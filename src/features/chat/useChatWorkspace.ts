import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { chatApi, streamChat } from "./chatApi";
import { demoAttachment, demoCreateConversation, demoCreateFolder, readDemoState, writeDemoState } from "./demoChat";
import type { ChatAttachment, ChatFolder, ChatMessage, ConversationSummary, GrowthModel, WorkspaceCapabilities } from "./types";

const modelLabels: Record<GrowthModel, string> = {
  "growth-low": "Growth Low",
  "growth-medium": "Growth Medium",
  "growth-high": "Growth High",
};

export function useChatWorkspace() {
  const { demo } = useAuth();
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [model, setModel] = useState<GrowthModel>("growth-medium");
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<WorkspaceCapabilities>({
    uploads: { available: false, reason: "O backend não anunciou processamento seguro de ficheiros." },
    browserTools: { available: false, reason: "O backend não anunciou ferramentas de internet." },
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const workspace = demo ? readDemoState() : await chatApi.getWorkspace();
        if (!active) return;
        setFolders(workspace.folders);
        setConversations(workspace.conversations);
        setCapabilities(workspace.capabilities ?? {
          uploads: { available: false, reason: "O backend não anunciou processamento seguro de ficheiros." },
          browserTools: { available: false, reason: "O backend não anunciou ferramentas de internet." },
        });
        const first = workspace.conversations[0];
        if (first) {
          setSelectedId(first.id);
          setModel(first.model);
          const loadedMessages = demo
            ? readDemoState().messages[first.id] ?? []
            : (await chatApi.getMessages(first.id)).messages;
          if (active) setMessages(loadedMessages);
        }
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar as conversas.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [demo]);

  const selectConversation = useCallback(async (conversation: ConversationSummary) => {
    setSelectedId(conversation.id);
    setModel(conversation.model);
    setLoading(true);
    setError(null);
    try {
      const nextMessages = demo
        ? readDemoState().messages[conversation.id] ?? []
        : (await chatApi.getMessages(conversation.id)).messages;
      setMessages(nextMessages);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível abrir esta conversa.");
    } finally {
      setLoading(false);
    }
  }, [demo]);

  const createConversation = useCallback(async (folderId: string | null = null) => {
    const conversation = demo
      ? demoCreateConversation(readDemoState(), model, folderId).conversation
      : await chatApi.createConversation(model, folderId);
    setConversations((current) => [conversation, ...current]);
    setSelectedId(conversation.id);
    setMessages([]);
    return conversation;
  }, [demo, model]);

  const createFolder = useCallback(async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const folder = demo
      ? demoCreateFolder(readDemoState(), cleanName).folder
      : await chatApi.createFolder(cleanName);
    setFolders((current) => [...current, folder]);
  }, [demo]);

  const renameFolder = useCallback(async (folderId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (demo) {
      const state = readDemoState();
      writeDemoState({ ...state, folders: state.folders.map((folder) => folder.id === folderId ? { ...folder, name: cleanName } : folder) });
    } else {
      await chatApi.renameFolder(folderId, cleanName);
    }
    setFolders((current) => current.map((folder) => folder.id === folderId ? { ...folder, name: cleanName } : folder));
  }, [demo]);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    if (demo) {
      const state = readDemoState();
      writeDemoState({ ...state, conversations: state.conversations.map((item) => item.id === conversationId ? { ...item, title: cleanTitle } : item) });
    } else {
      await chatApi.renameConversation(conversationId, cleanTitle);
    }
    setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, title: cleanTitle } : item));
  }, [demo]);

  const moveConversation = useCallback(async (conversationId: string, folderId: string | null) => {
    if (demo) {
      const state = readDemoState();
      writeDemoState({ ...state, conversations: state.conversations.map((item) => item.id === conversationId ? { ...item, folderId } : item) });
    } else {
      await chatApi.moveConversation(conversationId, folderId);
    }
    setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, folderId } : item));
  }, [demo]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (demo) {
      const state = readDemoState();
      const nextMessages = { ...state.messages };
      delete nextMessages[conversationId];
      writeDemoState({ ...state, conversations: state.conversations.filter((item) => item.id !== conversationId), messages: nextMessages });
    } else {
      await chatApi.deleteConversation(conversationId);
    }
    setConversations((current) => current.filter((item) => item.id !== conversationId));
    if (selectedId === conversationId) {
      setSelectedId(null);
      setMessages([]);
    }
  }, [demo, selectedId]);

  const uploadAttachment = useCallback(async (file: File) => demo ? demoAttachment(file) : chatApi.uploadAttachment(file), [demo]);

  const runCompletion = useCallback(async (conversationId: string, nextMessages: ChatMessage[], attachments: ChatAttachment[]) => {
    const assistantId = crypto.randomUUID();
    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString(), pending: true }]);
    setStreaming(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let completeText = "";

    const onDelta = (delta: string) => {
      completeText += delta;
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: completeText } : message));
    };

    try {
      if (demo) {
        const demoText = "Resposta simulada no modo de demonstração local. Ligue o backend Growth para conversar com os modelos e usar memória, Skills, Plugins e Conexões reais.";
        for (const word of demoText.split(" ")) {
          if (controller.signal.aborted) break;
          onDelta(`${word} `);
          await new Promise((resolve) => window.setTimeout(resolve, 18));
        }
      } else {
        await streamChat({
          conversationId,
          model,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          attachments,
          signal: controller.signal,
          onDelta,
        });
      }
      setMessages((current) => {
        const finalized = current.map((message) => message.id === assistantId ? { ...message, pending: false } : message);
        if (demo) {
          const state = readDemoState();
          writeDemoState({ ...state, messages: { ...state.messages, [conversationId]: finalized } });
        }
        return finalized;
      });
    } catch (requestError) {
      if (controller.signal.aborted) {
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, pending: false } : message));
      } else {
        setError(requestError instanceof Error ? requestError.message : "A resposta foi interrompida por um erro.");
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, pending: false, error: true } : message));
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }, [demo, model]);

  const sendMessage = useCallback(async (content: string, attachments: ChatAttachment[]) => {
    let conversationId = selectedId;
    if (!conversationId) conversationId = (await createConversation()).id;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      attachments,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    if (messages.length === 0) {
      const title = content.trim().slice(0, 54) || "Nova conversa";
      try {
        await renameConversation(conversationId, title);
      } catch {
        setError("A conversa foi iniciada, mas o título não pôde ser atualizado.");
      }
    }
    await runCompletion(conversationId, nextMessages, attachments);
  }, [createConversation, messages, renameConversation, runCompletion, selectedId]);

  const regenerate = useCallback(async () => {
    if (streaming || !selectedId) return;
    const lastMessage = messages[messages.length - 1];
    const withoutLastAssistant = lastMessage?.role === "assistant" ? messages.slice(0, -1) : messages;
    if (!withoutLastAssistant.some((message) => message.role === "user")) return;
    await runCompletion(selectedId, withoutLastAssistant, []);
  }, [messages, runCompletion, selectedId, streaming]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  return {
    folders,
    conversations,
    messages,
    selectedId,
    selectedConversation,
    model,
    modelLabels,
    loading,
    streaming,
    error,
    capabilities,
    setModel,
    setError,
    selectConversation,
    createConversation,
    createFolder,
    renameFolder,
    renameConversation,
    moveConversation,
    deleteConversation,
    uploadAttachment,
    sendMessage,
    regenerate,
    stop,
  };
}
