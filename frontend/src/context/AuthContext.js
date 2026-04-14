import { createContext, useContext, useState, useEffect, useRef } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await API.post('/auth/register', { name, email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      if (localStorage.getItem('token')) {
        await API.post('/auth/logout');
      }
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      localStorage.removeItem('token');
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
