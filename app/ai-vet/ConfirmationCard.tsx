"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  saveAiVaccination,
  saveAiVetVisit,
  saveAiWeightEntry,
  saveAiMedication,
  updateAiVaccination,
  updateAiVetVisit,
  updateAiWeightEntry,
  updateAiMedication,
} from "@/lib/actions/ai-records";

interface Props {
  toolType: string; // e.g. "tool-addVaccination" (the ToolUIPart type field from AI SDK v6)
  args: Record<string, unknown>;
}

type CardState = "idle" | "saving" | "saved" | "error";

const FIELD_LABELS: Record<string, string> = {
  vaccine_name: "Vaccine",
  date_given: "Date given",
  next_due_date: "Next due",
  vet_clinic: "Clinic",
  batch_number: "Batch no.",
  date: "Date",
  reason: "Reason",
  outcome: "Outcome",
  cost: "Cost (€)",
  weight_kg: "Weight (kg)",
  name: "Medication",
  medication_type: "Type",
  dosage: "Dosage",
  frequency: "Frequency",
  start_date: "Start date",
  end_date: "End date",
  prescribed_by: "Prescribed by",
  notes: "Notes",
};

const DATE_FIELDS = new Set([
  "date_given",
  "next_due_date",
  "date",
  "start_date",
  "end_date",
]);

const ID_FIELDS = new Set([
  "vaccination_id",
  "vet_visit_id",
  "weight_entry_id",
  "medication_id",
]);

const TOOL_META: Record<string, { title: string; href: string }> = {
  addVaccination:    { title: "Add Vaccination",    href: "/vaccinations" },
  addVetVisit:       { title: "Add Vet Visit",       href: "/vet-visits" },
  addWeightEntry:    { title: "Add Weight Entry",    href: "/weight" },
  addMedication:     { title: "Add Medication",      href: "/medications" },
  updateVaccination: { title: "Update Vaccination",  href: "/vaccinations" },
  updateVetVisit:    { title: "Update Vet Visit",    href: "/vet-visits" },
  updateWeightEntry: { title: "Update Weight Entry", href: "/weight" },
  updateMedication:  { title: "Update Medication",   href: "/medications" },
};

export default function ConfirmationCard({ toolType, args }: Props) {
  const [cardState, setCardState] = useState<CardState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  const toolName = toolType.replace(/^tool-/, "");
  const meta = TOOL_META[toolName];

  if (dismissed || !meta) return null;

  const handleConfirm = async () => {
    setCardState("saving");
    try {
      let result;
      if (toolName === "addVaccination") {
        result = await saveAiVaccination(
          args as Parameters<typeof saveAiVaccination>[0]
        );
      } else if (toolName === "addVetVisit") {
        result = await saveAiVetVisit(
          args as Parameters<typeof saveAiVetVisit>[0]
        );
      } else if (toolName === "addWeightEntry") {
        result = await saveAiWeightEntry(
          args as Parameters<typeof saveAiWeightEntry>[0]
        );
      } else if (toolName === "addMedication") {
        result = await saveAiMedication(
          args as Parameters<typeof saveAiMedication>[0]
        );
      } else if (toolName === "updateVaccination") {
        result = await updateAiVaccination(
          args as Parameters<typeof updateAiVaccination>[0]
        );
      } else if (toolName === "updateVetVisit") {
        result = await updateAiVetVisit(
          args as Parameters<typeof updateAiVetVisit>[0]
        );
      } else if (toolName === "updateWeightEntry") {
        result = await updateAiWeightEntry(
          args as Parameters<typeof updateAiWeightEntry>[0]
        );
      } else {
        result = await updateAiMedication(
          args as Parameters<typeof updateAiMedication>[0]
        );
      }
      if ("error" in result) throw new Error(result.error);
      setCardState("saved");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setCardState("error");
    }
  };

  const displayFields = Object.entries(args).filter(
    ([key, v]) => v !== undefined && v !== null && !ID_FIELDS.has(key)
  );

  return (
    <div className="bg-white rounded-card border-l-4 border-accent p-4 flex flex-col gap-3 max-w-[80%]">
      <p className="text-[13px] font-semibold text-text-primary">{meta.title}</p>

      <div className="flex flex-col gap-1.5">
        {displayFields.map(([key, value]) => (
          <div key={key} className="flex gap-2 text-[13px]">
            <span className="text-text-secondary w-24 shrink-0">
              {FIELD_LABELS[key] ?? key}
            </span>
            <span className="text-text-primary font-medium">
              {DATE_FIELDS.has(key)
                ? (() => {
                    try {
                      return formatDate(String(value));
                    } catch {
                      return String(value);
                    }
                  })()
                : String(value)}
            </span>
          </div>
        ))}
      </div>

      {cardState === "saved" ? (
        <div className="flex items-center gap-2 text-green-600 text-[13px]">
          <CheckCircle size={16} />
          <span>Saved!</span>
          <a href={meta.href} className="underline ml-1">
            View records
          </a>
        </div>
      ) : cardState === "error" ? (
        <>
          <p className="text-[12px] text-red-500">
            {errorMessage || "Something went wrong. Please try again."}
          </p>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setDismissed(true)}
              className="text-[13px] text-text-secondary px-3 py-1.5"
            >
              Dismiss
            </button>
            <button
              onClick={handleConfirm}
              className="text-[13px] bg-accent text-white rounded-pill px-4 py-1.5"
            >
              Retry
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setDismissed(true)}
            className="text-[13px] text-text-secondary px-3 py-1.5"
          >
            Dismiss
          </button>
          <button
            onClick={handleConfirm}
            disabled={cardState === "saving"}
            className="text-[13px] bg-accent text-white rounded-pill px-4 py-1.5 disabled:opacity-50"
          >
            {cardState === "saving" ? "Saving…" : "Confirm & Save"}
          </button>
        </div>
      )}
    </div>
  );
}
