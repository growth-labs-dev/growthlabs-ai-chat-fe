import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Switch from "../../components/form/switch/Switch";
import { apiRequest } from "../../lib/api";
import type { AuthUser } from "../auth/types";
import type { CapabilityStatus } from "../chat/types";
import { useLocale, type Locale } from "../i18n/LocaleProvider";
import { Boxes, Link2, Plug, Settings, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { resourceBrands as connectionDirectory, type BrandIcon } from "./brandIcons";

type ResourceTab = "skills" | "plugins" | "connections" | "personalities" | "profile" | "settings";

interface ResourceItem {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  connected?: boolean;
  status?: string;
}

interface ResourceResponse {
  items: ResourceItem[];
  capability?: CapabilityStatus & { mutable?: boolean };
}

const tabs: Array<{ id: ResourceTab; icon: LucideIcon }> = [
  { id: "skills", icon: Boxes },
  { id: "plugins", icon: Plug },
  { id: "connections", icon: Link2 },
  { id: "personalities", icon: Sparkles },
  { id: "profile", icon: UserRound },
  { id: "settings", icon: Settings },
];

const tabLabels: Record<Locale, Record<ResourceTab, string>> = {
  en: { skills: "Skills", plugins: "Plugins", connections: "Connections", personalities: "Personalities", profile: "Profile", settings: "Settings" },
  pt: { skills: "Skills", plugins: "Plugins", connections: "Conexões", personalities: "Personalidades", profile: "Perfil", settings: "Configurações" },
};

const unavailableCopy: Record<Locale, Partial<Record<ResourceTab, string>>> = {
  en: {
    skills: "The runtime Skills catalogue is not configured on the server yet.",
    plugins: "The runtime Plugins catalogue is not configured on the server yet.",
    connections: "The connection manager and OAuth broker are not configured on the server yet.",
  },
  pt: {
    skills: "O catálogo de Skills do runtime ainda não está configurado no servidor.",
    plugins: "O catálogo de Plugins do runtime ainda não está configurado no servidor.",
    connections: "O gestor de conexões e o broker OAuth ainda não estão configurados no servidor.",
  },
};

function BrandMark({ icon }: { icon: BrandIcon }) {
  return (
    <span className="grid size-10 place-items-center rounded-xl bg-white shadow-sm" title={icon.title}>
      <svg role="img" aria-label={icon.title} viewBox="0 0 24 24" className="size-5" fill={`#${icon.hex}`}><path d={icon.path} /></svg>
    </span>
  );
}

const demoResources: Record<Locale, Record<Exclude<ResourceTab, "profile" | "settings">, ResourceItem[]>> = {
  en: {
    skills: [{ id: "demo-skill", name: "Demo skill", description: "Local example; it does not represent an active capability.", enabled: false }],
    plugins: [{ id: "demo-plugin", name: "Demo plugin", description: "Local example; real installation depends on an administrator.", enabled: false }],
    connections: [{ id: "demo-connection", name: "Demo connection", description: "OAuth and credentials are not used in local demo mode.", connected: false }],
    personalities: [{ id: "default", name: "Growth default", description: "A balance of clarity, precision, and execution.", enabled: true }],
  },
  pt: {
    skills: [{ id: "demo-skill", name: "Skill de demonstração", description: "Exemplo local; não representa uma capacidade ativa.", enabled: false }],
    plugins: [{ id: "demo-plugin", name: "Plugin de demonstração", description: "Exemplo local; a instalação real depende do administrador.", enabled: false }],
    connections: [{ id: "demo-connection", name: "Ligação de demonstração", description: "OAuth e credenciais não são exercitados no modo local.", connected: false }],
    personalities: [{ id: "default", name: "Growth padrão", description: "Equilíbrio entre clareza, precisão e execução.", enabled: true }],
  },
};

interface ResourceCenterProps {
  open: boolean;
  onClose: () => void;
  user: AuthUser;
  demo: boolean;
  browserTools?: CapabilityStatus;
}

function ResourceList({ tab, items, demo, capability, onUpdate }: { tab: Exclude<ResourceTab, "profile" | "settings">; items: ResourceItem[]; demo: boolean; capability?: ResourceResponse["capability"]; onUpdate: (item: ResourceItem) => void }) {
  const { locale } = useLocale();
  const copy = locale === "pt" ? {
    unsafeOAuth: "O servidor devolveu um destino OAuth inseguro.",
    servicesLabel: "Serviços suportados pelo catálogo de conexões",
    empty: "Nenhum recurso configurado para esta conta.",
    connectionsEmpty: "GitHub, Google Drive, Notion, Jira e n8n são identificados pelo catálogo; uma ligação só aparece ativa depois da configuração segura no servidor.",
    catalogueEmpty: "O catálogo é gerido pelo servidor e não contém itens disponíveis neste ambiente.",
    unavailable: "Indisponível",
    connected: "Ligada",
    active: "Ativa",
    inactive: "Inativa",
    noDescription: "Sem descrição disponível.",
    disconnect: "Desligar",
    disable: "Desativar",
    connect: "Ligar",
    enable: "Ativar",
  } : {
    unsafeOAuth: "The server returned an insecure OAuth destination.",
    servicesLabel: "Services supported by the connections catalogue",
    empty: "No resources are configured for this account.",
    connectionsEmpty: "GitHub, Google Drive, Notion, Jira, and n8n are identified by the catalogue; a connection only appears active after secure server-side configuration.",
    catalogueEmpty: "The catalogue is managed by the server and has no items available in this environment.",
    unavailable: "Unavailable",
    connected: "Connected",
    active: "Active",
    inactive: "Inactive",
    noDescription: "No description available.",
    disconnect: "Disconnect",
    disable: "Disable",
    connect: "Connect",
    enable: "Enable",
  };
  const toggle = async (item: ResourceItem) => {
    if (demo) return;
    if (tab === "connections") {
      if (item.connected) {
        const updated = await apiRequest<ResourceItem>(`/connections/${encodeURIComponent(item.id)}/disconnect`, { method: "POST" });
        onUpdate(updated);
      } else {
        const result = await apiRequest<{ authorizeUrl: string }>(`/connections/${encodeURIComponent(item.id)}/authorize`, { method: "POST" });
        const authorizeUrl = new URL(result.authorizeUrl, window.location.origin);
        const safeDevelopmentUrl = import.meta.env.DEV && authorizeUrl.origin === window.location.origin;
        if (authorizeUrl.protocol !== "https:" && !safeDevelopmentUrl) {
          throw new Error(copy.unsafeOAuth);
        }
        window.location.assign(authorizeUrl);
      }
      return;
    }
    const updated = await apiRequest<ResourceItem>(`/${tab}/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    onUpdate(updated);
  };

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-700 px-6 py-10 text-center">
        {tab === "connections" ? (
          <div className="mb-6 flex flex-wrap justify-center gap-3" aria-label={copy.servicesLabel}>
            {connectionDirectory.map((icon) => <BrandMark key={icon.slug} icon={icon} />)}
          </div>
        ) : null}
        <p className="text-sm font-medium text-gray-300">{copy.empty}</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
          {capability?.available === false ? unavailableCopy[locale][tab] : (tab === "connections" ? copy.connectionsEmpty : copy.catalogueEmpty)}
        </p>
        <div className="mt-4"><Badge size="sm" color="light">{copy.unavailable}</Badge></div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800 overflow-hidden rounded-2xl border border-gray-800">
      {items.map((item) => {
        const active = tab === "connections" ? item.connected : item.enabled;
        return (
          <div key={item.id} className="flex items-start gap-4 bg-gray-950/40 px-4 py-4 sm:px-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-sm font-semibold text-brand-400">{item.name.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-white">{item.name}</h3><Badge size="sm" color={active ? "success" : "light"}>{active ? (tab === "connections" ? copy.connected : copy.active) : copy.inactive}</Badge></div>
              <p className="mt-1 text-sm leading-5 text-gray-500">{item.description ?? copy.noDescription}</p>
            </div>
            <Button size="sm" variant="outline" disabled={demo} onClick={() => void toggle(item)}>{active ? (tab === "connections" ? copy.disconnect : copy.disable) : (tab === "connections" ? copy.connect : copy.enable)}</Button>
          </div>
        );
      })}
    </div>
  );
}

function ProfilePanel({ user, demo }: { user: AuthUser; demo: boolean }) {
  const { locale } = useLocale();
  const copy = locale === "pt" ? {
    name: "Nome", role: "Função", rolePlaceholder: "Ex.: Engenharia de software", context: "Contexto de trabalho",
    contextPlaceholder: "Preferências, tecnologias e contexto que a IA deve considerar.", save: "Guardar alterações", saved: "Perfil atualizado.",
  } : {
    name: "Name", role: "Role", rolePlaceholder: "E.g. Software engineering", context: "Work context",
    contextPlaceholder: "Preferences, technologies, and context the AI should consider.", save: "Save changes", saved: "Profile updated.",
  };
  const [name, setName] = useState(user.displayName);
  const [jobTitle, setJobTitle] = useState("");
  const [workspaceContext, setWorkspaceContext] = useState("");
  const [saved, setSaved] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!demo) await apiRequest("/profile", { method: "PATCH", body: JSON.stringify({ name, job_title: jobTitle, workspace_context: workspaceContext }) });
    setSaved(true);
  };
  return (
    <div className="max-w-xl space-y-9">
      <form onSubmit={submit} className="space-y-5">
        <div><Label htmlFor="profile-name">{copy.name}</Label><Input id="profile-name" value={name} onChange={(event) => { setSaved(false); setName(event.target.value); }} /></div>
        <div><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" value={user.email} disabled /></div>
        <div><Label htmlFor="profile-role">{copy.role}</Label><Input id="profile-role" value={jobTitle} placeholder={copy.rolePlaceholder} onChange={(event) => { setSaved(false); setJobTitle(event.target.value); }} /></div>
        <div><Label htmlFor="profile-context">{copy.context}</Label><textarea id="profile-context" value={workspaceContext} onChange={(event) => { setSaved(false); setWorkspaceContext(event.target.value); }} rows={5} placeholder={copy.contextPlaceholder} className="w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-500 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10" /></div>
        <div className="flex items-center gap-3"><Button disabled={demo}>{copy.save}</Button>{saved ? <span className="text-sm text-success-500">{copy.saved}</span> : null}</div>
      </form>
      <PasswordChangePanel demo={demo} />
    </div>
  );
}

function PasswordChangePanel({ demo }: { demo: boolean }) {
  const { locale } = useLocale();
  const copy = locale === "pt" ? {
    success: "Palavra-passe atualizada com sucesso.", failure: "Não foi possível alterar a palavra-passe.", security: "Segurança",
    description: "Altere a palavra-passe temporária ou atual da sua conta.", current: "Palavra-passe atual", next: "Nova palavra-passe",
    confirm: "Confirmar nova palavra-passe", minimum: "Mínimo de 12 caracteres.", mismatch: "As palavras-passe não coincidem.",
    submitting: "A alterar…", submit: "Alterar palavra-passe",
  } : {
    success: "Password updated successfully.", failure: "The password could not be changed.", security: "Security",
    description: "Change the temporary or current password for your account.", current: "Current password", next: "New password",
    confirm: "Confirm new password", minimum: "At least 12 characters.", mismatch: "Passwords do not match.",
    submitting: "Changing…", submit: "Change password",
  };
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const valid = currentPassword.length > 0 && newPassword.length >= 12 && newPassword === confirmation;

  const clearFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (demo || !valid || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest("/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setFeedback({ kind: "success", message: copy.success });
    } catch (requestError) {
      setFeedback({ kind: "error", message: requestError instanceof Error ? requestError.message : copy.failure });
    } finally {
      clearFields();
      setSubmitting(false);
    }
  };

  return (
    <section className="border-t border-gray-800 pt-8" aria-labelledby="profile-security-heading">
      <h4 id="profile-security-heading" className="text-base font-semibold text-white">{copy.security}</h4>
      <p className="mt-1 text-sm leading-5 text-gray-500">{copy.description}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div><Label htmlFor="current-password">{copy.current}</Label><Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required disabled={demo || submitting} /></div>
        <div><Label htmlFor="new-password">{copy.next}</Label><Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required disabled={demo || submitting} hint={copy.minimum} error={newPassword.length > 0 && newPassword.length < 12} /></div>
        <div><Label htmlFor="confirm-new-password">{copy.confirm}</Label><Input id="confirm-new-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required disabled={demo || submitting} hint={confirmation.length > 0 && confirmation !== newPassword ? copy.mismatch : undefined} error={confirmation.length > 0 && confirmation !== newPassword} /></div>
        <div className="flex flex-wrap items-center gap-3"><Button disabled={demo || submitting || !valid}>{submitting ? copy.submitting : copy.submit}</Button>{feedback ? <span role="status" className={`text-sm ${feedback.kind === "success" ? "text-success-400" : "text-error-400"}`}>{feedback.message}</span> : null}</div>
      </form>
    </section>
  );
}

function PersonalitiesPanel({ items, demo, onCreated, onUpdate }: { items: ResourceItem[]; demo: boolean; onCreated: (item: ResourceItem) => void; onUpdate: (item: ResourceItem) => void }) {
  const { locale } = useLocale();
  const copy = locale === "pt" ? {
    description: "Defina como o Growth AI comunica e executa tarefas.", cancel: "Cancelar", create: "Nova personalidade", name: "Nome",
    namePlaceholder: "Ex.: Arquiteto pragmático", instructions: "Instruções", instructionsPlaceholder: "Tom, prioridades e forma de trabalho…", save: "Guardar personalidade",
  } : {
    description: "Define how Growth AI communicates and carries out tasks.", cancel: "Cancel", create: "New personality", name: "Name",
    namePlaceholder: "E.g. Pragmatic architect", instructions: "Instructions", instructionsPlaceholder: "Tone, priorities, and way of working…", save: "Save personality",
  };
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (demo || !name.trim() || !instructions.trim()) return;
    const created = await apiRequest<ResourceItem>("/personalities", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), instructions: instructions.trim() }),
    });
    onCreated(created);
    setName("");
    setInstructions("");
    setCreating(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4"><p className="text-sm text-gray-500">{copy.description}</p><Button size="sm" disabled={demo} onClick={() => setCreating((current) => !current)}>{creating ? copy.cancel : copy.create}</Button></div>
      {creating ? (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950/40 p-5">
          <div><Label htmlFor="personality-name">{copy.name}</Label><Input id="personality-name" value={name} placeholder={copy.namePlaceholder} onChange={(event) => setName(event.target.value)} /></div>
          <div><Label htmlFor="personality-instructions">{copy.instructions}</Label><textarea id="personality-instructions" rows={5} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={copy.instructionsPlaceholder} className="w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-500 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10" /></div>
          <Button disabled={!name.trim() || !instructions.trim()}>{copy.save}</Button>
        </form>
      ) : null}
      <ResourceList tab="personalities" items={items} demo={demo} onUpdate={onUpdate} />
    </div>
  );
}

function SettingsPanel({ demo, browserTools }: { demo: boolean; browserTools?: CapabilityStatus }) {
  const { locale } = useLocale();
  const copy = locale === "pt" ? {
    memory: "Memória Growth",
    memoryDescription: "O G-Brain é aplicado pelo servidor através da identidade assinada da sessão. O browser não escolhe fontes de memória; G-Cortex é a respetiva camada de visualização.",
    internet: "Acesso à internet", internetAvailable: "Utiliza ferramentas aprovadas e sujeitas a permissões.",
    internetUnavailable: "Indisponível neste ambiente — runtime de browser não configurado.", compact: "Interface compacta",
    compactDescription: "Reduz o espaçamento da lista de conversas.",
  } : {
    memory: "Growth memory",
    memoryDescription: "G-Brain is applied by the server through the session's signed identity. The browser does not choose memory sources; G-Cortex is its visualisation layer.",
    internet: "Internet access", internetAvailable: "Uses approved tools subject to permissions.",
    internetUnavailable: "Unavailable in this environment — browser runtime is not configured.", compact: "Compact interface",
    compactDescription: "Reduces spacing in the conversation list.",
  };
  const browserAvailable = browserTools?.available === true;
  const [internet, setInternet] = useState(false);
  const [compact, setCompact] = useState(false);
  const update = (key: string, value: boolean) => {
    if (!demo) void apiRequest("/profile/preferences", { method: "PATCH", body: JSON.stringify({ [key]: value }) });
  };
  return (
    <div className="max-w-xl divide-y divide-gray-800 rounded-2xl border border-gray-800 px-5">
      <div className="py-5"><h3 className="text-sm font-semibold text-white">{copy.memory}</h3><p className="mt-1 text-sm leading-5 text-gray-500">{copy.memoryDescription}</p></div>
      <div className="flex items-start justify-between gap-5 py-5"><div><h3 className="text-sm font-semibold text-white">{copy.internet}</h3><p className="mt-1 text-sm leading-5 text-gray-500">{browserAvailable ? copy.internetAvailable : copy.internetUnavailable}</p></div><Switch label="" ariaLabel={copy.internet} defaultChecked={internet} disabled={demo || !browserAvailable} onChange={(value) => { setInternet(value); update("internet_enabled", value); }} /></div>
      <div className="flex items-start justify-between gap-5 py-5"><div><h3 className="text-sm font-semibold text-white">{copy.compact}</h3><p className="mt-1 text-sm leading-5 text-gray-500">{copy.compactDescription}</p></div><Switch label="" ariaLabel={copy.compact} defaultChecked={compact} disabled={demo} onChange={(value) => { setCompact(value); update("compact_ui", value); }} /></div>
    </div>
  );
}

export function ResourceCenter({ open, onClose, user, demo, browserTools }: ResourceCenterProps) {
  const { locale } = useLocale();
  const copy = locale === "pt" ? {
    loadFailure: "Não foi possível carregar os recursos.", title: "Recursos Growth",
    description: "Capacidades e preferências disponíveis para a sua conta.", navigation: "Áreas de recursos",
    demo: "Dados de demonstração — sem alterações no servidor.",
  } : {
    loadFailure: "Resources could not be loaded.", title: "Growth resources",
    description: "Capabilities and preferences available for your account.", navigation: "Resource areas",
    demo: "Demo data — no server-side changes.",
  };
  const [tab, setTab] = useState<ResourceTab>("skills");
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capability, setCapability] = useState<ResourceResponse["capability"]>();

  useEffect(() => {
    if (!open || tab === "profile" || tab === "settings") return;
    let active = true;
    setLoading(true);
    setError(null);
    setCapability(undefined);
    if (demo) {
      setItems(demoResources[locale][tab]);
      setLoading(false);
      return;
    }
    apiRequest<ResourceResponse>(`/${tab}`)
      .then((response) => { if (active) { setItems(response.items); setCapability(response.capability); } })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : copy.loadFailure); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [copy.loadFailure, demo, locale, open, tab]);

  return (
    <Modal isOpen={open} onClose={onClose} className="mx-3 max-h-[90vh] max-w-5xl overflow-hidden border border-gray-800 !bg-gray-900 sm:mx-6">
      <div className="border-b border-gray-800 px-5 pb-5 pt-6 sm:px-7">
        <h2 className="text-theme-xl font-semibold text-white">{copy.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{copy.description}</p>
      </div>
      <div className="grid max-h-[calc(90vh-105px)] md:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-800 p-3 md:flex-col md:border-b-0 md:border-r" aria-label={copy.navigation}>
          {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${tab === item.id ? "bg-white/[0.08] text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}><item.icon className="size-4" strokeWidth={1.7} />{tabLabels[locale][item.id]}</button>)}
        </nav>
        <section className="min-h-[440px] overflow-y-auto p-5 sm:p-7">
          <div className="mb-6"><h3 className="text-lg font-semibold text-white">{tabLabels[locale][tab]}</h3>{demo ? <p className="mt-1 text-xs text-warning-400">{copy.demo}</p> : null}</div>
          {tab === "profile" ? <ProfilePanel user={user} demo={demo} /> : tab === "settings" ? <SettingsPanel demo={demo} browserTools={browserTools} /> : loading ? <div className="grid min-h-48 place-items-center"><span className="size-7 animate-spin rounded-full border-2 border-gray-700 border-t-white" /></div> : error ? <p role="alert" className="rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm text-error-400">{error}</p> : tab === "personalities" ? <PersonalitiesPanel items={items} demo={demo} onCreated={(created) => setItems((current) => [...current, created])} onUpdate={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))} /> : <ResourceList tab={tab} items={items} demo={demo} capability={capability} onUpdate={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))} />}
        </section>
      </div>
    </Modal>
  );
}
