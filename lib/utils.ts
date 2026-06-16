import { format, differenceInMonths, differenceInYears, parseISO } from "date-fns";
import type { VaccinationStatus } from "./types";

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "d MMM yyyy");
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
}

export function calculateAge(dateOfBirth: string | Date): string {
  const dob = typeof dateOfBirth === "string" ? parseISO(dateOfBirth) : dateOfBirth;
  const now = new Date();
  const years = differenceInYears(now, dob);
  const months = differenceInMonths(now, dob);

  if (years >= 1) {
    const remainingMonths = months - years * 12;
    if (remainingMonths === 0) return `${years}y`;
    return `${years}y ${remainingMonths}m`;
  }
  return `${months} month${months !== 1 ? "s" : ""}`;
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

export function getVaccinationStatus(nextDueDate: string | null): VaccinationStatus {
  if (!nextDueDate) return "up_to_date";
  const due = parseISO(nextDueDate);
  const now = new Date();
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 30) return "due_soon";
  return "up_to_date";
}
