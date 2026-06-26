import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, getToken, getUsername, setSession, clearSession } from './api';

interface AuthState {
  username: string;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string>(getUsername());
  const [token, setToken] = useState<string>(getToken());

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.signin({ email, password });
    setSession(res.access_token, res.username);
    setToken(res.access_token);
    setUsername(res.username);
  }, []);

  const signup = useCallback(async (uname: string, email: string, password: string) => {
    const res = await api.signup({ username: uname, email, password });
    setSession(res.access_token, res.username);
    setToken(res.access_token);
    setUsername(res.username);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken('');
    setUsername('');
  }, []);

  return (
    <AuthContext.Provider
      value={{ username, isAuthenticated: Boolean(token), login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
