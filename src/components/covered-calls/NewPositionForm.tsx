"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberField, DateField, TextField, toNumber } from "./fields";
import { useCoveredCallStore } from "@/store/useCoveredCallStore";
import { getTodayTW } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { TAIEX_UNDERLYING } from "@/types/covered-call";

export function NewPositionForm() {
  const { t } = useT();
  const create = useCoveredCallStore((s) => s.create);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [quantity, setQuantity] = useState("1");
  const [openDate, setOpenDate] = useState(getTodayTW());
  const [openPrice, setOpenPrice] = useState("");
  const [openFee, setOpenFee] = useState("");
  const [strike, setStrike] = useState("");
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit = toNumber(strike) > 0 && !!expiry;

  function reset() {
    setQuantity("1");
    setOpenDate(getTodayTW());
    setOpenPrice("");
    setOpenFee("");
    setStrike("");
    setExpiry("");
    setNotes("");
  }

  async function handleSubmit() {
    if (!canSubmit) {
      toast.error(t("coveredCalls.strikeExpiryRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await create({
        quantity: toNumber(quantity),
        openDate,
        openPrice: toNumber(openPrice),
        openFee: toNumber(openFee, 0),
        strike: toNumber(strike),
        expiry,
        notes: notes.trim() || undefined,
      });
      toast.success(t("coveredCalls.added"));
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("coveredCalls.saveFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" className="h-9" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        {t("coveredCalls.newPosition")}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("coveredCalls.newPosition")}</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t("common.cancel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 標的固定為台股加權股價指數（台指選擇權），不需選擇 */}
      <div className="rounded-md border bg-muted/40 px-3 py-2">
        <p className="text-[11px] text-muted-foreground">
          {t("coveredCalls.underlying")}
        </p>
        <p className="text-sm font-medium">
          {t("coveredCalls.underlyingName")}
          <span className="ml-1.5 font-mono text-xs text-muted-foreground">
            {TAIEX_UNDERLYING.symbol}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t("coveredCalls.underlyingHint", {
            multiplier: TAIEX_UNDERLYING.contractMultiplier,
          })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <NumberField
          label={`${t("coveredCalls.quantity")}（${t(
            "coveredCalls.quantityUnitContracts",
          )}）`}
          value={quantity}
          onChange={setQuantity}
          placeholder="1"
        />
        <DateField
          label={t("coveredCalls.openDate")}
          value={openDate}
          onChange={setOpenDate}
        />
        <NumberField
          label={t("coveredCalls.openPrice")}
          value={openPrice}
          onChange={setOpenPrice}
          placeholder="0"
        />
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

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setOpen(false)}
        >
          {t("common.cancel")}
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs"
          disabled={submitting || !canSubmit}
          onClick={handleSubmit}
        >
          {t("coveredCalls.addPosition")}
        </Button>
      </div>
    </div>
  );
}
