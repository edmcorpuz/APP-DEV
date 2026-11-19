import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:4000';
export const BLOG_URL = import.meta.env.VITE_BLOG_URL || 'http://localhost:5000/api';

const AuthContext = createContext(null);

// Reads { id, username, role } out of the access token (the payload is plain base64url JSON).
function decode(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  }).catch(() => {
    throw new Error("Can't reach the server. Check that npm run dev is still running.");
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export function AuthProvider({ children }) {
  // The access token lives in memory only. The refresh token is an httpOnly cookie set by
  // the Auth Server, so page JavaScript can never read it.
  const tokenRef = useRef(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const setToken = useCallback(token => {
    tokenRef.current = token;
    const claims = token ? decode(token) : null;
    setUser(claims ? { id: claims.id, username: claims.username, role: claims.role } : null);
  }, []);

  // Ask the Auth Server for a new access token using the refresh cookie.
  const refresh = useCallback(async () => {
    try {
      const data = await request(`${AUTH_URL}/refresh`, { method: 'POST', credentials: 'include', body: '{}' });
      setToken(data.accessToken);
      return data.accessToken;
    } catch {
      setToken(null);
      return null;
    }
  }, [setToken]);

  // On first load, restore the session if a valid refresh cookie exists.
  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  const login = useCallback(async (username, password) => {
    const data = await request(`${AUTH_URL}/login`, {
      method: 'POST', credentials: 'include', body: JSON.stringify({ username, password }),
    });
    setToken(data.accessToken);
  }, [setToken]);

  const register = useCallback(
    form => request(`${AUTH_URL}/register`, { method: 'POST', body: JSON.stringify(form) }),
    [],
  );

  const logout = useCallback(async () => {
    try {
      await request(`${AUTH_URL}/logout`, { method: 'POST', credentials: 'include', body: '{}' });
    } finally {
      setToken(null);
    }
  }, [setToken]);

  // Calls the Blog API. Adds the Bearer token, and on a 401 refreshes once and retries.
  const api = useCallback(async (path, options = {}) => {
    const send = token => request(`${BLOG_URL}${path}`, {
      ...options,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    try {
      return await send(tokenRef.current);
    } catch (error) {
      if (error.status !== 401 || !tokenRef.current) throw error;
      const fresh = await refresh();
      if (!fresh) throw new Error('Your session expired. Please log in again.');
      return send(fresh);
    }
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
