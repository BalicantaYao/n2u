"use client";

import { calculateFees, calcSettlementDate, lotsToShares } from "@/lib/taiwan-fees";
import { formatTWD, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FeePreviewProps {
  price: number;
  shares: number;
  lotType: "ROUND" | "ODD";
  lots?: number;
  side: "BUY" | "SELL";
  isETF: boolean;
  tradeDate: string;
}

export function FeePreview({
  price,
  shares,
  lotType,
  lots,
  side,
  isETF,
  tradeDate,
}: FeePreviewProps) {
  const actualShares = lotType === "ROUND" && lots ? lotsToShares(lots) : shares;

  if (!price || actualShares <= 0) {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        請輸入價格與數量以預覽費用
      </div>
    );
  }

  const fees = calculateFees({ price, shares: actualShares, side, isETF });
  const settlementDate = tradeDate
    ? calcSettlementDate(new Date(tradeDate))
    : null;

  const rows = [
    { label: "成交金額", value: formatTWD(fees.grossAmount) },
    { label: "手續費 (0.1425%)", value: `- ${formatTWD(fees.commission)}` },
    ...(side === "SELL"
      ? [
          {
            label: `證交稅 (${isETF ? "0.1%" : "0.3%"})`,
            value: `- ${formatTWD(fees.transactionTax)}`,
          },
        ]
      : []),
    { label: "總手續費", value: `- ${formatTWD(fees.totalFees)}` },
  ];

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        費用預覽
      </p>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="tabular-nums font-medium">{row.value}</span>
        </div>
      ))}
      <div className="border-t pt-2 mt-2 flex justify-between text-sm font-bold">
        <span>{side === "BUY" ? "買進總成本" : "賣出淨所得"}</span>
        <span
          className={cn(
            "tabular-nums",
            side === "BUY" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
          )}
        >
          {formatTWD(fees.netAmount)}
        </span>
      </div>
      {settlementDate && (
        <div className="flex justify-between text-xs text-muted-foreground pt-1">
          <span>交割日</span>
          <span>{formatDate(settlementDate)}</span>
        </div>
      )}
    </div>
  );
}
