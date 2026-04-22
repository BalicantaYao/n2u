/**
 * TWSE 公司基本資料：僅保留 shares-outstanding map 供市值計算。
 *
 * 資料來源：
 *   - opendata/t187ap03_L：上市公司基本資料
 *   - opendata/t187ap03_O：上櫃公司基本資料
 *
 * 市值估算：shares = 實收資本額 / 普通股每股面額（面額多為 10 元）
 *          marketCap = shares × lastPrice（由呼叫端帶入 Fugle snapshot 的價格）
 */

const TWSE_BASE = "https://openapi.twse.com.tw/v1";

const LISTED_COMPANIES_URL = `${TWSE_BASE}/opendata/t187ap03_L`;
const OTC_COMPANIES_URL = `${TWSE_BASE}/opendata/t187ap03_O`;

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  return null;
}

function setCache<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

interface CompanyInfoRow {
  公司代號?: string;
  公司簡稱?: string;
  公司名稱?: string;
  產業別?: string;
  實收資本額?: string;
  普通股每股面額?: string;
  [key: string]: string | undefined;
}

function parseNum(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/,/g, "").trim();
  if (!cleaned || cleaned === "--") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function fetchCompanyRows(url: string, cacheKey: string): Promise<CompanyInfoRow[]> {
  const cached = getCache<CompanyInfoRow[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[twse-market-data] ${cacheKey} HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as CompanyInfoRow[];
    const rows = Array.isArray(data) ? data : [];
    setCache(cacheKey, rows, 24 * 60 * 60 * 1000);
    return rows;
  } catch (err) {
    console.error(`[twse-market-data] ${cacheKey} fetch failed:`, err);
    return [];
  }
}

export interface SharesInfo {
  shares: number;
  name: string;
  industry?: string;
}

/**
 * 合併上市 + 上櫃公司資料，回傳 symbol → { shares, name, industry } map。
 * shares 單位為「股」（實收資本額 / 普通股每股面額）。
 */
export async function fetchTwseSharesMap(): Promise<Map<string, SharesInfo>> {
  const cached = getCache<Map<string, SharesInfo>>("twse-shares-map");
  if (cached) return cached;

  const [listed, otc] = await Promise.all([
    fetchCompanyRows(LISTED_COMPANIES_URL, "listed-companies-detail"),
    fetchCompanyRows(OTC_COMPANIES_URL, "otc-companies-detail"),
  ]);

  const map = new Map<string, SharesInfo>();
  for (const row of [...listed, ...otc]) {
    const code = (row["公司代號"] ?? "").trim();
    if (!code) continue;
    const capital = parseNum(row["實收資本額"]);
    const parValue = parseNum(row["普通股每股面額"]) || 10;
    const shares = capital > 0 ? capital / parValue : 0;
    const name = (row["公司簡稱"] ?? row["公司名稱"] ?? "").trim();
    const industry = (row["產業別"] ?? "").trim() || undefined;
    map.set(code, { shares, name, industry });
  }

  setCache("twse-shares-map", map, 24 * 60 * 60 * 1000);
  return map;
}
