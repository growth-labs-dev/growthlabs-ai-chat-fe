/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest, isDemoEnabled } from "../../lib/api";
import { setCsrfToken } from "../../lib/csrf";
import type { AuthConfig, AuthSession, AuthUser } from "./types";

type AuthNotice = { kind: "success" | "error"; message: string } | null;

interface AuthContextValue {
  user: AuthUser | null;
  config: AuthConfig | null;
  loading: boolean;
  error: string | null;
  notice: AuthNotice;
  demo: boolean;
  loginWithGoogle: () => void;
  loginDemo: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const demoUser: AuthUser = {
  id: "demo-user",
  displayName: "Utilizador de demonstração",
  email: "demo@growthlabs.pt",
  avatarUrl: null,
  role: "demo",
  status: "active",
};

function consumeAuthResult(): AuthNotice {
  const url = new URL(window.location.href);
  const result = url.searchParams.get("auth");
  if (!result) return null;
  url.searchParams.delete("auth");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  if (result === "success") return { kind: "success", message: "Sessão iniciada com sucesso." };
  if (result === "not-authorized") return { kind: "error", message: "Esta conta Google não está autorizada a usar o Growth AI." };
  return { kind: "error", message: "O login Google falhou ou expirou. Tente novamente." };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<AuthNotice>(() => consumeAuthResult());
  const [demo, setDemo] = useState(false);

  const applySession = useCallback((session: AuthSession) => {
    setCsrfToken(session.authenticated ? session.csrfToken : null);
    setUser(session.authenticated ? session.user : null);
    setDemo(false);
  }, []);

  const refresh = useCallback(async () => {
    const session = await apiRequest<AuthSession>("/auth/session");
    applySession(session);
  }, [applySession]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextConfig, session] = await Promise.all([
          apiRequest<AuthConfig>("/auth/config"),
          apiRequest<AuthSession>("/auth/session"),
        ]);
        if (!active) return;
        setConfig(nextConfig);
        applySession(session);
        if (!session.authenticated) {
          setNotice((current) => current?.kind === "success"
            ? { kind: "error", message: "O login foi concluído, mas a sessão não ficou ativa. Tente novamente." }
            : current);
        }
      } catch {
        if (active && !isDemoEnabled) setError("Não foi possível ligar ao serviço de autenticação Growth.");
        if (active) {
          setCsrfToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, [applySession]);

  const loginWithGoogle = useCallback(() => {
    if (!config?.google.enabled || !config.google.loginUrl) {
      setError("O login Google ainda não está disponível.");
      return;
    }
    const loginUrl = new URL(config.google.loginUrl, window.location.origin);
    const safeDevelopmentUrl = import.meta.env.DEV && loginUrl.origin === window.location.origin;
    if (loginUrl.protocol !== "https:" && !safeDevelopmentUrl) {
      setError("O serviço devolveu um endereço de login inseguro.");
      return;
    }
    const returnTo = new URL(window.location.href);
    returnTo.searchParams.delete("auth");
    loginUrl.searchParams.set("return_to", returnTo.toString());
    window.location.assign(loginUrl);
  }, [config]);

  const loginDemo = useCallback(() => {
    if (!isDemoEnabled) return;
    setError(null);
    setCsrfToken("demo-only");
    setDemo(true);
    setUser(demoUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (!demo) await apiRequest<{ authenticated: false }>("/auth/logout", { method: "POST" });
    } finally {
      setCsrfToken(null);
      setDemo(false);
      setUser(null);
    }
  }, [demo]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, config, loading, error, notice, demo, loginWithGoogle, loginDemo, logout, refresh, clearNotice: () => setNotice(null) }),
    [user, config, loading, error, notice, demo, loginWithGoogle, loginDemo, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
