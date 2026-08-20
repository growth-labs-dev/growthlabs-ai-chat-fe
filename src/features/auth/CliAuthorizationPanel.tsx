import { useState } from "react";
import Button from "../../components/ui/button/Button";
import { apiRequest } from "../../lib/api";

interface CliAuthorizationPanelProps {
  userCode: string | null;
  demo: boolean;
  onComplete: () => void;
}

export function CliAuthorizationPanel({ userCode, demo, onComplete }: CliAuthorizationPanelProps) {
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
      setError(requestError instanceof Error ? requestError.message : "Não foi possível responder ao pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-brand-500/25 bg-brand-500/10 px-4 py-4 shadow-theme-sm sm:flex sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-white">Autorizar Growth CLI</h2><p className="mt-1 text-sm text-gray-400">Confirme apenas se iniciou o código <strong className="font-mono text-brand-300">{userCode}</strong> no seu terminal.</p>{error ? <p className="mt-2 text-xs text-error-400">{error}</p> : null}</div>
      <div className="mt-3 flex gap-2 sm:mt-0"><Button size="sm" variant="outline" disabled={submitting || demo} onClick={() => void respond(false)}>Recusar</Button><Button size="sm" disabled={submitting || demo} onClick={() => void respond(true)}>Autorizar</Button></div>
    </div>
  );
}
