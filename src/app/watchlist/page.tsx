"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SymbolSearch } from "@/components/trade-form/SymbolSearch";
import { isMarketOpen, cn } from "@/lib/utils";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import type { Market } from "@/types/taiwan";
import type { Quote } from "@/types/market";

interface WatchlistItem {
  id: string;
  symbol: string;
  symbolName?: string;
  market: Market;
  isETF: boolean;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  // New item state
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newMarket, setNewMarket] = useState<Market>("TWSE");
  const [newIsETF, setNewIsETF] = useState(false);

  async function fetchItems() {
    const res = await fetch("/api/watchlist");
    const data = await res.json();
    setItems(data);
    return data as WatchlistItem[];
  }

  const fetchQuotes = useCallback(async (watchItems: WatchlistItem[]) => {
    if (watchItems.length === 0) return;
    setLoading(true);
    try {
      const symbolsParam = watchItems
        .map((i) => `${i.symbol}:${i.market}`)
        .join(",");
      const res = await fetch(`/api/market/quote?symbols=${symbolsParam}`);
      const data = await res.json();
      setQuotes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems().then(fetchQuotes);
    // Poll every 30s if market open, else 5min
    const ms = isMarketOpen() ? 30000 : 300000;
    const id = setInterval(() => {
      fetchItems().then(fetchQuotes);
    }, ms);
    return () => clearInterval(id);
  }, [fetchQuotes]);

  async function handleAdd() {
    if (!newSymbol) return toast.error("請選擇股票");
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: newSymbol,
        symbolName: newName,
        market: newMarket,
        isETF: newIsETF,
      }),
    });
    toast.success(`${newSymbol} 已加入自選股`);
    setShowAdd(false);
    setNewSymbol("");
    const updated = await fetchItems();
    fetchQuotes(updated);
  }

  async function handleRemove(id: string, symbol: string) {
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(`${symbol} 已移除`);
  }

  return (
    <div>
      <Header title="自選股" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn(
              "inline-block h-2 w-2 rounded-full",
              isMarketOpen() ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            {isMarketOpen() ? "報價每 30 秒更新" : "已收盤（每 5 分鐘更新）"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchItems().then(fetchQuotes)}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-4 w-4 mr-1.5" />
              新增自選
            </Button>
          </div>
        </div>

        {showAdd && (
          <Card className="p-4 space-y-3 max-w-md">
            <p className="text-sm font-medium">新增自選股</p>
            <SymbolSearch
              value={newSymbol}
              onChange={(sym, name, mkt, etf) => {
                setNewSymbol(sym);
                setNewName(name);
                setNewMarket(mkt);
                setNewIsETF(etf);
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>確認新增</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>取消</Button>
            </div>
          </Card>
        )}

        <Card>
          {items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              尚未新增自選股
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium">代號</th>
                    <th className="text-left py-3 pr-4 font-medium">名稱</th>
                    <th className="text-left py-3 pr-4 font-medium">市場</th>
                    <th className="text-right py-3 pr-4 font-medium">現價</th>
                    <th className="text-right py-3 pr-4 font-medium">漲跌</th>
                    <th className="text-right py-3 pr-4 font-medium">漲跌幅</th>
                    <th className="text-right py-3 pr-4 font-medium">成交量</th>
                    <th className="py-3 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const q = quotes[item.symbol];
                    const up = q ? q.change >= 0 : null;
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-3 px-4 font-mono font-medium">{item.symbol}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {item.symbolName ?? "—"}
                          {item.isETF && (
                            <Badge variant="secondary" className="ml-1.5 text-xs py-0">ETF</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={item.market === "TWSE" ? "twse" : "tpex"}
                            className="text-xs py-0"
                          >
                            {item.market === "TWSE" ? "上市" : "上櫃"}
                          </Badge>
                        </td>
                        <td className={cn(
                          "py-3 pr-4 text-right tabular-nums font-medium",
                          up === true && "text-green-600",
                          up === false && "text-red-600"
                        )}>
                          {q ? q.price.toLocaleString() : "—"}
                        </td>
                        <td className={cn(
                          "py-3 pr-4 text-right tabular-nums",
                          up === true && "text-green-600",
                          up === false && "text-red-600"
                        )}>
                          {q ? `${up ? "+" : ""}${q.change.toFixed(2)}` : "—"}
                        </td>
                        <td className={cn(
                          "py-3 pr-4 text-right tabular-nums",
                          up === true && "text-green-600",
                          up === false && "text-red-600"
                        )}>
                          {q ? `${up ? "+" : ""}${(q.changePct * 100).toFixed(2)}%` : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                          {q ? `${(q.volume / 1000).toFixed(0)}張` : "—"}
                        </td>
                        <td className="py-3 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemove(item.id, item.symbol)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
