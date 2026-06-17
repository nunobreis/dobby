"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Milestone = {
  id: string;
  title: string;
  date: string;
  photo_url: string | null;
  notes: string | null;
};

export default function MilestoneCards({ milestones }: { milestones: Milestone[] }) {
  const [selected, setSelected] = useState<Milestone | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {milestones.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            className="bg-white rounded-[16px] overflow-hidden flex flex-col text-left w-full"
          >
            {m.photo_url && (
              <img
                src={m.photo_url}
                alt={m.title}
                className="w-full h-24 lg:h-40 object-cover"
              />
            )}
            <div className="p-3.5 flex flex-col gap-1">
              <span className="text-[14px] font-bold text-text-primary">{m.title}</span>
              <span className="text-[12px] text-text-secondary">{formatDate(m.date)}</span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-[24px] overflow-hidden w-full sm:max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.photo_url && (
              <img
                src={selected.photo_url}
                alt={selected.title}
                className="w-full object-cover max-h-[55vh]"
              />
            )}
            <div className="p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[18px] font-bold text-text-primary">{selected.title}</h2>
                  <span className="text-[13px] text-text-secondary">{formatDate(selected.date)}</span>
                </div>
                <button
                  onClick={() => setSelected(null)}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
