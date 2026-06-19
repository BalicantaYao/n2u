import type { Market, Side, LotType, Currency } from "./taiwan";

export interface Trade {
  id: string;
  createdAt: string;
  updatedAt: string;
  symbol: string;
  symbolName?: string;
  market: Market;
  currency: Currency;
  side: Side;
  tradeDate: string;
  settlementDate?: string;
  lotType: LotType;
  lots?: number;
  shares: number;
  price: number;
  commission: number;
  transactionTax: number;
  totalFees: number;
  grossAmount: number;
  netAmount: number;
  realizedPnL?: number;
  isETF: boolean;
  stopLoss?: number;
  notes?: string;
  tags?: string;
}

export interface CreateTradeInput {
  symbol: string;
  symbolName?: string;
  market: Market;
  side: Side;
  tradeDate: string;
  lotType: LotType;
  lots?: number;
  shares: number;
  price: number;
  commission?: number;
  isETF?: boolean;
  stopLoss?: number;
  notes?: string;
  tags?: string;
}

export interface UpdateTradeInput extends Partial<CreateTradeInput> {
  id: string;
}

export interface PositionNote {
  /** 備註內容 */
  note: string;
  /** 該備註對應進場日（YYYY-MM-DD） */
  date: string;
}

export interface StopLossAdjustmentEntry {
  /** 調整前停損價，null = 先前未設定 */
  previousStopLoss: number | null;
  /** 調整後停損價，null = 清除停損 */
  newStopLoss: number | null;
  /** 此次調整的筆記 */
  note: string | null;
  /** 調整時間（ISO 字串） */
  date: string;
}

export interface Position {
  symbol: string;
  symbolName?: string;
  market: Market;
  currency: Currency;
  isETF?: boolean;
  totalShares: number;
  avgCostPerShare: number;
  totalCost: number;
  currentPrice?: number;
  dailyChange?: number;
  dailyChangePct?: number;
  marketValue?: number;
  unrealizedPnL?: number;
  unrealizedPnLPct?: number;
  realizedPnL?: number;
  totalPnLPct?: number;
  stopLoss?: number;
  pnlAtStopLoss?: number;
  pnlAtStopLossPct?: number;
  latestOpenBuyTradeId?: string;
  ma5?: number;
  ma10?: number;
  atr14?: number;
  /** 持倉天數：自最早一筆仍開倉的進場日起算的曆日數 */
  holdingDays?: number;
  suggestedStopLoss?: number;
  /** 建議停損價的參考日（YYYY-MM-DD），即近 14 日中開／收盤最高的那一日 */
  suggestedStopLossRefDate?: string;
  /**
   * 距離上次調整停損的曆日數。以最近一次停損調整為準，
   * 若從未調整則以最近一次進場日為基準。無停損價時為 undefined。
   */
  daysSinceStopLossUpdate?: number;
  /** 已設停損且超過 3 天未調整 → 提醒檢視 */
  needsStopLossReview?: boolean;
  isStopLossAlert?: boolean;
  notes: PositionNote[];
  /** 停損調整記錄，依時間新到舊排序 */
  stopLossHistory?: StopLossAdjustmentEntry[];
}

export interface PnLSummary {
  totalRealized: number;
  totalUnrealized: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalCommission: number;
  totalTransactionTax: number;
}

export interface DailyPnL {
  date: string;
  daily: number;
  cumulative: number;
}

export interface SellTradeDetail {
  id: string;
  tradeDate: string;
  shares: number;
  lotType: LotType;
  price: number;
  netAmount: number;
  buyCost: number;
  buyAvgPrice: number;
  buyDate?: string;
  buyDateEnd?: string;
  realizedPnL: number;
  realizedPnLPct: number;
  notes?: string;
}

export interface SymbolResult {
  symbol: string;
  symbolName?: string;
  market: Market;
  currency: Currency;
  tradeCount: number;
  totalShares: number;
  totalRealizedPnL: number;
  totalBuyCost: number;
  realizedPnLPct: number;
  winCount: number;
  lossCount: number;
  lastTradeDate: string;
  trades: SellTradeDetail[];
}

export interface MarketSummary {
  totalRealized: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalCommission: number;
  totalTransactionTax: number;
}

export interface TradingResultsData {
  summary: MarketSummary;
  summaryByCurrency: Record<Currency, MarketSummary>;
  bySymbol: SymbolResult[];
}
