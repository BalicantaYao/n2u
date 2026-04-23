/**
 * Fugle MarketData REST API wrapper
 * https://developer.fugle.tw/docs/data/intro
 *
 * 取代原先 yahoo-finance2 的用途：即時報價 / 歷史 K 棒 / 股票搜尋。
 * TWSE 與 TPEX 都用 raw symbol（e.g. "2330", "6547"），不加後綴，market 由回傳資料決定。
 *
 * 需要環境變數：FUGLE_API_KEY
 */

import type { Market } from "@/types/taiwan";
import type { Quote, OHLCVBar, SearchResult } from "@/types/market";

const BASE_URL = "https://api.fugle.tw/marketdata/v1.0";

function getApiKey(): string | null {
  const key = process.env.FUGLE_API_KEY;
  if (!key) {
    console.error("[fugle-api] FUGLE_API_KEY is not set");
    return null;
  }
  return key;
}

async function fugleFetch<T>(path: string, query?: Record<string, string>): Promise<T | null> {
  const key = getApiKey();
  if (!key) return null;

  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { "X-API-KEY": key },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[fugle-api] ${path} HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[fugle-api] ${path} failed:`, err);
    return null;
  }
}

/* ── 型別（只對應到我們會用到的欄位） ── */

interface FugleQuoteResponse {
  symbol: string;
  name?: string;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  previousClose?: number;
  total?: { tradeVolume?: number };
  lastUpdated?: number; // epoch ms
}

interface FugleCandle {
  date: string; // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FugleCandlesResponse {
  symbol: string;
  data: FugleCandle[];
}

export interface FugleTicker {
  symbol: string;
  name: string;
  market: "TSE" | "OTC" | string;
  type?: string;
  industry?: string;
  industryZhTw?: string;
  isETF?: boolean;
}

interface FugleTickersResponse {
  data: FugleTicker[];
}

/** Fugle snapshot quote 單列（對應我們會用到的欄位） */
export interface FugleSnapshotRow {
  symbol: string;
  name?: string;
  type?: string;
  lastPrice?: number;
  previousClose?: number;
  /** 除權息日的當日基準價；可作為 previousClose 的備援 */
  referencePrice?: number;
  change?: number;
  changePercent?: number;
  tradeValue?: number;
  tradeVolume?: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  lastUpdated?: number;
}

interface FugleSnapshotResponse {
  date?: string;
  type?: string;
  exchange?: string;
  market?: string;
  data: FugleSnapshotRow[];
}

/* ── 核心 API ── */

/** 取得即時報價 */
export async function fetchQuote(
  symbol: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _market: Market
): Promise<Quote | null> {
  const res = await fugleFetch<FugleQuoteResponse>(`/stock/intraday/quote/${encodeURIComponent(symbol)}`);
  if (!res || res.lastPrice == null) return null;

  return {
    symbol,
    symbolName: res.name,
    price: res.lastPrice,
    change: res.change ?? 0,
    changePct: (res.changePercent ?? 0) / 100,
    open: res.openPrice ?? 0,
    high: res.highPrice ?? 0,
    low: res.lowPrice ?? 0,
    prevClose: res.previousClose ?? 0,
    volume: res.total?.tradeVolume ?? 0,
    timestamp: new Date(res.lastUpdated ?? Date.now()),
  };
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

function toFugleTimeframe(interval: "1d" | "1wk" | "1mo"): "D" | "W" | "M" {
  if (interval === "1wk") return "W";
  if (interval === "1mo") return "M";
  return "D";
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 取得歷史 OHLCV 資料 */
export async function fetchHistorical(
  symbol: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _market: Market,
  from: Date,
  to: Date,
  interval: "1d" | "1wk" | "1mo" = "1d"
): Promise<OHLCVBar[]> {
  const res = await fugleFetch<FugleCandlesResponse>(
    `/stock/historical/candles/${encodeURIComponent(symbol)}`,
    {
      from: toISODate(from),
      to: toISODate(to),
      timeframe: toFugleTimeframe(interval),
    }
  );
  if (!res?.data) return [];

  return res.data
    .map((bar) => ({
      date: new Date(bar.date),
      open: bar.open ?? 0,
      high: bar.high ?? 0,
      low: bar.low ?? 0,
      close: bar.close ?? 0,
      volume: bar.volume ?? 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* ── 搜尋用的 tickers 清單（24h 快取） ── */

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCache<T>(k: string): T | null {
  const e = cache.get(k);
  if (e && e.expiresAt > Date.now()) return e.data as T;
  return null;
}

function setCache<T>(k: string, v: T, ttlMs: number) {
  cache.set(k, { data: v, expiresAt: Date.now() + ttlMs });
}

export async function fetchAllTickers(): Promise<FugleTicker[]> {
  const cached = getCache<FugleTicker[]>("fugle-tickers");
  if (cached) return cached;

  const res = await fugleFetch<FugleTickersResponse>("/stock/intraday/tickers", { type: "EQUITY" });
  const list = res?.data ?? [];
  setCache("fugle-tickers", list, 24 * 60 * 60 * 1000);
  return list;
}

/**
 * 取得指定市場（TSE 上市 / OTC 上櫃）所有個股的當日快照：
 * lastPrice / previousClose / change / changePercent / tradeValue ...
 * 一次呼叫可同時取得「今日收盤（或盤中）」與「前日收盤」。
 */
export async function fetchSnapshotQuotes(market: "TSE" | "OTC"): Promise<FugleSnapshotRow[]> {
  const res = await fugleFetch<FugleSnapshotResponse>(
    `/snapshot/quotes/${encodeURIComponent(market)}`,
  );
  return res?.data ?? [];
}

/** 搜尋股票代碼 */
export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const tickers = await fetchAllTickers();
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return tickers
    .filter((t) => {
      const symbol = t.symbol ?? "";
      const name = t.name ?? "";
      return symbol.includes(q) || name.toLowerCase().includes(q);
    })
    .slice(0, 10)
    .map((t) => ({
      symbol: t.symbol,
      symbolName: t.name,
      market: (t.market === "OTC" ? "TPEX" : "TWSE") as Market,
      isETF: t.isETF === true || t.type === "ETF",
    }));
}
