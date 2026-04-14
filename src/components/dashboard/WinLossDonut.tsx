"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface WinLossDonutProps {
  winCount: number;
  lossCount: number;
}

export function WinLossDonut({ winCount, lossCount }: WinLossDonutProps) {
  const data = [
    { name: "獲利", value: winCount },
    { name: "虧損", value: lossCount },
  ];

  if (winCount + lossCount === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        尚無資料
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
          formatter={(v, name) => [`${v} 筆`, name]}
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
