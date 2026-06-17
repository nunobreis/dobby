import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, ExternalLink } from "lucide-react";
import BackButton from "@/components/BackButton";
import EmptyState from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

const CATEGORY_ORDER = ["insurance", "certificates", "vet_records", "other"];

export default async function DocumentsPage() {
  const supabase = await createClient();
  const t = await getTranslations("documents");

  const CATEGORY_LABELS: Record<string, string> = {
    insurance: t("categoryInsurance"),
    certificates: t("categoryCertificates"),
    vet_records: t("categoryVetRecords"),
    other: t("categoryOther"),
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/profile/setup");

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("puppy_id", membership.puppy_id)
    .order("created_at", { ascending: false });

  const signedUrls: Record<string, string> = {};
  if (documents && documents.length > 0) {
    await Promise.all(
      documents.map(async (doc) => {
        const { data } = await supabase.storage
          .from("dobby-documents")
          .createSignedUrl(doc.file_path, 3600);
        if (data?.signedUrl) signedUrls[doc.id] = data.signedUrl;
      })
    );
  }

  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof documents>>((acc, cat) => {
    const items = (documents ?? []).filter((d) => (d.category ?? "other") === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-[28px] font-bold text-text-primary">{t("title")}</h1>
        </div>
        <Link href="/documents/new">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {Object.keys(grouped).length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("emptyTitle")}
            message={t("emptyMessage")}
            ctaLabel={t("emptyCta")}
            ctaHref="/documents/new"
          />
        ) : (
          Object.entries(grouped).map(([cat, docs]) => (
            <div key={cat} className="flex flex-col gap-3">
              <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                {CATEGORY_LABELS[cat]}
              </span>
              <div className="bg-white rounded-card overflow-hidden">
                {docs!.map((doc, i) => (
                  <a
                    key={doc.id}
                    href={signedUrls[doc.id] ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-4 py-3.5 active:bg-[#F5F5F5] transition-colors ${
                      i < docs!.length - 1 ? "border-b border-[#F0F0F0]" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-[10px] bg-lavender flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-accent" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[14px] font-semibold text-text-primary truncate">
                        {doc.title}
                      </span>
                      <span className="text-[12px] text-text-secondary">
                        {doc.document_date ? formatDate(doc.document_date) : formatDate(doc.created_at)}
                        {doc.file_size_bytes
                          ? ` · ${(doc.file_size_bytes / 1024).toFixed(0)} KB`
                          : ""}
                      </span>
                    </div>
                    <ExternalLink size={15} className="text-[#AEAEAE] shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
