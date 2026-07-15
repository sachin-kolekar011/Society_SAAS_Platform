import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axiosClient, { setAccessToken, setUnauthorizedHandler } from '../services/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // logout should clear local state even if the network call fails --
      // the user's intent is "get me out," not "confirm the server agrees"
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  // Wire the interceptor's forced-logout path (Phase 10 axiosClient.js) to
  // this context's logout -- registered once on mount.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  // On app load, attempt a silent refresh -- if the user has a valid
  // refresh cookie from a previous session, this logs them back in without
  // showing the login screen at all.
  useEffect(() => {
    (async () => {
      try {
        const response = await axiosClient.post('/auth/refresh');
        setAccessToken(response.data.data.accessToken);
        const meResponse = await axiosClient.get('/auth/me');
        setUser(meResponse.data.data);
      } catch {
        // no valid session, that's fine -- user sees the login screen
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const response = await axiosClient.post('/auth/login', { email, password });
    const { accessToken, user: loggedInUser } = response.data.data;
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload) => {
    const response = await axiosClient.post('/auth/register', payload);
    return response.data.data;
  };

  return (
    <AuthContext.Provider value={{ user, tenant, setTenant, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
