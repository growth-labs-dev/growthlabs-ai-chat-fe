import { useCallback, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { ReactComponent as MenuIcon } from "../../icons/list.svg?react";
import { ReactComponent as UserIcon } from "../../icons/user-circle.svg?react";
import { ReactComponent as MoreIcon } from "../../icons/moredot.svg?react";
import { useAuth } from "../auth/AuthProvider";
import { CliAuthorizationPanel } from "../auth/CliAuthorizationPanel";
import { ResourceCenter } from "../resources/ResourceCenter";
import { ChatComposer } from "./components/ChatComposer";
import { ChatConversation } from "./components/ChatConversation";
import { ChatSidebar } from "./components/ChatSidebar";
import { useChatWorkspace } from "./useChatWorkspace";

export function ChatApp() {
  const auth = useAuth();
  const chat = useChatWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cliUserCode, setCliUserCode] = useState(() => new URLSearchParams(window.location.search).get("user_code"));

  const completeCliRequest = useCallback(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("user_code");
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    setCliUserCode(null);
  }, []);

  const headerTitle = chat.selectedConversation?.title ?? "Nova conversa";
  const canRegenerate = useMemo(() => !chat.streaming && chat.messages.some((message) => message.role === "user"), [chat.messages, chat.streaming]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
      <PageMeta title={`${headerTitle} | Growth AI`} description="Converse com os modelos Growth" />
      <ChatSidebar
        open={sidebarOpen}
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
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu" className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"><MenuIcon className="size-5" /></button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-200">{headerTitle}</h1>
          {auth.demo ? <Badge size="sm" color="warning">Demonstração</Badge> : null}
          <div className="relative">
            <button type="button" onClick={() => setAccountOpen((current) => !current)} aria-label="Menu da conta" className="grid size-9 place-items-center rounded-full border border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600"><UserIcon className="size-5" /></button>
            {accountOpen ? (
              <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-gray-700 bg-gray-900 p-2 shadow-theme-xl">
                <div className="border-b border-gray-800 px-3 py-3"><p className="truncate text-sm font-semibold text-white">{auth.user?.displayName}</p><p className="mt-0.5 truncate text-xs text-gray-500">{auth.user?.email}</p></div>
                <button type="button" onClick={() => { setResourcesOpen(true); setAccountOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5"><MoreIcon className="size-4" />Perfil e configurações</button>
                <button type="button" onClick={() => void auth.logout()} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5">Terminar sessão</button>
              </div>
            ) : null}
          </div>
        </header>

        {auth.notice ? <div className={`mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-3xl items-center gap-3 rounded-xl border px-4 py-3 text-sm ${auth.notice.kind === "success" ? "border-success-500/20 bg-success-500/10 text-success-400" : "border-error-500/20 bg-error-500/10 text-error-400"}`}><span className="min-w-0 flex-1">{auth.notice.message}</span><button type="button" onClick={auth.clearNotice} className="font-semibold">Fechar</button></div> : null}
        <CliAuthorizationPanel userCode={cliUserCode} demo={auth.demo} onComplete={completeCliRequest} />
        {chat.error ? (
          <div className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-3xl items-center gap-3 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm text-error-400"><span className="min-w-0 flex-1">{chat.error}</span><button type="button" onClick={() => chat.setError(null)} className="font-semibold hover:text-error-300">Fechar</button></div>
        ) : null}
        <ChatConversation messages={chat.messages} loading={chat.loading} hasConversation={Boolean(chat.selectedId)} />
        {canRegenerate ? (
          <button type="button" onClick={() => void chat.regenerate()} className="absolute bottom-36 left-1/2 z-10 -translate-x-1/2 rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-400 shadow-theme-sm hover:bg-gray-800 hover:text-white">Gerar novamente</button>
        ) : null}
        <ChatComposer model={chat.model} modelLabels={chat.modelLabels} streaming={chat.streaming} disabled={chat.loading} uploadCapability={chat.capabilities.uploads} onModelChange={chat.setModel} onUpload={chat.uploadAttachment} onSend={chat.sendMessage} onStop={chat.stop} />
      </main>

      {auth.user ? <ResourceCenter open={resourcesOpen} onClose={() => setResourcesOpen(false)} user={auth.user} demo={auth.demo} browserTools={chat.capabilities.browserTools} /> : null}
    </div>
  );
}
