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
// TPEX OpenAPI (`www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O`) 於 2024 網站改版後
// 已失效（回 403）。改用 TWSE ISIN 清冊（strMode=4 = 上櫃），為 Big5 編碼 HTML。
const TPEX_ISIN_URL = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4";

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
    if (!res.ok) {
      console.error(`[twse-api] TWSE stocks HTTP ${res.status}`);
      return [];
    }
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
  } catch (err) {
    console.error("[twse-api] TWSE stocks fetch failed:", err);
    return [];
  }
}

/** 取得 TPEX 上櫃公司清單（24 小時快取） */
export async function fetchTPEXStocks(): Promise<TPEXStock[]> {
  const cacheKey = "tpex-stocks";
  const cached = getCache<TPEXStock[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(TPEX_ISIN_URL, { next: { revalidate: 86400 } });
    if (!res.ok) {
      console.error(`[twse-api] TPEX ISIN HTTP ${res.status}`);
      return [];
    }
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("big5").decode(buf);

    // ISIN 頁面第一欄格式為「<代號>　<名稱>」（全形空白 U+3000）。
    // 只取 4 碼數字代號的普通股票（排除 ETN、權證、TDR、特別股等非 4 碼代號）。
    const re = /<td[^>]*>\s*(\d{4})\u3000([^<]+?)\s*<\/td>/g;
    const seen = new Set<string>();
    const stocks: TPEXStock[] = [];
    for (const m of html.matchAll(re)) {
      const symbol = m[1];
      const name = m[2].trim();
      if (!symbol || !name || seen.has(symbol)) continue;
      seen.add(symbol);
      stocks.push({ symbol, name, market: "TPEX" });
    }

    if (stocks.length === 0) {
      console.error("[twse-api] TPEX ISIN parsed 0 stocks (page format may have changed)");
    }
    setCache(cacheKey, stocks, 24 * 60 * 60 * 1000);
    return stocks;
  } catch (err) {
    console.error("[twse-api] TPEX ISIN fetch failed:", err);
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
    .filter((s) => {
      const symbol = s.symbol ?? "";
      const name = s.name ?? "";
      return symbol.includes(q) || name.toLowerCase().includes(q);
    })
    .slice(0, 10);
}
