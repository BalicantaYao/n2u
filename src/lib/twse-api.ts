/**
 * TWSE Open API wrapper
 * https://openapi.twse.com.tw/v1/
 *
 * 注意：TWSE API 有速率限制（每 5 秒最多 3 次請求），回應結果應快取。
 */

export interface TWSEStock {
  symbol: string;
  name: string;
  market: "TWSE";
}

export interface TPEXStock {
  symbol: string;
  name: string;
  market: "TPEX";
}

const TWSE_BASE = "https://openapi.twse.com.tw/v1";
const TPEX_BASE = "https://www.tpex.org.tw/openapi/v1";

// In-memory cache with TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** 取得 TWSE 上市公司清單（24 小時快取） */
export async function fetchTWSEStocks(): Promise<TWSEStock[]> {
  const cacheKey = "twse-stocks";
  const cached = getCache<TWSEStock[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${TWSE_BASE}/opendata/t187ap03_L`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const stocks: TWSEStock[] = (Array.isArray(data) ? data : [])
      .filter((item: Record<string, string>) => item["公司代號"] && item["公司簡稱"])
      .map((item: Record<string, string>) => ({
        symbol: item["公司代號"].trim(),
        name: item["公司簡稱"].trim(),
        market: "TWSE" as const,
      }));
    setCache(cacheKey, stocks, 24 * 60 * 60 * 1000);
    return stocks;
  } catch {
    return [];
  }
}

/** 取得 TPEX 上櫃公司清單（24 小時快取） */
export async function fetchTPEXStocks(): Promise<TPEXStock[]> {
  const cacheKey = "tpex-stocks";
  const cached = getCache<TPEXStock[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${TPEX_BASE}/mopsfin_t187ap03_O`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const stocks: TPEXStock[] = (Array.isArray(data) ? data : [])
      .filter((item: Record<string, string>) => item["公司代號"] && item["公司簡稱"])
      .map((item: Record<string, string>) => ({
        symbol: item["公司代號"].trim(),
        name: item["公司簡稱"].trim(),
        market: "TPEX" as const,
      }));
    setCache(cacheKey, stocks, 24 * 60 * 60 * 1000);
    return stocks;
  } catch {
    return [];
  }
}

/** 搜尋上市/上櫃股票（含名稱模糊搜尋） */
export async function searchTaiwanStocks(query: string) {
  const [twse, tpex] = await Promise.all([
    fetchTWSEStocks(),
    fetchTPEXStocks(),
  ]);
  const all = [...twse, ...tpex];
  const q = query.toLowerCase().trim();
  return all
    .filter(
      (s) =>
        s.symbol.includes(q) ||
        s.name.toLowerCase().includes(q)
    )
    .slice(0, 10);
}
