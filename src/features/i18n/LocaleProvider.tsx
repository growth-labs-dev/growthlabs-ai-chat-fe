/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../auth/AuthProvider";

export type Locale = "en" | "pt";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  saving: boolean;
  error: string | null;
}

interface ProfileLocaleResponse {
  preferences?: { locale?: Locale };
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function requestedLocale(): Locale {
  return new URLSearchParams(window.location.search).get("lang") === "pt" ? "pt" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user, demo } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(requestedLocale);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-PT" : "en";
  }, [locale]);

  useEffect(() => {
    if (!user || demo) return;
    let active = true;
    apiRequest<ProfileLocaleResponse>("/profile")
      .then((profile) => {
        if (active && (profile.preferences?.locale === "en" || profile.preferences?.locale === "pt")) {
          setLocaleState(profile.preferences.locale);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [demo, user]);

  const setLocale = useCallback(async (next: Locale) => {
    if (next === locale || saving) return;
    const previous = locale;
    setLocaleState(next);
    setError(null);
    if (user && !demo) {
      setSaving(true);
      try {
        await apiRequest("/profile/preferences", { method: "PATCH", body: JSON.stringify({ locale: next }) });
      } catch {
        setLocaleState(previous);
        setError(previous === "pt" ? "Não foi possível guardar o idioma." : "Unable to save the language preference.");
      } finally {
        setSaving(false);
      }
      return;
    }
    const url = new URL(window.location.href);
    if (next === "pt") url.searchParams.set("lang", "pt"); else url.searchParams.delete("lang");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [demo, locale, saving, user]);

  const value = useMemo(() => ({ locale, setLocale, saving, error }), [error, locale, saving, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, saving, error } = useLocale();
  return (
    <div>
      <div className={`inline-flex items-center rounded-full bg-white/[0.055] p-1 ${compact ? "text-[10px]" : "text-xs"}`} aria-label={locale === "pt" ? "Idioma" : "Language"} title={error ?? undefined}>
        {(["en", "pt"] as const).map((value) => (
          <button key={value} type="button" disabled={saving} onClick={() => void setLocale(value)} aria-pressed={locale === value} aria-label={value === "en" ? "English" : "Português"} className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wider transition disabled:cursor-wait ${locale === value ? "bg-white text-black" : "text-gray-500 hover:text-white"}`}>{value}</button>
        ))}
      </div>
      {error ? <span role="status" className="sr-only">{error}</span> : null}
    </div>
  );
}
