import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class DolibarrError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export class DolibarrAPI {
  private client: AxiosInstance;
  public baseURL: string;
  /** URL de l'interface web Dolibarr (sans /api/index.php), pour les liens renvoyés à l'utilisateur */
  public webURL: string;

  constructor(baseURL: string, apiKey: string) {
    // Normalize URL - remove trailing slash and ensure we point to the right base
    let url = baseURL.replace(/\/$/, '');
    // If it doesn't already end with api/index.php, append it
    if (!url.endsWith('api/index.php')) {
      url = `${url}/api/index.php`;
    }
    this.baseURL = url;
    this.webURL = url.replace(/\/api\/index\.php$/, '');

    // La clé API circule dans chaque requête : refuser de l'envoyer en clair hors de la machine locale
    const { protocol, hostname } = new URL(url);
    const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
    if (protocol !== 'https:' && !isLocal && process.env.DOLIBARR_ALLOW_INSECURE_HTTP !== 'true') {
      throw new Error(`DOLIBARR_URL doit utiliser HTTPS (reçu : ${protocol}//${hostname}). Définissez DOLIBARR_ALLOW_INSECURE_HTTP=true pour forcer, à vos risques.`);
    }

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
          const message = data?.error?.message || data?.message || data?.error || error.message;
          
          let context = '';
          if (status === 401) context = ' (Clé API invalide ou permissions insuffisantes)';
          if (status === 403) context = ' (Accès non autorisé à cette ressource)';
          if (status === 404) context = ' (Ressource introuvable - vérifiez que le module est activé dans Dolibarr)';
          if (status === 500) context = ' (Erreur interne Dolibarr - vérifiez les logs)';
          
          throw new DolibarrError(`Dolibarr API Error [${status}]${context}: ${message}`, status);
        }
        if (error.request) {
          throw new DolibarrError(`Dolibarr: Pas de réponse du serveur. Vérifiez que l'URL ${this.baseURL} est accessible.`);
        }
        throw new DolibarrError(`Dolibarr Request Error: ${error.message}`);
      }
    );
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
    return response.data;
  }

  /**
   * Récupère toutes les pages d'une liste (100 éléments par page, plafonné à maxItems).
   * Les anciennes versions de Dolibarr renvoient 404 pour une liste vide : traité comme [].
   */
  async listAll<T = Record<string, unknown>>(endpoint: string, params: Record<string, unknown> = {}, maxItems = 5000): Promise<T[]> {
    const pageSize = 100;
    const items: T[] = [];
    for (let page = 0; items.length < maxItems; page++) {
      let batch: unknown;
      try {
        batch = await this.get(endpoint, { ...params, limit: pageSize, page });
      } catch (e) {
        if (e instanceof DolibarrError && e.status === 404) break;
        throw e;
      }
      if (!Array.isArray(batch) || batch.length === 0) break;
      items.push(...(batch as T[]));
      if (batch.length < pageSize) break;
    }
    return items.slice(0, maxItems);
  }

  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(endpoint, data);
    return response.data;
  }

  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(endpoint, data);
    return response.data;
  }

  async patch<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(endpoint, data);
    return response.data;
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(endpoint);
    return response.data;
  }
}
