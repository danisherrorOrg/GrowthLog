import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  // The session lives in an httpOnly cookie that page scripts can't read; the browser sends it for us
  withCredentials: true,
  // Required by the API on cookie-authenticated writes (CSRF protection)
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

// While the user is signing out, requests still in flight (polling etc.) get 401s once the cookie
// is cleared. Those aren't an expired session, so they must not redirect to "Session Expired".
let signingOut = false;
export function setSigningOut(value) {
  signingOut = value;
}

API.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect if it's a 401 and we're not already on a signed-out page (login, register, password reset).
    // Callers that just probe the session (e.g. AuthContext on load) opt out with skipAuthRedirect.
    const onAuthPage = AUTH_PAGES.some((p) => window.location.pathname.startsWith(p));
    if (err.response?.status === 401 && !onAuthPage && !signingOut && !err.config?.skipAuthRedirect) {
      // Simple and effective: forces a complete state wipe
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(err);
  }
);

export default API;
