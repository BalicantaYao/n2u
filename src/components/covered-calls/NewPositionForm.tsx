"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SymbolSearch } from "@/components/trade-form/SymbolSearch";
import { NumberField, DateField, TextField, toNumber } from "./fields";
import { useCoveredCallStore } from "@/store/useCoveredCallStore";
import { getTodayTW, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Market } from "@/types/taiwan";
import type { UnderlyingType } from "@/types/covered-call";

/** 各底倉型態的預設契約乘數：股票選擇權每口 2,000 股、現股一張 1,000 股 */
const DEFAULT_MULTIPLIER: Record<UnderlyingType, number> = {
  LONG_CALL: 2000,
  STOCK: 1000,
};

export function NewPositionForm() {
  const { t } = useT();
  const create = useCoveredCallStore((s) => s.create);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [symbol, setSymbol] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [market, setMarket] = useState<Market | null>(null);
  const [underlyingType, setUnderlyingType] = useState<UnderlyingType>("LONG_CALL");
  const [multiplier, setMultiplier] = useState(String(DEFAULT_MULTIPLIER.LONG_CALL));
  const [quantity, setQuantity] = useState("1");
  const [openDate, setOpenDate] = useState(getTodayTW());
  const [openPrice, setOpenPrice] = useState("");
  const [openFee, setOpenFee] = useState("");
  const [strike, setStrike] = useState("");
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");

  const isLongCall = underlyingType === "LONG_CALL";

  function reset() {
    setSymbol("");
    setSymbolName("");
    setMarket(null);
    setQuantity("1");
    setOpenDate(getTodayTW());
    setOpenPrice("");
    setOpenFee("");
    setStrike("");
    setExpiry("");
    setNotes("");
  }

  function switchType(next: UnderlyingType) {
    setUnderlyingType(next);
    setMultiplier(String(DEFAULT_MULTIPLIER[next]));
  }

  async function handleSubmit() {
    if (!symbol || !market) {
      toast.error(t("coveredCalls.selectStockFirst"));
      return;
    }
    setSubmitting(true);
    try {
      await create({
        symbol,
        market,
        symbolName: symbolName || undefined,
        underlyingType,
        contractMultiplier: toNumber(multiplier, DEFAULT_MULTIPLIER[underlyingType]),
        quantity: toNumber(quantity),
        openDate,
        openPrice: toNumber(openPrice),
        openFee: toNumber(openFee, 0),
        strike: isLongCall ? toNumber(strike) : null,
        expiry: isLongCall ? expiry || null : null,
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

      <SymbolSearch
        value={symbol ? `${symbol} ${symbolName}` : ""}
        onChange={(sym, name, mkt) => {
          setSymbol(sym);
          setSymbolName(name);
          setMarket(mkt);
        }}
        placeholder={t("coveredCalls.searchPlaceholder")}
      />

      <div className="space-y-1">
        <span className="block text-xs font-medium text-muted-foreground">
          {t("coveredCalls.underlyingType")}
        </span>
        <div className="flex gap-2">
          {(["LONG_CALL", "STOCK"] as UnderlyingType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => switchType(type)}
              className={cn(
                "flex-1 rounded-md border-2 py-2 text-sm font-medium transition-colors",
                underlyingType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background hover:bg-accent",
              )}
            >
              {type === "LONG_CALL"
                ? t("coveredCalls.typeLongCall")
                : t("coveredCalls.typeStock")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <NumberField
          label={`${t("coveredCalls.quantity")}（${
            isLongCall
              ? t("coveredCalls.quantityUnitContracts")
              : t("coveredCalls.quantityUnitLots")
          }）`}
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
        {isLongCall && (
          <>
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
          </>
        )}
        <NumberField
          label={t("coveredCalls.openFee")}
          value={openFee}
          onChange={setOpenFee}
          placeholder="0"
        />
        <NumberField
          label={t("coveredCalls.contractMultiplier")}
          value={multiplier}
          onChange={setMultiplier}
          hint={t("coveredCalls.multiplierHint")}
          className="sm:col-span-2 md:col-span-3"
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
          disabled={submitting || !symbol || !market}
          onClick={handleSubmit}
        >
          {t("coveredCalls.addPosition")}
        </Button>
      </div>
    </div>
  );
}
