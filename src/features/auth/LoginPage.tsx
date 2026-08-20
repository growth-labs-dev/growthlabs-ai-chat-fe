import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { isDemoEnabled } from "../../lib/api";
import { useAuth } from "./AuthProvider";

export function LoginPage() {
  const { config, loginWithGoogle, loginDemo, error, notice } = useAuth();
  const googleEnabled = config?.google.enabled === true;
  const userCode = new URLSearchParams(window.location.search).get("user_code");

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <PageMeta title="Entrar | Growth AI" description="Acesso seguro ao Growth AI" />
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <section className="hidden border-r border-white/8 bg-gray-900 lg:flex lg:flex-col lg:justify-between lg:p-14">
          <img src="/Logo-Vertical-White.svg" alt="Growth Labs" className="h-24 w-fit object-contain" />
          <div className="max-w-xl pb-10">
            <h1 className="text-title-md font-semibold tracking-tight text-white">O conhecimento da Growth, no seu fluxo de trabalho.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-gray-400">Converse com os modelos Growth, mantenha os seus contextos organizados e aceda às capacidades aprovadas para a sua conta.</p>
          </div>
          <p className="text-theme-xs text-gray-500">Growth Labs · Acesso protegido</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <img src="/Logo-Vertical-White.svg" alt="Growth Labs" className="mb-10 h-20 w-fit object-contain lg:hidden" />
            {isDemoEnabled ? <div className="mb-5"><Badge color="warning">Modo de demonstração local</Badge></div> : null}
            <h2 className="text-title-sm font-semibold text-white">Bem-vindo ao Growth AI</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Entre com uma conta Google previamente aprovada pela Growth Labs.</p>

            {userCode ? <div className="mt-6 rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3"><p className="text-sm font-semibold text-white">Login solicitado pelo Growth CLI</p><p className="mt-1 text-sm text-gray-400">Depois de entrar, confirme o código <strong className="font-mono text-brand-300">{userCode}</strong>.</p></div> : null}
            {notice || error ? <p role="alert" className={`mt-6 rounded-lg border px-4 py-3 text-sm ${notice?.kind === "success" ? "border-success-500/25 bg-success-500/10 text-success-400" : "border-error-500/25 bg-error-500/10 text-error-400"}`}>{notice?.message ?? error}</p> : null}

            <div className="mt-8">
              <Button variant="outline" className="w-full" disabled={!googleEnabled} onClick={loginWithGoogle}>
                <span aria-hidden className="grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-gray-900">G</span>
                Continuar com Google
              </Button>
              {!googleEnabled ? <p className="mt-3 text-center text-xs text-gray-500">O login Google não está configurado neste ambiente.</p> : null}
            </div>
            {isDemoEnabled ? <button type="button" onClick={loginDemo} className="mt-5 w-full text-center text-sm font-medium text-warning-400 hover:text-warning-300">Entrar na demonstração local</button> : null}
            <p className="mt-8 text-center text-theme-xs leading-5 text-gray-500">Não existe registo público. Se o seu email ainda não foi aprovado, contacte o administrador.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

