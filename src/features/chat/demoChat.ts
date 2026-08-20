import type { ChatAttachment, ChatFolder, ChatMessage, ChatWorkspace, ConversationSummary, GrowthModel } from "./types";

interface DemoState extends ChatWorkspace {
  messages: Record<string, ChatMessage[]>;
}

const initialState: DemoState = {
  folders: [
    { id: "demo-folder-product", name: "Produto" },
    { id: "demo-folder-research", name: "Investigação" },
  ],
  conversations: [
    {
      id: "demo-conversation",
      title: "Conhecer o Growth AI",
      folderId: null,
      model: "growth-medium",
      updatedAt: new Date().toISOString(),
    },
  ],
  messages: {
    "demo-conversation": [
      {
        id: "demo-welcome",
        role: "assistant",
        content: "Este é o ambiente de demonstração local. As respostas e dados apresentados aqui não são enviados aos modelos Growth.",
        createdAt: new Date().toISOString(),
      },
    ],
  },
  capabilities: {
    persistence: { available: false, reason: "A demonstração mantém os dados apenas em memória." },
    uploads: { available: false, reason: "A demonstração não envia ficheiros." },
    browserTools: { available: false, reason: "A demonstração não executa ferramentas de internet." },
  },
};

const cloneInitialState = (): DemoState => JSON.parse(JSON.stringify(initialState)) as DemoState;
let inMemoryDemoState = cloneInitialState();

export function readDemoState(): DemoState {
  return structuredClone(inMemoryDemoState);
}

export function writeDemoState(state: DemoState) {
  inMemoryDemoState = structuredClone(state);
}

export function demoCreateFolder(state: DemoState, name: string) {
  const folder: ChatFolder = { id: crypto.randomUUID(), name };
  const next = { ...state, folders: [...state.folders, folder] };
  writeDemoState(next);
  return { folder, state: next };
}

export function demoCreateConversation(state: DemoState, model: GrowthModel, folderId: string | null) {
  const conversation: ConversationSummary = {
    id: crypto.randomUUID(),
    title: "Nova conversa",
    folderId,
    model,
    updatedAt: new Date().toISOString(),
  };
  const next = {
    ...state,
    conversations: [conversation, ...state.conversations],
    messages: { ...state.messages, [conversation.id]: [] },
  };
  writeDemoState(next);
  return { conversation, state: next };
}

export function demoAttachment(file: File): ChatAttachment {
  return { id: crypto.randomUUID(), name: file.name, size: file.size, mimeType: file.type || "application/octet-stream" };
}
