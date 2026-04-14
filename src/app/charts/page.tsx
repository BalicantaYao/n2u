"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { SymbolSearch } from "@/components/trade-form/SymbolSearch";
import { PriceChart } from "@/components/charts/PriceChart";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { cn } from "@/lib/utils";
import type { Market } from "@/types/taiwan";
import type { OHLCVBar, Quote } from "@/types/market";

type Interval = "1d" | "1wk" | "1mo";
type Range = "1mo" | "3mo" | "6mo" | "1y" | "3y";

const RANGE_LABELS: Record<Range, string> = {
  "1mo": "1月",
  "3mo": "3月",
  "6mo": "6月",
  "1y": "1年",
  "3y": "3年",
};

function rangeToFrom(range: Range): string {
  const now = new Date();
  const map: Record<Range, number> = {
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
    "1y": 365,
    "3y": 1095,
  };
  now.setDate(now.getDate() - map[range]);
  return now.toISOString().slice(0, 10);
}

export default function ChartsPage() {
  const [symbol, setSymbol] = useState("");
  const [market, setMarket] = useState<Market>("TWSE");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [bars, setBars] = useState<OHLCVBar[]>([]);
  const [interval, setInterval] = useState<Interval>("1d");
  const [range, setRange] = useState<Range>("1y");
  const [loading, setLoading] = useState(false);

  async function loadData(sym: string, mkt: Market, iv: Interval = interval, r: Range = range) {
    setLoading(true);
    try {
      const from = rangeToFrom(r);
      const [quoteRes, histRes] = await Promise.all([
        fetch(`/api/market/quote?symbols=${sym}:${mkt}`),
        fetch(`/api/market/historical?symbol=${sym}&market=${mkt}&interval=${iv}&from=${from}`),
      ]);
      const quoteData = await quoteRes.json();
      const histData: OHLCVBar[] = await histRes.json();
      setQuote(quoteData[sym] ?? null);
      setBars(histData);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSymbol(sym: string, _name: string, mkt: Market) {
    setSymbol(sym);
    setMarket(mkt);
    loadData(sym, mkt);
  }

  function handleIntervalChange(iv: Interval) {
    setInterval(iv);
    if (symbol) loadData(symbol, market, iv, range);
  }

  function handleRangeChange(r: Range) {
    setRange(r);
    if (symbol) loadData(symbol, market, interval, r);
  }

  const changeIsPositive = quote ? quote.change >= 0 : true;

  return (
    <div>
      <Header title="走勢圖" />
      <div className="p-6 space-y-4">
        <div className="max-w-md">
          <SymbolSearch
            value={symbol}
            onChange={handleSelectSymbol}
            placeholder="輸入股票代碼或名稱..."
          />
        </div>

        {quote && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
                <div>
                  <p className="text-lg font-bold">
                    {quote.symbol}
                    {quote.symbolName && (
                      <span className="text-muted-foreground font-normal text-sm ml-2">
                        {quote.symbolName}
                      </span>
                    )}
                  </p>
                  <p
                    className={cn(
                      "text-3xl font-bold tabular-nums",
                      changeIsPositive ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {quote.price.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-4 text-sm flex-wrap">
                  <div>
                    <p className="text-muted-foreground text-xs">漲跌</p>
                    <p className={cn("tabular-nums font-medium", changeIsPositive ? "text-green-600" : "text-red-600")}>
                      {changeIsPositive ? "+" : ""}{quote.change.toFixed(2)}
                      {" "}({changeIsPositive ? "+" : ""}{(quote.changePct * 100).toFixed(2)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">開盤</p>
                    <p className="tabular-nums">{quote.open.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">最高</p>
                    <p className="tabular-nums text-green-600">{quote.high.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">最低</p>
                    <p className="tabular-nums text-red-600">{quote.low.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">前收</p>
                    <p className="tabular-nums">{quote.prevClose.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">成交量</p>
                    <p className="tabular-nums">{(quote.volume / 1000).toFixed(0)}張</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between flex-wrap gap-3">
            {/* Range buttons */}
            <div className="flex gap-1">
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === r ? "default" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => handleRangeChange(r)}
                >
                  {RANGE_LABELS[r]}
                </Button>
              ))}
            </div>
            {/* Interval buttons */}
            <div className="flex gap-1">
              {(["1d", "1wk", "1mo"] as Interval[]).map((iv) => (
                <Button
                  key={iv}
                  size="sm"
                  variant={interval === iv ? "secondary" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => handleIntervalChange(iv)}
                >
                  {iv === "1d" ? "日" : iv === "1wk" ? "週" : "月"}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">
                載入中...
              </div>
            ) : (
              <PriceChart
                data={bars}
                prevClose={quote?.prevClose}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
