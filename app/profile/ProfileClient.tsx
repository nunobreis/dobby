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
  const [breed, setBreed] = useState(puppy.breed);
  const [dob, setDob] = useState(puppy.date_of_birth);
  const [sex, setSex] = useState(puppy.sex ?? "");
  const [colour, setColour] = useState(puppy.colour ?? "");
  const [furTypes, setFurTypes] = useState<string[]>(puppy.fur_type ?? []);
  const [tailTypes, setTailTypes] = useState<string[]>(puppy.tail_type ?? []);
  const [otherInfo, setOtherInfo] = useState(puppy.other_info ?? "");

  function toggleFurType(value: string) {
    setFurTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function toggleTailType(value: string) {
    setTailTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function cancelEditing() {
    setName(puppy.name);
    setBreed(puppy.breed);
    setDob(puppy.date_of_birth);
    setSex(puppy.sex ?? "");
    setColour(puppy.colour ?? "");
    setFurTypes(puppy.fur_type ?? []);
    setTailTypes(puppy.tail_type ?? []);
    setOtherInfo(puppy.other_info ?? "");
    setMicrochip(puppy.microchip_number ?? "");
    setLegalOwner(puppy.legal_owner ?? "");
    setPhotoPreview(puppy.photo_url);
    setPendingPhoto(null);
    setError(null);
    setEditing(false);
  }
  const [microchip, setMicrochip] = useState(puppy.microchip_number ?? "");
  const [legalOwner, setLegalOwner] = useState(puppy.legal_owner ?? "");
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
          breed: breed || "Golden Retriever",
          date_of_birth: dob,
          sex: sex || null,
          colour: colour || null,
          fur_type: furTypes.length > 0 ? furTypes : null,
          tail_type: tailTypes.length > 0 ? tailTypes : null,
          other_info: otherInfo || null,
          microchip_number: microchip || null,
          legal_owner: legalOwner || null,
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
      <div className="flex items-center justify-between mb-1 lg:hidden">
        {!editing ? (
          <button onClick={() => router.back()} className="min-w-[44px] min-h-[44px] flex items-center justify-start">
            <ChevronLeft size={26} className="text-text-primary" />
          </button>
        ) : <div />}
        <div className="flex items-center gap-4">
          {editing && (
            <button onClick={cancelEditing} disabled={saving} className="text-text-secondary text-[15px] font-semibold disabled:opacity-50">
              {t("cancel")}
            </button>
          )}
          <button onClick={() => (editing ? saveProfile() : setEditing(true))} disabled={saving} className="text-accent text-[15px] font-semibold disabled:opacity-50">
            {saving ? t("saving") : editing ? t("save") : t("edit")}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[32px] font-bold text-text-primary">{t("title")}</h1>
        <div className="hidden lg:flex items-center gap-4">
          {editing && (
            <button onClick={cancelEditing} disabled={saving} className="text-text-secondary text-[15px] font-semibold disabled:opacity-50">
              {t("cancel")}
            </button>
          )}
          <button onClick={() => (editing ? saveProfile() : setEditing(true))} disabled={saving} className="text-accent text-[15px] font-semibold disabled:opacity-50">
            {saving ? t("saving") : editing ? t("save") : t("edit")}
          </button>
        </div>
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
          label={t("fieldBreed")}
          value={breed}
          editing={editing}
          onChange={setBreed}
          placeholder="e.g. Golden Retriever"
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
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-text-secondary tracking-wider">
            {t("fieldFurType")}
          </span>
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {(["long", "medium", "short", "straight", "curly", "wavy", "rough"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleFurType(opt)}
                  className={`px-4 py-2 rounded-pill text-[14px] font-medium transition-colors ${
                    furTypes.includes(opt)
                      ? "bg-accent text-white"
                      : "bg-[#EBEBEB] text-text-primary"
                  }`}
                >
                  {t(`fur${opt.charAt(0).toUpperCase() + opt.slice(1)}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          ) : (
            <div className="min-h-[52px] bg-[#EBEBEB] rounded-input px-4 flex items-center flex-wrap gap-2 py-2">
              {furTypes.length > 0 ? furTypes.map((opt) => (
                <span key={opt} className="bg-accent/10 text-accent text-[13px] font-medium px-3 py-1 rounded-pill capitalize">
                  {t(`fur${opt.charAt(0).toUpperCase() + opt.slice(1)}` as Parameters<typeof t>[0])}
                </span>
              )) : (
                <span className="text-[15px] font-medium text-text-primary">—</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-text-secondary tracking-wider">
            {t("fieldTailType")}
          </span>
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {(["long", "short", "amputated"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleTailType(opt)}
                  className={`px-4 py-2 rounded-pill text-[14px] font-medium transition-colors ${
                    tailTypes.includes(opt)
                      ? "bg-accent text-white"
                      : "bg-[#EBEBEB] text-text-primary"
                  }`}
                >
                  {t(`tail${opt.charAt(0).toUpperCase() + opt.slice(1)}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          ) : (
            <div className="min-h-[52px] bg-[#EBEBEB] rounded-input px-4 flex items-center flex-wrap gap-2 py-2">
              {tailTypes.length > 0 ? tailTypes.map((opt) => (
                <span key={opt} className="bg-accent/10 text-accent text-[13px] font-medium px-3 py-1 rounded-pill capitalize">
                  {t(`tail${opt.charAt(0).toUpperCase() + opt.slice(1)}` as Parameters<typeof t>[0])}
                </span>
              )) : (
                <span className="text-[15px] font-medium text-text-primary">—</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-text-secondary tracking-wider">
            {t("fieldOtherInfo")}
          </span>
          {editing ? (
            <textarea
              value={otherInfo}
              onChange={(e) => setOtherInfo(e.target.value)}
              placeholder={t("placeholderOtherInfo")}
              rows={4}
              className="bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none"
            />
          ) : (
            <div className="min-h-[52px] bg-[#EBEBEB] rounded-input px-4 py-3">
              <span className="text-[15px] font-medium text-text-primary whitespace-pre-wrap">
                {otherInfo || "—"}
              </span>
            </div>
          )}
        </div>
        <ProfileField
          label={t("fieldMicrochip")}
          value={microchip}
          editing={editing}
          onChange={setMicrochip}
          placeholder={t("placeholderMicrochip")}
        />
        <ProfileField
          label={t("fieldLegalOwner")}
          value={legalOwner}
          editing={editing}
          onChange={setLegalOwner}
          placeholder={t("placeholderLegalOwner")}
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
