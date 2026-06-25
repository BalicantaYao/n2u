"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useWalletBalance } from "@/lib/use-wallet";
import { formatCurrency, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Wallet } from "lucide-react";
import type { Currency } from "@/types/taiwan";

/** 總覽頁的小卡：顯示指定幣別（台股 TWD／美股 USD）的現金錢包餘額 */
export function WalletBalanceCard({
  currency,
  className,
}: {
  currency: Currency;
  className?: string;
}) {
  const { t } = useT();
  const balance = useWalletBalance(currency);

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 md:p-5 h-full flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              {t("dashboard.walletBalance")}
            </p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                balance != null && balance < 0 && "text-red-600 dark:text-red-400",
              )}
            >
              {balance == null ? "—" : formatCurrency(balance, currency)}
            </p>
          </div>
          <div className="rounded-md bg-muted p-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {currency === "USD" ? t("marketTabs.us") : t("marketTabs.tw")} · {currency}
        </p>
      </CardContent>
    </Card>
  );
}
