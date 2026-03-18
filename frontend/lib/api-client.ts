import axios, { type AxiosInstance } from 'axios';
import { getStoredToken } from '@/lib/auth';

export interface ApiClientConfig {
  baseUrl?: string;
  getToken?: () => string | null;
}

export const createApiClient = (config?: ApiClientConfig): AxiosInstance => {
  const instance = axios.create({
    baseURL: config?.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  });

  instance.interceptors.request.use((request) => {
    const token = config?.getToken?.() ?? getStoredToken();
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
  });

  return instance;
};

/** Клієнт з автоматичною підстановкою токена з localStorage (лише в браузері). */
export const getAuthApiClient = (): AxiosInstance =>
  createApiClient({ getToken: getStoredToken });

