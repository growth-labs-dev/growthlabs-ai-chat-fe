import { useAuth } from "./AuthProvider";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { ChatApp } from "../chat/ChatApp";
import { useLocale } from "../i18n/LocaleProvider";

export function AuthenticatedApplication() {
  const { user, loading } = useAuth();
  const { locale } = useLocale();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-950 text-white" aria-live="polite">
        <div className="flex flex-col items-center gap-5">
          <img src="/Logo-Vertical-White.svg" alt="Growth Labs" className="h-16 w-fit object-contain" />
          <span className="size-7 animate-spin rounded-full border-2 border-gray-700 border-t-brand-500" aria-label={locale === "pt" ? "A validar sessão" : "Validating session"} />
        </div>
      </div>
    );
  }

  if (user) return <ChatApp />;
  return window.location.pathname.replace(/\/+$/, "") === "/register" ? <RegisterPage /> : <LoginPage />;
}
