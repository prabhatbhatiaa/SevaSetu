import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sevasetu_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.success) {
            setUser(res.data.data);
          }
        } catch (err) {
          console.error('[AuthContext] Failed to load session user:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data && res.data.token) {
      localStorage.setItem('sevasetu_token', res.data.token);
      localStorage.setItem('sevasetu_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data && res.data.token) {
      localStorage.setItem('sevasetu_token', res.data.token);
      localStorage.setItem('sevasetu_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('sevasetu_token');
    localStorage.removeItem('sevasetu_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
