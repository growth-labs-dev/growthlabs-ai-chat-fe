import { useState, type FormEvent } from "react";
import { ArrowRight, GitBranch, LockKeyhole, Mail } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { isDemoEnabled } from "../../lib/api";
import { AuthShell } from "./AuthShell";
import { InputGroup, SocialButton } from "./AuthControls";
import { GoogleIcon } from "./GoogleIcon";
import { localizeAuthMessage, useAuth } from "./AuthProvider";
import { LanguageSelector, useLocale } from "../i18n/LocaleProvider";

export function LoginPage() {
  const { config, loginWithPassword, loginWithGoogle, loginDemo, error, notice } = useAuth();
  const { locale } = useLocale();
  const c = locale === "pt" ? {
    pageTitle: "Entrar | Growth AI", pageDescription: "Acesso seguro ao Growth AI", title: "Bem-vindo de volta", description: "Entre na sua conta para continuar conversas, projetos e contextos de trabalho.", secure: "Acesso seguro", account: "Entrar na sua conta", intro: "Use as credenciais associadas ao seu perfil Growth.", demo: "Modo de demonstração local", cliTitle: "Login solicitado pelo Growth CLI", cliText: "Depois de entrar, confirme o código", failed: "Não foi possível iniciar a sessão.", password: "Palavra-passe", passwordPlaceholder: "Introduza a sua palavra-passe", signing: "A entrar…", signIn: "Entrar", continue: "ou continue com", github: "GitHub indisponível", unavailable: "Nenhum método de autenticação está configurado neste ambiente.", demoLogin: "Entrar na demonstração local", noAccount: "Ainda não tem conta?", create: "Criar conta", contact: "Contacte o administrador.",
  } : {
    pageTitle: "Sign in | Growth AI", pageDescription: "Secure access to Growth AI", title: "Welcome back", description: "Sign in to continue your conversations, projects, and work contexts.", secure: "Secure access", account: "Sign in to your account", intro: "Use the credentials associated with your Growth profile.", demo: "Local demo mode", cliTitle: "Growth CLI requested sign-in", cliText: "After signing in, confirm code", failed: "Unable to sign in.", password: "Password", passwordPlaceholder: "Enter your password", signing: "Signing in…", signIn: "Sign in", continue: "or continue with", github: "GitHub unavailable", unavailable: "No authentication method is configured in this environment.", demoLogin: "Enter local demo", noAccount: "Don’t have an account?", create: "Create account", contact: "Contact your administrator.",
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const googleEnabled = config?.google.enabled === true;
  const passwordEnabled = config?.password.enabled === true;
  const registrationEnabled = config?.password.registration === true;
  const userCode = new URLSearchParams(window.location.search).get("user_code");

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordEnabled || submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await loginWithPassword(email, password);
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : c.failed);
    } finally {
      setPassword("");
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta title={c.pageTitle} description={c.pageDescription} />
      <AuthShell
        eyebrow="Growth AI"
        title={c.title}
        description={c.description}
      >
        <div className="mb-5 flex justify-end"><LanguageSelector /></div>
        <p className="text-theme-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{c.secure}</p>
        <h2 className="mt-3 text-title-sm font-semibold tracking-tight text-white">{c.account}</h2>
        <p className="mb-8 mt-2 text-sm leading-6 text-gray-400">{c.intro}</p>
        {isDemoEnabled ? <div className="mb-5"><Badge color="warning">{c.demo}</Badge></div> : null}
        {userCode ? <div className="mb-5 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3"><p className="text-sm font-semibold text-white">{c.cliTitle}</p><p className="mt-1 text-sm text-gray-400">{c.cliText} <strong className="font-mono text-gray-200">{userCode}</strong>.</p></div> : null}
        {notice || error || formError ? <p role="alert" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice?.kind === "success" ? "border-success-500/25 bg-success-500/10 text-success-400" : "border-error-500/25 bg-error-500/10 text-error-400"}`}>{localizeAuthMessage(notice?.message ?? formError ?? error ?? "", locale)}</p> : null}

        {passwordEnabled ? (
          <form onSubmit={submitPassword} className="space-y-5">
            <InputGroup id="login-email" label="Email" icon={Mail} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={locale === "pt" ? "nome@empresa.com" : "name@company.com"} autoComplete="username" required disabled={submitting} />
            <InputGroup id="login-password" label={c.password} icon={LockKeyhole} name="password" type="password" passwordToggle value={password} onChange={(event) => setPassword(event.target.value)} placeholder={c.passwordPlaceholder} autoComplete="current-password" required disabled={submitting} />
            <Button className="h-12 w-full" disabled={submitting || !email.trim() || !password}>
              {submitting ? c.signing : <><span>{c.signIn}</span><ArrowRight aria-hidden="true" className="size-4" /></>}
            </Button>
          </form>
        ) : null}

        <div className="my-6 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-gray-800" />
          <span className="text-theme-xs font-medium uppercase tracking-widest text-gray-500">{c.continue}</span>
          <span className="h-px flex-1 bg-gray-800" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SocialButton icon={<GoogleIcon />} disabled={!googleEnabled || submitting} onClick={loginWithGoogle}>Google</SocialButton>
          <SocialButton icon={<GitBranch aria-hidden="true" className="size-5" />} disabled>{c.github}</SocialButton>
        </div>
        {!passwordEnabled && !googleEnabled ? <p role="status" className="mt-5 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-center text-sm text-gray-400">{c.unavailable}</p> : null}
        {isDemoEnabled ? <button type="button" onClick={loginDemo} className="mt-5 w-full text-center text-sm font-medium text-warning-400 hover:text-warning-300">{c.demoLogin}</button> : null}

        <p className="mt-8 text-center text-sm text-gray-400">
          {c.noAccount}{" "}
          {registrationEnabled ? <a href="/register" className="font-semibold text-white underline decoration-gray-600 underline-offset-4 hover:decoration-white">{c.create}</a> : <span className="text-gray-500">{c.contact}</span>}
        </p>
      </AuthShell>
    </>
  );
}
