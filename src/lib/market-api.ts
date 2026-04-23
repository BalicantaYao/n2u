/**
 * 多市場資料派發層：依 market 路由到對應資料源
 *   TWSE / TPEX  → Fugle
 *   NYSE / NASDAQ → Finnhub（即時報價 / 搜尋）+ Yahoo Finance（歷史 K 棒）
 *
 * 說明：Finnhub 免費方案已不再提供美股 /stock/candle，
 * 因此歷史 OHLCV 改打 Yahoo Finance 的公開 chart endpoint，
 * 讓 ATR、移動平均等依賴歷史資料的計算（例如停損建議）能正常運作。
 */

import type { Market } from "@/types/taiwan";
import { isUSMarket } from "@/types/taiwan";
import type { Quote, OHLCVBar, SearchResult } from "@/types/market";

import {
  fetchQuote as fetchQuoteTW,
  fetchHistorical as fetchHistoricalTW,
  searchSymbols as searchSymbolsTW,
} from "./fugle-api";
import { fetchQuoteUS, searchSymbolsUS } from "./finnhub-api";
import { fetchHistoricalUS } from "./yahoo-finance-api";

export async function fetchQuote(
  symbol: string,
  market: Market,
): Promise<Quote | null> {
  return isUSMarket(market)
    ? fetchQuoteUS(symbol)
    : fetchQuoteTW(symbol, market);
}

export async function fetchQuotes(
  symbols: Array<{ symbol: string; market: Market }>,
): Promise<Record<string, Quote>> {
  const results: Record<string, Quote> = {};
  await Promise.allSettled(
    symbols.map(async ({ symbol, market }) => {
      const q = await fetchQuote(symbol, market);
      if (q) results[symbol] = q;
    }),
  );
  return results;
}

export async function fetchHistorical(
  symbol: string,
  market: Market,
  from: Date,
  to: Date,
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<OHLCVBar[]> {
  return isUSMarket(market)
    ? fetchHistoricalUS(symbol, from, to, interval)
    : fetchHistoricalTW(symbol, market, from, to, interval);
}

/**
 * 同時搜尋台股與美股，回傳合併結果（台股在前，美股在後）。
 * 任一資料源失敗不影響另一個的結果。
 */
export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [twRes, usRes] = await Promise.allSettled([
    searchSymbolsTW(q),
    searchSymbolsUS(q),
  ]);

  const tw = twRes.status === "fulfilled" ? twRes.value : [];
  const us = usRes.status === "fulfilled" ? usRes.value : [];

  return [...tw, ...us].slice(0, 20);
}
