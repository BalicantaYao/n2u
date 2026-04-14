"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { formatTWD } from "@/lib/utils";
import type { DailyPnL } from "@/types/trade";

export function DailyPnLBar({ data }: { data: DailyPnL[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        尚無資料
      </div>
    );
  }

  const recent = data.slice(-30);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={recent} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${Math.round(v / 1000)}K`}
          width={45}
        />
        <Tooltip
          formatter={(v) => [formatTWD(v as number), "當日損益"]}
          labelFormatter={(l) => `日期：${l}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="daily" radius={[2, 2, 0, 0]}>
          {recent.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.daily >= 0 ? "#16a34a" : "#dc2626"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
