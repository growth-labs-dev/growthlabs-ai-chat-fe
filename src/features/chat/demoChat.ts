import type { ChatAttachment, ChatFolder, ChatMessage, ChatWorkspace, ConversationSummary, GrowthModel } from "./types";
import type { Locale } from "../i18n/LocaleProvider";

interface DemoState extends ChatWorkspace {
  messages: Record<string, ChatMessage[]>;
}

const createInitialState = (locale: Locale): DemoState => {
  const copy = locale === "pt" ? {
    product: "Produto", research: "Investigação", title: "Conhecer o Growth AI",
    welcome: "Este é o ambiente de demonstração local. As respostas e dados apresentados aqui não são enviados aos modelos Growth.",
    persistence: "A demonstração mantém os dados apenas em memória.", uploads: "A demonstração não envia ficheiros.", browser: "A demonstração não executa ferramentas de internet.",
  } : {
    product: "Product", research: "Research", title: "Meet Growth AI",
    welcome: "This is the local demo environment. The responses and data shown here are not sent to Growth models.",
    persistence: "The demo keeps data in memory only.", uploads: "The demo does not upload files.", browser: "The demo does not run internet tools.",
  };
  return {
    folders: [
      { id: "demo-folder-product", name: copy.product },
      { id: "demo-folder-research", name: copy.research },
    ],
    conversations: [{
      id: "demo-conversation",
      title: copy.title,
      folderId: null,
      model: "growth-medium",
      updatedAt: new Date().toISOString(),
    }],
    messages: {
      "demo-conversation": [{
        id: "demo-welcome",
        role: "assistant",
        content: copy.welcome,
        createdAt: new Date().toISOString(),
      }],
    },
    capabilities: {
      persistence: { available: false, reason: copy.persistence },
      uploads: { available: false, reason: copy.uploads },
      browserTools: { available: false, reason: copy.browser },
    },
  };
};

const inMemoryDemoStates: Record<Locale, DemoState> = {
  en: createInitialState("en"),
  pt: createInitialState("pt"),
};

export function readDemoState(locale: Locale): DemoState {
  return structuredClone(inMemoryDemoStates[locale]);
}

export function writeDemoState(state: DemoState, locale: Locale) {
  inMemoryDemoStates[locale] = structuredClone(state);
}

export function demoCreateFolder(state: DemoState, name: string, locale: Locale) {
  const folder: ChatFolder = { id: crypto.randomUUID(), name };
  const next = { ...state, folders: [...state.folders, folder] };
  writeDemoState(next, locale);
  return { folder, state: next };
}

export function demoCreateConversation(state: DemoState, model: GrowthModel, folderId: string | null, locale: Locale) {
  const conversation: ConversationSummary = {
    id: crypto.randomUUID(),
    title: locale === "pt" ? "Nova conversa" : "New conversation",
    folderId,
    model,
    updatedAt: new Date().toISOString(),
  };
  const next = {
    ...state,
    conversations: [conversation, ...state.conversations],
    messages: { ...state.messages, [conversation.id]: [] },
  };
  writeDemoState(next, locale);
  return { conversation, state: next };
}

export function demoAttachment(file: File): ChatAttachment {
  return { id: crypto.randomUUID(), name: file.name, size: file.size, mimeType: file.type || "application/octet-stream" };
}
