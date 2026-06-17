"use client";

import { useState } from "react";
import { PawPrint, UserCircle2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { invitePartner } from "./actions";
import { formatDate } from "@/lib/utils";
import type { Puppy } from "@/lib/types";
import { useTranslations } from "next-intl";

interface Member {
  user_id: string;
  joined_at: string;
}

interface Props {
  puppy: Puppy;
  members: Member[];
  currentUserId: string;
}

const AVATAR_COLORS = ["#D5C9F0", "#C2DCF0", "#F2C4CE", "#C5DDD1", "#F5EAC2"];

export default function ProfileClient({ puppy, members, currentUserId }: Props) {
  const t = useTranslations("profile");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(puppy.name);
  const [dob, setDob] = useState(puppy.date_of_birth);
  const [sex, setSex] = useState(puppy.sex ?? "");
  const [colour, setColour] = useState(puppy.colour ?? "");
  const [microchip, setMicrochip] = useState(puppy.microchip_number ?? "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(puppy.photo_url);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      let photoUrl = puppy.photo_url;

      if (pendingPhoto) {
        const compressed = await imageCompression(pendingPhoto, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });
        const ext = pendingPhoto.name.split(".").pop();
        const path = `${puppy.id}/profile.${ext}`;
        await supabase.storage
          .from("dobby-photos")
          .upload(path, compressed, { upsert: true });
        const { data } = supabase.storage
          .from("dobby-photos")
          .getPublicUrl(path);
        photoUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("puppies")
        .update({
          name,
          date_of_birth: dob,
          sex: sex || null,
          colour: colour || null,
          microchip_number: microchip || null,
          photo_url: photoUrl,
        })
        .eq("id", puppy.id);

      if (error) throw error;
      toast.success(t("toastSuccess"));
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("failedSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      await invitePartner(inviteEmail);
      setInviteMsg(t("inviteSent", { email: inviteEmail }));
      setInviteEmail("");
    } catch (err: unknown) {
      setInviteMsg(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-5 py-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => router.back()}>
              <ChevronLeft size={26} className="text-text-primary" />
            </button>
          )}
          <h1 className="text-[32px] font-bold text-text-primary">{t("title")}</h1>
        </div>
        <button
          onClick={() => (editing ? saveProfile() : setEditing(true))}
          disabled={saving}
          className="text-accent text-[15px] font-semibold disabled:opacity-50"
        >
          {saving ? t("saving") : editing ? t("save") : t("edit")}
        </button>
      </div>

      {/* Photo */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <label className={editing ? "cursor-pointer" : "cursor-default"}>
          <div className="w-[108px] h-[108px] rounded-full bg-lavender flex items-center justify-center overflow-hidden">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={puppy.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <PawPrint size={40} className="text-accent opacity-60" />
            )}
          </div>
          {editing && (
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          )}
        </label>
        {editing && (
          <span className="text-[13px] text-text-secondary">{t("editPhoto")}</span>
        )}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        <ProfileField
          label={t("fieldName")}
          value={name}
          editing={editing}
          onChange={setName}
        />
        <ProfileField
          label={t("fieldDateOfBirth")}
          value={dob}
          editing={editing}
          onChange={setDob}
          type="date"
          displayValue={dob ? formatDate(dob) : "—"}
        />
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-text-secondary tracking-wider">
            {t("fieldSex")}
          </span>
          {editing ? (
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40 appearance-none"
            >
              <option value="">{t("selectSex")}</option>
              <option value="male">{t("male")}</option>
              <option value="female">{t("female")}</option>
            </select>
          ) : (
            <div className="h-[52px] bg-[#EBEBEB] rounded-input px-4 flex items-center">
              <span className="text-[15px] font-medium text-text-primary capitalize">
                {sex || "—"}
              </span>
            </div>
          )}
        </div>
        <ProfileField
          label={t("fieldColour")}
          value={colour}
          editing={editing}
          onChange={setColour}
          placeholder={t("placeholderColour")}
        />
        <ProfileField
          label={t("fieldMicrochip")}
          value={microchip}
          editing={editing}
          onChange={setMicrochip}
          placeholder={t("placeholderMicrochip")}
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-[#9B1C1C] bg-blush-pink rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Household */}
      <div className="mt-8 bg-white rounded-card p-5 flex flex-col gap-4">
        <h2 className="text-[18px] font-bold text-text-primary">{t("household")}</h2>

        {members.map((m, i) => (
          <div key={m.user_id} className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
            >
              <UserCircle2 size={22} className="text-text-primary opacity-70" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-text-primary">
                {m.user_id === currentUserId ? t("you") : t("partner")}
              </span>
              <span className="text-[13px] text-text-secondary">
                {t("joined", { date: formatDate(m.joined_at) })}
              </span>
            </div>
          </div>
        ))}

        <form onSubmit={handleInvite} className="flex flex-col gap-3 mt-1">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("partnerEmailPlaceholder")}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="submit"
            disabled={inviting || !inviteEmail}
            className="h-[50px] bg-accent text-white rounded-pill text-[15px] font-semibold disabled:opacity-60"
          >
            {inviting ? t("inviting") : t("inviteButton")}
          </button>
          {inviteMsg && (
            <p className="text-[13px] text-text-secondary text-center">
              {inviteMsg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  editing,
  onChange,
  type = "text",
  placeholder,
  displayValue,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  displayValue?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold text-text-secondary tracking-wider">
        {label}
      </span>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
        />
      ) : (
        <div className="h-[52px] bg-[#EBEBEB] rounded-input px-4 flex items-center">
          <span className="text-[15px] font-medium text-text-primary">
            {displayValue ?? (value || "—")}
          </span>
        </div>
      )}
    </div>
  );
}
