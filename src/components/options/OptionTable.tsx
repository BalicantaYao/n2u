"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Pencil, Trash2 } from "lucide-react";
import type { OptionTrade } from "@/types/option";
import type { Currency } from "@/types/taiwan";

interface OptionTableProps {
  options: OptionTrade[];
  onDelete: (id: string) => void;
}

function actionLabel(action: string, t: (k: string) => string): string {
  if (action === "SELL_PUT") return t("options.sellPut");
  if (action === "BUY_PUT") return t("options.buyPut");
  return action;
}

export function OptionTable({ options, onDelete }: OptionTableProps) {
  const { t } = useT();

  if (options.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">{t("options.noRecords")}</p>
        <Link
          href="/options/new"
          className="text-primary underline text-sm mt-1 inline-block"
        >
          {t("options.addFirst")}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden divide-y">
        {options.map((op) => {
          const isSell = op.action.startsWith("SELL_");
          return (
            <div key={op.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">{op.symbol}</span>
                  <Badge variant={isSell ? "profit" : "loss"} className="text-xs">
                    {actionLabel(op.action, t)}
                  </Badge>
                  <Badge
                    variant={op.status === "OPEN" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {op.status === "OPEN" ? t("options.open") : t("options.closed")}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/options/${op.id}/edit`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(t("common.confirmDelete"))) onDelete(op.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                <span>{formatDate(op.tradeDate)}</span>
                <span>
                  {t("options.strikeShort")} ${op.strikePrice}
                </span>
                <span>
                  {t("options.expShort")} {formatDate(op.expirationDate)}
                </span>
                {op.delta != null && <span>Δ {op.delta}</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {op.quantity} × ${Math.abs(op.premium).toFixed(2)}
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums text-sm",
                    op.netPremium > 0 && "text-green-600 dark:text-green-400",
                    op.netPremium < 0 && "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatCurrency(op.netPremium, op.currency as Currency, true)}
                </span>
              </div>
              {op.notes && (
                <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                  {op.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground bg-muted/30">
              <th className="text-left py-3 pl-4 pr-4 font-medium">
                {t("common.date")}
              </th>
              <th className="text-left py-3 pr-4 font-medium">
                {t("options.symbol")}
              </th>
              <th className="text-left py-3 pr-4 font-medium">
                {t("options.action")}
              </th>
              <th className="text-right py-3 pr-4 font-medium">
                {t("options.qty")}
              </th>
              <th className="text-right py-3 pr-4 font-medium">
                {t("options.strike")}
              </th>
              <th className="text-left py-3 pr-4 font-medium">
                {t("options.expiration")}
              </th>
              <th className="text-right py-3 pr-4 font-medium">
                {t("options.delta")}
              </th>
              <th className="text-right py-3 pr-4 font-medium">
                {t("options.premium")}
              </th>
              <th className="text-right py-3 pr-4 font-medium">
                {t("options.netPremium")}
              </th>
              <th className="text-left py-3 pr-4 font-medium">
                {t("options.status")}
              </th>
              <th className="text-left py-3 pr-4 font-medium">
                {t("common.notes")}
              </th>
              <th className="text-center py-3 pr-4 font-medium">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((op) => {
              const isSell = op.action.startsWith("SELL_");
              return (
                <tr key={op.id} className="border-b hover:bg-muted/40">
                  <td className="py-3 pl-4 pr-4 text-muted-foreground whitespace-nowrap">
                    {formatDate(op.tradeDate)}
                  </td>
                  <td className="py-3 pr-4 font-medium">{op.symbol}</td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={isSell ? "profit" : "loss"}
                      className="text-xs"
                    >
                      {actionLabel(op.action, t)}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {op.quantity}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    ${op.strikePrice.toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {formatDate(op.expirationDate)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                    {op.delta != null ? op.delta.toFixed(2) : "—"}
                  </td>
                  <td
                    className={cn(
                      "py-3 pr-4 text-right tabular-nums",
                      op.premium > 0 && "text-green-600 dark:text-green-400",
                      op.premium < 0 && "text-red-600 dark:text-red-400",
                    )}
                  >
                    {op.premium >= 0 ? "+" : "-"}$
                    {Math.abs(op.premium).toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "py-3 pr-4 text-right tabular-nums font-medium",
                      op.netPremium > 0 && "text-green-600 dark:text-green-400",
                      op.netPremium < 0 && "text-red-600 dark:text-red-400",
                    )}
                  >
                    {formatCurrency(op.netPremium, op.currency as Currency, true)}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={op.status === "OPEN" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {op.status === "OPEN"
                        ? t("options.open")
                        : t("options.closed")}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 max-w-[200px] truncate text-muted-foreground text-xs">
                    {op.notes ?? ""}
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/options/${op.id}/edit`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(t("common.confirmDelete"))) onDelete(op.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
