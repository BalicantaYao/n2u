/**
 * Fugle MarketData futopt（期貨/選擇權）REST API wrapper
 * https://developer.fugle.tw/docs/data-futopt/intro/
 *
 * 需要環境變數：FUGLE_API_KEY（須確認該金鑰已開通期貨/選擇權資料權限，
 * 否則呼叫會回傳 401/403，此檔案的函式會回傳 null / 空陣列讓上層優雅降級）
 */

const BASE_URL = "https://api.fugle.tw/marketdata/v1.0/futopt";

function getApiKey(): string | null {
  const key = process.env.FUGLE_API_KEY;
  if (!key) {
    console.error("[fugle-futopt-api] FUGLE_API_KEY is not set");
    return null;
  }
  return key;
}

async function futoptFetch<T>(path: string, query?: Record<string, string>): Promise<T | null> {
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
      console.error(`[fugle-futopt-api] ${path} HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[fugle-futopt-api] ${path} failed:`, err);
    return null;
  }
}

/* ── 型別（欄位命名以官方文件為準，這裡對可能出現的別名做寬鬆解析） ── */

interface FutoptProductRaw {
  symbol: string;
  name?: string;
  underlyingSymbol?: string;
  underlying?: string;
  endDate?: string;
  expiryDate?: string;
  deliveryDate?: string;
}

interface FutoptProductsResponse {
  data: FutoptProductRaw[];
}

export interface FutoptProduct {
  symbol: string;
  name?: string;
  underlyingSymbol: string;
  expiryDate: Date;
}

interface FutoptQuoteResponse {
  symbol: string;
  name?: string;
  lastPrice?: number;
  closePrice?: number;
  referencePrice?: number;
  lastUpdated?: number;
}

export interface FutoptQuote {
  symbol: string;
  price: number;
  updatedAt: Date;
}

/* ── 商品清單快取（24h，商品/到期日變動不頻繁） ── */

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCache<T>(k: string): T | null {
  const e = cache.get(k);
  if (e && e.expiresAt > Date.now()) return e.data as T;
  return null;
}

function setCache<T>(k: string, v: T, ttlMs: number) {
  cache.set(k, { data: v, expiresAt: Date.now() + ttlMs });
}

function parseExpiryDate(raw: FutoptProductRaw): Date | null {
  const str = raw.endDate ?? raw.expiryDate ?? raw.deliveryDate;
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 取得全部期貨商品清單（含台指期貨、股票期貨等） */
export async function fetchFutoptProducts(): Promise<FutoptProduct[]> {
  const cached = getCache<FutoptProduct[]>("futopt-products");
  if (cached) return cached;

  const res = await futoptFetch<FutoptProductsResponse>("/intraday/products");
  const raw = res?.data ?? [];

  const list: FutoptProduct[] = [];
  for (const p of raw) {
    const expiryDate = parseExpiryDate(p);
    const underlyingSymbol = p.underlyingSymbol ?? p.underlying;
    if (!p.symbol || !expiryDate || !underlyingSymbol) continue;
    list.push({ symbol: p.symbol, name: p.name, underlyingSymbol, expiryDate });
  }

  setCache("futopt-products", list, 24 * 60 * 60 * 1000);
  return list;
}

/** 取得單一期貨合約即時報價 */
export async function fetchFutoptQuote(symbol: string): Promise<FutoptQuote | null> {
  const res = await futoptFetch<FutoptQuoteResponse>(`/intraday/quote/${encodeURIComponent(symbol)}`);
  const price = res?.lastPrice ?? res?.closePrice ?? res?.referencePrice;
  if (!res || price == null) return null;

  return {
    symbol,
    price,
    updatedAt: new Date(res.lastUpdated ?? Date.now()),
  };
}

/** 併發限制批次取得多檔期貨報價，單一合約失敗不影響其他合約 */
export async function fetchFutoptQuotesBatch(
  symbols: string[],
  concurrency = 12,
): Promise<{ quotes: Record<string, FutoptQuote>; failed: string[] }> {
  const quotes: Record<string, FutoptQuote> = {};
  const failed: string[] = [];

  let cursor = 0;
  async function worker() {
    while (cursor < symbols.length) {
      const symbol = symbols[cursor++];
      const quote = await fetchFutoptQuote(symbol);
      if (quote) quotes[symbol] = quote;
      else failed.push(symbol);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, symbols.length) }, () => worker()),
  );

  return { quotes, failed };
}
