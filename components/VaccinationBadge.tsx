import { getVaccinationStatus } from "@/lib/utils";
import type { VaccinationStatus } from "@/lib/types";

const styles: Record<VaccinationStatus, { bg: string; text: string; label: string }> = {
  up_to_date: { bg: "bg-sage-green", text: "text-[#2D6A4F]", label: "Up to date" },
  due_soon:   { bg: "bg-soft-yellow", text: "text-[#B7791F]", label: "Due soon" },
  overdue:    { bg: "bg-blush-pink", text: "text-[#9B1C1C]", label: "Overdue" },
};

interface Props {
  nextDueDate: string | null;
  status?: VaccinationStatus;
}

export default function VaccinationBadge({ nextDueDate, status }: Props) {
  const s = status ?? getVaccinationStatus(nextDueDate);
  const { bg, text, label } = styles[s];
  return (
    <span className={`${bg} ${text} text-[12px] font-semibold px-[10px] py-[4px] rounded-badge`}>
      {label}
    </span>
  );
}
