export type Market = "TWSE" | "TPEX" | "NYSE" | "NASDAQ";
export type Side = "BUY" | "SELL";
export type LotType = "ROUND" | "ODD";
export type Currency = "TWD" | "USD";

export const TW_MARKETS: Market[] = ["TWSE", "TPEX"];
export const US_MARKETS: Market[] = ["NYSE", "NASDAQ"];

export function marketToCurrency(market: Market): Currency {
  return market === "NYSE" || market === "NASDAQ" ? "USD" : "TWD";
}

export function isUSMarket(market: Market): boolean {
  return market === "NYSE" || market === "NASDAQ";
}
