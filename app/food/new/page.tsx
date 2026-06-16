"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import type { FoodEntry } from "@/lib/types";

export default function NewFoodPage() {
  const today = new Date().toISOString().split("T")[0];
  const [currentFood, setCurrentFood] = useState<FoodEntry | null>(null);
  const [currentFoodEndDate, setCurrentFoodEndDate] = useState(today);

  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState("");
  const [foodType, setFoodType] = useState<"dry" | "wet" | "raw" | "mixed" | "">("");
  const [dailyAmountG, setDailyAmountG] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchCurrent() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: membership } = await supabase
        .from("puppy_members")
        .select("puppy_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership) return;
      const { data } = await supabase
        .from("food_entries")
        .select("*")
        .eq("puppy_id", membership.puppy_id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setCurrentFood(data);
    }
    fetchCurrent();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brand || !productName || !startDate) {
      setError("Brand, product name, and start date are required.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("End date must be after the start date.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: membership } = await supabase
        .from("puppy_members")
        .select("puppy_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership) throw new Error("No puppy found");

      if (currentFood) {
        const { error: updateError } = await supabase
          .from("food_entries")
          .update({ end_date: currentFoodEndDate })
          .eq("id", currentFood.id);
        if (updateError) throw updateError;
      }

      const { error: insertError } = await supabase.from("food_entries").insert({
        puppy_id: membership.puppy_id,
        brand,
        product_name: productName,
        food_type: foodType || null,
        daily_amount_g: dailyAmountG ? parseInt(dailyAmountG) : null,
        meals_per_day: mealsPerDay ? parseInt(mealsPerDay) : null,
        start_date: startDate,
        end_date: endDate || null,
        notes: notes || null,
        created_by: user.id,
      });
      if (insertError) throw insertError;

      toast.success("Food saved!");
      router.push("/food");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/food">
          <ChevronLeft size={26} className="text-text-primary" />
        </Link>
        <h1 className="text-[28px] font-bold text-text-primary">Add Food</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {currentFood && (
          <div className="bg-white rounded-card p-4 flex flex-col gap-3">
            <div>
              <span className="text-[13px] font-semibold text-text-primary">
                Currently feeding: {currentFood.brand} · {currentFood.product_name}
              </span>
              <p className="text-[12px] text-text-secondary mt-0.5">
                Set an end date before switching to new food.
              </p>
            </div>
            <Field label="END DATE FOR CURRENT FOOD">
              <input
                type="date"
                value={currentFoodEndDate}
                onChange={(e) => setCurrentFoodEndDate(e.target.value)}
                className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
              />
            </Field>
          </div>
        )}

        <Field label="BRAND">
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Royal Canin"
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="PRODUCT NAME">
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Puppy Golden Retriever"
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="TYPE">
          <select
            value={foodType}
            onChange={(e) => setFoodType(e.target.value as typeof foodType)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40 appearance-none"
          >
            <option value="">Select…</option>
            <option value="dry">Dry</option>
            <option value="wet">Wet</option>
            <option value="raw">Raw</option>
            <option value="mixed">Mixed</option>
          </select>
        </Field>

        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="DAILY AMOUNT (G)">
              <input
                type="number"
                value={dailyAmountG}
                onChange={(e) => setDailyAmountG(e.target.value)}
                placeholder="e.g. 300"
                min="0"
                className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 w-full"
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="MEALS / DAY">
              <input
                type="number"
                value={mealsPerDay}
                onChange={(e) => setMealsPerDay(e.target.value)}
                placeholder="e.g. 3"
                min="1"
                max="10"
                className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 w-full"
              />
            </Field>
          </div>
        </div>

        <Field label="START DATE">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="END DATE (optional)">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="NOTES (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes…"
            rows={3}
            className="bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
        </Field>

        {error && (
          <p className="text-sm text-[#9B1C1C] bg-blush-pink rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold disabled:opacity-60 transition-opacity mt-2"
        >
          {loading ? "Saving…" : "Save food"}
        </button>
      </form>
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
