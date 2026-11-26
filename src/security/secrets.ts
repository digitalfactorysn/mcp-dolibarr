/**
 * Audit 26/11/2026 (F-08) : constantes Dolibarr qui portent un secret (mots de passe SMTP, sels, jetons de
 * passerelles de paiement, cles d'API) : jamais renvoyees en clair a l'agent.
 */
const SENSITIVE_CONST = /(PASS|PWD|_PW$|_PW_|SECRET|TOKEN|SALT|PRIVATE|_KEY$|_KEY_|APIKEY|API_KEY|CREDENTIAL)/i;

export function maskSetupValue(name: string, value: unknown): unknown {
  return SENSITIVE_CONST.test(name) && value !== null && value !== undefined && String(value) !== '' ? '***MASQUÉ***' : value;
}

/** Reponse de GET /setup/conf (objet nom => valeur) ou /setup/conf/NOM (valeur seule). */
export function maskSetupResponse(endpoint: string, data: unknown): unknown {
  const single = endpoint.match(/^\/setup\/conf\/([^/?]+)/);
  if (single) return maskSetupValue(decodeURIComponent(single[1]), data);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return Object.fromEntries(Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, maskSetupValue(k, v)]));
  }
  return data;
}
