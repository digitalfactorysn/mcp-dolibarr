import crypto from 'node:crypto';

export interface MutationEnvelope<TBefore = unknown, TAfter = unknown> {
  applied: boolean;
  verified: boolean;
  dry_run: boolean;
  id?: number | string;
  ref?: string;
  before?: TBefore | null;
  requested?: unknown;
  after?: TAfter | null;
  side_effects?: string[];
  warnings?: string[];
  proof?: {
    timestamp: string;
    endpoint?: string;
    verified_fields?: Record<string, boolean>;
  };
  rollback_possible?: boolean;
  rollback_instructions?: string;
}

export interface MutationOptions {
  dry_run?: boolean;
  idempotency_key?: string;
  reason?: string;
  expected_status?: string | number;
  expected_tms?: number | string;
  expected_version?: number | string;
  entity_id?: number | string;
  effective_date?: string;
  approval_token?: string;
}

export const PROTECTED_PRODUCTION_BANK_ACCOUNT_IDS = new Set<number>([1]);

// 1. Gestionnaire d'Idempotence
interface IdempotencyRecord {
  result: unknown;
  created_at: number;
}
const idempotencyStore = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key?: string): unknown | null {
  if (!key) return null;
  const record = idempotencyStore.get(key);
  if (!record) return null;
  if (Date.now() - record.created_at > IDEMPOTENCY_TTL_MS) {
    idempotencyStore.delete(key);
    return null;
  }
  return record.result;
}

export function saveIdempotency(key: string | undefined, result: unknown): void {
  if (!key) return;
  idempotencyStore.set(key, { result, created_at: Date.now() });
}

// 2. Gestionnaire d'Approbation Renforcée (2-step Approval)
interface ApprovalRecord {
  operation: string;
  target_id?: string | number;
  paramsHash: string;
  impactSummary: string;
  created_at: number;
  expires_at: number;
}
const approvalStore = new Map<string, ApprovalRecord>();
const APPROVAL_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function requestApproval(
  operation: string,
  params: Record<string, unknown>,
  impactSummary: string,
  target_id?: string | number
): {
  applied: false;
  approval_required: true;
  status: 'PENDING_APPROVAL';
  approval_token: string;
  expires_in_seconds: number;
  impact_summary: string;
  instructions: string;
} {
  const token = `APPR_${crypto.randomBytes(16).toString('hex')}`;
  const now = Date.now();
  const paramsHash = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex');

  approvalStore.set(token, {
    operation,
    target_id,
    paramsHash,
    impactSummary,
    created_at: now,
    expires_at: now + APPROVAL_TTL_MS,
  });

  return {
    applied: false,
    approval_required: true,
    status: 'PENDING_APPROVAL',
    approval_token: token,
    expires_in_seconds: Math.floor(APPROVAL_TTL_MS / 1000),
    impact_summary: impactSummary,
    instructions: `Opération sensible nécessitant confirmation explicite. Rappelez cet outil en transmettant 'approval_token: "${token}"' dans les 5 minutes pour valider l'exécution.`,
  };
}

export function verifyApproval(token?: string, operation?: string, params?: Record<string, unknown>): boolean {
  if (!token) return false;
  const record = approvalStore.get(token);
  if (!record) return false;
  if (Date.now() > record.expires_at) {
    approvalStore.delete(token);
    return false;
  }
  if (operation && record.operation !== operation) {
    return false;
  }
  if (params) {
    // Exclure approval_token des paramètres pour comparer le hash
    const { approval_token: _, ...cleanParams } = params;
    const currentHash = crypto.createHash('sha256').update(JSON.stringify(cleanParams)).digest('hex');
    if (currentHash !== record.paramsHash) {
      return false;
    }
  }
  // Usage unique
  approvalStore.delete(token);
  return true;
}

// 3. Masquage strict des secrets et mots de passe
const SENSITIVE_KEYS = new Set([
  'password', 'pass', 'pwd', 'api_key', 'apikey', 'secret',
  'token', 'private_key', 'oauth_token', 'access_token', 'refresh_token',
  'dolapikey', 'mcp_token', 'auth_token'
]);

export function sanitizeSecrets<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeSecrets(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password')) {
      result[key] = '***REDACTED***';
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizeSecrets(val);
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

// 4. Verrouillage Optimiste
export function checkOptimisticLock(
  before: Record<string, unknown> | null,
  options: MutationOptions
): void {
  if (!before) return;
  if (options.expected_status !== undefined) {
    const currentStatus = before.status ?? before.statut;
    if (String(currentStatus) !== String(options.expected_status)) {
      throw new Error(
        `OPTIMISTIC_LOCK_FAILED: Le statut actuel de l'objet (${currentStatus}) ne correspond pas au statut attendu (${options.expected_status}).`
      );
    }
  }
  if (options.expected_tms !== undefined && before.tms !== undefined) {
    if (String(before.tms) !== String(options.expected_tms)) {
      throw new Error(
        `OPTIMISTIC_LOCK_FAILED: L'horodatage de modification (tms=${before.tms}) ne correspond pas à la version attendue (${options.expected_tms}).`
      );
    }
  }
}
