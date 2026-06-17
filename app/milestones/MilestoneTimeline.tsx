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

export default function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  const [selected, setSelected] = useState<Milestone | null>(null);

  return (
    <>
      <div className="relative">
        <div className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-[#E0E0E0]" />
        <div className="flex flex-col gap-5">
          {milestones.map((m) => (
            <div key={m.id} className="flex gap-4 items-start">
              <div className="w-4 h-4 rounded-full bg-accent shrink-0 mt-1.5 z-10" />
              <button
                onClick={() => setSelected(m)}
                className="flex-1 bg-white rounded-card p-4 flex flex-col gap-2 text-left"
              >
                <span className="text-[12px] text-text-secondary">{formatDate(m.date)}</span>
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
