/**
 * Client REST Dolibarr — point de passage UNIQUE de toutes les requêtes.
 *
 * Gardes appliquées à chaque appel (défense en profondeur, indépendantes des outils) :
 *   1. chemin = segments sûrs uniquement (pas de "..", "?", "%", "\\"…) ;
 *   2. méthode + chemin doivent figurer dans la liste blanche générée depuis
 *      les sources Dolibarr (et exister dans la version ciblée si précisée) ;
 *   3. en lecture seule, toute méthode autre que GET est refusée ;
 *   4. paramètres de requête typés, filtres USF validés ;
 *   5. aucune redirection suivie (la clé API ne peut pas fuiter vers un autre hôte) ;
 *   6. taille de réponse bornée, messages d'erreur assainis (jamais la clé ni les en-têtes).
 */
import axios, { type AxiosInstance } from 'axios';
import { checkRoute } from './security/routes.js';
import { validateUsf } from './security/usf.js';

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiOptions {
  readOnly: boolean;
  dolibarrVersion?: string | null;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ParamValue = string | number | boolean | undefined;

const PARAM_KEY = /^[A-Za-z0-9_]{1,40}$/;

function clean(msg: unknown): string {
  return String(msg ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .slice(0, 300);
}

export class DolibarrAPI {
  private readonly client: AxiosInstance;
  private readonly readOnly: boolean;
  private readonly version: string | null;
  private userId: number | null | undefined;

  /** `baseURL` doit déjà être normalisé (voir config.normalizeDolibarrUrl). */
  constructor(readonly baseURL: string, apiKey: string, opts: ApiOptions) {
    this.readOnly = opts.readOnly;
    this.version = opts.dolibarrVersion ?? null;
    this.client = axios.create({
      baseURL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'mcp-dolibarr-secure',
        DOLAPIKEY: apiKey,
      },
      timeout: opts.timeoutMs ?? 30_000,
      maxRedirects: 0,
      maxContentLength: opts.maxResponseBytes ?? 20 * 1024 * 1024,
      maxBodyLength: 1024 * 1024,
    });
  }

  private prepareParams(params?: Record<string, unknown>): Record<string, string | number | boolean> | undefined {
    if (!params) return undefined;
    const out: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(params) as [string, ParamValue][]) {
      if (v === undefined) continue;
      if (!PARAM_KEY.test(k)) throw new ApiError(`Paramètre de requête invalide : ${clean(k)}`);
      if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
        throw new ApiError(`Valeur invalide pour le paramètre ${k}.`);
      }
      if (typeof v === 'number' && !Number.isFinite(v)) throw new ApiError(`Valeur numérique invalide pour ${k}.`);
      if (k === 'sqlfilters' && typeof v === 'string') validateUsf(v);
      out[k] = v;
    }
    return out;
  }

  /**
   * Refuse tout paramètre que Dolibarr ignorerait en silence (ou qui n'existe pas dans
   * la version ciblée) : un outil ne peut pas croire qu'il filtre alors que non.
   */
  private checkParams(
    method: Method,
    endpoint: string,
    route: { params: string[]; body: boolean },
    query: Record<string, unknown> | undefined,
    data: unknown,
  ): void {
    const known = new Set(route.params);
    const where = `${method} ${endpoint.replace(/[^\x20-\x7e]/g, '?')}`;
    for (const k of Object.keys(query ?? {})) {
      if (!known.has(k) && !(route.body && method !== 'GET' && method !== 'DELETE')) {
        throw new ApiError(`Paramètre « ${clean(k)} » non pris en charge par ${where}.`);
      }
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && !route.body) {
      for (const k of Object.keys(data)) {
        if (!known.has(k)) throw new ApiError(`Champ « ${clean(k)} » non pris en charge par ${where}.`);
      }
    }
  }

  private async request<T>(
    method: Method,
    endpoint: string,
    opts: { params?: Record<string, unknown>; data?: unknown } = {},
  ): Promise<T> {
    let route;
    try {
      route = checkRoute(method, endpoint, this.version);
    } catch (e) {
      throw new ApiError((e as Error).message);
    }
    if (!route.ok) {
      throw new ApiError(
        route.reason === 'version'
          ? `Route indisponible avant Dolibarr ${route.minMajor} : ${method} ${endpoint.replace(/[^\x20-\x7e]/g, '?')}`
          : `Route Dolibarr non autorisée : ${method} ${endpoint.replace(/[^\x20-\x7e]/g, '?')}`,
      );
    }
    if (this.readOnly && method !== 'GET') {
      throw new ApiError('Serveur en lecture seule : requête de modification refusée.');
    }
    const params = this.prepareParams(opts.params);
    this.checkParams(method, endpoint, route.route, params, opts.data);
    try {
      const res = await this.client.request<T>({ method, url: endpoint, params, data: opts.data });
      return res.data;
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  private toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        if (status >= 300 && status < 400) {
          return new ApiError(
            `Dolibarr a répondu par une redirection [${status}] (non suivie par sécurité). Vérifiez DOLIBARR_URL (HTTPS, chemin exact).`,
            status,
          );
        }
        const data = error.response.data as { error?: { message?: string }; message?: string } | string | undefined;
        const message =
          typeof data === 'string' ? data : (data?.error?.message ?? data?.message ?? error.message);
        let context = '';
        if (status === 401) context = ' (clé API invalide ou permissions insuffisantes)';
        else if (status === 403) context = ' (accès refusé à cette ressource)';
        else if (status === 404) context = ' (introuvable — module désactivé ou identifiant inexistant)';
        else if (status >= 500) context = ' (erreur interne Dolibarr — consultez ses journaux)';
        return new ApiError(`Dolibarr API [${status}]${context} : ${clean(message)}`, status);
      }
      if (error.code === 'ECONNABORTED') return new ApiError('Dolibarr : délai dépassé.');
      if (error.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' || /maxContentLength/i.test(error.message)) {
        return new ApiError('Dolibarr : réponse trop volumineuse (limite dépassée).');
      }
      return new ApiError('Dolibarr : pas de réponse du serveur (vérifiez DOLIBARR_URL et le réseau).');
    }
    return new ApiError('Erreur de requête inattendue.');
  }

  get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', endpoint, { params });
  }

  post<T = unknown>(endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', endpoint, { data, params });
  }

  put<T = unknown>(endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('PUT', endpoint, { data, params });
  }

  patch<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PATCH', endpoint, { data });
  }

  delete<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', endpoint, { params });
  }

  /**
   * Identifiant de l'utilisateur Dolibarr propriétaire de la clé API (GET /users/info),
   * mis en cache. Sert d'auteur par défaut des objets créés — jamais un « 1 » codé en dur.
   */
  async currentUserId(): Promise<number | undefined> {
    if (this.userId === undefined) {
      try {
        const me = await this.get<{ id?: number | string }>('/users/info');
        const id = Number(me?.id);
        this.userId = Number.isInteger(id) && id > 0 ? id : null;
      } catch {
        this.userId = null;
      }
    }
    return this.userId ?? undefined;
  }
}

/** Convertit une date ISO 8601 (ou undefined → maintenant) en timestamp UNIX (secondes). */
export function toUnix(date?: unknown): number {
  if (date === undefined || date === null || date === '') return Math.floor(Date.now() / 1000);
  const t = new Date(String(date)).getTime();
  if (!Number.isFinite(t)) throw new ApiError(`Date invalide : ${clean(date)}`);
  return Math.floor(t / 1000);
}

/** Ajoute l'auteur courant (propriétaire de la clé API) à un payload si non fourni. */
export async function withAuthor<T extends Record<string, unknown>>(
  api: DolibarrAPI,
  payload: T,
  field: 'fk_user_author' | 'user_author_id',
): Promise<T> {
  if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') return payload;
  const id = await api.currentUserId();
  return id ? { ...payload, [field]: id } : payload;
}
