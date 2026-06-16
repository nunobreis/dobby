"use client";

import { useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import imageCompression from "browser-image-compression";

interface Props {
  onChange: (file: File | null) => void;
}

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

export default function DocumentUpload({ onChange }: Props) {
  const [selected, setSelected] = useState<{
    name: string;
    isImage: boolean;
    preview: string | null;
  } | null>(null);
  const [converting, setConverting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isHeic = isHeicFile(file);
    const isImage = file.type.startsWith("image/") || isHeic;

    if (isHeic) {
      setConverting(true);
      try {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        const jpegFile = new File(
          [blob],
          file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"),
          { type: "image/jpeg" }
        );
        const compressed = await imageCompression(jpegFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });
        const compressedFile = compressed as File;
        setSelected({ name: compressedFile.name, isImage: true, preview: URL.createObjectURL(compressedFile) });
        onChange(compressedFile);
      } catch {
        // Conversion failed — upload original HEIC as-is
        setSelected({ name: file.name, isImage: false, preview: null });
        onChange(file);
      } finally {
        setConverting(false);
      }
    } else if (isImage && !isPdf) {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
      });
      const compressedFile = compressed as File;
      setSelected({ name: file.name, isImage: true, preview: URL.createObjectURL(compressedFile) });
      onChange(compressedFile);
    } else {
      setSelected({ name: file.name, isImage: false, preview: null });
      onChange(file);
    }
  }

  function handleClear() {
    setSelected(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (converting) {
    return (
      <div className="h-36 bg-[#EBEBEB] rounded-[16px] flex items-center justify-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
        <span className="text-[13px] text-text-secondary">Converting…</span>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="bg-[#EBEBEB] rounded-[16px] p-4 flex items-center gap-3">
        {selected.isImage && selected.preview ? (
          <img
            src={selected.preview}
            alt="Preview"
            className="w-14 h-14 rounded-[10px] object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-[10px] bg-lavender flex items-center justify-center shrink-0">
            <FileText size={24} className="text-accent" />
          </div>
        )}
        <span className="flex-1 text-[14px] text-text-primary truncate">{selected.name}</span>
        <button type="button" onClick={handleClear} className="shrink-0">
          <X size={18} className="text-text-secondary" />
        </button>
      </div>
    );
  }

  return (
    <label className="flex flex-col items-center justify-center h-36 bg-[#EBEBEB] rounded-[16px] cursor-pointer gap-2">
      <FileText size={28} className="text-[#AEAEAE]" />
      <span className="text-[13px] text-[#AEAEAE]">Add file</span>
      <span className="text-[11px] text-[#AEAEAE]">PDF, photo, or image</span>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.heic,.heif,image/*"
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}
