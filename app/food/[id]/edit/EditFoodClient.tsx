"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { FoodEntry } from "@/lib/types";

export default function EditFoodClient({ entry }: { entry: FoodEntry }) {
  const t = useTranslations("food");
  const router = useRouter();
  const supabase = createClient();

  const [brand, setBrand] = useState(entry.brand);
  const [productName, setProductName] = useState(entry.product_name);
  const [foodType, setFoodType] = useState<"dry" | "wet" | "raw" | "mixed" | "">(entry.food_type ?? "");
  const [dailyAmountG, setDailyAmountG] = useState(entry.daily_amount_g != null ? String(entry.daily_amount_g) : "");
  const [mealsPerDay, setMealsPerDay] = useState(entry.meals_per_day != null ? String(entry.meals_per_day) : "");
  const [startDate, setStartDate] = useState(entry.start_date);
  const [endDate, setEndDate] = useState(entry.end_date ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!brand || !productName || !startDate) {
      setError(t("errorRequired"));
      return;
    }
    if (endDate && endDate < startDate) {
      setError(t("errorEndDate"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("food_entries")
        .update({
          brand,
          product_name: productName,
          food_type: foodType || null,
          daily_amount_g: dailyAmountG ? parseInt(dailyAmountG) : null,
          meals_per_day: mealsPerDay ? parseInt(mealsPerDay) : null,
          start_date: startDate,
          end_date: endDate || null,
          notes: notes || null,
        })
        .eq("id", entry.id);

      if (error) throw error;
      toast.success(t("toastUpdated"));
      router.push("/food");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("food_entries")
        .delete()
        .eq("id", entry.id);

      if (error) throw error;
      toast.success(t("toastDeleted"));
      router.push("/food");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-5 py-8 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/food">
          <ChevronLeft size={26} className="text-text-primary" />
        </Link>
        <h1 className="text-[28px] font-bold text-text-primary">{t("editTitle")}</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <Field label={t("fieldBrand")}>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={t("placeholderBrand")}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldProduct")}>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={t("placeholderProduct")}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldType")}>
          <select
            value={foodType}
            onChange={(e) => setFoodType(e.target.value as typeof foodType)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40 appearance-none"
          >
            <option value="">{t("typeSelect")}</option>
            <option value="dry">{t("typeDry")}</option>
            <option value="wet">{t("typeWet")}</option>
            <option value="raw">{t("typeRaw")}</option>
            <option value="mixed">{t("typeMixed")}</option>
          </select>
        </Field>

        <div className="flex gap-3">
          <div className="flex-1">
            <Field label={t("fieldDailyAmount")}>
              <input
                type="number"
                value={dailyAmountG}
                onChange={(e) => setDailyAmountG(e.target.value)}
                placeholder={t("placeholderDailyAmount")}
                min="0"
                className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 w-full"
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label={t("fieldMealsPerDay")}>
              <input
                type="number"
                value={mealsPerDay}
                onChange={(e) => setMealsPerDay(e.target.value)}
                placeholder={t("placeholderMeals")}
                min="1"
                max="10"
                className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 w-full"
              />
            </Field>
          </div>
        </div>

        <Field label={t("fieldStartDate")}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldEndDate")}>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldNotes")}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("placeholderNotes")}
            rows={3}
            className="bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
        </Field>

        {error && (
          <p className="text-sm text-[#9B1C1C] bg-blush-pink rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold disabled:opacity-60 transition-opacity mt-2"
        >
          {saving ? t("saving") : t("saveChangesButton")}
        </button>
      </form>

      <div className="mt-8">
        {confirmDelete ? (
          <div className="bg-white rounded-card p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[16px] font-bold text-text-primary">{t("deleteConfirmTitle")}</span>
              <span className="text-[13px] text-text-secondary">{t("deleteConfirmMessage")}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-[50px] bg-[#EBEBEB] text-text-primary rounded-pill text-[15px] font-semibold"
              >
                {t("cancelButton")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-[50px] bg-[#9B1C1C] text-white rounded-pill text-[15px] font-semibold disabled:opacity-60"
              >
                {deleting ? "…" : t("deleteButton")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 h-[50px] text-[#9B1C1C] text-[15px] font-semibold"
          >
            <Trash2 size={16} />
            {t("deleteButton")}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold text-text-secondary tracking-wider">{label}</span>
      {children}
    </div>
  );
}
