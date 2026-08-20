import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Switch from "../../components/form/switch/Switch";
import { apiRequest } from "../../lib/api";
import type { AuthUser } from "../auth/types";

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
}

const tabs: Array<{ id: ResourceTab; label: string }> = [
  { id: "skills", label: "Skills" },
  { id: "plugins", label: "Plugins" },
  { id: "connections", label: "Conexões" },
  { id: "personalities", label: "Personalidades" },
  { id: "profile", label: "Perfil" },
  { id: "settings", label: "Configurações" },
];

const demoResources: Record<Exclude<ResourceTab, "profile" | "settings">, ResourceItem[]> = {
  skills: [{ id: "demo-skill", name: "Skill de demonstração", description: "Exemplo local; não representa uma capacidade ativa.", enabled: false }],
  plugins: [{ id: "demo-plugin", name: "Plugin de demonstração", description: "Exemplo local; a instalação real depende do administrador.", enabled: false }],
  connections: [{ id: "demo-connection", name: "Ligação de demonstração", description: "OAuth e credenciais não são exercitados no modo local.", connected: false }],
  personalities: [{ id: "default", name: "Growth padrão", description: "Equilíbrio entre clareza, precisão e execução.", enabled: true }],
};

interface ResourceCenterProps {
  open: boolean;
  onClose: () => void;
  user: AuthUser;
  demo: boolean;
}

function ResourceList({ tab, items, demo, onUpdate }: { tab: Exclude<ResourceTab, "profile" | "settings">; items: ResourceItem[]; demo: boolean; onUpdate: (item: ResourceItem) => void }) {
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
          throw new Error("O servidor devolveu um destino OAuth inseguro.");
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
    return <div className="rounded-2xl border border-dashed border-gray-700 px-6 py-12 text-center text-sm text-gray-500">Ainda não existem recursos disponíveis para esta conta.</div>;
  }

  return (
    <div className="divide-y divide-gray-800 overflow-hidden rounded-2xl border border-gray-800">
      {items.map((item) => {
        const active = tab === "connections" ? item.connected : item.enabled;
        return (
          <div key={item.id} className="flex items-start gap-4 bg-gray-950/40 px-4 py-4 sm:px-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-sm font-semibold text-brand-400">{item.name.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-white">{item.name}</h3><Badge size="sm" color={active ? "success" : "light"}>{active ? (tab === "connections" ? "Ligada" : "Ativa") : "Inativa"}</Badge></div>
              <p className="mt-1 text-sm leading-5 text-gray-500">{item.description ?? "Sem descrição disponível."}</p>
            </div>
            <Button size="sm" variant="outline" disabled={demo} onClick={() => void toggle(item)}>{active ? (tab === "connections" ? "Desligar" : "Desativar") : (tab === "connections" ? "Ligar" : "Ativar")}</Button>
          </div>
        );
      })}
    </div>
  );
}

function ProfilePanel({ user, demo }: { user: AuthUser; demo: boolean }) {
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
    <form onSubmit={submit} className="max-w-xl space-y-5">
      <div><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" value={name} onChange={(event) => { setSaved(false); setName(event.target.value); }} /></div>
      <div><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" value={user.email} disabled /></div>
      <div><Label htmlFor="profile-role">Função</Label><Input id="profile-role" value={jobTitle} placeholder="Ex.: Engenharia de software" onChange={(event) => { setSaved(false); setJobTitle(event.target.value); }} /></div>
      <div><Label htmlFor="profile-context">Contexto de trabalho</Label><textarea id="profile-context" value={workspaceContext} onChange={(event) => { setSaved(false); setWorkspaceContext(event.target.value); }} rows={5} placeholder="Preferências, tecnologias e contexto que a IA deve considerar." className="w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-500 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10" /></div>
      <div className="flex items-center gap-3"><Button disabled={demo}>Guardar alterações</Button>{saved ? <span className="text-sm text-success-500">Perfil atualizado.</span> : null}</div>
    </form>
  );
}

function PersonalitiesPanel({ items, demo, onCreated, onUpdate }: { items: ResourceItem[]; demo: boolean; onCreated: (item: ResourceItem) => void; onUpdate: (item: ResourceItem) => void }) {
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
      <div className="flex items-center justify-between gap-4"><p className="text-sm text-gray-500">Defina como o Growth AI comunica e executa tarefas.</p><Button size="sm" disabled={demo} onClick={() => setCreating((current) => !current)}>{creating ? "Cancelar" : "Nova personalidade"}</Button></div>
      {creating ? (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950/40 p-5">
          <div><Label htmlFor="personality-name">Nome</Label><Input id="personality-name" value={name} placeholder="Ex.: Arquiteto pragmático" onChange={(event) => setName(event.target.value)} /></div>
          <div><Label htmlFor="personality-instructions">Instruções</Label><textarea id="personality-instructions" rows={5} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Tom, prioridades e forma de trabalho…" className="w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-500 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10" /></div>
          <Button disabled={!name.trim() || !instructions.trim()}>Guardar personalidade</Button>
        </form>
      ) : null}
      <ResourceList tab="personalities" items={items} demo={demo} onUpdate={onUpdate} />
    </div>
  );
}

