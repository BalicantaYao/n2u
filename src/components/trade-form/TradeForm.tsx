"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SymbolSearch } from "./SymbolSearch";
import { FeePreview } from "./FeePreview";
import { cn } from "@/lib/utils";
import { getTodayTW } from "@/lib/utils";
import type { Market, Side, LotType } from "@/types/taiwan";

export function TradeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [market, setMarket] = useState<Market>("TWSE");
  const [isETF, setIsETF] = useState(false);
  const [side, setSide] = useState<Side>("BUY");
  const [tradeDate, setTradeDate] = useState(getTodayTW().replaceAll("/", "-"));
  const [lotType, setLotType] = useState<LotType>("ROUND");
  const [lots, setLots] = useState<string>("");
  const [shares, setShares] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [notes, setNotes] = useState("");

  const priceNum = parseFloat(price) || 0;
  const lotsNum = parseInt(lots) || 0;
  const sharesNum = parseInt(shares) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol) return toast.error("請選擇股票代碼");
    if (!priceNum || priceNum <= 0) return toast.error("請輸入正確的成交價格");
    if (lotType === "ROUND" && lotsNum <= 0) return toast.error("請輸入整張數量");
    if (lotType === "ODD" && sharesNum <= 0) return toast.error("請輸入零股股數");

    setLoading(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "新增失敗");
      }

      toast.success("交易記錄已新增");
      router.push("/journal");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "新增失敗，請重試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Market selector */}
      <div className="space-y-2">
        <Label>市場</Label>
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
              {m === "TWSE" ? "上市 (TWSE)" : "上櫃 (TPEX)"}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol search */}
      <div className="space-y-2">
        <Label>股票代碼</Label>
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
              {isETF ? "ETF" : "股票"}
            </Badge>
          </div>
        )}
      </div>

      {/* Buy / Sell toggle */}
      <div className="space-y-2">
        <Label>方向</Label>
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
            買進
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
            賣出
          </button>
        </div>
      </div>

      {/* Trade date */}
      <div className="space-y-2">
        <Label htmlFor="tradeDate">交易日期</Label>
        <Input
          id="tradeDate"
          type="date"
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          required
        />
      </div>

      {/* Lot type toggle */}
      <div className="space-y-2">
        <Label>交易單位</Label>
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
              {lt === "ROUND" ? "整張" : "零股"}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        {lotType === "ROUND" ? (
          <>
            <Label htmlFor="lots">張數</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lots"
                type="number"
                min={1}
                step={1}
                placeholder="例：3"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                className="max-w-xs"
              />
              {lotsNum > 0 && (
                <span className="text-sm text-muted-foreground">
                  = {(lotsNum * 1000).toLocaleString()} 股
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <Label htmlFor="shares">股數（零股，1–999）</Label>
            <Input
              id="shares"
              type="number"
              min={1}
              max={999}
              step={1}
              placeholder="例：50"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="max-w-xs"
            />
          </>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price">成交價格（TWD）</Label>
        <Input
          id="price"
          type="number"
          min={0.01}
          step={0.01}
          placeholder="例：810.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="max-w-xs"
          required
        />
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stopLoss">
            停損價（TWD）
            <span className="ml-1 text-xs text-muted-foreground">選填</span>
          </Label>
          <Input
            id="stopLoss"
            type="number"
            min={0.01}
            step={0.01}
            placeholder="例：750.00"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          />
          {stopLoss && priceNum > 0 && (
            <p className="text-xs text-red-500">
              距均價 {(((parseFloat(stopLoss) - priceNum) / priceNum) * 100).toFixed(2)}%
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="takeProfit">
            停利價（TWD）
            <span className="ml-1 text-xs text-muted-foreground">選填</span>
          </Label>
          <Input
            id="takeProfit"
            type="number"
            min={0.01}
            step={0.01}
            placeholder="例：900.00"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
          />
          {takeProfit && priceNum > 0 && (
            <p className="text-xs text-green-600">
              距均價 +{(((parseFloat(takeProfit) - priceNum) / priceNum) * 100).toFixed(2)}%
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">
          備註
          <span className="ml-1 text-xs text-muted-foreground">選填</span>
        </Label>
        <Textarea
          id="notes"
          placeholder="進場理由、市場觀察、操作心得..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Fee preview */}
      <FeePreview
        price={priceNum}
        shares={sharesNum}
        lotType={lotType}
        lots={lotsNum}
        side={side}
        isETF={isETF}
        tradeDate={tradeDate}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading} className="min-w-[120px]">
          {loading ? "儲存中..." : "新增交易"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          取消
        </Button>
      </div>
    </form>
  );
}
