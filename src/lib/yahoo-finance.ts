/**
 * yahoo-finance2 wrapper
 *
 * TWSE 上市股票：代碼 + ".TW"  (e.g. "2330.TW")
 * TPEX 上櫃股票：代碼 + ".TWO" (e.g. "3008.TWO")
 */

import YahooFinance from "yahoo-finance2";
import type { Market } from "@/types/taiwan";
import type { Quote, OHLCVBar } from "@/types/market";

const yahooFinance = new YahooFinance();

export function toYahooSymbol(symbol: string, market: Market): string {
  return market === "TWSE" ? `${symbol}.TW` : `${symbol}.TWO`;
}

/** 取得即時報價 */
export async function fetchQuote(
  symbol: string,
  market: Market
): Promise<Quote | null> {
  try {
    const ticker = toYahooSymbol(symbol, market);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(ticker, {}, { validateResult: false });
    if (!result) return null;
    if (result.regularMarketPrice == null) return null;

    return {
      symbol,
      symbolName: result.shortName ?? result.longName ?? undefined,
      price: result.regularMarketPrice,
      change: result.regularMarketChange ?? 0,
      changePct: (result.regularMarketChangePercent ?? 0) / 100,
      open: result.regularMarketOpen ?? 0,
      high: result.regularMarketDayHigh ?? 0,
      low: result.regularMarketDayLow ?? 0,
      prevClose: result.regularMarketPreviousClose ?? 0,
      volume: result.regularMarketVolume ?? 0,
      timestamp: new Date(result.regularMarketTime ?? Date.now()),
    };
  } catch (err) {
    console.error(`[fetchQuote] Failed to fetch ${toYahooSymbol(symbol, market)}:`, err);
    return null;
  }
}

/** 批次取得多檔報價 */
export async function fetchQuotes(
  symbols: Array<{ symbol: string; market: Market }>
): Promise<Record<string, Quote>> {
  const results: Record<string, Quote> = {};
  await Promise.allSettled(
    symbols.map(async ({ symbol, market }) => {
      const q = await fetchQuote(symbol, market);
      if (q) results[symbol] = q;
    })
  );
  return results;
}

/** 取得歷史 OHLCV 資料 */
export async function fetchHistorical(
  symbol: string,
  market: Market,
  from: Date,
  to: Date,
  interval: "1d" | "1wk" | "1mo" = "1d"
): Promise<OHLCVBar[]> {
  try {
    const ticker = toYahooSymbol(symbol, market);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = await yahooFinance.historical(ticker, {
      period1: from,
      period2: to,
      interval,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((bar: any) => ({
      date: bar.date,
      open: bar.open ?? 0,
      high: bar.high ?? 0,
      low: bar.low ?? 0,
      close: bar.close ?? 0,
      volume: bar.volume ?? 0,
      adjClose: bar.adjClose ?? undefined,
    }));
  } catch {
    return [];
  }
}

/** 搜尋股票代碼 */
export async function searchSymbols(query: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(query);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((result.quotes ?? []) as any[])
      .filter(
        (q) =>
          (q.quoteType === "EQUITY" || q.quoteType === "ETF") &&
          (q.symbol?.endsWith(".TW") || q.symbol?.endsWith(".TWO"))
      )
      .map((q) => ({
        symbol: (q.symbol as string).replace(/\.(TW|TWO)$/, ""),
        symbolName: q.shortname ?? q.longname ?? undefined,
        market: (q.symbol?.endsWith(".TWO") ? "TPEX" : "TWSE") as Market,
        isETF: q.quoteType === "ETF",
      }));
  } catch {
    return [];
  }
}
