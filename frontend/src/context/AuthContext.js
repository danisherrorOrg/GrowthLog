import { createContext, useContext, useState, useEffect, useRef } from 'react';
import API, { setSigningOut } from '../utils/api';
import { browserTimezone } from '../utils/dates';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tokens used to live in localStorage; drop any left over from before the cookie switch
    try { localStorage.removeItem('token'); } catch { /* storage unavailable */ }
    // The httpOnly session cookie is invisible to JS, so ask the API whether we're signed in
    API.get('/auth/me', { skipAuthRedirect: true })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password, timezone: browserTimezone() });
    setSigningOut(false);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await API.post('/auth/register', { name, email, password, timezone: browserTimezone() });
    setSigningOut(false);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    setSigningOut(true);
    try {
      // Clears the httpOnly cookie server-side; works even if the session already expired
      await API.post('/auth/logout', null, { skipAuthRedirect: true });
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setUser(null);
    }
  };

  const lastFetch = useRef(0);

  const refreshUser = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetch.current < 3000 && user) return user;
    
    try {
      lastFetch.current = now;
      const res = await API.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch (e) {
      console.error("Failed to refresh user stats:", e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
