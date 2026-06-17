"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PawPrint, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const t = useTranslations("login");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  async function handleForgotPassword() {
    if (!email) {
      setError(t("enterEmail"));
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/account",
      });
      if (error) throw error;
      setMessage(t("resetSent"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push("/profile/setup");
          router.refresh();
        } else {
          setMessage(t("confirmEmail"));
          switchMode("signin");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <>
      <div className="flex flex-col items-center gap-3 mb-8">
        <PawPrint size={40} strokeWidth={1.5} className="text-accent" />
        <h1 className="text-[28px] font-bold text-text-primary">Dobby</h1>
        <p className="text-sm text-text-secondary text-center">
          {t("tagline")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
          className="h-[52px] bg-[#EFEFEF] rounded-input px-4 text-base text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            required
            className="w-full h-[52px] bg-[#EFEFEF] rounded-input px-4 pr-12 text-base text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {error && (
          <p className="text-sm text-[#9B1C1C] bg-blush-pink rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        {message && (
          <p className="text-sm text-[#2D6A4F] bg-sage-green rounded-lg px-4 py-2">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold mt-2 disabled:opacity-60 transition-opacity"
        >
          {loading ? t("loading") : mode === "signin" ? t("signIn") : t("signUp")}
        </button>
      </form>

      {mode === "signin" && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="text-sm text-text-secondary disabled:opacity-60"
          >
            {t("forgotPassword")}
          </button>
        </div>
      )}

      <div className="flex justify-center items-center gap-1 mt-5">
        <span className="text-sm text-text-secondary">
          {mode === "signin" ? t("noAccount") : t("hasAccount")}
        </span>
        <button
          type="button"
          onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          className="text-sm font-semibold text-accent"
        >
          {mode === "signin" ? t("signUpLink") : t("signInLink")}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile layout */}
      <div className="lg:hidden min-h-screen bg-background flex flex-col justify-center px-8 py-12">
        {form}
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left panel */}
        <div className="w-1/2 bg-accent flex items-center justify-center">
          <PawPrint size={80} strokeWidth={1.5} className="text-background opacity-90" />
        </div>
        {/* Right panel */}
        <div className="w-1/2 bg-white flex items-center justify-center px-12">
          <div className="w-full max-w-[400px]">
            {form}
          </div>
        </div>
      </div>
    </>
  );
}
