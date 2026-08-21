import { useMemo, useState, type FormEvent } from "react";
import Button from "../../../components/ui/button/Button";
import { ReactComponent as PlusIcon } from "../../../icons/plus.svg?react";
import { ReactComponent as FolderIcon } from "../../../icons/folder.svg?react";
import { ReactComponent as ChatIcon } from "../../../icons/chat.svg?react";
import { ReactComponent as MoreIcon } from "../../../icons/moredot.svg?react";
import { ReactComponent as PencilIcon } from "../../../icons/pencil.svg?react";
import { ReactComponent as TrashIcon } from "../../../icons/trash.svg?react";
import { ReactComponent as CloseIcon } from "../../../icons/close.svg?react";
import type { ChatFolder, ConversationSummary } from "../types";
import { resourceBrands, type BrandIcon } from "../../resources/brandIcons";
import { useLocale } from "../../i18n/LocaleProvider";

interface ChatSidebarProps {
  open: boolean;
  collapsed: boolean;
  folders: ChatFolder[];
  conversations: ConversationSummary[];
  selectedId: string | null;
  onClose: () => void;
  onNewConversation: (folderId?: string | null) => void;
  onSelect: (conversation: ConversationSummary) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onRename: (conversationId: string, title: string) => Promise<void>;
  onMove: (conversationId: string, folderId: string | null) => Promise<void>;
  onDelete: (conversationId: string) => Promise<void>;
  onOpenResources: () => void;
}

function MiniBrand({ icon }: { icon: BrandIcon }) {
  return <span className="grid size-5 place-items-center rounded-full bg-white"><svg role="img" aria-label={icon.title} viewBox="0 0 24 24" className="size-3" fill={`#${icon.hex}`}><path d={icon.path} /></svg></span>;
}

