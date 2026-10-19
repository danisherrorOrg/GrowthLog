import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

API.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect if it's a 401 and we're not already on a signed-out page (login, register, password reset)
    const onAuthPage = AUTH_PAGES.some((p) => window.location.pathname.startsWith(p));
    if (err.response?.status === 401 && !onAuthPage) {
      localStorage.removeItem('token');
      // Simple and effective: forces a complete state wipe
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(err);
  }
);

export default API;
