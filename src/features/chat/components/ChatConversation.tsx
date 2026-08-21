import { memo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReactComponent as FileIcon } from "../../../icons/file.svg?react";
import type { ChatMessage } from "../types";
import { useLocale } from "../../i18n/LocaleProvider";

const Message = memo(function Message({ message }: { message: ChatMessage }) {
  const { locale } = useLocale();
  if (message.role === "user") {
    return (
      <article className="mx-auto flex w-full max-w-3xl justify-end px-4 py-3 sm:px-6">
        <div className="max-w-[88%] rounded-3xl bg-gray-800 px-4 py-3 text-[15px] leading-7 text-gray-100 sm:max-w-[78%]">
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.attachments?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.attachments.map((attachment) => <span key={attachment.id} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900/60 px-2.5 py-1.5 text-xs text-gray-300"><FileIcon className="size-3.5" />{attachment.name}</span>)}
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="mx-auto flex w-full max-w-3xl gap-3 px-4 py-4 sm:gap-4 sm:px-6">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-theme-xs">G</div>
      <div className={`min-w-0 flex-1 text-[15px] leading-7 text-gray-200 ${message.error ? "text-error-300" : ""}`}>
        {message.content ? (
          <div className="growth-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  if (!href) return <span>{children}</span>;
                  try {
                    const target = new URL(href, window.location.origin);
                    if (target.protocol !== "http:" && target.protocol !== "https:") return <span>{children}</span>;
                  } catch {
                    return <span>{children}</span>;
                  }
                  return <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>;
                },
                img: ({ alt }) => <span className="text-gray-500">[{locale === "pt" ? "Imagem" : "Image"}: {alt || (locale === "pt" ? "sem descrição" : "no description")}]</span>,
              }}
            >{message.content}</ReactMarkdown>
          </div>
        ) : message.pending ? (
          <span className="inline-flex items-center gap-1 py-2" aria-label={locale === "pt" ? "Growth está a responder" : "Growth is responding"}><i className="size-1.5 animate-pulse rounded-full bg-gray-400" /><i className="size-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:120ms]" /><i className="size-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:240ms]" /></span>
        ) : null}
      </div>
    </article>
  );
});

interface ChatConversationProps {
  messages: ChatMessage[];
  loading: boolean;
  hasConversation: boolean;
}

export function ChatConversation({ messages, loading, hasConversation }: ChatConversationProps) {
  const { locale } = useLocale();
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (loading) {
    return <div className="grid flex-1 place-items-center"><span className="size-7 animate-spin rounded-full border-2 border-gray-700 border-t-brand-500" aria-label={locale === "pt" ? "A carregar conversa" : "Loading conversation"} /></div>;
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 pb-28 pt-20">
        <div className="max-w-xl text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-500 text-xl font-semibold text-white shadow-theme-lg">G</div>
          <h1 className="mt-6 text-title-sm font-semibold tracking-tight text-white">{locale === "pt" ? "Como posso ajudar?" : "How can I help?"}</h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            {hasConversation ? (locale === "pt" ? "Comece um novo assunto nesta conversa." : "Start a new topic in this conversation.") : (locale === "pt" ? "Crie uma conversa e escolha o modelo Growth mais adequado ao seu trabalho." : "Create a conversation and choose the Growth model that best fits your work.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-36 pt-4" role="log" aria-live="polite" aria-label={locale === "pt" ? "Mensagens da conversa" : "Conversation messages"}>
      {messages.map((message) => <Message key={message.id} message={message} />)}
      <div ref={bottomRef} />
    </div>
  );
}