function SettingsPanel({ demo }: { demo: boolean }) {
  const [internet, setInternet] = useState(true);
  const [compact, setCompact] = useState(false);
  const update = (key: string, value: boolean) => {
    if (!demo) void apiRequest("/profile/preferences", { method: "PATCH", body: JSON.stringify({ [key]: value }) });
  };
  return (
    <div className="max-w-xl divide-y divide-gray-800 rounded-2xl border border-gray-800 px-5">
      <div className="py-5"><h3 className="text-sm font-semibold text-white">Memória Growth</h3><p className="mt-1 text-sm leading-5 text-gray-500">O G-Brain é aplicado pelo servidor através da identidade assinada da sessão. O browser não escolhe fontes de memória; G-Cortex é a respetiva camada de visualização.</p></div>
      <div className="flex items-start justify-between gap-5 py-5"><div><h3 className="text-sm font-semibold text-white">Acesso à internet</h3><p className="mt-1 text-sm leading-5 text-gray-500">Utiliza ferramentas aprovadas e sujeitas a permissões.</p></div><Switch label="" defaultChecked={internet} disabled={demo} onChange={(value) => { setInternet(value); update("internet_enabled", value); }} /></div>
      <div className="flex items-start justify-between gap-5 py-5"><div><h3 className="text-sm font-semibold text-white">Interface compacta</h3><p className="mt-1 text-sm leading-5 text-gray-500">Reduz o espaçamento da lista de conversas.</p></div><Switch label="" defaultChecked={compact} disabled={demo} onChange={(value) => { setCompact(value); update("compact_ui", value); }} /></div>
    </div>
  );
}

export function ResourceCenter({ open, onClose, user, demo }: ResourceCenterProps) {
  const [tab, setTab] = useState<ResourceTab>("skills");
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || tab === "profile" || tab === "settings") return;
    let active = true;
    setLoading(true);
    setError(null);
    if (demo) {
      setItems(demoResources[tab]);
      setLoading(false);
      return;
    }
    apiRequest<ResourceResponse>(`/${tab}`)
      .then((response) => { if (active) setItems(response.items); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os recursos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demo, open, tab]);

  return (
    <Modal isOpen={open} onClose={onClose} className="mx-3 max-h-[90vh] max-w-5xl overflow-hidden border border-gray-800 !bg-gray-900 sm:mx-6">
      <div className="border-b border-gray-800 px-5 pb-5 pt-6 sm:px-7">
        <h2 className="text-theme-xl font-semibold text-white">Recursos Growth</h2>
        <p className="mt-1 text-sm text-gray-500">Capacidades e preferências disponíveis para a sua conta.</p>
      </div>
      <div className="grid max-h-[calc(90vh-105px)] md:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-800 p-3 md:flex-col md:border-b-0 md:border-r" aria-label="Áreas de recursos">
          {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${tab === item.id ? "bg-brand-500/12 text-brand-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>{item.label}</button>)}
        </nav>
        <section className="min-h-[440px] overflow-y-auto p-5 sm:p-7">
          <div className="mb-6"><h3 className="text-lg font-semibold text-white">{tabs.find((item) => item.id === tab)?.label}</h3>{demo ? <p className="mt-1 text-xs text-warning-400">Dados de demonstração — sem alterações no servidor.</p> : null}</div>
          {tab === "profile" ? <ProfilePanel user={user} demo={demo} /> : tab === "settings" ? <SettingsPanel demo={demo} /> : loading ? <div className="grid min-h-48 place-items-center"><span className="size-7 animate-spin rounded-full border-2 border-gray-700 border-t-brand-500" /></div> : error ? <p role="alert" className="rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm text-error-400">{error}</p> : tab === "personalities" ? <PersonalitiesPanel items={items} demo={demo} onCreated={(created) => setItems((current) => [...current, created])} onUpdate={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))} /> : <ResourceList tab={tab} items={items} demo={demo} onUpdate={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))} />}
        </section>
      </div>
    </Modal>
  );
}
