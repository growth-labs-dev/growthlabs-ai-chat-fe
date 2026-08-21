import { API_BASE, apiRequest } from "../../lib/api";
import { getCsrfToken } from "../../lib/csrf";
import type {
  ChatAttachment,
  ChatFolder,
  ChatMessage,
  ChatWorkspace,
  ConversationSummary,
  GrowthModel,
  StreamChatInput,
} from "./types";

type StreamRecord = Record<string, unknown>;

export const chatApi = {
  getWorkspace: () => apiRequest<ChatWorkspace>("/chat/workspace"),
  getMessages: (conversationId: string) =>
    apiRequest<{ messages: ChatMessage[] }>(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`),
  createFolder: (name: string) =>
    apiRequest<ChatFolder>("/chat/folders", { method: "POST", body: JSON.stringify({ name }) }),
  renameFolder: (folderId: string, name: string) =>
    apiRequest<ChatFolder>(`/chat/folders/${encodeURIComponent(folderId)}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  createConversation: (model: GrowthModel, folderId: string | null = null) =>
    apiRequest<ConversationSummary>("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ model, folder_id: folderId }),
    }),
  renameConversation: (conversationId: string, title: string) =>
    apiRequest<ConversationSummary>(`/chat/conversations/${encodeURIComponent(conversationId)}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  moveConversation: (conversationId: string, folderId: string | null) =>
    apiRequest<ConversationSummary>(`/chat/conversations/${encodeURIComponent(conversationId)}`, {
      method: "PATCH",
      body: JSON.stringify({ folder_id: folderId }),
    }),
  deleteConversation: (conversationId: string) =>
    apiRequest<void>(`/chat/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE" }),
  uploadAttachment: async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<ChatAttachment>("/chat/attachments", { method: "POST", body });
  },
};

function extractText(record: StreamRecord): string {
  if (typeof record.delta === "string") return record.delta;
  if (typeof record.text === "string") return record.text;
  if (typeof record.output_text === "string") return record.output_text;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const first = choices[0];
  if (!first || typeof first !== "object") return "";
  const delta = (first as StreamRecord).delta;
  if (delta && typeof delta === "object" && typeof (delta as StreamRecord).content === "string") {
    return (delta as StreamRecord).content as string;
  }
  return "";
}

export async function streamChat(input: StreamChatInput) {
  const portuguese = document.documentElement.lang.startsWith("pt");
  const csrfToken = getCsrfToken();
  if (!csrfToken) throw new Error(portuguese ? "A sessão não possui um token CSRF válido." : "The session does not have a valid CSRF token.");
  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    credentials: "include",
    signal: input.signal,
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", "X-Growth-CSRF": csrfToken },
    body: JSON.stringify({
      model: input.model,
      stream: true,
      conversation_id: input.conversationId,
      messages: input.messages,
      attachments: input.attachments.map(({ id }) => ({ id })),
    }),
  });

  if (!response.ok || !response.body) {
    const message = await response.text();
    throw new Error(message || (portuguese ? `A resposta foi recusada (${response.status}).` : `The response was rejected (${response.status}).`));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const payload = line.trim().replace(/^data:\s*/, "");
      if (!payload || payload === "[DONE]") continue;
      try {
        const delta = extractText(JSON.parse(payload) as StreamRecord);
        if (delta) input.onDelta(delta);
      } catch {
        if (!line.startsWith("data:")) input.onDelta(line);
      }
    }
  }

  const finalPayload = buffer.trim().replace(/^data:\s*/, "");
  if (finalPayload && finalPayload !== "[DONE]") {
    try {
      const delta = extractText(JSON.parse(finalPayload) as StreamRecord);
      if (delta) input.onDelta(delta);
    } catch {
      if (!buffer.startsWith("data:")) input.onDelta(buffer);
    }
  }
}
