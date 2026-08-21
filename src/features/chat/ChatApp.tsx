import { useCallback, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { ReactComponent as MenuIcon } from "../../icons/list.svg?react";
import { ReactComponent as UserIcon } from "../../icons/user-circle.svg?react";
import { ReactComponent as MoreIcon } from "../../icons/moredot.svg?react";
import { Boxes, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { localizeAuthMessage, useAuth } from "../auth/AuthProvider";
import { CliAuthorizationPanel } from "../auth/CliAuthorizationPanel";
import { LanguageSelector, useLocale } from "../i18n/LocaleProvider";
import { ResourceCenter } from "../resources/ResourceCenter";
import { ChatComposer } from "./components/ChatComposer";
import { ChatConversation } from "./components/ChatConversation";
import { ChatSidebar } from "./components/ChatSidebar";
import { useChatWorkspace } from "./useChatWorkspace";

export function ChatApp() {
  const auth = useAuth();
  const { locale } = useLocale();
  const c = locale === "pt" ? {
    newConversation: "Nova conversa", description: "Converse com os modelos Growth", openMenu: "Abrir menu", expandSidebar: "Expandir barra lateral", collapseSidebar: "Recolher barra lateral", demo: "Demonstração", accountMenu: "Menu da conta", profile: "Perfil e configurações", logout: "Terminar sessão", close: "Fechar", regenerate: "Gerar novamente",
  } : {
    newConversation: "New conversation", description: "Chat with Growth models", openMenu: "Open menu", expandSidebar: "Expand sidebar", collapseSidebar: "Collapse sidebar", demo: "Demo", accountMenu: "Account menu", profile: "Profile and settings", logout: "Sign out", close: "Close", regenerate: "Regenerate",
  };
  const chat = useChatWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cliUserCode, setCliUserCode] = useState(() => new URLSearchParams(window.location.search).get("user_code"));

  const completeCliRequest = useCallback(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("user_code");
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    setCliUserCode(null);
  }, []);

  const headerTitle = chat.selectedConversation?.title ?? c.newConversation;
  const canRegenerate = useMemo(() => !chat.streaming && chat.messages.some((message) => message.role === "user"), [chat.messages, chat.streaming]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
      <PageMeta title={`${headerTitle} | Growth AI`} description={c.description} />
      <ChatSidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        folders={chat.folders}
        conversations={chat.conversations}
        selectedId={chat.selectedId}
        onClose={() => setSidebarOpen(false)}
        onNewConversation={(folderId) => void chat.createConversation(folderId)}
        onSelect={(conversation) => void chat.selectConversation(conversation)}
        onCreateFolder={chat.createFolder}
        onRenameFolder={chat.renameFolder}
        onRename={chat.renameConversation}
        onMove={chat.moveConversation}
        onDelete={chat.deleteConversation}
        onOpenResources={() => setResourcesOpen(true)}
      />

      <main className="relative flex min-w-0 flex-1 flex-col bg-gray-950">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/6 px-3 sm:px-5">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label={c.openMenu} className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"><MenuIcon className="size-5" /></button>
          <button type="button" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? c.expandSidebar : c.collapseSidebar} className="hidden size-9 place-items-center rounded-lg text-gray-500 transition hover:bg-white/5 hover:text-white lg:grid">{sidebarCollapsed ? <PanelLeftOpen className="size-[18px]" strokeWidth={1.6} /> : <PanelLeftClose className="size-[18px]" strokeWidth={1.6} />}</button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-200">{headerTitle}</h1>
          {auth.demo ? <Badge size="sm" color="warning">{c.demo}</Badge> : null}
          <LanguageSelector compact />
          <button type="button" onClick={() => setResourcesOpen(true)} className="hidden items-center gap-2 rounded-full bg-white/[0.045] px-3 py-2 text-xs font-medium text-gray-400 transition hover:bg-white/[0.075] hover:text-white sm:flex"><Boxes className="size-4" strokeWidth={1.6} />Skills · Plugins</button>
          <div className="relative">
            <button type="button" onClick={() => setAccountOpen((current) => !current)} aria-label={c.accountMenu} className="grid size-9 place-items-center rounded-full bg-white/[0.055] text-gray-300 transition hover:bg-white/[0.09]"><UserIcon className="size-5" /></button>
            {accountOpen ? (
              <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-gray-700 bg-gray-900 p-2 shadow-theme-xl">
                <div className="border-b border-gray-800 px-3 py-3"><p className="truncate text-sm font-semibold text-white">{auth.user?.displayName}</p><p className="mt-0.5 truncate text-xs text-gray-500">{auth.user?.email}</p></div>
                <button type="button" onClick={() => { setResourcesOpen(true); setAccountOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5"><MoreIcon className="size-4" />{c.profile}</button>
                <button type="button" onClick={() => void auth.logout()} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5">{c.logout}</button>
              </div>
            ) : null}
          </div>
        </header>

        {auth.notice ? <div className={`mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-3xl items-center gap-3 rounded-xl border px-4 py-3 text-sm ${auth.notice.kind === "success" ? "border-success-500/20 bg-success-500/10 text-success-400" : "border-error-500/20 bg-error-500/10 text-error-400"}`}><span className="min-w-0 flex-1">{localizeAuthMessage(auth.notice.message, locale)}</span><button type="button" onClick={auth.clearNotice} className="font-semibold">{c.close}</button></div> : null}
        <CliAuthorizationPanel userCode={cliUserCode} demo={auth.demo} onComplete={completeCliRequest} />
        {chat.error ? (
          <div className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-3xl items-center gap-3 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm text-error-400"><span className="min-w-0 flex-1">{chat.error}</span><button type="button" onClick={() => chat.setError(null)} className="font-semibold hover:text-error-300">{c.close}</button></div>
        ) : null}
        <ChatConversation messages={chat.messages} loading={chat.loading} hasConversation={Boolean(chat.selectedId)} />
        {canRegenerate ? (
          <button type="button" onClick={() => void chat.regenerate()} className="absolute bottom-36 left-1/2 z-10 -translate-x-1/2 rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-400 shadow-theme-sm hover:bg-gray-800 hover:text-white">{c.regenerate}</button>
        ) : null}
        <ChatComposer model={chat.model} modelLabels={chat.modelLabels} streaming={chat.streaming} disabled={chat.loading} uploadCapability={chat.capabilities.uploads} onModelChange={chat.setModel} onUpload={chat.uploadAttachment} onSend={chat.sendMessage} onStop={chat.stop} />
      </main>

      {auth.user ? <ResourceCenter open={resourcesOpen} onClose={() => setResourcesOpen(false)} user={auth.user} demo={auth.demo} browserTools={chat.capabilities.browserTools} /> : null}
    </div>
  );
}
