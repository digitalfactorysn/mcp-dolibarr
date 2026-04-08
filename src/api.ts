import axios, { AxiosInstance, AxiosResponse } from 'axios';

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
          const message = data?.error?.message || data?.message || data?.error || error.message;
          
          let context = '';
          if (status === 401) context = ' (Clé API invalide ou permissions insuffisantes)';
          if (status === 403) context = ' (Accès non autorisé à cette ressource)';
          if (status === 404) context = ' (Ressource introuvable - vérifiez que le module est activé dans Dolibarr)';
          if (status === 500) context = ' (Erreur interne Dolibarr - vérifiez les logs)';
          
          throw new Error(`Dolibarr API Error [${status}]${context}: ${message}`);
        }
        if (error.request) {
          throw new Error(`Dolibarr: Pas de réponse du serveur. Vérifiez que l'URL ${this.baseURL} est accessible.`);
        }
        throw new Error(`Dolibarr Request Error: ${error.message}`);
      }
    );
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
    return response.data;
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
