export interface Quote {
  symbol: string;
  symbolName?: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  timestamp: Date;
}

/**
 * 多週期漲跌幅：以最近一筆收盤為基準，回推 N 個交易日的收盤計算。
 * 各欄位為小數（0.0123 = +1.23%），資料不足時為 null。
 */
export interface PriceChanges {
  symbol: string;
  changePct5d: number | null;
  changePct30d: number | null;
}

export interface OHLCVBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

import type { Market } from "./taiwan";

export interface SearchResult {
  symbol: string;
  symbolName?: string;
  market: Market;
  isETF: boolean;
}

/* ── Stop-Loss Helper ── */

export interface StopLossSuggestion {
  strategy: string;
  label: string;
  description: string;
  price: number;
  distancePct: number;
  category: "percentage" | "atr" | "support" | "ma" | "limit";
}

export interface PositionImpact {
  currentAvgCost: number;
  currentShares: number;
  newAvgCost: number;
  newTotalShares: number;
  newTotalCost: number;
  referencePrice: number;
  mode: "scale-in" | "edit";
}

/* ── Market Map（台股產業版塊地圖） ── */

export interface MarketMapStock {
  symbol: string;
  name: string;
  sector: string;
  /** Fugle / TWSE 產業代碼，例 "24" = 半導體業。UI 以此作為 sector 的穩定 key。 */
  industryCode?: string;
  /** 個股所屬市場；給定時 UI 以此組 TradingView 連結（觀察清單地圖含美股時必要）。 */
  market?: Market;
  price: number;
  /** 當日漲跌（金額）。`null` 表示資料來源缺漏，無法計算。 */
  change: number | null;
  /** 當日漲跌幅，小數：0.0123 = +1.23%。`null` 表示資料來源缺漏，無法計算。 */
  changePct: number | null;
  marketCap: number; // 以 TWD 為單位
}

export interface MarketMapSector {
  sector: string;
  industryCode?: string;
  stocks: MarketMapStock[];
  /** 該產業所有個股市值加總（用於排序 sector 本身） */
  marketCap: number;
}

export type MarketMapMarket = "TWSE" | "TPEX";
export type MarketMapSizingMode = "marketCap" | "tradeValue" | "mixed";

export interface MarketMapMarketPayload {
  market: MarketMapMarket;
  groups: MarketMapSector[];
  /** 來源資料時間（Fugle snapshot 回傳的日期，或 server fetch 時間） */
  asOf: string;
  /** 套完排名區間後的個股數 */
  totalCount: number;
  /** 套區間前的候選總數（前端顯示 rank 上限用） */
  universeCount: number;
  /** 若個股市值缺漏改用 trading value 當 size；mixed 表示部分個股為 trade value */
  sizingMode: MarketMapSizingMode;
  rankFrom: number;
  rankTo: number;
}

export interface MarketMapResponse {
  /** 1 或 2 筆（依 request 的 market=TWSE|TPEX|BOTH） */
  markets: MarketMapMarketPayload[];
  asOf: string;
}

/* ── Watchlist Map（以使用者觀察清單為版塊的熱度地圖） ── */

export type WatchlistMapTimeframe = "today" | "5d" | "30d";

export interface WatchlistMapStock {
  symbol: string;
  name: string;
  market: Market;
  price: number;
  /** 用於方塊面積；以 TWD 估算（美股市值會換算為 TWD 以便同圖比較）。 */
  marketCap: number;
  /** 三種週期漲跌幅，小數：0.0123 = +1.23%。`null` 表示資料不足。 */
  changePctToday: number | null;
  changePct5d: number | null;
  changePct30d: number | null;
}

export interface WatchlistMapGroup {
  watchlistId: string;
  watchlistName: string;
  stocks: WatchlistMapStock[];
  /** 群組內個股市值加總（用於排序版塊大小） */
  marketCap: number;
}

export interface WatchlistMapResponse {
  groups: WatchlistMapGroup[];
  asOf: string;
}

/** 單一移動平均線指標值（資訊用，不一定低於基準價） */
export interface MovingAverageIndicator {
  period: number;
  /** 移動平均值；資料不足時為 null */
  value: number | null;
  /** 相對基準價的差距百分比；資料不足時為 null */
  distancePct: number | null;
}

export interface StopLossHelperResponse {
  suggestions: StopLossSuggestion[];
  positionImpact: PositionImpact | null;
  existingPosition: {
    avgCostPerShare: number;
    totalShares: number;
    totalCost: number;
  } | null;
  editingMode: boolean;
  /** 此次回應實際採用的基準模式。若請求 market 但市價無法取得則會退回 entry。 */
  baseMode: "entry" | "market";
  /** 此次回應實際採用的基準價格。 */
  referencePrice: number;
  quote: {
    price: number;
    prevClose: number;
    low: number;
    high: number;
  } | null;
  /** 技術指標（資訊用），目前包含 SMA 5/10/20 */
  indicators: {
    sma: MovingAverageIndicator[];
  };
  meta: {
    barsCount: number;
    hasHistoricalData: boolean;
  };
}
