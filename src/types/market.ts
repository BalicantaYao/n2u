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

export interface SearchResult {
  symbol: string;
  symbolName?: string;
  market: "TWSE" | "TPEX";
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
