"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLocale } from "next-intl";
import { pt } from "date-fns/locale";
import { formatDateShort } from "@/lib/utils";

interface Entry {
  date: string;
  weight_kg: number;
}

export default function WeightChart({ entries }: { entries: Entry[] }) {
  const locale = useLocale();
  const dateFnsLocale = locale === "pt" ? pt : undefined;

  const data = entries.map((e) => ({
    date: formatDateShort(e.date, dateFnsLocale),
    weight: e.weight_kg,
  }));

  const tickInterval = entries.length > 6 ? Math.ceil(entries.length / 5) - 1 : 0;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#7A7A7A" }}
          tickLine={false}
          axisLine={false}
          interval={tickInterval}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#7A7A7A" }}
          tickLine={false}
          axisLine={false}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 13,
          }}
          formatter={(value) => [`${value} kg`, "Weight"]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#8B5CF6"
          strokeWidth={2.5}
          dot={{ fill: "#8B5CF6", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
