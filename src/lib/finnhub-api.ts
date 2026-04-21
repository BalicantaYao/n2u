/**
 * Finnhub MarketData REST API wrapper
 * https://finnhub.io/docs/api
 *
 * 用途：美股（NYSE / NASDAQ）即時報價、歷史 K 棒、symbol search。
 * 免費版：15 分鐘延遲報價、60 req/min。
 *
 * 需要環境變數：FINNHUB_API_KEY
 */

import type { Market } from "@/types/taiwan";
import type { Quote, OHLCVBar, SearchResult } from "@/types/market";

const BASE_URL = "https://finnhub.io/api/v1";

function getApiKey(): string | null {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    console.error("[finnhub-api] FINNHUB_API_KEY is not set");
    return null;
  }
  return key;
}

async function finnhubFetch<T>(
  path: string,
  query?: Record<string, string>,
): Promise<T | null> {
  const key = getApiKey();
  if (!key) return null;

  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }
  url.searchParams.set("token", key);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.error(
        `[finnhub-api] ${path} HTTP ${res.status}: ${await res
          .text()
          .catch(() => "")}`,
      );
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[finnhub-api] ${path} failed:`, err);
    return null;
  }
}

/* ── 對應到 Finnhub 回傳結構的型別（僅含我們使用的欄位） ── */

interface FinnhubQuoteResponse {
  c?: number; // current
  d?: number; // change
  dp?: number; // change percent (already in %)
  h?: number; // high
  l?: number; // low
  o?: number; // open
  pc?: number; // prev close
  t?: number; // unix seconds
}

interface FinnhubCandleResponse {
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  t?: number[];
  v?: number[];
  s?: string; // "ok" | "no_data"
}

interface FinnhubSearchItem {
  description?: string;
  displaySymbol?: string;
  symbol?: string;
  type?: string;
}

interface FinnhubSearchResponse {
  count?: number;
  result?: FinnhubSearchItem[];
}

interface FinnhubSymbolListItem {
  symbol?: string;
  displaySymbol?: string;
  description?: string;
  mic?: string; // e.g. "XNYS", "XNAS", "ARCX"
  type?: string; // e.g. "Common Stock", "ETP"
}

/* ── 核心 API ── */

/** 取得美股即時報價（15 分鐘延遲） */
export async function fetchQuoteUS(symbol: string): Promise<Quote | null> {
  const res = await finnhubFetch<FinnhubQuoteResponse>("/quote", {
    symbol: symbol.toUpperCase(),
  });
  if (!res || res.c == null || res.c === 0) return null;

  return {
    symbol: symbol.toUpperCase(),
    price: res.c,
    change: res.d ?? 0,
    changePct: (res.dp ?? 0) / 100,
    open: res.o ?? 0,
    high: res.h ?? 0,
    low: res.l ?? 0,
    prevClose: res.pc ?? 0,
    volume: 0, // Finnhub free quote endpoint 未含 volume
    timestamp: new Date((res.t ?? Math.floor(Date.now() / 1000)) * 1000),
  };
}

/** 批次取得多檔美股報價（Finnhub 不支援 batch，使用 Promise.allSettled） */
export async function fetchQuotesUS(
  symbols: string[],
): Promise<Record<string, Quote>> {
  const results: Record<string, Quote> = {};
  await Promise.allSettled(
    symbols.map(async (symbol) => {
      const q = await fetchQuoteUS(symbol);
      if (q) results[symbol.toUpperCase()] = q;
    }),
  );
  return results;
}

function toFinnhubResolution(interval: "1d" | "1wk" | "1mo"): "D" | "W" | "M" {
  if (interval === "1wk") return "W";
  if (interval === "1mo") return "M";
  return "D";
}

/** 取得美股歷史 OHLCV 資料 */
export async function fetchHistoricalUS(
  symbol: string,
  from: Date,
  to: Date,
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<OHLCVBar[]> {
  const res = await finnhubFetch<FinnhubCandleResponse>("/stock/candle", {
    symbol: symbol.toUpperCase(),
    resolution: toFinnhubResolution(interval),
    from: String(Math.floor(from.getTime() / 1000)),
    to: String(Math.floor(to.getTime() / 1000)),
  });

  if (!res || res.s !== "ok" || !res.t) return [];

  const bars: OHLCVBar[] = [];
  for (let i = 0; i < res.t.length; i++) {
    bars.push({
      date: new Date(res.t[i] * 1000),
      open: res.o?.[i] ?? 0,
      high: res.h?.[i] ?? 0,
      low: res.l?.[i] ?? 0,
      close: res.c?.[i] ?? 0,
      volume: res.v?.[i] ?? 0,
    });
  }
  return bars.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* ── 符號清單（用 MIC code 判斷 NYSE vs NASDAQ） ── */

// https://en.wikipedia.org/wiki/Market_Identifier_Code
// XNYS = NYSE (含主板)、ARCX = NYSE Arca、XNAS = NASDAQ、BATS = Cboe BZX
const NYSE_MICS = new Set(["XNYS", "ARCX", "XASE", "BATS", "IEXG"]);
const NASDAQ_MICS = new Set(["XNAS", "XNGS", "XNMS", "XNCM"]);

function micToMarket(mic: string | undefined): Market | null {
  if (!mic) return null;
  if (NASDAQ_MICS.has(mic)) return "NASDAQ";
  if (NYSE_MICS.has(mic)) return "NYSE";
  return null;
}

/* ── 24h 快取美股完整 symbol list（含 MIC） ── */

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCache<T>(k: string): T | null {
  const e = cache.get(k);
  if (e && e.expiresAt > Date.now()) return e.data as T;
  return null;
}

function setCache<T>(k: string, v: T, ttlMs: number) {
  cache.set(k, { data: v, expiresAt: Date.now() + ttlMs });
}

async function fetchAllUSSymbols(): Promise<FinnhubSymbolListItem[]> {
  const cached = getCache<FinnhubSymbolListItem[]>("finnhub-us-symbols");
  if (cached) return cached;

  const res = await finnhubFetch<FinnhubSymbolListItem[]>("/stock/symbol", {
    exchange: "US",
  });
  const list = res ?? [];
  setCache("finnhub-us-symbols", list, 24 * 60 * 60 * 1000);
  return list;
}

/**
 * 搜尋美股代碼。
 *
 * 優先打 /search（可用中英文描述查詢），但 /search 不含 MIC，只含 type。
 * 再以 symbol list 的 MIC 推導 NYSE / NASDAQ。
 */
export async function searchSymbolsUS(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const [searchRes, symbolList] = await Promise.all([
    finnhubFetch<FinnhubSearchResponse>("/search", { q, exchange: "US" }),
    fetchAllUSSymbols(),
  ]);

  const micBySymbol = new Map<string, string>();
  const typeBySymbol = new Map<string, string>();
  for (const s of symbolList) {
    const sym = s.symbol?.toUpperCase();
    if (!sym) continue;
    if (s.mic) micBySymbol.set(sym, s.mic);
    if (s.type) typeBySymbol.set(sym, s.type);
  }

  const items = searchRes?.result ?? [];
  const out: SearchResult[] = [];
  for (const item of items) {
    const sym = (item.symbol ?? item.displaySymbol ?? "").toUpperCase();
    if (!sym || sym.includes(".")) continue; // 過濾掉含 "." 的非美股代碼
    const market = micToMarket(micBySymbol.get(sym));
    if (!market) continue; // 非 NYSE/NASDAQ 忽略
    const type = typeBySymbol.get(sym) ?? item.type ?? "";
    out.push({
      symbol: sym,
      symbolName: item.description,
      market,
      isETF: /ETF|ETP|Fund/i.test(type),
    });
    if (out.length >= 10) break;
  }
  return out;
}
