"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SymbolSearch } from "./SymbolSearch";
import { FeePreview } from "./FeePreview";
import { StopLossHelper } from "./StopLossHelper";
import { MaxLossPreview } from "./MaxLossPreview";
import { cn } from "@/lib/utils";
import { getTodayTW, formatShares } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Info, RefreshCw } from "lucide-react";
import type { Trade } from "@/types/trade";
import type { Market, Side, LotType } from "@/types/taiwan";

interface TradeFormProps {
  mode?: "create" | "edit";
  initialData?: Trade;
  editableFields?: "all" | "metadata-only";
  defaults?: {
    symbol?: string;
    symbolName?: string;
    market?: Market;
    isETF?: boolean;
  };
}

export function TradeForm({
  mode = "create",
  initialData,
  editableFields = "all",
  defaults,
}: TradeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<{
    price: number;
    changePct: number;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const { t } = useT();

  const isEdit = mode === "edit";
  const metadataOnly = editableFields === "metadata-only";

  // Form state — initialized from initialData when editing, falling back to defaults
  const [symbol, setSymbol] = useState(initialData?.symbol ?? defaults?.symbol ?? "");
  const [symbolName, setSymbolName] = useState(
    initialData?.symbolName ?? defaults?.symbolName ?? ""
  );
  const [market, setMarket] = useState<Market>(
    (initialData?.market as Market) ?? defaults?.market ?? "TWSE"
  );
  const [isETF, setIsETF] = useState(initialData?.isETF ?? defaults?.isETF ?? false);
  const [side, setSide] = useState<Side>(
    (initialData?.side as Side) ?? "BUY"
  );
  const [tradeDate, setTradeDate] = useState(() => {
    if (initialData?.tradeDate) {
      return new Date(initialData.tradeDate).toISOString().slice(0, 10);
    }
    return getTodayTW().replaceAll("/", "-");
  });
  const [lotType, setLotType] = useState<LotType>(
    (initialData?.lotType as LotType) ?? "ROUND"
  );
  const [lots, setLots] = useState<string>(
    initialData?.lots != null ? String(initialData.lots) : ""
  );
  const [shares, setShares] = useState<string>(
    initialData && initialData.lotType === "ODD"
      ? String(initialData.shares)
      : ""
  );
  const [price, setPrice] = useState<string>(
    initialData?.price != null ? String(initialData.price) : ""
  );
  const [stopLoss, setStopLoss] = useState<string>(
    initialData?.stopLoss != null ? String(initialData.stopLoss) : ""
  );
  const [takeProfit, setTakeProfit] = useState<string>(
    initialData?.takeProfit != null ? String(initialData.takeProfit) : ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const priceNum = parseFloat(price) || 0;
  const lotsNum = parseInt(lots) || 0;
  const sharesNum = parseInt(shares) || 0;

  async function fetchQuoteForReference(
    sym: string,
    mkt: Market,
    signal?: AbortSignal
  ): Promise<{ price: number; changePct: number } | null> {
    const res = await fetch(
      `/api/market/quote?symbols=${encodeURIComponent(sym)}:${mkt}`,
      { signal }
    );
    if (!res.ok) return null;
    const data: Record<string, { price?: number; changePct?: number }> =
      await res.json();
    const q = data[sym];
    if (!q || q.price == null) return null;
    return { price: q.price, changePct: q.changePct ?? 0 };
  }

  const quoteReqId = useRef(0);
  useEffect(() => {
    if (metadataOnly || !symbol) {
      setCurrentQuote(null);
      return;
    }
    const reqId = ++quoteReqId.current;
    const controller = new AbortController();
    setQuoteLoading(true);
    fetchQuoteForReference(symbol, market, controller.signal)
      .then((q) => {
        if (reqId === quoteReqId.current) setCurrentQuote(q);
      })
      .catch(() => {
        if (reqId === quoteReqId.current) setCurrentQuote(null);
      })
      .finally(() => {
        if (reqId === quoteReqId.current) setQuoteLoading(false);
      });
    return () => controller.abort();
  }, [symbol, market, metadataOnly]);

  async function handleFetchPrice() {
    if (!symbol) {
      toast.error(t("trade.selectSymbolFirst"));
      return;
    }
    setFetchingPrice(true);
    try {
      const q = await fetchQuoteForReference(symbol, market);
      if (!q) {
        toast.error(t("trade.fetchPriceFailed"));
        return;
      }
      setCurrentQuote(q);
      setPrice(String(q.price));
      toast.success(t("trade.fetchPriceSuccess"));
    } catch {
      toast.error(t("trade.fetchPriceFailed"));
    } finally {
      setFetchingPrice(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit && metadataOnly) {
      // Only submit metadata fields
      setLoading(true);
      try {
        const res = await fetch(`/api/trades/${initialData!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopLoss: stopLoss ? parseFloat(stopLoss) : null,
            takeProfit: takeProfit ? parseFloat(takeProfit) : null,
            notes: notes || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? t("trade.updateFailed"));
        }
        toast.success(t("trade.tradeUpdated"));
        router.push("/journal");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("trade.updateFailedRetry"));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Full validation for create or full-edit mode
    if (!symbol) return toast.error(t("trade.selectSymbol"));
    if (!priceNum || priceNum <= 0) return toast.error(t("trade.invalidPrice"));
    if (lotType === "ROUND" && lotsNum <= 0) return toast.error(t("trade.invalidLots"));
    if (lotType === "ODD" && sharesNum <= 0) return toast.error(t("trade.invalidShares"));

    setLoading(true);
    try {
      const payload = {
        symbol,
        symbolName,
        market,
        side,
        tradeDate,
        lotType,
        lots: lotType === "ROUND" ? lotsNum : undefined,
        shares: lotType === "ROUND" ? lotsNum * 1000 : sharesNum,
        price: priceNum,
        isETF,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        notes: notes || undefined,
      };

      const url = isEdit ? `/api/trades/${initialData!.id}` : "/api/trades";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? (isEdit ? t("trade.updateFailed") : t("trade.createFailed")));
      }

      toast.success(isEdit ? t("trade.tradeUpdated") : t("trade.tradeCreated"));
      router.push("/journal");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : isEdit ? t("trade.updateFailedRetry") : t("trade.createFailedRetry")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Metadata-only warning banner */}
      {metadataOnly && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{t("trade.metadataOnlyWarning")}</span>
        </div>
      )}

      {/* Market selector */}
      <div className="space-y-2">
        <Label>{t("trade.market")}</Label>
        {metadataOnly ? (
          <p className="text-sm font-medium">
            {market === "TWSE" ? t("common.twseFull") : t("common.tpexFull")}
          </p>
        ) : (
          <div className="flex gap-2">
            {(["TWSE", "TPEX"] as Market[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMarket(m)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium border transition-colors",
                  market === m
                    ? m === "TWSE"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-purple-600 text-white border-purple-600"
                    : "bg-background text-foreground border-input hover:bg-accent"
                )}
              >
                {m === "TWSE" ? t("common.twseFull") : t("common.tpexFull")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Symbol search */}
      <div className="space-y-2">
        <Label>{t("trade.symbolCode")}</Label>
        {metadataOnly ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{symbol}</span>
            {symbolName && <span className="text-muted-foreground">{symbolName}</span>}
            <Badge variant={isETF ? "secondary" : "outline"} className="text-xs py-0">
              {isETF ? t("common.etf") : t("common.stock")}
            </Badge>
          </div>
        ) : (
          <>
            <SymbolSearch
              value={symbol}
              onChange={(sym, name, mkt, etf) => {
                setSymbol(sym);
                setSymbolName(name);
                setMarket(mkt);
                setIsETF(etf);
              }}
            />
            {symbol && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{symbol}</span>
                <span>{symbolName}</span>
                <Badge variant={isETF ? "secondary" : "outline"} className="text-xs py-0">
                  {isETF ? t("common.etf") : t("common.stock")}
                </Badge>
              </div>
            )}
          </>
        )}
      </div>

      {/* Buy / Sell toggle */}
      <div className="space-y-2">
        <Label>{t("common.direction")}</Label>
        {metadataOnly ? (
          <Badge variant={side === "BUY" ? "profit" : "loss"} className="text-xs">
            {side === "BUY" ? t("common.buy") : t("common.sell")}
          </Badge>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={cn(
                "flex-1 py-3 rounded-md text-sm font-semibold border-2 transition-colors",
                side === "BUY"
                  ? "bg-green-600 text-white border-green-600"
                  : "border-input bg-background hover:bg-accent"
              )}
            >
              {t("common.buy")}
            </button>
            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={cn(
                "flex-1 py-3 rounded-md text-sm font-semibold border-2 transition-colors",
                side === "SELL"
                  ? "bg-red-600 text-white border-red-600"
                  : "border-input bg-background hover:bg-accent"
              )}
            >
              {t("common.sell")}
            </button>
          </div>
        )}
      </div>

      {/* Trade date */}
      <div className="space-y-2">
        <Label htmlFor="tradeDate">{t("trade.tradeDate")}</Label>
        {metadataOnly ? (
          <p className="text-sm">{tradeDate}</p>
        ) : (
          <Input
            id="tradeDate"
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            required
          />
        )}
      </div>

      {/* Lot type toggle */}
      <div className="space-y-2">
        <Label>{t("trade.tradeUnit")}</Label>
        {metadataOnly ? (
          <p className="text-sm">{lotType === "ROUND" ? t("common.roundLot") : t("common.oddLot")}</p>
        ) : (
          <div className="flex gap-2">
            {(["ROUND", "ODD"] as LotType[]).map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => setLotType(lt)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm border transition-colors",
                  lotType === lt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-accent"
                )}
              >
                {lt === "ROUND" ? t("common.roundLot") : t("common.oddLot")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        {metadataOnly ? (
          <>
            <Label>{t("common.quantity")}</Label>
            <p className="text-sm tabular-nums">
              {formatShares(initialData?.shares ?? 0, lotType)}
            </p>
          </>
        ) : lotType === "ROUND" ? (
          <>
            <Label htmlFor="lots">{t("trade.lotsLabel")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lots"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 3"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                className="max-w-xs"
              />
              {lotsNum > 0 && (
                <span className="text-sm text-muted-foreground">
                  {t("trade.sharesConversion", { count: (lotsNum * 1000).toLocaleString() })}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <Label htmlFor="shares">{t("trade.sharesLabel")}</Label>
            <Input
              id="shares"
              type="number"
              min={1}
              max={999}
              step={1}
              placeholder="e.g. 50"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="max-w-xs"
            />
          </>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price">{t("trade.price")}</Label>
        {metadataOnly ? (
          <p className="text-sm tabular-nums">{initialData?.price?.toLocaleString()}</p>
        ) : (
          <>
            <div className="flex gap-2 max-w-xs">
              <Input
                id="price"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="e.g. 810.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchPrice}
                disabled={fetchingPrice || !symbol}
                title={t("trade.fetchPrice")}
              >
                <RefreshCw
                  className={cn("h-4 w-4", fetchingPrice && "animate-spin")}
                />
                <span className="ml-2 hidden sm:inline">{t("trade.fetchPrice")}</span>
              </Button>
            </div>
            {symbol && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t("trade.currentPriceRef")}:</span>
                {quoteLoading && !currentQuote ? (
                  <span>{t("common.loading")}</span>
                ) : currentQuote ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPrice(String(currentQuote.price))}
                      title={t("trade.useCurrentPrice")}
                      className="font-semibold tabular-nums text-foreground underline-offset-2 hover:underline"
                    >
                      {currentQuote.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </button>
                    <span
                      className={cn(
                        "tabular-nums",
                        currentQuote.changePct > 0 && "text-green-600",
                        currentQuote.changePct < 0 && "text-red-600"
                      )}
                    >
                      {currentQuote.changePct > 0 ? "+" : ""}
                      {(currentQuote.changePct * 100).toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span>{t("trade.currentPriceUnavailable")}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stopLoss">
            {t("trade.stopLoss")}
            <span className="ml-1 text-xs text-muted-foreground">{t("common.optional")}</span>
          </Label>
          <Input
            id="stopLoss"
            type="number"
            min={0.01}
            step={0.01}
            placeholder="e.g. 750.00"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          />
          {stopLoss && priceNum > 0 && (
            <p className="text-xs text-red-500">
              {t("trade.stopLossDistance", { pct: (((parseFloat(stopLoss) - priceNum) / priceNum) * 100).toFixed(2) })}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="takeProfit">
            {t("trade.takeProfit")}
            <span className="ml-1 text-xs text-muted-foreground">{t("common.optional")}</span>
          </Label>
          <Input
            id="takeProfit"
            type="number"
            min={0.01}
            step={0.01}
            placeholder="e.g. 900.00"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
          />
          {takeProfit && priceNum > 0 && (
            <p className="text-xs text-green-600">
              {t("trade.takeProfitDistance", { pct: (((parseFloat(takeProfit) - priceNum) / priceNum) * 100).toFixed(2) })}
            </p>
          )}
        </div>
      </div>

      {/* Stop Loss Helper */}
      {side === "BUY" && (
        <StopLossHelper
          symbol={symbol}
          market={market}
          entryPrice={metadataOnly ? initialData?.price ?? priceNum : priceNum}
          newShares={
            metadataOnly
              ? initialData?.shares ?? 0
              : lotType === "ROUND"
              ? lotsNum * 1000
              : sharesNum
          }
          side={side}
          onSelectStopLoss={(price) => setStopLoss(String(price))}
          editingTradeId={isEdit ? initialData?.id : undefined}
        />
      )}

      {/* Max Loss Preview */}
      {side === "BUY" && (
        <MaxLossPreview
          symbol={symbol}
          price={metadataOnly ? initialData?.price ?? priceNum : priceNum}
          shares={
            metadataOnly
              ? initialData?.shares ?? 0
              : lotType === "ROUND"
              ? lotsNum * 1000
              : sharesNum
          }
          stopLoss={parseFloat(stopLoss) || 0}
          side={side}
          isETF={isETF}
          editingTradeId={isEdit ? initialData?.id : undefined}
        />
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">
          {t("common.notes")}
          <span className="ml-1 text-xs text-muted-foreground">{t("common.optional")}</span>
        </Label>
        <Textarea
          id="notes"
          placeholder={t("trade.notesPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Fee preview — only show when core fields are editable */}
      {!metadataOnly && (
        <FeePreview
          price={priceNum}
          shares={sharesNum}
          lotType={lotType}
          lots={lotsNum}
          side={side}
          isETF={isETF}
          tradeDate={tradeDate}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="min-w-[120px]">
          {loading ? t("trade.saving") : isEdit ? t("trade.saveChanges") : t("trade.createTrade")}
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
