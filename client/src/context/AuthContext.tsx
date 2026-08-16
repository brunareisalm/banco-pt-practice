import { createContext, useContext, useState, ReactNode } from "react";
import { api, setToken, clearToken, isAuthenticated } from "../api";

interface AuthUser {
  id: string;
  username: string;
  nomeCompleto: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  registo: (data: {
    username: string;
    password: string;
    nomeCompleto: string;
    telefone: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  async function login(username: string, password: string) {
    const response = await api.login(username, password);
    setToken(response.token);
    setUser(response.user);
    setAuthenticated(true);
  }

  async function registo(data: {
    username: string;
    password: string;
    nomeCompleto: string;
    telefone: string;
  }) {
    const response = await api.registo(data);
    setToken(response.token);
    setUser(response.user);
    setAuthenticated(true);
  }

  function logout() {
    clearToken();
    setUser(null);
    setAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ user, authenticated, login, registo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
