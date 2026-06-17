"use client";

import { useState, useRef } from "react";
import { Camera, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { updateAccountProfile, updateAvatarUrl, changePassword } from "./actions";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";

export default function AccountClient({ user }: { user: User }) {
  const t = useTranslations("account");

  const emailPrefix = user.email?.split("@")[0] ?? "User";
  const initial = emailPrefix[0].toUpperCase();

  const [displayName, setDisplayName] = useState(
    (user.user_metadata?.display_name as string | undefined) ?? emailPrefix
  );
  const [phone, setPhone] = useState(
    (user.user_metadata?.phone as string | undefined) ?? ""
  );
  const [avatarUrl, setAvatarUrl] = useState(
    (user.user_metadata?.avatar_url as string | undefined) ?? null
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
      });
      const ext = file.name.split(".").pop();
      const path = `user-avatars/${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("dobby-photos")
        .upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("dobby-photos").getPublicUrl(path);
      await updateAvatarUrl(data.publicUrl);
      setAvatarUrl(data.publicUrl);
      toast.success(t("toastProfileSaved"));
    } catch {
      toast.error(t("failedSave"));
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateAccountProfile(displayName, phone);
      toast.success(t("toastProfileSaved"));
    } catch {
      toast.error(t("failedSave"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      toast.success(t("toastPasswordSaved"));
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error(t("failedSave"));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-5 py-8 pb-32 lg:pb-10">
      <div className="flex items-center gap-2 mb-8">
        <BackButton />
        <h1 className="text-[32px] font-bold text-text-primary">{t("title")}</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative"
          aria-label={t("changePhoto")}
        >
          <div className="w-20 h-20 rounded-full bg-[#F2C4CE] flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[28px] font-bold text-white">{initial}</span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
            <Camera size={12} className="text-white" />
          </div>
        </button>
        <span className="text-[13px] text-text-secondary">{t("changePhoto")}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Read-only info */}
      <div className="bg-white rounded-card px-5 py-4 flex flex-col gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-text-secondary tracking-wider">
            {t("fieldEmail")}
          </span>
          <span className="text-[15px] text-text-primary">{user.email}</span>
        </div>
        <div className="h-px bg-[#F0F0F0]" />
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-text-secondary tracking-wider">
            {t("fieldMemberSince")}
          </span>
          <span className="text-[15px] text-text-primary">{formatDate(user.created_at)}</span>
        </div>
      </div>

      {/* Editable profile fields */}
      <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 mb-8">
        <Field label={t("fieldDisplayName")}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("placeholderDisplayName")}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>
        <Field label={t("fieldPhone")}>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("placeholderPhone")}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>
        <button
          type="submit"
          disabled={savingProfile}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold disabled:opacity-60 transition-opacity"
        >
          {savingProfile ? t("saving") : t("saveProfile")}
        </button>
      </form>

      {/* Sign out */}
      <div className="h-px bg-[#E0E0E0] mb-8" />
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full h-[56px] flex items-center justify-center gap-2 rounded-pill border border-[#E0E0E0] text-[#9B1C1C] text-base font-semibold mb-8"
      >
        <LogOut size={18} />
        {t("signOut")}
      </button>

      {/* Change password */}
      <div className="h-px bg-[#E0E0E0] mb-8" />
      <h2 className="text-[18px] font-bold text-text-primary mb-5">{t("passwordSection")}</h2>
      <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
        <Field label={t("fieldNewPassword")}>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>
        <Field label={t("fieldConfirmPassword")}>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>
        <button
          type="submit"
          disabled={savingPassword}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold disabled:opacity-60 transition-opacity"
        >
          {savingPassword ? t("saving") : t("savePassword")}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold text-text-secondary tracking-wider">{label}</span>
      {children}
    </div>
  );
}
