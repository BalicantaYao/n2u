"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useWalletBalance } from "@/lib/use-wallet";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Currency } from "@/types/taiwan";
import type { Position } from "@/types/trade";

/** 資產分布配色：現金固定灰色，持股依序套用以下色票 */
const CASH_COLOR = "#94a3b8";
const SLICE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#7c3aed",
  "#ca8a04",
];

interface Slice {
  name: string;
  value: number;
  isCash?: boolean;
}

/**
 * 總覽頁的資產分布圓餅圖：以現金（錢包餘額）＋各持股市值（無報價則退回成本）
 * 計算單一市場的資產配置。台股與美股分別呈現。
 */
export function AssetAllocationChart({
  currency,
  positions,
}: {
  currency: Currency;
  positions: Position[] | null;
}) {
  const { t } = useT();
  const cash = useWalletBalance(currency);

  if (positions == null || cash == null) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        {t("common.loading")}
      </div>
    );
  }

  const holdings: Slice[] = positions
    .map((p) => ({
      name: p.symbolName ? `${p.symbol} ${p.symbolName}` : p.symbol,
      value: p.marketValue ?? p.totalCost,
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const data: Slice[] = [...holdings];
  if (cash > 0) data.push({ name: t("dashboard.cash"), value: cash, isCash: true });

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        {t("dashboard.noAssets")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {t("dashboard.totalAssets")}:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {formatCurrency(total, currency)}
        </span>
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((d, i) => (
              <Cell
                key={d.name}
                fill={d.isCash ? CASH_COLOR : SLICE_COLORS[i % SLICE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${formatCurrency(value as number, currency)} (${(
                ((value as number) / total) *
                100
              ).toFixed(1)}%)`,
              name,
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            iconType="circle"
            iconSize={10}
            formatter={(value) => <span className="text-xs">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
