"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import type { UIMessage } from "ai";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, Send } from "lucide-react";
import type { DogContext } from "@/app/api/chat/route";

interface Props {
  context: DogContext;
  displayName: string;
}

export default function AiVetClient({ context, displayName }: Props) {
  const router = useRouter();
  const t = useTranslations("aiVet");
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { context },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue("");
    sendMessage({ text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMessageText = (msg: UIMessage) =>
    msg.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join("");

  const puppyName = context.puppyName;
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
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          >
            <ChevronLeft size={22} className="text-text-primary" />
          </button>
          <span className="text-[17px] font-semibold text-text-primary">
            {t("title")}
          </span>
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
            {messages.map((msg) => {
              const text = getMessageText(msg);
              if (!text) return null;
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 text-[14px] leading-relaxed ${
                      isUser
                        ? "bg-accent text-white rounded-[18px_18px_4px_18px] whitespace-pre-wrap"
                        : "bg-white text-text-primary rounded-[18px_18px_18px_4px]"
                    }`}
                  >
                    {isUser ? text : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                        }}
                      >
                        {text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              );
            })}

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
        <div className="flex items-end gap-3">
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
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
