"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatTWD } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { DailyPnL } from "@/types/trade";

interface PnLChartProps {
  data: DailyPnL[];
}

export function PnLChart({ data }: PnLChartProps) {
  const { t } = useT();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("chart.noTradeData")}
      </div>
    );
  }

  const isPositive = (data[data.length - 1]?.cumulative ?? 0) >= 0;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={isPositive ? "#16a34a" : "#dc2626"}
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor={isPositive ? "#16a34a" : "#dc2626"}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => v.slice(5)}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${Math.round(v / 1000)}K`}
          className="text-muted-foreground"
          width={50}
        />
        <Tooltip
          formatter={(value) => [formatTWD(value as number), t("chart.cumulativePnL")]}
          labelFormatter={(label) => `${t("chart.datePrefix")}${label}`}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={isPositive ? "#16a34a" : "#dc2626"}
          strokeWidth={2}
          fill="url(#pnlGradient)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
