"use client";

import { calculateFees, calcSettlementDate, lotsToShares } from "@/lib/taiwan-fees";
import { formatTWD, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

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
  const { t } = useT();
  const actualShares = lotType === "ROUND" && lots ? lotsToShares(lots) : shares;

  if (!price || actualShares <= 0) {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        {t("fee.enterPriceAndQty")}
      </div>
    );
  }

  const fees = calculateFees({ price, shares: actualShares, side, isETF });
  const settlementDate = tradeDate
    ? calcSettlementDate(new Date(tradeDate))
    : null;

  const rows = [
    { label: t("fee.grossAmount"), value: formatTWD(fees.grossAmount) },
    { label: t("fee.commission"), value: `- ${formatTWD(fees.commission)}` },
    ...(side === "SELL"
      ? [
          {
            label: isETF ? t("fee.taxETF") : t("fee.taxStock"),
            value: `- ${formatTWD(fees.transactionTax)}`,
          },
        ]
      : []),
    { label: t("fee.totalFees"), value: `- ${formatTWD(fees.totalFees)}` },
  ];

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {t("fee.preview")}
      </p>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="tabular-nums font-medium">{row.value}</span>
        </div>
      ))}
      <div className="border-t pt-2 mt-2 flex justify-between text-sm font-bold">
        <span>{side === "BUY" ? t("fee.buyCost") : t("fee.sellProceeds")}</span>
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
          <span>{t("fee.settlementDate")}</span>
          <span>{formatDate(settlementDate)}</span>
        </div>
      )}
    </div>
  );
}
