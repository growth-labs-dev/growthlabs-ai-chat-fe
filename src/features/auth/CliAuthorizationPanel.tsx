import { useState } from "react";
import Button from "../../components/ui/button/Button";
import { apiRequest } from "../../lib/api";
import { useLocale } from "../i18n/LocaleProvider";

interface CliAuthorizationPanelProps {
  userCode: string | null;
  demo: boolean;
  onComplete: () => void;
}

export function CliAuthorizationPanel({ userCode, demo, onComplete }: CliAuthorizationPanelProps) {
  const { locale } = useLocale();
  const c = locale === "pt" ? {
    failed: "Não foi possível responder ao pedido.", title: "Autorizar Growth CLI", prefix: "Confirme apenas se iniciou o código", suffix: "no seu terminal.", deny: "Recusar", approve: "Autorizar",
  } : {
    failed: "Unable to respond to the request.", title: "Authorize Growth CLI", prefix: "Only confirm if you started code", suffix: "in your terminal.", deny: "Deny", approve: "Authorize",
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!userCode) return null;

  const respond = async (approved: boolean) => {
    if (demo) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/auth/cli/${approved ? "approve" : "deny"}`, {
        method: "POST",
        body: JSON.stringify({ user_code: userCode }),
      });
      onComplete();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : c.failed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-brand-500/25 bg-brand-500/10 px-4 py-4 shadow-theme-sm sm:flex sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-white">{c.title}</h2><p className="mt-1 text-sm text-gray-400">{c.prefix} <strong className="font-mono text-brand-300">{userCode}</strong> {c.suffix}</p>{error ? <p className="mt-2 text-xs text-error-400">{error}</p> : null}</div>
      <div className="mt-3 flex gap-2 sm:mt-0"><Button size="sm" variant="outline" disabled={submitting || demo} onClick={() => void respond(false)}>{c.deny}</Button><Button size="sm" disabled={submitting || demo} onClick={() => void respond(true)}>{c.approve}</Button></div>
    </div>
  );
}
