"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, isStaticToolUIPart } from "ai";
import type { UIMessage } from "ai";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, Mic, Paperclip, Send, SquarePen, StopCircle, X } from "lucide-react";
import { useChatInput, fileToBase64DataUrl, PENDING_IMAGE_KEY } from "@/lib/hooks/useChatInput";
import ConfirmationCard from "./ConfirmationCard";

const CHAT_STORAGE_KEY = "dobby-ai-vet-messages";

interface Props {
  puppyName: string;
  displayName: string;
}

export default function AiVetClient({ puppyName, displayName }: Props) {
  const router = useRouter();
  const t = useTranslations("aiVet");
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const hasSentRef = useRef(false);
  const hasSentSessionRef = useRef(false);

  const ci = useChatInput({
    micError: t("micError"),
    transcribeError: t("transcribeError"),
    imageError: t("imageError"),
  });

  const [storedMessages] = useState<UIMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UIMessage[]) : [];
    } catch {
      return [];
    }
  });

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: storedMessages,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Read image + text forwarded from the dashboard prompt
  const [sessionSend, setSessionSend] = useState<{
    text: string;
    dataUrl: string;
    mimeType: string;
  } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_IMAGE_KEY);
    if (!stored) return;
    sessionStorage.removeItem(PENDING_IMAGE_KEY);
    try {
      const parsed = JSON.parse(stored) as { dataUrl: string; mimeType: string; text?: string };
      setSessionSend({ text: parsed.text ?? "", dataUrl: parsed.dataUrl, mimeType: parsed.mimeType });
    } catch {}
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const toSave = messages.map((msg) => ({
        ...msg,
        parts: msg.parts.filter((p) => p.type !== "file"),
      }));
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [messages]);

  // Auto-send plain text from ?q= param (e.g. dashboard prompt text-only)
  useEffect(() => {
    if (!initialQuery || hasSentRef.current || status !== "ready") return;
    hasSentRef.current = true;
    sendMessage({ text: initialQuery });
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send image (+ optional text) forwarded from the dashboard prompt
  useEffect(() => {
    if (!sessionSend || hasSentSessionRef.current || status !== "ready") return;
    hasSentSessionRef.current = true;
    const { text, dataUrl, mimeType } = sessionSend;
    const files: Array<{ type: "file"; mediaType: string; url: string }> = [
      { type: "file", mediaType: mimeType, url: dataUrl },
    ];
    sendMessage({ text, files });
  }, [status, sessionSend]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewChat = () => {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
    setMessages([]);
  };

  const handleSend = async () => {
    const text = ci.inputValue.trim();
    if ((!text && !ci.pendingImage) || isLoading) return;

    let files: Array<{ type: "file"; mediaType: string; url: string }> | undefined;

    if (ci.pendingImage) {
      const dataUrl = await fileToBase64DataUrl(ci.pendingImage.file);
      files = [{ type: "file", mediaType: ci.pendingImage.file.type || "image/jpeg", url: dataUrl }];
      URL.revokeObjectURL(ci.pendingImage.previewUrl);
      ci.setPendingImage(null);
      if (ci.fileInputRef.current) ci.fileInputRef.current.value = "";
    }

    ci.setInputValue("");
    sendMessage({ text, ...(files ? { files } : {}) });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const capabilities = [t("cap1"), t("cap2"), t("cap3"), t("cap4"), t("cap5"), t("cap6")];

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 lg:left-[220px] z-40 bg-white border-b border-[#F0F0F0]">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          >
            <ChevronLeft size={22} className="text-text-primary" />
          </button>
          <span className="text-[17px] font-semibold text-text-primary">{t("title")}</span>
          <button
            onClick={handleNewChat}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
            title={t("newChat")}
          >
            <SquarePen size={20} className="text-text-primary" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="pt-14 pb-28 px-4">
        {messages.length === 0 ? (
          <div className="pt-6 flex flex-col gap-4">
            <div className="bg-[#FFF8E7] rounded-card p-4">
              <p className="text-[12px] text-[#92720C] leading-relaxed">{t("disclaimerText")}</p>
            </div>
            <div className="bg-white rounded-card p-5 flex flex-col gap-3">
              <p className="text-[18px] font-bold text-text-primary">
                {t("welcomeHeading", { name: displayName })}
              </p>
              <p className="text-[14px] text-text-secondary">{t("welcomeIntro")}</p>
              <ul className="flex flex-col gap-2 mt-1">
                {capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-2">
                    <span className="text-accent text-[14px] mt-0.5">•</span>
                    <span className="text-[14px] text-text-primary">{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="pt-4 flex flex-col gap-3">
            <p className="text-[11px] text-text-secondary text-center px-6 leading-relaxed">
              {t("disclaimerText")}
            </p>

            {messages.map((msg: UIMessage) => (
              <div key={msg.id} className="flex flex-col gap-2">
                {msg.parts.map((part, i) => {
                  if (isTextUIPart(part) && part.text) {
                    const isUser = msg.role === "user";
                    return (
                      <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] px-4 py-3 text-[14px] leading-relaxed ${
                            isUser
                              ? "bg-accent text-white rounded-[18px_18px_4px_18px] whitespace-pre-wrap"
                              : "bg-white text-text-primary rounded-[18px_18px_18px_4px]"
                          }`}
                        >
                          {isUser ? (
                            part.text
                          ) : (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li>{children}</li>,
                              }}
                            >
                              {part.text}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (part.type === "file" && msg.role === "user") {
                    const url = "url" in part ? (part.url as string) : "";
                    if (!url) return null;
                    return (
                      <div key={i} className="flex justify-end">
                        <img
                          src={url}
                          alt={t("attachedPhoto")}
                          className="max-w-[80%] max-h-48 rounded-[18px_18px_4px_18px] object-cover"
                        />
                      </div>
                    );
                  }

                  if (isStaticToolUIPart(part) && part.state === "output-available") {
                    return (
                      <div key={i} className="flex justify-start">
                        <ConfirmationCard
                          toolType={part.type}
                          args={part.input as Record<string, unknown>}
                        />
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-[18px_18px_18px_4px] flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#AEAEAE] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-[#AEAEAE] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-[#AEAEAE] rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-[12px] text-red-500 text-center px-4">{t("errorMessage")}</p>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Fixed input bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[220px] bg-white border-t border-[#F0F0F0] px-4 py-3">
        {/* Pending image preview */}
        {ci.pendingImage && (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative w-14 h-14 shrink-0">
              <img
                src={ci.pendingImage.previewUrl}
                alt={t("attachmentPreview")}
                className="w-14 h-14 rounded-[10px] object-cover"
              />
              <button
                type="button"
                onClick={ci.handleClearImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1A1A1A] rounded-full flex items-center justify-center"
              >
                <X size={11} className="text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Recording / transcribing pill */}
        {ci.recordingState !== "idle" && (
          <div className="mb-2">
            {ci.recordingState === "recording" ? (
              <div className="inline-flex items-center gap-2 bg-[#FEE2E2] rounded-pill px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-[13px] font-medium text-red-700 tabular-nums">
                  {ci.formatSeconds(ci.recordingSeconds)}
                </span>
                <button
                  type="button"
                  onClick={ci.cancelRecording}
                  aria-label={t("cancelRecording")}
                  className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center ml-1"
                >
                  <X size={11} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-[#EBEBEB] rounded-pill px-3 py-1.5">
                <div className="w-4 h-4 rounded-full border-2 border-text-secondary/30 border-t-text-secondary animate-spin shrink-0" />
                <span className="text-[13px] text-text-secondary">{t("transcribing")}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => ci.fileInputRef.current?.click()}
            disabled={isLoading || ci.processingImage || ci.recordingState !== "idle"}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors disabled:opacity-40 shrink-0"
          >
            {ci.processingImage ? (
              <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            ) : (
              <Paperclip size={20} className="text-text-secondary" />
            )}
          </button>

          <input
            ref={ci.fileInputRef}
            type="file"
            accept="image/*"
            onChange={ci.handleFileSelect}
            className="hidden"
          />

          <textarea
            value={ci.inputValue}
            onChange={(e) => ci.setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder", { name: puppyName })}
            rows={1}
            disabled={isLoading || ci.recordingState !== "idle"}
            className="flex-1 bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none max-h-32 disabled:opacity-50 leading-snug"
            style={{ minHeight: "48px" }}
          />

          {/* Right slot: mic → stop → spinner → send */}
          {ci.recordingState === "recording" ? (
            <button
              type="button"
              onClick={ci.stopRecording}
              aria-label={t("stopRecording")}
              className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shrink-0"
            >
              <StopCircle size={18} className="text-white" />
            </button>
          ) : ci.recordingState === "transcribing" ? (
            <div className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <div className="w-5 h-5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            </div>
          ) : ci.inputValue.trim() || ci.pendingImage ? (
            <button
              onClick={() => void handleSend()}
              disabled={isLoading || ci.processingImage}
              className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
            >
              <Send size={18} className="text-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void ci.startRecording()}
              disabled={isLoading || ci.processingImage}
              aria-label={t("startRecording")}
              className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
            >
              <Mic size={18} className="text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
