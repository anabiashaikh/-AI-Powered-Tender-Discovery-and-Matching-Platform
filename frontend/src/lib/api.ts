import axios from 'axios';

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Add auth header on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Prevent concurrent refresh races: if a refresh is already in-flight,
// queue subsequent 401s and resolve them when the refresh completes.
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // If a refresh is already in-flight, wait for it instead of firing a second one
        if (!refreshing) {
          refreshing = axios
            .post(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/refresh`,
              { refresh_token: refreshToken },
              { headers: { 'Content-Type': 'application/json' } },
            )
            .then((res) => {
              const { access_token, refresh_token } = res.data;
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);
              return access_token;
            })
            .finally(() => {
              refreshing = null;
            });
        }

        const newAccessToken = await refreshing;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — clear tokens and send user to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth/login?expired=true';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
