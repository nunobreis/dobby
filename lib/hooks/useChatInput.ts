"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";

export const PENDING_IMAGE_KEY = "dobby-ai-vet-pending-image";

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

export async function processImageFile(file: File): Promise<File> {
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

export async function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

interface UseChatInputOptions {
  micError: string;
  transcribeError: string;
  imageError: string;
}

export function useChatInput({ micError, transcribeError, imageError }: UseChatInputOptions) {
  const [inputValue, setInputValue] = useState("");
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  function formatSeconds(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  const handleClearImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingImage(true);
    try {
      const processed = await processImageFile(file);
      setPendingImage({ file: processed, previewUrl: URL.createObjectURL(processed) });
    } catch {
      toast.error(imageError);
    } finally {
      setProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      toast.error(micError);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.start();
      setRecordingState("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error(micError);
    }
  };

  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingState("transcribing");
    mediaRecorder.onstop = async () => {
      const mimeType = mimeTypeRef.current || "audio/webm";
      const ext = getFileExtension(mimeType);
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, `recording.${ext}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const { transcript } = (await res.json()) as { transcript: string };
        setInputValue(transcript);
      } catch {
        toast.error(transcribeError);
      } finally {
        setRecordingState("idle");
        setRecordingSeconds(0);
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      }
    };
    mediaRecorder.stop();
  };

  const cancelRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.onstop = null;
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
      mediaRecorderRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    audioChunksRef.current = [];
    setRecordingState("idle");
    setRecordingSeconds(0);
  };

  return {
    inputValue,
    setInputValue,
    pendingImage,
    setPendingImage,
    processingImage,
    recordingState,
    recordingSeconds,
    fileInputRef,
    formatSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
    handleFileSelect,
    handleClearImage,
  };
}
