"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type Milestone = {
  id: string;
  puppy_id: string;
  title: string;
  date: string;
  photo_url: string | null;
  notes: string | null;
};

type Mode = "view" | "edit" | "delete-confirm";

export default function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  const t = useTranslations("milestones");
  const router = useRouter();
  const supabase = createClient();

  const [selected, setSelected] = useState<Milestone | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openMilestone(m: Milestone) {
    setSelected(m);
    setMode("view");
    setEditTitle(m.title);
    setEditDate(m.date);
    setEditNotes(m.notes ?? "");
    setEditPhoto(null);
    setError(null);
  }

  function closeModal() {
    setSelected(null);
    setMode("view");
    setError(null);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);

    try {
      let photoUrl = selected.photo_url;

      if (editPhoto) {
        const ext = editPhoto.name.split(".").pop() ?? "jpg";
        const path = `${selected.puppy_id}/milestones/${selected.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("dobby-photos")
          .upload(path, editPhoto, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("dobby-photos").getPublicUrl(path);
        photoUrl = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("milestones")
        .update({
          title: editTitle,
          date: editDate,
          notes: editNotes || null,
          photo_url: photoUrl,
        })
        .eq("id", selected.id);

      if (updateError) throw updateError;

      toast.success(t("toastUpdated"));
      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("milestones")
        .delete()
        .eq("id", selected.id);

      if (deleteError) throw deleteError;

      toast.success(t("toastDeleted"));
      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="relative">
        <div className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-[#E0E0E0]" />
        <div className="flex flex-col gap-5">
          {milestones.map((m) => (
            <div key={m.id} className="flex gap-4 items-start">
              <div className="w-4 h-4 rounded-full bg-accent shrink-0 mt-1.5 z-10" />
              <button
                onClick={() => openMilestone(m)}
                className="flex-1 bg-white rounded-card p-4 flex flex-col gap-2 text-left"
              >
                <span className="inline-flex items-center px-3 py-1 rounded-badge bg-lavender text-accent text-[11px] font-semibold self-start">
                  {formatDate(m.date)}
                </span>
                <span className="text-[15px] font-bold text-text-primary">{m.title}</span>
                {m.photo_url && (
                  <img
                    src={m.photo_url}
                    alt={m.title}
                    className="w-full rounded-[12px] object-cover max-h-56"
                  />
                )}
                {m.notes && (
                  <span className="text-[13px] text-text-secondary">{m.notes}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-[24px] overflow-hidden w-full sm:max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* VIEW STATE */}
            {mode === "view" && (
              <>
                {selected.photo_url && (
                  <img
                    src={selected.photo_url}
                    alt={selected.title}
                    className="w-full object-cover max-h-[55vh]"
                  />
                )}
                <div className="p-5 flex flex-col gap-2 overflow-y-auto">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <h2 className="text-[18px] font-bold text-text-primary">{selected.title}</h2>
                      <span className="text-[13px] text-text-secondary">{formatDate(selected.date)}</span>
                    </div>
                    <button
                      onClick={closeModal}
                      className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-[#F5F5F5] transition-colors"
                    >
                      <X size={18} className="text-text-secondary" />
                    </button>
                  </div>
                  {selected.notes && (
                    <p className="text-[14px] text-text-secondary leading-relaxed mt-1">
                      {selected.notes}
                    </p>
                  )}
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setMode("edit")}
                      className="flex-1 h-[44px] rounded-pill border-2 border-accent text-accent text-[14px] font-semibold hover:opacity-80 transition-opacity"
                    >
                      {t("editButton")}
                    </button>
                    <button
                      onClick={() => setMode("delete-confirm")}
                      className="flex-1 h-[44px] rounded-pill border-2 border-[#f87171] text-[#b91c1c] text-[14px] font-semibold hover:opacity-80 transition-opacity"
                    >
                      {t("deleteButton")}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* DELETE CONFIRM STATE */}
            {mode === "delete-confirm" && (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-[18px] font-bold text-text-primary">{selected.title}</h2>
                    <span className="text-[13px] text-text-secondary">{formatDate(selected.date)}</span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-[#F5F5F5] transition-colors"
                  >
                    <X size={18} className="text-text-secondary" />
                  </button>
                </div>
                <div className="bg-[#fff5f5] rounded-[16px] p-4 flex flex-col gap-3">
                  <p className="text-[15px] font-semibold text-[#b91c1c]">{t("deleteConfirmTitle")}</p>
                  <p className="text-[13px] text-text-secondary">{t("deleteConfirmMessage")}</p>
                  {error && (
                    <p className="text-[13px] text-[#b91c1c]">{error}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={() => { setMode("view"); setError(null); }}
                      disabled={saving}
                      className="flex-1 h-[44px] rounded-pill border-2 border-[#E0E0E0] text-text-secondary text-[14px] font-semibold disabled:opacity-60"
                    >
                      {t("cancelButton")}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="flex-1 h-[44px] rounded-pill bg-[#b91c1c] text-white text-[14px] font-semibold disabled:opacity-60"
                    >
                      {saving ? "…" : t("deleteButton")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* EDIT STATE */}
            {mode === "edit" && (
              <div className="p-5 flex flex-col gap-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-bold text-text-primary">{t("editTitle")}</h2>
                  <button
                    onClick={closeModal}
                    className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-[#F5F5F5] transition-colors"
                  >
                    <X size={18} className="text-text-secondary" />
                  </button>
                </div>

                <EditField label={t("fieldTitle")}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </EditField>

                <EditField label={t("fieldDate")}>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </EditField>

                <EditField label={t("fieldPhoto")}>
                  {selected.photo_url && !editPhoto && (
                    <img
                      src={selected.photo_url}
                      alt={selected.title}
                      className="w-full rounded-[12px] object-cover max-h-40 mb-2"
                    />
                  )}
                  <ImageUpload onChange={setEditPhoto} />
                </EditField>

                <EditField label={t("fieldNotes")}>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                  />
                </EditField>

                {error && (
                  <p className="text-sm text-[#9B1C1C] bg-blush-pink rounded-lg px-4 py-2">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setMode("view"); setError(null); }}
                    disabled={saving}
                    className="flex-1 h-[44px] rounded-pill border-2 border-[#E0E0E0] text-text-secondary text-[14px] font-semibold disabled:opacity-60"
                  >
                    {t("cancelButton")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editTitle || !editDate}
                    className="flex-1 h-[44px] rounded-pill bg-accent text-white text-[14px] font-semibold disabled:opacity-60"
                  >
                    {saving ? "…" : t("saveChangesButton")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function EditField({
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
