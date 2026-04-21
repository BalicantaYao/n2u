"use client";

import { calculateFees, calcSettlementDate } from "@/lib/fees";
import { lotsToShares } from "@/lib/taiwan-fees";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { marketToCurrency, isUSMarket } from "@/types/taiwan";
import type { Market } from "@/types/taiwan";

interface FeePreviewProps {
  market: Market;
  price: number;
  shares: number;
  lotType: "ROUND" | "ODD";
  lots?: number;
  side: "BUY" | "SELL";
  isETF: boolean;
  tradeDate: string;
  commission?: number;
}

export function FeePreview({
  market,
  price,
  shares,
  lotType,
  lots,
  side,
  isETF,
  tradeDate,
  commission,
}: FeePreviewProps) {
  const { t } = useT();
  const isUS = isUSMarket(market);
  const currency = marketToCurrency(market);

  const actualShares = isUS
    ? shares
    : lotType === "ROUND" && lots
      ? lotsToShares(lots)
      : shares;

  if (!price || actualShares <= 0) {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        {t("fee.enterPriceAndQty")}
      </div>
    );
  }

  const fees = calculateFees(market, {
    price,
    shares: actualShares,
    side,
    isETF,
    commission,
  });
  const settlementDate = tradeDate
    ? calcSettlementDate(market, new Date(tradeDate))
    : null;

  const rows: Array<{ label: string; value: string }> = [
    { label: t("fee.grossAmount"), value: formatCurrency(fees.grossAmount, currency) },
    {
      label: isUS ? t("fee.commissionUS") : t("fee.commission"),
      value: `- ${formatCurrency(fees.commission, currency)}`,
    },
  ];
  if (!isUS && side === "SELL") {
    rows.push({
      label: isETF ? t("fee.taxETF") : t("fee.taxStock"),
      value: `- ${formatCurrency(fees.transactionTax, currency)}`,
    });
  }
  rows.push({
    label: t("fee.totalFees"),
    value: `- ${formatCurrency(fees.totalFees, currency)}`,
  });

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
          {formatCurrency(fees.netAmount, currency)}
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
