/**
 * TWSE 市場總覽資料層（給 Market Map 使用）
 *
 * 資料來源：
 *   - STOCK_DAY_ALL：每日盤後 / 盤中每檔個股收盤、漲跌、成交量值
 *   - t187ap03_L：上市公司基本資料（含產業別、實收資本額、每股面額）
 *
 * 市值估算：shares = 實收資本額 / 普通股每股面額（面額多為 10 元）
 *           marketCap = shares × ClosingPrice
 *
 * 有速率限制（與 twse-api.ts 同域名），故以記憶體 TTL 快取。
 */

import type { MarketMapResponse, MarketMapStock, MarketMapSector } from "@/types/market";

const TWSE_BASE = "https://openapi.twse.com.tw/v1";

const STOCK_DAY_ALL_URL = `${TWSE_BASE}/exchangeReport/STOCK_DAY_ALL`;
const LISTED_COMPANIES_URL = `${TWSE_BASE}/opendata/t187ap03_L`;

// In-memory cache（單一 Node.js 程序內共享）
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  return null;
}

function setCache<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/* ── 型別（對應 TWSE openapi JSON 回傳結構） ── */

interface StockDayRow {
  Code?: string;
  Name?: string;
  ClosingPrice?: string;
  Change?: string;
  OpeningPrice?: string;
  HighestPrice?: string;
  LowestPrice?: string;
  TradeVolume?: string;
  TradeValue?: string;
  Transaction?: string;
  // 某些日期 TWSE 會改回傳中文欄位，保留彈性
  [key: string]: string | undefined;
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

/* ── Raw fetchers ── */

async function fetchStockDayAll(): Promise<StockDayRow[]> {
  const cached = getCache<StockDayRow[]>("stock-day-all");
  if (cached) return cached;

  try {
    const res = await fetch(STOCK_DAY_ALL_URL, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[twse-market-data] STOCK_DAY_ALL HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as StockDayRow[];
    const rows = Array.isArray(data) ? data : [];
    setCache("stock-day-all", rows, 5 * 60 * 1000);
    return rows;
  } catch (err) {
    console.error("[twse-market-data] STOCK_DAY_ALL fetch failed:", err);
    return [];
  }
}

async function fetchListedCompanies(): Promise<CompanyInfoRow[]> {
  const cached = getCache<CompanyInfoRow[]>("listed-companies-detail");
  if (cached) return cached;

  try {
    const res = await fetch(LISTED_COMPANIES_URL, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[twse-market-data] t187ap03_L HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as CompanyInfoRow[];
    const rows = Array.isArray(data) ? data : [];
    setCache("listed-companies-detail", rows, 24 * 60 * 60 * 1000);
    return rows;
  } catch (err) {
    console.error("[twse-market-data] t187ap03_L fetch failed:", err);
    return [];
  }
}

/* ── Helpers ── */

function parseNum(v: string | undefined): number {
  if (!v) return 0;
  // STOCK_DAY_ALL 偶爾用 "--" 表示停牌
  const cleaned = v.replace(/,/g, "").trim();
  if (!cleaned || cleaned === "--") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeIndustry(s: string | undefined): string {
  const v = (s ?? "").trim();
  return v || "其他";
}

/* ── Public: 組裝市場地圖資料 ── */

/**
 * 取得前 N 檔市值最大的上市股票，依產業分群。
 * limit 上限 1000；小於 1 時回空結果。
 */
export async function fetchMarketMap(limit: number): Promise<MarketMapResponse> {
  const n = Math.max(0, Math.min(Math.floor(limit) || 0, 1000));

  const [dailyRows, companyRows] = await Promise.all([
    fetchStockDayAll(),
    fetchListedCompanies(),
  ]);

  if (dailyRows.length === 0) {
    return { groups: [], asOf: new Date().toISOString(), totalCount: 0, sizingMode: "marketCap" };
  }

  // 建立公司基本資料的 symbol → info map
  const companyBySymbol = new Map<string, CompanyInfoRow>();
  for (const row of companyRows) {
    const code = (row["公司代號"] ?? "").trim();
    if (code) companyBySymbol.set(code, row);
  }

  // 是否能以市值為 size（需要 capital & par value 可解析）
  let hasAnyCap = false;

  type EnrichedStock = MarketMapStock & { tradeValue: number };
  const enriched: EnrichedStock[] = [];

  for (const row of dailyRows) {
    const symbol = (row.Code ?? "").trim();
    if (!symbol) continue;
    // 只保留 4 碼數字代號（排除 ETF/TDR/權證等非一般普通股）
    if (!/^\d{4}$/.test(symbol)) continue;

    const info = companyBySymbol.get(symbol);
    if (!info) continue; // 有公司基本資料才算進來（= 普通股公司）

    const price = parseNum(row.ClosingPrice);
    const change = parseNum(row.Change);
    if (price <= 0) continue; // 停牌或異常跳過

    const prevClose = price - change;
    const changePct = prevClose > 0 ? change / prevClose : 0;

    const capital = parseNum(info["實收資本額"]);
    const parValue = parseNum(info["普通股每股面額"]) || 10;
    const shares = capital > 0 ? capital / parValue : 0;
    const marketCap = shares > 0 ? shares * price : 0;
    if (marketCap > 0) hasAnyCap = true;

    enriched.push({
      symbol,
      name: (info["公司簡稱"] ?? info["公司名稱"] ?? row.Name ?? symbol).trim(),
      sector: normalizeIndustry(info["產業別"]),
      price,
      change,
      changePct,
      marketCap,
      tradeValue: parseNum(row.TradeValue),
    });
  }

  // 若完全拿不到市值（欄位命名被 TWSE 變更），fallback 用 trading value 當 size
  const sizingMode: "marketCap" | "tradeValue" = hasAnyCap ? "marketCap" : "tradeValue";

  // 排序並取前 N
  enriched.sort((a, b) => {
    const av = sizingMode === "marketCap" ? a.marketCap : a.tradeValue;
    const bv = sizingMode === "marketCap" ? b.marketCap : b.tradeValue;
    return bv - av;
  });

  const top = enriched.slice(0, n).map<MarketMapStock>((s) => ({
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    price: s.price,
    change: s.change,
    changePct: s.changePct,
    marketCap: sizingMode === "marketCap" ? s.marketCap : s.tradeValue,
  }));

  // 依產業分群並排序
  const groupMap = new Map<string, MarketMapStock[]>();
  for (const s of top) {
    const arr = groupMap.get(s.sector) ?? [];
    arr.push(s);
    groupMap.set(s.sector, arr);
  }

  const groups: MarketMapSector[] = [];
  for (const [sector, stocks] of groupMap) {
    stocks.sort((a, b) => b.marketCap - a.marketCap);
    const sum = stocks.reduce((acc, s) => acc + s.marketCap, 0);
    groups.push({ sector, stocks, marketCap: sum });
  }
  groups.sort((a, b) => b.marketCap - a.marketCap);

  return {
    groups,
    asOf: new Date().toISOString(),
    totalCount: top.length,
    sizingMode,
  };
}
