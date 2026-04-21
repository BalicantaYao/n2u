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
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { DailyPnL } from "@/types/trade";
import type { Currency } from "@/types/taiwan";

export function DailyPnLBar({
  data,
  currency = "TWD",
}: {
  data: DailyPnL[];
  currency?: Currency;
}) {
  const { t } = useT();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {t("common.noData")}
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
          formatter={(v) => [formatCurrency(v as number, currency), t("chart.dailyPnL")]}
          labelFormatter={(l) => `${t("chart.datePrefix")}${l}`}
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
