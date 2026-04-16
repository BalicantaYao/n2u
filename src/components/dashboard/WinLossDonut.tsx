"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useT } from "@/lib/i18n";

interface WinLossDonutProps {
  winCount: number;
  lossCount: number;
}

export function WinLossDonut({ winCount, lossCount }: WinLossDonutProps) {
  const { t } = useT();

  const data = [
    { name: t("chart.profit"), value: winCount },
    { name: t("chart.loss"), value: lossCount },
  ];

  if (winCount + lossCount === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {t("common.noData")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          <Cell fill="#16a34a" />
          <Cell fill="#dc2626" />
        </Pie>
        <Tooltip
          formatter={(v, name) => [`${v} ${t("chart.trades")}`, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend
          iconType="circle"
          iconSize={10}
          formatter={(value) => (
            <span className="text-xs">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
