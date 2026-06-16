"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import imageCompression from "browser-image-compression";

interface Props {
  onChange: (file: File | null) => void;
}

export default function ImageUpload({ onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
    });

    setPreview(URL.createObjectURL(compressed));
    onChange(compressed as File);
  }

  function handleClear() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return preview ? (
    <div className="relative w-full rounded-[16px] overflow-hidden">
      <img src={preview} alt="Preview" className="w-full object-cover max-h-64" />
      <button
        type="button"
        onClick={handleClear}
        className="absolute top-2 right-2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
      >
        <X size={18} className="text-white" />
      </button>
    </div>
  ) : (
    <label className="flex flex-col items-center justify-center h-36 bg-[#EBEBEB] rounded-[16px] cursor-pointer gap-2">
      <Camera size={28} className="text-[#AEAEAE]" />
      <span className="text-[13px] text-[#AEAEAE]">Add photo</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}
