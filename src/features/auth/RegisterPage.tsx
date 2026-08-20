import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, GitBranch, LockKeyhole, Mail, UserRound } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { AuthShell } from "./AuthShell";
import { InputGroup, SocialButton, StepItem } from "./AuthControls";
import { GoogleIcon } from "./GoogleIcon";
import { useAuth } from "./AuthProvider";

const MINIMUM_PASSWORD_LENGTH = 12;

export function RegisterPage() {
  const { config, registerWithPassword, loginWithGoogle } = useAuth();
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
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar o pedido de conta.");
    } finally {
      setPassword("");
      setConfirmation("");
      setSubmitting(false);
    }
  };

  const steps = (
    <div className="grid grid-cols-3 gap-3" aria-label="Etapas de criação da conta">
      <StepItem number={1} label="Dados" active={!submitted} />
      <StepItem number={2} label="Validação" complete={submitted} />
      <StepItem number={3} label="Aprovação" active={submitted} />
    </div>
  );

  return (
    <>
      <PageMeta title="Criar conta | Growth AI" description="Pedido de acesso ao Growth AI" />
      <AuthShell eyebrow="Acesso Growth" title="Crie a sua conta" description="Envie os seus dados. Todas as novas contas passam por aprovação antes do primeiro acesso." steps={steps}>
        <p className="text-theme-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Pedido de acesso</p>
        <h2 className="mt-3 text-title-sm font-semibold tracking-tight text-white">Dados da conta</h2>
        <p className="mb-8 mt-2 text-sm leading-6 text-gray-400">Preencha os dados abaixo para iniciar a validação.</p>
        {submitted ? (
          <div role="status" className="rounded-2xl border border-success-500/25 bg-success-500/10 p-6">
            <CheckCircle2 aria-hidden="true" className="size-8 text-success-400" />
            <h2 className="mt-4 text-lg font-semibold text-white">Pedido recebido</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">A sua conta está pendente e aguarda aprovação do administrador. O acesso só será possível depois dessa validação.</p>
            <a href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-gray-600 underline-offset-4 hover:decoration-white">Voltar ao login <ArrowRight aria-hidden="true" className="size-4" /></a>
          </div>
        ) : (
          <>
            {error ? <p role="alert" className="mb-5 rounded-xl border border-error-500/25 bg-error-500/10 px-4 py-3 text-sm text-error-400">{error}</p> : null}
            {registrationEnabled ? (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputGroup id="register-first-name" label="Nome" icon={UserRound} name="first_name" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required disabled={submitting} />
                  <InputGroup id="register-last-name" label="Apelido" icon={UserRound} name="last_name" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required disabled={submitting} />
                </div>
                <InputGroup id="register-email" label="Email profissional" icon={Mail} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@empresa.com" autoComplete="email" required disabled={submitting} />
                <InputGroup id="register-password" label="Palavra-passe" icon={LockKeyhole} name="password" type="password" passwordToggle value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={MINIMUM_PASSWORD_LENGTH} required disabled={submitting} invalid={passwordTooShort} hint={`Mínimo de ${MINIMUM_PASSWORD_LENGTH} caracteres.`} />
                <InputGroup id="register-confirmation" label="Confirmar palavra-passe" icon={LockKeyhole} name="password_confirmation" type="password" passwordToggle value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={MINIMUM_PASSWORD_LENGTH} required disabled={submitting} invalid={confirmationMismatch} hint={confirmationMismatch ? "As palavras-passe não coincidem." : undefined} />
                <Button className="h-12 w-full" disabled={!formReady || submitting}>{submitting ? "A enviar…" : <><span>Pedir acesso</span><ArrowRight aria-hidden="true" className="size-4" /></>}</Button>
              </form>
            ) : <p role="status" className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-4 text-sm leading-6 text-gray-400">O registo de novas contas não está disponível neste ambiente.</p>}

            <div className="my-6 flex items-center gap-4" aria-hidden="true"><span className="h-px flex-1 bg-gray-800" /><span className="text-theme-xs font-medium uppercase tracking-widest text-gray-500">ou continue com</span><span className="h-px flex-1 bg-gray-800" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SocialButton icon={<GoogleIcon />} disabled={!googleEnabled || submitting} onClick={loginWithGoogle}>Google</SocialButton>
              <SocialButton icon={<GitBranch aria-hidden="true" className="size-5" />} disabled>GitHub indisponível</SocialButton>
            </div>
            <p className="mt-8 text-center text-sm text-gray-400">Já tem conta? <a href="/login" className="font-semibold text-white underline decoration-gray-600 underline-offset-4 hover:decoration-white">Entrar</a></p>
          </>
        )}
      </AuthShell>
    </>
  );
}
