import { getTranslations } from "next-intl/server";
import { getVaccinationStatus } from "@/lib/utils";
import type { VaccinationStatus } from "@/lib/types";

const styles: Record<VaccinationStatus, { bg: string; text: string }> = {
  up_to_date: { bg: "bg-sage-green", text: "text-[#2D6A4F]" },
  due_soon:   { bg: "bg-soft-yellow", text: "text-[#B7791F]" },
  overdue:    { bg: "bg-blush-pink", text: "text-[#9B1C1C]" },
};

const statusKey: Record<VaccinationStatus, "upToDate" | "dueSoon" | "overdue"> = {
  up_to_date: "upToDate",
  due_soon: "dueSoon",
  overdue: "overdue",
};

interface Props {
  nextDueDate: string | null;
  status?: VaccinationStatus;
}

export default async function VaccinationBadge({ nextDueDate, status }: Props) {
  const s = status ?? getVaccinationStatus(nextDueDate);
  const { bg, text } = styles[s];
  const t = await getTranslations("vaccinationBadge");
  return (
    <span className={`${bg} ${text} text-[12px] font-semibold px-[10px] py-[4px] rounded-badge self-start`}>
      {t(statusKey[s])}
    </span>
  );
}
