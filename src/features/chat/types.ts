export type GrowthModel = "growth-low" | "growth-medium" | "growth-high";
export type MessageRole = "user" | "assistant" | "system";

export interface ChatFolder {
  id: string;
  name: string;
  createdAt?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  folderId: string | null;
  model: GrowthModel;
  updatedAt: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  downloadUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  pending?: boolean;
  error?: boolean;
}

export interface ChatWorkspace {
  folders: ChatFolder[];
  conversations: ConversationSummary[];
}

export interface StreamChatInput {
  conversationId: string;
  model: GrowthModel;
  messages: Array<Pick<ChatMessage, "role" | "content">>;
  attachments: ChatAttachment[];
  signal: AbortSignal;
  onDelta: (delta: string) => void;
}

