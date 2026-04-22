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
  price: number;
  change: number;
  changePct: number; // 小數：0.0123 = +1.23%
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
  meta: {
    barsCount: number;
    hasHistoricalData: boolean;
  };
}
