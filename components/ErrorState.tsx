"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorState({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 gap-4">
      <AlertCircle size={40} className="text-accent opacity-50" />
      <span className="text-[18px] font-bold text-text-primary">Something went wrong</span>
      <span className="text-[13px] text-text-secondary text-center">
        {error.message || "An unexpected error occurred. Please try again."}
      </span>
      <button
        onClick={reset}
        className="h-[48px] px-8 bg-accent text-white rounded-pill text-[15px] font-semibold"
      >
        Try again
      </button>
    </div>
  );
}
