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
