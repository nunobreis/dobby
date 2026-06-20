"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mic, Paperclip, Send, StopCircle, X } from "lucide-react";
import { useState } from "react";
import { useChatInput, fileToBase64DataUrl, PENDING_IMAGE_KEY } from "@/lib/hooks/useChatInput";

export default function DashboardChatPrompt({ puppyName }: { puppyName: string }) {
  const t = useTranslations("dashboard");
  const tAiVet = useTranslations("aiVet");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ci = useChatInput({
    micError: tAiVet("micError"),
    transcribeError: tAiVet("transcribeError"),
    imageError: tAiVet("imageError"),
  });

  const handleSubmit = async () => {
    const text = ci.inputValue.trim();
    if (!text && !ci.pendingImage) return;
    setIsSubmitting(true);

    if (ci.pendingImage) {
      try {
        const dataUrl = await fileToBase64DataUrl(ci.pendingImage.file);
        sessionStorage.setItem(
          PENDING_IMAGE_KEY,
          JSON.stringify({ dataUrl, mimeType: ci.pendingImage.file.type || "image/jpeg", text })
        );
      } catch {}
      router.push("/ai-vet");
    } else {
      router.push(`/ai-vet?q=${encodeURIComponent(text)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-card p-4 flex flex-col gap-3">
      <p className="text-[15px] font-semibold text-text-primary">{t("chatPromptTitle")}</p>

      {/* Pending image preview */}
      {ci.pendingImage && (
        <div className="flex items-center gap-2">
          <div className="relative w-14 h-14 shrink-0">
            <img
              src={ci.pendingImage.previewUrl}
              alt={tAiVet("attachmentPreview")}
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
        <div>
          {ci.recordingState === "recording" ? (
            <div className="inline-flex items-center gap-2 bg-[#FEE2E2] rounded-pill px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-[13px] font-medium text-red-700 tabular-nums">
                {ci.formatSeconds(ci.recordingSeconds)}
              </span>
              <button
                type="button"
                onClick={ci.cancelRecording}
                aria-label={tAiVet("cancelRecording")}
                className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center ml-1"
              >
                <X size={11} className="text-white" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-[#EBEBEB] rounded-pill px-3 py-1.5">
              <div className="w-4 h-4 rounded-full border-2 border-text-secondary/30 border-t-text-secondary animate-spin shrink-0" />
              <span className="text-[13px] text-text-secondary">{tAiVet("transcribing")}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-3">
        <button
          type="button"
          onClick={() => ci.fileInputRef.current?.click()}
          disabled={ci.processingImage || ci.recordingState !== "idle"}
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
          placeholder={tAiVet("inputPlaceholder", { name: puppyName })}
          rows={1}
          disabled={ci.recordingState !== "idle"}
          className="flex-1 bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none max-h-32 disabled:opacity-50 leading-snug"
          style={{ minHeight: "48px" }}
        />

        {/* Right slot: mic → stop → spinner → send */}
        {ci.recordingState === "recording" ? (
          <button
            type="button"
            onClick={ci.stopRecording}
            aria-label={tAiVet("stopRecording")}
            className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shrink-0"
          >
            <StopCircle size={18} className="text-white" />
          </button>
        ) : ci.recordingState === "transcribing" ? (
          <div className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          </div>
        ) : isSubmitting ? (
          <div className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <div className="w-5 h-5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          </div>
        ) : ci.inputValue.trim() || ci.pendingImage ? (
          <button
            onClick={() => void handleSubmit()}
            disabled={ci.processingImage}
            className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          >
            <Send size={18} className="text-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void ci.startRecording()}
            disabled={ci.processingImage}
            aria-label={tAiVet("startRecording")}
            className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
          >
            <Mic size={18} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
