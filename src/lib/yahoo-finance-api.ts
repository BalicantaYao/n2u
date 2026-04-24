/**
 * Yahoo Finance chart endpoint wrapper
 * https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
 *
 * 用途：美股（NYSE / NASDAQ）歷史 K 棒。
 * 免費、免 API key，適合算 ATR / 移動平均。
 *
 * 補足 Finnhub 免費方案不再提供 /stock/candle 的缺口；
 * 即時報價仍使用 Finnhub（finnhub-api.ts）。
 */

import type { OHLCVBar } from "@/types/market";

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

// Yahoo 會對沒有 UA 的請求回 401/429，帶一個常見 browser UA 比較穩
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface YahooChartQuote {
  open?: (number | null)[];
  high?: (number | null)[];
  low?: (number | null)[];
  close?: (number | null)[];
  volume?: (number | null)[];
}

interface YahooChartAdjClose {
  adjclose?: (number | null)[];
}

interface YahooChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: YahooChartQuote[];
    adjclose?: YahooChartAdjClose[];
  };
}

interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

function toYahooInterval(interval: "1d" | "1wk" | "1mo"): string {
  return interval; // Yahoo 用一樣的字串
}

/** 取得美股歷史 OHLCV 資料（Yahoo Finance） */
export async function fetchHistoricalUS(
  symbol: string,
  from: Date,
  to: Date,
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<OHLCVBar[]> {
  const url = new URL(`${BASE_URL}/${encodeURIComponent(symbol.toUpperCase())}`);
  url.searchParams.set("period1", String(Math.floor(from.getTime() / 1000)));
  url.searchParams.set("period2", String(Math.floor(to.getTime() / 1000)));
  url.searchParams.set("interval", toYahooInterval(interval));
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,split");

  let json: YahooChartResponse;
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(
        `[yahoo-finance-api] ${symbol} HTTP ${res.status}: ${await res
          .text()
          .catch(() => "")}`,
      );
      return [];
    }
    json = (await res.json()) as YahooChartResponse;
  } catch (err) {
    console.error(`[yahoo-finance-api] ${symbol} failed:`, err);
    return [];
  }

  if (json.chart?.error) {
    console.error(
      `[yahoo-finance-api] ${symbol} error:`,
      json.chart.error.description ?? json.chart.error.code,
    );
    return [];
  }

  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];
  const adjClose = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!timestamps || !quote) return [];

  const bars: OHLCVBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i];
    // Yahoo 會在部分節點給 null（假日/停牌），直接跳過
    if (open == null || high == null || low == null || close == null) continue;

    bars.push({
      date: new Date(timestamps[i] * 1000),
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
      adjClose: adjClose?.[i] ?? undefined,
    });
  }

  return bars.sort((a, b) => a.date.getTime() - b.date.getTime());
}
