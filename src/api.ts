import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { maskSetupResponse } from './security/secrets.js';

export class DolibarrAPIError extends Error {
  public status?: number;
  public route?: string;
  public method?: string;
  public dolibarrData?: unknown;

  constructor(message: string, status?: number, route?: string, method?: string, dolibarrData?: unknown) {
    super(message);
    this.name = 'DolibarrAPIError';
    this.status = status;
    this.route = route;
    this.method = method;
    this.dolibarrData = dolibarrData;
  }
}

export class DolibarrAPI {
  private client: AxiosInstance;
  public baseURL: string;

  constructor(baseURL: string, apiKey: string) {
    // Normalize URL - remove trailing slash and ensure we point to the right base
    let url = baseURL.replace(/\/$/, '');
    // If it doesn't already end with api/index.php, append it
    if (!url.endsWith('api/index.php')) {
      url = `${url}/api/index.php`;
    }
    this.baseURL = url;

    this.client = axios.create({
      baseURL: url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'DOLAPIKEY': apiKey,
      },
      timeout: 30000,
    });

    // Interceptor for clean error messages
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          const method = error.config?.method?.toUpperCase() || 'REQUEST';
          const url = error.config?.url || '';
          const message = data?.error?.message || data?.message || data?.error || error.message;

          let context = '';
          if (status === 401) context = ' (Clé API invalide ou permissions insuffisantes)';
          if (status === 403) context = ' (Accès non autorisé à cette ressource)';
          if (status === 404) context = ' (Ressource introuvable - vérifiez que le module est activé dans Dolibarr)';
          if (status === 500) context = ' (Erreur interne Dolibarr - vérifiez les logs)';

          const bodyDetail = typeof data === 'object' && data !== null ? ` | Corps: ${JSON.stringify(data)}` : '';
          console.error(`[DolibarrAPI] Erreur ${status} sur ${method} ${url}:`, data);

          throw new DolibarrAPIError(
            `Dolibarr API Error [${status}] on ${method} ${url}${context}: ${message}${bodyDetail}`,
            status,
            url,
            method,
            data
          );
        }
        if (error.request) {
          throw new DolibarrAPIError(
            `Dolibarr: Pas de réponse du serveur sur ${error.config?.method?.toUpperCase() || ''} ${error.config?.url || ''}. Vérifiez que l'instance Dolibarr configurée est accessible.`,
            undefined,
            error.config?.url,
            error.config?.method?.toUpperCase()
          );
        }
        throw new DolibarrAPIError(`Dolibarr Request Error: ${error.message}`);
      }
    );
  }

  /**
   * Audit 26/11/2026 (F-04) : un argument d'outil colle dans l'adresse ne doit jamais changer de point
   * d'API. Toute adresse dont le chemin contient un segment « .. » ou « . » (meme encode), une barre
   * oblique inverse ou un caractere de controle est refusee AVANT l'appel a Dolibarr.
   */
  static assertSafeEndpoint(endpoint: string): string {
    const refuse = (why: string): never => {
      throw new DolibarrAPIError(`Paramètre refusé : ${why} (${String(endpoint).slice(0, 120)}).`);
    };
    if (typeof endpoint !== 'string' || !endpoint.startsWith('/')) refuse("adresse d'API invalide");
    const q = endpoint.indexOf('?');
    // Une requete dans l'adresse n'est admise que pour /documents (les autres outils passent par « params »).
    if (q !== -1 && !endpoint.startsWith('/documents?')) refuse("caractère « ? » interdit dans un identifiant");
    const path = q === -1 ? endpoint : endpoint.slice(0, q);
    // Decodage repete jusqu'a stabilite (double encodage %252e…).
    let decoded = path;
    for (let i = 0; i < 5; i++) {
      let next = decoded;
      try { next = decodeURIComponent(decoded); } catch { refuse('encodage invalide'); }
      if (next === decoded) break;
      decoded = next;
    }
    // Forme normalisee (points pleine chasse, etc.) puis caracteres dangereux refuses ; les references
    // metier (espaces, accents, +, parentheses) restent admises.
    decoded = decoded.normalize('NFKC');
    if (/[?#\\;\u0000-\u001f\u007f]/.test(decoded)) refuse('caractère interdit dans un identifiant');
    const segments = decoded.slice(1).split('/');
    if (segments.some((seg, i) => /^[.\s]+$/.test(seg) || (seg === '' && i < segments.length - 1))) {
      refuse("l'identifiant tente de sortir du point d'API prévu");
    }
    return endpoint;
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(DolibarrAPI.assertSafeEndpoint(endpoint), { params });
    // Constantes de configuration : secrets masques a la source, pour tous les outils.
    return endpoint.startsWith('/setup/conf') ? maskSetupResponse(endpoint, response.data) as T : response.data;
  }

  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(DolibarrAPI.assertSafeEndpoint(endpoint), data);
    return response.data;
  }

  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(DolibarrAPI.assertSafeEndpoint(endpoint), data);
    return response.data;
  }

  async patch<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(DolibarrAPI.assertSafeEndpoint(endpoint), data);
    return response.data;
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(DolibarrAPI.assertSafeEndpoint(endpoint));
    return response.data;
  }
}
