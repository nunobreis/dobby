"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, isStaticToolUIPart } from "ai";
import type { UIMessage } from "ai";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, Paperclip, Send, SquarePen, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import ConfirmationCard from "./ConfirmationCard";

const CHAT_STORAGE_KEY = "dobby-ai-vet-messages";

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

async function processImageFile(file: File): Promise<File> {
  let workingFile = file;

  if (isHeicFile(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      workingFile = new File(
        [blob],
        file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"),
        { type: "image/jpeg" }
      );
    } catch {
      // fall back to original
    }
  }

  const compressed = await imageCompression(workingFile, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
  return compressed as File;
}

async function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  puppyName: string;
  displayName: string;
}

export default function AiVetClient({ puppyName, displayName }: Props) {
  const router = useRouter();
  const t = useTranslations("aiVet");
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const hasSentRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [processingImage, setProcessingImage] = useState(false);

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
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    messages: storedMessages,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (
      !initialQuery ||
      hasSentRef.current ||
      status !== "ready" ||
      messages.length > 0
    )
      return;
    hasSentRef.current = true;
    sendMessage({ text: initialQuery });
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewChat = () => {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
    setMessages([]);
  };

  const handleClearImage = () => {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingImage(true);
    try {
      const processed = await processImageFile(file);
      setPendingImage({
        file: processed,
        previewUrl: URL.createObjectURL(processed),
      });
    } catch {
      toast.error("Could not process image. Please try again.");
    } finally {
      setProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if ((!text && !pendingImage) || isLoading) return;

    let files: Array<{ type: "file"; mediaType: string; url: string }> | undefined;

    if (pendingImage) {
      const dataUrl = await fileToBase64DataUrl(pendingImage.file);
      files = [{ type: "file", mediaType: "image/jpeg", url: dataUrl }];
      URL.revokeObjectURL(pendingImage.previewUrl);
      setPendingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    setInputValue("");
    sendMessage({
      text: text || "",
      ...(files ? { files } : {}),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const capabilities = [
    t("cap1"),
    t("cap2"),
    t("cap3"),
    t("cap4"),
    t("cap5"),
    t("cap6"),
  ];

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
          <span className="text-[17px] font-semibold text-text-primary">
            {t("title")}
          </span>
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
      <div className="pt-14 pb-52 lg:pb-28 px-4">
        {messages.length === 0 ? (
          <div className="pt-6 flex flex-col gap-4">
            {/* Disclaimer banner */}
            <div className="bg-[#FFF8E7] rounded-card p-4">
              <p className="text-[12px] text-[#92720C] leading-relaxed">
                {t("disclaimerText")}
              </p>
            </div>

            {/* Welcome card */}
            <div className="bg-white rounded-card p-5 flex flex-col gap-3">
              <p className="text-[18px] font-bold text-text-primary">
                {t("welcomeHeading", { name: displayName })}
              </p>
              <p className="text-[14px] text-text-secondary">
                {t("welcomeIntro")}
              </p>
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
            {/* Compact disclaimer */}
            <p className="text-[11px] text-text-secondary text-center px-6 leading-relaxed">
              {t("disclaimerText")}
            </p>

            {/* Messages */}
            {messages.map((msg: UIMessage) => (
              <div key={msg.id} className="flex flex-col gap-2">
                {msg.parts.map((part, i) => {
                  if (isTextUIPart(part) && part.text) {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={i}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
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
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0">{children}</p>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold">
                                    {children}
                                  </strong>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-4 mb-2 space-y-1">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal pl-4 mb-2 space-y-1">
                                    {children}
                                  </ol>
                                ),
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

                  if (
                    isStaticToolUIPart(part) &&
                    part.state === "output-available"
                  ) {
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

            {/* Typing indicator */}
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
              <p className="text-[12px] text-red-500 text-center px-4">
                {t("errorMessage")}
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Fixed input bar */}
      <div className="fixed bottom-24 lg:bottom-0 left-0 right-0 lg:left-[220px] bg-white border-t border-[#F0F0F0] px-4 py-3">
        {/* Pending image preview */}
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative w-14 h-14 shrink-0">
              <img
                src={pendingImage.previewUrl}
                alt="Attachment preview"
                className="w-14 h-14 rounded-[10px] object-cover"
              />
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1A1A1A] rounded-full flex items-center justify-center"
              >
                <X size={11} className="text-white" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || processingImage}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors disabled:opacity-40 shrink-0"
          >
            {processingImage ? (
              <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            ) : (
              <Paperclip size={20} className="text-text-secondary" />
            )}
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder", { name: puppyName })}
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none max-h-32 disabled:opacity-50 leading-snug"
            style={{ minHeight: "48px" }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={(!inputValue.trim() && !pendingImage) || isLoading}
            className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
