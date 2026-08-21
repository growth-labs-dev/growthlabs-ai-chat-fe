import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, GitBranch, LockKeyhole, Mail, UserRound } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { AuthShell } from "./AuthShell";
import { InputGroup, SocialButton, StepItem } from "./AuthControls";
import { GoogleIcon } from "./GoogleIcon";
import { localizeAuthMessage, useAuth } from "./AuthProvider";
import { LanguageSelector, useLocale } from "../i18n/LocaleProvider";

const MINIMUM_PASSWORD_LENGTH = 12;

export function RegisterPage() {
  const { config, registerWithPassword, loginWithGoogle } = useAuth();
  const { locale } = useLocale();
  const c = locale === "pt" ? {
    pageTitle: "Criar conta | Growth AI", pageDescription: "Pedido de acesso ao Growth AI", eyebrow: "Acesso Growth", title: "Crie a sua conta", description: "Envie os seus dados. Todas as novas contas passam por aprovação antes do primeiro acesso.", request: "Pedido de acesso", details: "Dados da conta", intro: "Preencha os dados abaixo para iniciar a validação.", received: "Pedido recebido", pending: "A sua conta está pendente e aguarda aprovação do administrador. O acesso só será possível depois dessa validação.", back: "Voltar ao login", first: "Nome", last: "Apelido", workEmail: "Email profissional", password: "Palavra-passe", confirm: "Confirmar palavra-passe", minimum: `Mínimo de ${MINIMUM_PASSWORD_LENGTH} caracteres.`, mismatch: "As palavras-passe não coincidem.", sending: "A enviar…", submit: "Pedir acesso", unavailable: "O registo de novas contas não está disponível neste ambiente.", continue: "ou continue com", github: "GitHub indisponível", existing: "Já tem conta?", signIn: "Entrar", failed: "Não foi possível enviar o pedido de conta.", steps: "Etapas de criação da conta", data: "Dados", validation: "Validação", approval: "Aprovação",
  } : {
    pageTitle: "Create account | Growth AI", pageDescription: "Request access to Growth AI", eyebrow: "Growth access", title: "Create your account", description: "Submit your details. Every new account requires approval before first access.", request: "Access request", details: "Account details", intro: "Complete the details below to begin validation.", received: "Request received", pending: "Your account is pending administrator approval. Access will only be available after validation.", back: "Back to sign in", first: "First name", last: "Last name", workEmail: "Work email", password: "Password", confirm: "Confirm password", minimum: `At least ${MINIMUM_PASSWORD_LENGTH} characters.`, mismatch: "Passwords do not match.", sending: "Submitting…", submit: "Request access", unavailable: "New account registration is not available in this environment.", continue: "or continue with", github: "GitHub unavailable", existing: "Already have an account?", signIn: "Sign in", failed: "Unable to submit the account request.", steps: "Account creation steps", data: "Details", validation: "Validation", approval: "Approval",
  };
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const registrationEnabled = config?.password.registration === true;
  const googleEnabled = config?.google.enabled === true;
  const passwordTooShort = password.length > 0 && password.length < MINIMUM_PASSWORD_LENGTH;
  const confirmationMismatch = confirmation.length > 0 && password !== confirmation;
  const formReady = useMemo(
    () => Boolean(firstName.trim() && lastName.trim() && email.trim() && password.length >= MINIMUM_PASSWORD_LENGTH && password === confirmation),
    [confirmation, email, firstName, lastName, password],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!registrationEnabled || !formReady || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerWithPassword({ firstName, lastName, email, password });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmation("");
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : c.failed);
    } finally {
      setPassword("");
      setConfirmation("");
      setSubmitting(false);
    }
  };

  const steps = (
    <div className="grid grid-cols-3 gap-3" aria-label={c.steps}>
      <StepItem number={1} label={c.data} active={!submitted} />
      <StepItem number={2} label={c.validation} complete={submitted} />
      <StepItem number={3} label={c.approval} active={submitted} />
    </div>
  );

  return (
    <>
      <PageMeta title={c.pageTitle} description={c.pageDescription} />
      <AuthShell eyebrow={c.eyebrow} title={c.title} description={c.description} steps={steps}>
        <div className="mb-5 flex justify-end"><LanguageSelector /></div>
        <p className="text-theme-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{c.request}</p>
        <h2 className="mt-3 text-title-sm font-semibold tracking-tight text-white">{c.details}</h2>
        <p className="mb-8 mt-2 text-sm leading-6 text-gray-400">{c.intro}</p>
        {submitted ? (
          <div role="status" className="rounded-2xl border border-success-500/25 bg-success-500/10 p-6">
            <CheckCircle2 aria-hidden="true" className="size-8 text-success-400" />
            <h2 className="mt-4 text-lg font-semibold text-white">{c.received}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">{c.pending}</p>
            <a href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-gray-600 underline-offset-4 hover:decoration-white">{c.back} <ArrowRight aria-hidden="true" className="size-4" /></a>
          </div>
        ) : (
          <>
            {error ? <p role="alert" className="mb-5 rounded-xl border border-error-500/25 bg-error-500/10 px-4 py-3 text-sm text-error-400">{localizeAuthMessage(error, locale)}</p> : null}
            {registrationEnabled ? (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputGroup id="register-first-name" label={c.first} icon={UserRound} name="first_name" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required disabled={submitting} />
                  <InputGroup id="register-last-name" label={c.last} icon={UserRound} name="last_name" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required disabled={submitting} />
                </div>
                <InputGroup id="register-email" label={c.workEmail} icon={Mail} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" required disabled={submitting} />
                <InputGroup id="register-password" label={c.password} icon={LockKeyhole} name="password" type="password" passwordToggle value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={MINIMUM_PASSWORD_LENGTH} required disabled={submitting} invalid={passwordTooShort} hint={c.minimum} />
                <InputGroup id="register-confirmation" label={c.confirm} icon={LockKeyhole} name="password_confirmation" type="password" passwordToggle value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={MINIMUM_PASSWORD_LENGTH} required disabled={submitting} invalid={confirmationMismatch} hint={confirmationMismatch ? c.mismatch : undefined} />
                <Button className="h-12 w-full" disabled={!formReady || submitting}>{submitting ? c.sending : <><span>{c.submit}</span><ArrowRight aria-hidden="true" className="size-4" /></>}</Button>
              </form>
            ) : <p role="status" className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-4 text-sm leading-6 text-gray-400">{c.unavailable}</p>}

            <div className="my-6 flex items-center gap-4" aria-hidden="true"><span className="h-px flex-1 bg-gray-800" /><span className="text-theme-xs font-medium uppercase tracking-widest text-gray-500">{c.continue}</span><span className="h-px flex-1 bg-gray-800" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SocialButton icon={<GoogleIcon />} disabled={!googleEnabled || submitting} onClick={loginWithGoogle}>Google</SocialButton>
              <SocialButton icon={<GitBranch aria-hidden="true" className="size-5" />} disabled>{c.github}</SocialButton>
            </div>
            <p className="mt-8 text-center text-sm text-gray-400">{c.existing} <a href="/login" className="font-semibold text-white underline decoration-gray-600 underline-offset-4 hover:decoration-white">{c.signIn}</a></p>
          </>
        )}
      </AuthShell>
    </>
  );
}
