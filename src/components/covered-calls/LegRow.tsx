"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberField, DateField, toNumber } from "./fields";
import { useCoveredCallStore } from "@/store/useCoveredCallStore";
import {
  formatDateOnly,
  daysUntil,
  legNetCredit,
  legRealizedPnL,
} from "@/lib/covered-call";
import { cn, formatCurrency, getTodayTW } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Currency } from "@/types/taiwan";
import type { CoveredCallLeg, LegStatus } from "@/types/covered-call";

/** 使用者可主動選擇的結束方式（ROLLED 由「轉倉」流程產生） */
const CLOSE_METHODS: LegStatus[] = ["BOUGHT_BACK", "EXPIRED", "ASSIGNED"];

interface Props {
  leg: CoveredCallLeg;
  positionId: string;
  multiplier: number;
  currency: Currency;
  onRoll: (leg: CoveredCallLeg) => void;
}

export function LegRow({ leg, positionId, multiplier, currency, onRoll }: Props) {
  const { t } = useT();
  const updateLeg = useCoveredCallStore((s) => s.updateLeg);
  const removeLeg = useCoveredCallStore((s) => s.removeLeg);

  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<LegStatus>("BOUGHT_BACK");
  const [closeDate, setCloseDate] = useState(getTodayTW());
  const [closePremium, setClosePremium] = useState("");
  const [closeFee, setCloseFee] = useState("");

  const isOpen = leg.status === "OPEN";
  const realized = legRealizedPnL(leg, multiplier);
  const credit = legNetCredit(leg, multiplier);
  const days = daysUntil(leg.expiry);

  async function run(fn: () => Promise<unknown>, failKey: string) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(failKey));
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    await run(async () => {
      await updateLeg(positionId, leg.id, {
        status: method,
        closeDate,
        closePremium: method === "EXPIRED" ? 0 : toNumber(closePremium, 0),
        closeFee: toNumber(closeFee, 0),
      });
      toast.success(t("coveredCalls.saved"));
      setClosing(false);
    }, "coveredCalls.saveFailed");
  }

  async function handleDelete() {
    if (!window.confirm(t("coveredCalls.confirmDeleteLeg"))) return;
    await run(
      () => removeLeg(positionId, leg.id),
      "coveredCalls.deleteFailed",
    );
  }

  return (
    <div className="rounded-md border bg-background p-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-mono font-medium">
          {leg.strike} C
        </span>
        <span className="text-muted-foreground">
          {formatDateOnly(leg.expiry)}
          {isOpen && days != null && (
            <span className={cn("ml-1", days <= 7 && "text-amber-600 dark:text-amber-400")}>
              (
              {days < 0
                ? t("coveredCalls.expired")
                : t("coveredCalls.daysToExpiry", { days })}
              )
            </span>
          )}
        </span>
        <span className="text-muted-foreground">
          × {leg.contracts} @ {leg.openPremium}
        </span>
        <span className="text-muted-foreground">
          {t("coveredCalls.credit")}{" "}
          <span className="font-mono text-foreground">
            {formatCurrency(credit, currency, true)}
          </span>
        </span>

        <span className="ml-auto flex items-center gap-2">
          {isOpen ? (
            <Badge variant="outline" className="text-[11px]">
              {t("coveredCalls.statusOPEN")}
            </Badge>
          ) : (
            <>
              <Badge variant="secondary" className="text-[11px]">
                {t(`coveredCalls.status${leg.status}`)}
              </Badge>
              {realized != null && (
                <span
                  className={cn(
                    "font-mono font-medium",
                    realized >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatCurrency(realized, currency, true)}
                </span>
              )}
            </>
          )}
        </span>
      </div>

      {leg.notes && (
        <p className="mt-1 whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
          {leg.notes}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {isOpen ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => setClosing((v) => !v)}
            >
              {t("coveredCalls.closeLeg")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => onRoll(leg)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              {t("coveredCalls.roll")}
            </Button>
          </>
        ) : (
          <>
            <span className="text-[11px] text-muted-foreground">
              {leg.closeDate ? formatDateOnly(leg.closeDate) : ""}
              {/* 到期歸零的平倉價值一定是 0，不必再顯示 */}
              {leg.status !== "EXPIRED" &&
                leg.closePremium != null &&
                ` @ ${leg.closePremium}`}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              disabled={busy}
              onClick={() =>
                run(
                  () => updateLeg(positionId, leg.id, { status: "OPEN" }),
                  "coveredCalls.saveFailed",
                )
              }
            >
              <Undo2 className="mr-1 h-3 w-3" />
              {t("coveredCalls.reopenLeg")}
            </Button>
          </>
        )}
        <button
          type="button"
          title={t("common.delete")}
          aria-label={t("common.delete")}
          disabled={busy}
          onClick={handleDelete}
          className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {closing && (
        <div className="mt-2 space-y-2 rounded-md border bg-muted/40 p-2.5">
          <div className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">
              {t("coveredCalls.closeMethod")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CLOSE_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    method === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background hover:bg-accent",
                  )}
                >
                  {t(`coveredCalls.status${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <DateField
              label={t("coveredCalls.closeDate")}
              value={closeDate}
              onChange={setCloseDate}
            />
            {method !== "EXPIRED" && (
              <NumberField
                label={t("coveredCalls.closePremium")}
                value={closePremium}
                onChange={setClosePremium}
                placeholder="0"
                hint={t("coveredCalls.closePremiumHint")}
              />
            )}
            <NumberField
              label={t("coveredCalls.closeFee")}
              value={closeFee}
              onChange={setCloseFee}
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setClosing(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px]"
              disabled={busy}
              onClick={handleClose}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
