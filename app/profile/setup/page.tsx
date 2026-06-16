"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PawPrint } from "lucide-react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSetupPage() {
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("Dobby");
  const [breed, setBreed] = useState("Golden Retriever");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [colour, setColour] = useState("");
  const [microchip, setMicrochip] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkInvite() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const puppyId = user?.user_metadata?.puppy_id as string | undefined;

      if (puppyId && user) {
        const { error } = await supabase
          .from("puppy_members")
          .insert({ puppy_id: puppyId, user_id: user.id });

        if (!error) {
          router.push("/dashboard");
          return;
        }
      }

      setChecking(false);
    }

    checkInvite();
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(file: File, puppyId: string): Promise<string | null> {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
    });

    const ext = file.name.split(".").pop();
    const path = `${puppyId}/profile.${ext}`;

    const { error } = await supabase.storage
      .from("dobby-photos")
      .upload(path, compressed, { upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from("dobby-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dob || !sex) {
      setError("Date of birth and sex are required.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: puppy, error: puppyError } = await supabase
        .from("puppies")
        .insert({
          name,
          breed,
          date_of_birth: dob,
          sex,
          colour: colour || null,
          microchip_number: microchip || null,
        })
        .select()
        .single();

      if (puppyError) throw puppyError;

      if (photo) {
        const photoUrl = await uploadPhoto(photo, puppy.id);
        if (photoUrl) {
          await supabase
            .from("puppies")
            .update({ photo_url: photoUrl })
            .eq("id", puppy.id);
        }
      }

      const { error: memberError } = await supabase
        .from("puppy_members")
        .insert({ puppy_id: puppy.id, user_id: user.id });

      if (memberError) throw memberError;

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <PawPrint size={32} className="text-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <h1 className="text-[32px] font-bold text-text-primary mb-6">
        Set up Dobby&apos;s profile
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Photo */}
        <div className="flex flex-col items-center gap-2">
          <label className="cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-lavender flex items-center justify-center overflow-hidden">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <PawPrint size={32} className="text-accent opacity-60" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
          <span className="text-[13px] text-text-secondary">Add photo</span>
        </div>

        <Field label="NAME">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="BREED">
          <input
            type="text"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="DATE OF BIRTH">
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="SEX">
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as "male" | "female")}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40 appearance-none"
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>

        <Field label="COLOUR (optional)">
          <input
            type="text"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            placeholder="e.g. Golden"
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="MICROCHIP NUMBER (optional)">
          <input
            type="text"
            value={microchip}
            onChange={(e) => setMicrochip(e.target.value)}
            placeholder="e.g. 985 141 000 012 345"
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        {error && (
          <p className="text-sm text-[#9B1C1C] bg-blush-pink rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold disabled:opacity-60 transition-opacity mt-2"
        >
          {loading ? "Saving…" : "Save profile"}
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
      <span className="text-[11px] font-bold text-text-secondary tracking-wider">
        {label}
      </span>
      {children}
    </div>
  );
}
