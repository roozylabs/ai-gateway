import axios from 'axios';
import Cookies from 'js-cookie';
import { parseApiError } from '@/lib/http/errors';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Axios request interceptor to attach auth token header if available
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Axios response interceptor for unified error parsing
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth_token');
    }
    const apiError = parseApiError(error);
    return Promise.reject(apiError);
  }
);
