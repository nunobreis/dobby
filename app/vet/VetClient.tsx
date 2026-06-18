"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Puppy } from "@/lib/types";
import { useTranslations } from "next-intl";

interface Props {
  puppy: Puppy;
}

export default function VetClient({ puppy }: Props) {
  const t = useTranslations("vet");
  const router = useRouter();
  const supabase = createClient();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clinicName, setClinicName] = useState(puppy.vet_clinic_name ?? "");
  const [surgeonName, setSurgeonName] = useState(puppy.vet_surgeon_name ?? "");
  const [address, setAddress] = useState(puppy.vet_address ?? "");
  const [postcode, setPostcode] = useState(puppy.vet_postcode ?? "");
  const [city, setCity] = useState(puppy.vet_city ?? "");
  const [country, setCountry] = useState(puppy.vet_country ?? "");
  const [phone, setPhone] = useState(puppy.vet_phone ?? "");
  const [email, setEmail] = useState(puppy.vet_email ?? "");

  function cancelEditing() {
    setClinicName(puppy.vet_clinic_name ?? "");
    setSurgeonName(puppy.vet_surgeon_name ?? "");
    setAddress(puppy.vet_address ?? "");
    setPostcode(puppy.vet_postcode ?? "");
    setCity(puppy.vet_city ?? "");
    setCountry(puppy.vet_country ?? "");
    setPhone(puppy.vet_phone ?? "");
    setEmail(puppy.vet_email ?? "");
    setError(null);
    setEditing(false);
  }

  async function saveVet() {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("puppies")
        .update({
          vet_clinic_name: clinicName || null,
          vet_surgeon_name: surgeonName || null,
          vet_address: address || null,
          vet_postcode: postcode || null,
          vet_city: city || null,
          vet_country: country || null,
          vet_phone: phone || null,
          vet_email: email || null,
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
        <div className="flex items-center gap-4">
          {editing && (
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="text-text-secondary text-[15px] font-semibold disabled:opacity-50"
            >
              {t("cancel")}
            </button>
          )}
          <button
            onClick={() => (editing ? saveVet() : setEditing(true))}
            disabled={saving}
            className="text-accent text-[15px] font-semibold disabled:opacity-50"
          >
            {saving ? t("saving") : editing ? t("save") : t("edit")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <VetField
          label={t("fieldClinicName")}
          value={clinicName}
          editing={editing}
          onChange={setClinicName}
          placeholder={t("placeholderClinicName")}
        />
        <VetField
          label={t("fieldSurgeonName")}
          value={surgeonName}
          editing={editing}
          onChange={setSurgeonName}
          placeholder={t("placeholderSurgeonName")}
        />
        <VetField
          label={t("fieldAddress")}
          value={address}
          editing={editing}
          onChange={setAddress}
          placeholder={t("placeholderAddress")}
        />
        <VetField
          label={t("fieldPostcode")}
          value={postcode}
          editing={editing}
          onChange={setPostcode}
          placeholder={t("placeholderPostcode")}
        />
        <VetField
          label={t("fieldCity")}
          value={city}
          editing={editing}
          onChange={setCity}
          placeholder={t("placeholderCity")}
        />
        <VetField
          label={t("fieldCountry")}
          value={country}
          editing={editing}
          onChange={setCountry}
          placeholder={t("placeholderCountry")}
        />
        <VetField
          label={t("fieldPhone")}
          value={phone}
          editing={editing}
          onChange={setPhone}
          placeholder={t("placeholderPhone")}
          type="tel"
        />
        <VetField
          label={t("fieldEmail")}
          value={email}
          editing={editing}
          onChange={setEmail}
          placeholder={t("placeholderEmail")}
          type="email"
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-[#9B1C1C] bg-blush-pink rounded-lg px-4 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

function VetField({
  label,
  value,
  editing,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
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
            {value || "—"}
          </span>
        </div>
      )}
    </div>
  );
}
