/**
 * Market Map 資料層：以 Fugle API 每日快照為主，產業代碼來自 Fugle tickers，
 * 市值計算由 TWSE opendata/t187ap03_L|O 提供股本資訊。
 *
 * 快取策略：每個市場、每個交易日（Asia/Taipei）只會打 Fugle snapshot 一次。
 * key = `market-map:snapshot:{TSE|OTC}:{YYYY-MM-DD}`
 */

import {
  fetchAllTickers,
  fetchSnapshotQuotes,
  type FugleTicker,
  type FugleSnapshotRow,
} from "@/lib/fugle-api";
import { fetchTwseSharesMap, type SharesInfo } from "@/lib/twse-market-data";
import { industryLabel } from "@/lib/taiwan-industry";
import type {
  MarketMapMarket,
  MarketMapMarketPayload,
  MarketMapResponse,
  MarketMapSector,
  MarketMapSizingMode,
  MarketMapStock,
} from "@/types/market";

/* ── 內部：依日期快取 snapshot ── */

const snapshotCache = new Map<string, FugleSnapshotRow[]>();

function getTaipeiDateString(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // "YYYY-MM-DD"
}

async function getDailySnapshot(market: "TSE" | "OTC"): Promise<FugleSnapshotRow[]> {
  const key = `market-map:snapshot:${market}:${getTaipeiDateString()}`;
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const rows = await fetchSnapshotQuotes(market);
  if (rows.length > 0) snapshotCache.set(key, rows);
  return rows;
}

/* ── Public ── */

export interface FetchMarketMapOptions {
  /** "TWSE" | "TPEX" | "BOTH" — 預設 BOTH */
  market?: "TWSE" | "TPEX" | "BOTH";
  /** 1-based 含，預設 1 */
  rankFrom?: number;
  /** 1-based 含，預設 100 */
  rankTo?: number;
}

const MARKET_TO_FUGLE: Record<MarketMapMarket, "TSE" | "OTC"> = {
  TWSE: "TSE",
  TPEX: "OTC",
};

export async function fetchMarketMap(
  opts: FetchMarketMapOptions = {},
): Promise<MarketMapResponse> {
  const which = opts.market ?? "BOTH";
  const rankFrom = Math.max(1, Math.floor(opts.rankFrom ?? 1));
  const rankTo = Math.max(rankFrom, Math.floor(opts.rankTo ?? 100));

  const wantedMarkets: MarketMapMarket[] =
    which === "TWSE" ? ["TWSE"] : which === "TPEX" ? ["TPEX"] : ["TWSE", "TPEX"];

  const [tickers, sharesMap, ...snapshots] = await Promise.all([
    fetchAllTickers(),
    fetchTwseSharesMap(),
    ...wantedMarkets.map((m) => getDailySnapshot(MARKET_TO_FUGLE[m])),
  ]);

  // 建立 symbol -> ticker 查找（一次 pass）
  const tickerBySymbol = new Map<string, FugleTicker>();
  for (const t of tickers) {
    if (t?.symbol) tickerBySymbol.set(t.symbol, t);
  }

  const payloads: MarketMapMarketPayload[] = wantedMarkets.map((market, i) => {
    const rows = snapshots[i] ?? [];
    return buildMarketPayload({
      market,
      rows,
      tickerBySymbol,
      sharesMap,
      rankFrom,
      rankTo,
    });
  });

  return {
    markets: payloads,
    asOf: new Date().toISOString(),
  };
}

/* ── Internals ── */

interface BuildPayloadArgs {
  market: MarketMapMarket;
  rows: FugleSnapshotRow[];
  tickerBySymbol: Map<string, FugleTicker>;
  sharesMap: Map<string, SharesInfo>;
  rankFrom: number;
  rankTo: number;
}

interface EnrichedStock {
  symbol: string;
  name: string;
  industryCode: string;
  industryName: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number;
  tradeValue: number;
  /** true 表示 marketCap 欄位實際是 tradeValue（缺股本資料時的 fallback） */
  isTradeValueFallback: boolean;
}

