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
