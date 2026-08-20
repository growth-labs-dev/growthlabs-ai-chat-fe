import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import Button from "../../../components/ui/button/Button";
import { ReactComponent as PlusIcon } from "../../../icons/plus.svg?react";
import { ReactComponent as CloseIcon } from "../../../icons/close.svg?react";
import { ReactComponent as PaperPlaneIcon } from "../../../icons/paper-plane.svg?react";
import { ReactComponent as FileIcon } from "../../../icons/file.svg?react";
import type { CapabilityStatus, ChatAttachment, GrowthModel } from "../types";

interface ChatComposerProps {
  model: GrowthModel;
  modelLabels: Record<GrowthModel, string>;
  streaming: boolean;
  disabled?: boolean;
  uploadCapability?: CapabilityStatus;
  onModelChange: (model: GrowthModel) => void;
  onUpload: (file: File) => Promise<ChatAttachment>;
  onSend: (content: string, attachments: ChatAttachment[]) => Promise<void>;
  onStop: () => void;
}

const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

export function ChatComposer(props: ChatComposerProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadsAvailable = props.uploadCapability?.available === true;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [content]);

  const send = async () => {
    const cleanContent = content.trim();
    if ((!cleanContent && attachments.length === 0) || props.streaming || uploading) return;
    setContent("");
    const sentAttachments = attachments;
    setAttachments([]);
    await props.onSend(cleanContent, sentAttachments);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await Promise.all(files.map(props.onUpload));
      setAttachments((current) => [...current, ...uploaded]);
    } catch (requestError) {
      setUploadError(requestError instanceof Error ? requestError.message : "Não foi possível anexar o ficheiro.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent px-3 pb-3 pt-12 sm:px-6 sm:pb-5">
      <div className="pointer-events-auto mx-auto max-w-3xl">
        {attachments.length ? (
          <div className="mb-2 flex flex-wrap gap-2 px-2">
            {attachments.map((attachment) => (
              <span key={attachment.id} className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300 shadow-theme-sm">
                <FileIcon className="size-4 text-brand-400" /><span className="max-w-40 truncate">{attachment.name}</span><span className="text-gray-600">{formatSize(attachment.size)}</span>
                <button type="button" aria-label={`Remover ${attachment.name}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))} className="text-gray-500 hover:text-white"><CloseIcon className="size-3.5" /></button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="rounded-3xl border border-gray-700 bg-gray-900 p-2 shadow-theme-xl transition focus-within:border-gray-600 focus-within:ring-3 focus-within:ring-brand-500/10">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={props.disabled}
            placeholder="Mensagem para o Growth AI"
            aria-label="Mensagem"
            className="max-h-44 min-h-12 w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-6 text-white outline-none placeholder:text-gray-500 disabled:opacity-50"
          />
          <div className="flex items-center gap-2 px-1 pb-1">
            <input ref={fileRef} type="file" multiple className="sr-only" onChange={handleFiles} />
            <button type="button" aria-label="Anexar ficheiros" aria-describedby={!uploadsAvailable ? "upload-capability" : undefined} disabled={!uploadsAvailable || uploading || props.streaming} onClick={() => fileRef.current?.click()} className="grid size-9 place-items-center rounded-full border border-gray-700 text-gray-400 transition hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"><PlusIcon className="size-4" /></button>
            <select value={props.model} onChange={(event) => props.onModelChange(event.target.value as GrowthModel)} disabled={props.streaming} aria-label="Modelo Growth" className="h-9 rounded-full border border-gray-700 bg-gray-900 px-3 text-xs font-medium text-gray-300 outline-none hover:bg-gray-800 focus:border-brand-500 disabled:opacity-50">
              {(Object.entries(props.modelLabels) as Array<[GrowthModel, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span className="ml-auto text-theme-xs text-gray-600">{uploading ? "A enviar anexo…" : "Enter envia · Shift+Enter quebra linha"}</span>
            {props.streaming ? (
              <button type="button" onClick={props.onStop} aria-label="Parar resposta" className="grid size-9 place-items-center rounded-full bg-white text-gray-950 transition hover:bg-gray-200"><span className="size-3 rounded-sm bg-gray-950" /></button>
            ) : (
              <Button size="sm" className="!size-9 !rounded-full !p-0" disabled={props.disabled || uploading || (!content.trim() && attachments.length === 0)} onClick={() => void send()}><PaperPlaneIcon className="size-4" /></Button>
            )}
          </div>
        </div>
        {uploadError ? <p role="alert" className="mt-2 px-3 text-xs text-error-400">{uploadError}</p> : null}
        {!uploadsAvailable ? <p id="upload-capability" className="mt-2 px-3 text-center text-theme-xs text-gray-500">Ficheiros indisponíveis neste ambiente — {props.uploadCapability?.reason ?? "processamento seguro não configurado"}</p> : null}
        <p className="mt-2 text-center text-theme-xs text-gray-600">As respostas podem conter erros. Confirme decisões importantes.</p>
      </div>
    </div>
  );
}
