"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NumberField, DateField, TextField, toNumber } from "./fields";
import { useCoveredCallStore } from "@/store/useCoveredCallStore";
import { getTodayTW, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Currency } from "@/types/taiwan";
import type { CoveredCallLeg } from "@/types/covered-call";

interface Props {
  positionId: string;
  multiplier: number;
  currency: Currency;
  /** 有值代表這是轉倉：先買回這一腳，再賣出新的一腳 */
  rollFrom?: CoveredCallLeg;
  onDone: () => void;
}

export function SellCallForm({
  positionId,
  multiplier,
  currency,
  rollFrom,
  onDone,
}: Props) {
  const { t } = useT();
  const addLeg = useCoveredCallStore((s) => s.addLeg);

  const [strike, setStrike] = useState(rollFrom ? String(rollFrom.strike) : "");
  const [expiry, setExpiry] = useState("");
  const [contracts, setContracts] = useState(
    rollFrom ? String(rollFrom.contracts) : "1",
  );
  const [openDate, setOpenDate] = useState(getTodayTW());
  const [openPremium, setOpenPremium] = useState("");
  const [openFee, setOpenFee] = useState("");
  const [notes, setNotes] = useState("");
  const [rollClosePremium, setRollClosePremium] = useState("");
  const [rollCloseFee, setRollCloseFee] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const contractsNum = toNumber(contracts, 0);
  const credit =
    toNumber(openPremium, 0) * multiplier * contractsNum - toNumber(openFee, 0);
  // 轉倉時真正入袋的是「新賣出權利金 − 買回舊倉成本」
  const rollDebit = rollFrom
    ? toNumber(rollClosePremium, 0) * multiplier * contractsNum +
      toNumber(rollCloseFee, 0)
    : 0;
  const netCredit = credit - rollDebit;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await addLeg(positionId, {
        strike: toNumber(strike),
        expiry,
        contracts: contractsNum,
        openDate,
        openPremium: toNumber(openPremium),
        openFee: toNumber(openFee, 0),
        notes: notes.trim() || undefined,
        ...(rollFrom
          ? {
              rolledFromId: rollFrom.id,
              rollClosePremium: toNumber(rollClosePremium, 0),
              rollCloseFee: toNumber(rollCloseFee, 0),
            }
          : {}),
      });
      toast.success(t("coveredCalls.added"));
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("coveredCalls.saveFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/40 p-3">
      <h4 className="text-xs font-semibold">
        {rollFrom ? t("coveredCalls.rollTitle") : t("coveredCalls.sellCall")}
      </h4>

      {rollFrom && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label={t("coveredCalls.rollBuyback")}
            value={rollClosePremium}
            onChange={setRollClosePremium}
            placeholder="0"
          />
          <NumberField
            label={t("coveredCalls.rollBuybackFee")}
            value={rollCloseFee}
            onChange={setRollCloseFee}
            placeholder="0"
          />
        </div>
      )}

      {rollFrom && (
        <p className="text-xs font-medium text-muted-foreground">
          {t("coveredCalls.newLeg")}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <NumberField
          label={t("coveredCalls.strike")}
          value={strike}
          onChange={setStrike}
          placeholder="0"
        />
        <DateField
          label={t("coveredCalls.expiry")}
          value={expiry}
          onChange={setExpiry}
        />
        <NumberField
          label={t("coveredCalls.contracts")}
          value={contracts}
          onChange={setContracts}
          placeholder="1"
        />
        <DateField
          label={t("coveredCalls.sellDate")}
          value={openDate}
          onChange={setOpenDate}
        />
        <NumberField
          label={t("coveredCalls.premium")}
          value={openPremium}
          onChange={setOpenPremium}
          placeholder="0"
        />
        <NumberField
          label={t("coveredCalls.openFee")}
          value={openFee}
          onChange={setOpenFee}
          placeholder="0"
        />
      </div>

      <TextField
        label={t("common.notes")}
        value={notes}
        onChange={setNotes}
        placeholder={t("coveredCalls.notesPlaceholder")}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {t("coveredCalls.credit")}{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(netCredit, currency, true)}
          </span>
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onDone}
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={submitting || !strike || !expiry || contractsNum <= 0}
            onClick={handleSubmit}
          >
            {rollFrom ? t("coveredCalls.roll") : t("coveredCalls.sellCall")}
          </Button>
        </div>
      </div>
    </div>
  );
}
