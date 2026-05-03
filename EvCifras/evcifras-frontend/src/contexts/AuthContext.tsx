import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api";
import type { AuthResponse, User } from "../types";
import type { ReactNode } from "react";

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type AuthContextData = {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("evcifras:token"),
  );
  const [loading, setLoading] = useState(true);

  const persistAuth = useCallback((response: AuthResponse) => {
    localStorage.setItem("evcifras:token", response.accessToken);
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("evcifras:token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const storedToken = localStorage.getItem("evcifras:token");

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<User>("/auth/me");
      setUser(response.data);
      setToken(storedToken);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (data: LoginInput) => {
      const response = await api.post<AuthResponse>("/auth/login", data);
      persistAuth(response.data);
    },
    [persistAuth],
  );

  const register = useCallback(
    async (data: RegisterInput) => {
      const response = await api.post<AuthResponse>("/auth/register", data);
      persistAuth(response.data);
    },
    [persistAuth],
  );

  const value = useMemo<AuthContextData>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === "ADMIN",
      isEditor: user?.role === "ADMIN" || user?.role === "EDITOR",
      login,
      register,
      logout,
      refreshMe,
    }),
    [user, token, loading, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
}