function buildMarketPayload(args: BuildPayloadArgs): MarketMapMarketPayload {
  const { market, rows, tickerBySymbol, sharesMap, rankFrom, rankTo } = args;
  const fugleMarket = MARKET_TO_FUGLE[market];

  const enriched: EnrichedStock[] = [];
  let hasTrueCap = false;
  let hasFallback = false;

  for (const row of rows) {
    const symbol = (row.symbol ?? "").trim();
    if (!symbol) continue;
    // 只保留 4 碼數字普通股（排除 ETF / 權證 / TDR 等）
    if (!/^\d{4}$/.test(symbol)) continue;

    const ticker = tickerBySymbol.get(symbol);
    if (ticker?.isETF) continue;
    // 確保屬於當前市場（tickers market 可能為 TSE / OTC）
    if (ticker && ticker.market && ticker.market !== fugleMarket) continue;

    const price = row.lastPrice ?? 0;
    if (price <= 0) continue;

    const previousClose = row.previousClose ?? 0;
    const change = row.change ?? (previousClose > 0 ? price - previousClose : 0);
    const changePct =
      typeof row.changePercent === "number"
        ? row.changePercent / 100
        : previousClose > 0
          ? (price - previousClose) / previousClose
          : 0;

    const industryCode = (ticker?.industry ?? "").trim();
    const industryName = industryLabel(industryCode, "zh-TW");

    const info = sharesMap.get(symbol);
    const shares = info?.shares ?? 0;
    const trueMarketCap = shares > 0 ? shares * price : 0;
    const tradeValue = row.tradeValue ?? 0;

    let marketCap = trueMarketCap;
    let isFallback = false;
    if (marketCap <= 0) {
      marketCap = tradeValue;
      isFallback = true;
    }
    if (marketCap <= 0) continue; // 沒有任何 size 依據就跳過

    if (isFallback) hasFallback = true;
    else hasTrueCap = true;

    enriched.push({
      symbol,
      name: (row.name ?? info?.name ?? ticker?.name ?? symbol).trim(),
      industryCode,
      industryName,
      price,
      change,
      changePct,
      marketCap,
      tradeValue,
      isTradeValueFallback: isFallback,
    });
  }

  const universeCount = enriched.length;

  // 依 marketCap desc 排序
  enriched.sort((a, b) => b.marketCap - a.marketCap);

  const from = Math.max(1, rankFrom);
  const to = Math.min(universeCount, rankTo);
  const sliced = universeCount > 0 && from <= to ? enriched.slice(from - 1, to) : [];

  // 以 industryCode 分群
  const groupMap = new Map<string, { code: string; name: string; stocks: MarketMapStock[] }>();
  for (const s of sliced) {
    const key = s.industryCode || "__OTHER__";
    let bucket = groupMap.get(key);
    if (!bucket) {
      bucket = { code: s.industryCode, name: s.industryName, stocks: [] };
      groupMap.set(key, bucket);
    }
    bucket.stocks.push({
      symbol: s.symbol,
      name: s.name,
      sector: s.industryName,
      industryCode: s.industryCode || undefined,
      price: s.price,
      change: s.change,
      changePct: s.changePct,
      marketCap: s.marketCap,
    });
  }

  const groups: MarketMapSector[] = [];
  for (const bucket of groupMap.values()) {
    bucket.stocks.sort((a, b) => b.marketCap - a.marketCap);
    const sum = bucket.stocks.reduce((acc, s) => acc + s.marketCap, 0);
    groups.push({
      sector: bucket.name,
      industryCode: bucket.code || undefined,
      stocks: bucket.stocks,
      marketCap: sum,
    });
  }
  groups.sort((a, b) => b.marketCap - a.marketCap);

  const sizingMode: MarketMapSizingMode = hasFallback
    ? hasTrueCap
      ? "mixed"
      : "tradeValue"
    : "marketCap";

  return {
    market,
    groups,
    asOf: new Date().toISOString(),
    totalCount: sliced.length,
    universeCount,
    sizingMode,
    rankFrom: from,
    rankTo: to,
  };
}