function ConversationRow({
  conversation,
  active,
  folders,
  onSelect,
  onRename,
  onMove,
  onDelete,
}: {
  conversation: ConversationSummary;
  active: boolean;
  folders: ChatFolder[];
  onSelect: () => void;
  onRename: (title: string) => Promise<void>;
  onMove: (folderId: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { locale } = useLocale();
  const c = locale === "pt" ? { title: "Novo título da conversa", options: "Opções de", rename: "Renomear", move: "Mover para", none: "Sem pasta", confirm: "Eliminar esta conversa?", remove: "Eliminar" } : { title: "New conversation title", options: "Options for", rename: "Rename", move: "Move to", none: "No folder", confirm: "Delete this conversation?", remove: "Delete" };
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);

  const submitRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onRename(title);
    setEditing(false);
    setMenuOpen(false);
  };

  if (editing) {
    return (
      <form onSubmit={submitRename} className="px-2 py-1">
        <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => setEditing(false)} className="h-9 w-full rounded-lg border border-brand-500 bg-gray-950 px-3 text-sm text-white outline-none ring-2 ring-brand-500/20" aria-label={c.title} />
      </form>
    );
  }

  return (
    <div className={`group relative flex min-w-0 items-center rounded-lg ${active ? "bg-white/8" : "hover:bg-white/5"}`}>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-300">
        <ChatIcon className="size-4 shrink-0 text-gray-500" />
        <span className="truncate">{conversation.title}</span>
      </button>
      <button type="button" aria-label={`${c.options} ${conversation.title}`} onClick={() => setMenuOpen((current) => !current)} className="mr-1 grid size-8 shrink-0 place-items-center rounded-md text-gray-500 opacity-0 transition hover:bg-white/8 hover:text-white focus:opacity-100 group-hover:opacity-100">
        <MoreIcon className="size-4" />
      </button>
      {menuOpen ? (
        <div className="absolute right-1 top-10 z-30 w-48 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 p-1 shadow-theme-lg">
          <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5"><PencilIcon className="size-4" />{c.rename}</button>
          <label className="block px-3 pb-1 pt-2 text-theme-xs font-medium text-gray-500" htmlFor={`move-${conversation.id}`}>{c.move}</label>
          <select id={`move-${conversation.id}`} value={conversation.folderId ?? ""} onChange={(event) => { void onMove(event.target.value || null); setMenuOpen(false); }} className="mx-2 mb-1 h-9 w-[calc(100%-1rem)] rounded-lg border border-gray-700 bg-gray-950 px-2 text-sm text-gray-300 outline-none focus:border-brand-500">
            <option value="">{c.none}</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
          <button type="button" onClick={() => { if (window.confirm(c.confirm)) void onDelete(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-error-400 hover:bg-error-500/10"><TrashIcon className="size-4" />{c.remove}</button>
        </div>
      ) : null}
    </div>
  );
}

export function ChatSidebar(props: ChatSidebarProps) {
  const { locale } = useLocale();
  const c = locale === "pt" ? { close: "Fechar menu", new: "Nova conversa", history: "Histórico de conversas", folders: "Pastas", createFolder: "Criar pasta", folderName: "Nome da pasta", newFolderName: "Novo nome de", inFolder: "Nova conversa em", renameFolder: "Renomear", conversations: "Conversas", resources: "Recursos Growth", resourceCopy: "Skills, Plugins e Conexões", resourceTitle: "Skills, Plugins e Conexões" } : { close: "Close menu", new: "New conversation", history: "Conversation history", folders: "Folders", createFolder: "Create folder", folderName: "Folder name", newFolderName: "New name for", inFolder: "New conversation in", renameFolder: "Rename", conversations: "Conversations", resources: "Growth resources", resourceCopy: "Skills, Plugins, and Connections", resourceTitle: "Skills, Plugins, and Connections" };
  const [folderInputOpen, setFolderInputOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(props.folders.map((folder) => folder.id)));

  const grouped = useMemo(() => {
    const byFolder = new Map<string | null, ConversationSummary[]>();
    for (const conversation of props.conversations) {
      const list = byFolder.get(conversation.folderId) ?? [];
      list.push(conversation);
      byFolder.set(conversation.folderId, list);
    }
    return byFolder;
  }, [props.conversations]);

  const submitFolder = async (event: FormEvent) => {
    event.preventDefault();
    if (!folderName.trim()) return;
    await props.onCreateFolder(folderName);
    setFolderName("");
    setFolderInputOpen(false);
  };

  const renderConversation = (conversation: ConversationSummary) => (
    <ConversationRow
      key={conversation.id}
      conversation={conversation}
      folders={props.folders}
      active={conversation.id === props.selectedId}
      onSelect={() => { props.onSelect(conversation); props.onClose(); }}
      onRename={(title) => props.onRename(conversation.id, title)}
      onMove={(folderId) => props.onMove(conversation.id, folderId)}
      onDelete={() => props.onDelete(conversation.id)}
    />
  );

  return (
    <>
      {props.open ? <button type="button" aria-label={c.close} onClick={props.onClose} className="fixed inset-0 z-40 bg-gray-950/70 backdrop-blur-sm lg:hidden" /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col border-r border-white/6 bg-gray-950 transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${props.collapsed ? "lg:w-[76px]" : "lg:w-[260px]"} ${props.open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className={`flex h-16 items-center px-4 ${props.collapsed ? "lg:justify-center lg:px-2" : "justify-between"}`}>
          <img src="/Logo-Vertical-White.svg" alt="Growth Labs" className={`object-contain transition-all ${props.collapsed ? "h-10 w-10" : "h-12 w-32 object-left"}`} />
          <button type="button" aria-label={c.close} onClick={props.onClose} className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"><CloseIcon className="size-5" /></button>
        </div>
        <div className={`pb-3 ${props.collapsed ? "lg:px-[18px]" : "px-3"}`}>
          <Button variant="outline" className={`${props.collapsed ? "lg:!size-10 lg:!justify-center lg:!p-0" : "w-full !justify-start"} !border-gray-700 !bg-gray-900 !text-gray-200 hover:!bg-gray-800`} startIcon={<PlusIcon className="size-4" />} onClick={() => { props.onNewConversation(null); props.onClose(); }}>{props.collapsed ? <span className="lg:sr-only">{c.new}</span> : c.new}</Button>
        </div>

        <nav className={`no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-5 ${props.collapsed ? "lg:hidden" : ""}`} aria-label={c.history}>
          <div className="mb-2 flex items-center justify-between px-3 pt-2">
            <span className="text-theme-xs font-semibold uppercase tracking-wider text-gray-500">{c.folders}</span>
            <button type="button" aria-label={c.createFolder} onClick={() => setFolderInputOpen(true)} className="grid size-7 place-items-center rounded-md text-gray-500 hover:bg-white/5 hover:text-white"><PlusIcon className="size-3.5" /></button>
          </div>
          {folderInputOpen ? (
            <form onSubmit={submitFolder} className="mb-2 px-2">
              <input autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} onBlur={() => { if (!folderName) setFolderInputOpen(false); }} placeholder={c.folderName} className="h-9 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none focus:border-brand-500" />
            </form>
          ) : null}

          {props.folders.map((folder) => {
            const expanded = expandedFolders.has(folder.id);
            const folderConversations = grouped.get(folder.id) ?? [];
            if (editingFolderId === folder.id) {
              return (
                <form key={folder.id} onSubmit={(event) => { event.preventDefault(); if (editingFolderName.trim()) void props.onRenameFolder(folder.id, editingFolderName); setEditingFolderId(null); }} className="mb-2 px-2">
                  <input autoFocus value={editingFolderName} onChange={(event) => setEditingFolderName(event.target.value)} onBlur={() => setEditingFolderId(null)} className="h-9 w-full rounded-lg border border-brand-500 bg-gray-900 px-3 text-sm text-white outline-none ring-2 ring-brand-500/20" aria-label={`${c.newFolderName} ${folder.name}`} />
                </form>
              );
            }
            return (
              <section key={folder.id} className="mb-2">
                <div className="group flex items-center rounded-lg hover:bg-white/5">
                  <button type="button" onClick={() => setExpandedFolders((current) => { const next = new Set(current); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next; })} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-400">
                    <FolderIcon className="size-4 shrink-0" /><span className="truncate">{folder.name}</span><span className="ml-auto text-xs text-gray-600">{folderConversations.length}</span>
                  </button>
                  <button type="button" aria-label={`${c.inFolder} ${folder.name}`} onClick={() => props.onNewConversation(folder.id)} className="mr-1 grid size-7 place-items-center rounded-md text-gray-600 opacity-0 hover:bg-white/5 hover:text-white group-hover:opacity-100"><PlusIcon className="size-3.5" /></button>
                  <button type="button" aria-label={`${c.renameFolder} ${folder.name}`} onClick={() => { setEditingFolderName(folder.name); setEditingFolderId(folder.id); }} className="mr-1 grid size-7 place-items-center rounded-md text-gray-600 opacity-0 hover:bg-white/5 hover:text-white group-hover:opacity-100"><PencilIcon className="size-3.5" /></button>
                </div>
                {expanded ? <div className="ml-3 border-l border-gray-800 pl-1">{folderConversations.map(renderConversation)}</div> : null}
              </section>
            );
          })}

          <div className="mt-4 px-3 pb-1 text-theme-xs font-semibold uppercase tracking-wider text-gray-500">{c.conversations}</div>
          {(grouped.get(null) ?? []).map(renderConversation)}
        </nav>

        <div className={`border-t border-white/6 p-3 ${props.collapsed ? "lg:px-[18px]" : ""}`}>
          <button type="button" onClick={props.onOpenResources} title={c.resourceTitle} className={`flex w-full items-center rounded-xl text-left text-sm font-medium text-gray-300 transition hover:bg-white/5 ${props.collapsed ? "lg:size-10 lg:justify-center lg:p-0" : "gap-3 px-3 py-2.5"}`}>
            <span className="grid size-8 place-items-center rounded-lg bg-brand-500/15 text-brand-400">G</span>
            <span className={`min-w-0 flex-1 ${props.collapsed ? "lg:hidden" : ""}`}><span className="block truncate">{c.resources}</span><span className="block truncate text-theme-xs font-normal text-gray-500">{c.resourceCopy}</span><span className="mt-2 flex -space-x-1">{resourceBrands.map((icon) => <MiniBrand key={icon.slug} icon={icon} />)}</span></span>
          </button>
        </div>
      </aside>
    </>
  );
}
