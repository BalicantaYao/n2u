"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, getTodayTW } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useOptionStore } from "@/store/useOptionStore";
import {
  computeNetPremium,
  type OptionAction,
  type OptionStatus,
  type OptionTrade,
} from "@/types/option";

interface OptionFormProps {
  mode?: "create" | "edit";
  initialData?: OptionTrade;
}

export function OptionForm({ mode = "create", initialData }: OptionFormProps) {
  const router = useRouter();
  const { addOption, updateOption } = useOptionStore();
  const { t } = useT();
  const isEdit = mode === "edit";

  const [symbol, setSymbol] = useState(initialData?.symbol ?? "");
  const [action, setAction] = useState<OptionAction>(
    (initialData?.action as OptionAction) ?? "SELL_PUT",
  );
  const [quantity, setQuantity] = useState<string>(
    initialData?.quantity != null ? String(initialData.quantity) : "1",
  );
  const [strikePrice, setStrikePrice] = useState<string>(
    initialData?.strikePrice != null ? String(initialData.strikePrice) : "",
  );
  const [expirationDate, setExpirationDate] = useState(() =>
    initialData?.expirationDate
      ? new Date(initialData.expirationDate).toISOString().slice(0, 10)
      : "",
  );
  const [tradeDate, setTradeDate] = useState(() =>
    initialData?.tradeDate
      ? new Date(initialData.tradeDate).toISOString().slice(0, 10)
      : getTodayTW().replaceAll("/", "-"),
  );
  const [delta, setDelta] = useState<string>(
    initialData?.delta != null ? String(initialData.delta) : "",
  );
  const [premium, setPremium] = useState<string>(
    initialData?.premium != null ? String(Math.abs(initialData.premium)) : "",
  );
  const [status, setStatus] = useState<OptionStatus>(
    (initialData?.status as OptionStatus) ?? "OPEN",
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [loading, setLoading] = useState(false);

  const qtyNum = parseInt(quantity) || 0;
  const premiumNum = parseFloat(premium) || 0;
  const netPreview = computeNetPremium(action, premiumNum, qtyNum);
  const isSell = action.startsWith("SELL_");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!symbol) return toast.error(t("options.errorSymbol"));
    if (!strikePrice || parseFloat(strikePrice) <= 0)
      return toast.error(t("options.errorStrike"));
    if (!expirationDate) return toast.error(t("options.errorExpiration"));
    if (!tradeDate) return toast.error(t("options.errorTradeDate"));
    if (qtyNum <= 0) return toast.error(t("options.errorQuantity"));
    if (premiumNum <= 0) return toast.error(t("options.errorPremium"));

    setLoading(true);
    try {
      const payload = {
        symbol: symbol.toUpperCase(),
        action,
        quantity: qtyNum,
        strikePrice: parseFloat(strikePrice),
        expirationDate,
        tradeDate,
        delta: delta ? parseFloat(delta) : null,
        premium: premiumNum,
        status,
        notes: notes || null,
      };

      if (isEdit && initialData) {
        await updateOption(initialData.id, payload);
        toast.success(t("options.updated"));
      } else {
        await addOption(payload);
        toast.success(t("options.created"));
      }
      router.push("/options");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("options.saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Symbol */}
      <div className="space-y-2">
        <Label htmlFor="symbol">{t("options.symbol")}</Label>
        <Input
          id="symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="GOOG"
          className="max-w-xs uppercase"
          required
        />
      </div>

      {/* Action */}
      <div className="space-y-2">
        <Label>{t("options.action")}</Label>
        <div className="flex gap-2">
          {(["SELL_PUT", "BUY_PUT"] as OptionAction[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              className={cn(
                "flex-1 py-3 rounded-md text-sm font-semibold border-2 transition-colors",
                action === a
                  ? a === "SELL_PUT"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-red-600 text-white border-red-600"
                  : "border-input bg-background hover:bg-accent",
              )}
            >
              {a === "SELL_PUT" ? t("options.sellPut") : t("options.buyPut")}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">{t("options.quantity")}</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="max-w-xs"
          required
        />
      </div>

      {/* Strike price */}
      <div className="space-y-2">
        <Label htmlFor="strikePrice">{t("options.strikePrice")}</Label>
        <Input
          id="strikePrice"
          type="number"
          min={0.01}
          step={0.01}
          value={strikePrice}
          onChange={(e) => setStrikePrice(e.target.value)}
          placeholder="290"
          className="max-w-xs"
          required
        />
      </div>

      {/* Expiration date */}
      <div className="space-y-2">
        <Label htmlFor="expirationDate">{t("options.expirationDate")}</Label>
        <Input
          id="expirationDate"
          type="date"
          value={expirationDate}
          onChange={(e) => setExpirationDate(e.target.value)}
          className="max-w-xs"
          required
        />
      </div>

      {/* Trade date */}
      <div className="space-y-2">
        <Label htmlFor="tradeDate">{t("options.tradeDate")}</Label>
        <Input
          id="tradeDate"
          type="date"
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          className="max-w-xs"
          required
        />
      </div>

      {/* Delta */}
      <div className="space-y-2">
        <Label htmlFor="delta">
          {t("options.delta")}
          <span className="ml-1 text-xs text-muted-foreground">
            {t("common.optional")}
          </span>
        </Label>
        <Input
          id="delta"
          type="number"
          step={0.01}
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="0.3"
          className="max-w-xs"
        />
      </div>

      {/* Premium */}
      <div className="space-y-2">
        <Label htmlFor="premium">
          {t("options.premium")}{" "}
          <span className="text-xs text-muted-foreground">
            {isSell ? t("options.premiumReceived") : t("options.premiumPaid")}
          </span>
        </Label>
        <Input
          id="premium"
          type="number"
          min={0.01}
          step={0.01}
          value={premium}
          onChange={(e) => setPremium(e.target.value)}
          placeholder="6.85"
          className="max-w-xs"
          required
        />
        {premiumNum > 0 && qtyNum > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("options.netPremium")}:{" "}
            <span
              className={cn(
                "tabular-nums font-medium",
                netPreview > 0 && "text-green-600 dark:text-green-400",
                netPreview < 0 && "text-red-600 dark:text-red-400",
              )}
            >
              {formatCurrency(netPreview, "USD", true)}
            </span>
          </p>
        )}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>{t("options.status")}</Label>
        <div className="flex gap-2">
          {(["OPEN", "CLOSED"] as OptionStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "px-4 py-2 rounded-md text-sm border transition-colors",
                status === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent",
              )}
            >
              {s === "OPEN" ? t("options.open") : t("options.closed")}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">
          {t("common.notes")}
          <span className="ml-1 text-xs text-muted-foreground">
            {t("common.optional")}
          </span>
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="min-w-[120px]">
          {loading
            ? t("options.saving")
            : isEdit
              ? t("options.saveChanges")
              : t("options.createOption")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
