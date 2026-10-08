import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY, UNAUTHORIZED_EVENT } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only show a loading state when there is a session to restore.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return undefined;

    let cancelled = false;
    api
      .get('/auth/me')
      .then((response) => {
        if (!cancelled) setUser(response.data.data);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [logout]);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const value = useMemo(() => {
    const startSession = async (path, body) => {
      const { data } = await api.post(path, body);
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      return data.user;
    };

    return {
      user,
      loading,
      setUser,
      logout,
      login: (email, password) => startSession('/auth/login', { email, password }),
      register: (details) => startSession('/auth/register', details),
    };
  }, [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
