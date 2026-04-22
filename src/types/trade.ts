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
  isStopLossAlert?: boolean;
  notes: string[];
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

export interface TradingResultsData {
  summary: {
    totalRealized: number;
    totalTrades: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    totalCommission: number;
    totalTransactionTax: number;
  };
  bySymbol: SymbolResult[];
}
