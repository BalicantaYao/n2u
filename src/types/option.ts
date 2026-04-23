export type OptionAction = "SELL_PUT" | "BUY_PUT";
export type OptionStatus = "OPEN" | "CLOSED";

export interface OptionTrade {
  id: string;
  createdAt: string;
  updatedAt: string;
  symbol: string;
  market: string;
  currency: string;
  action: OptionAction;
  quantity: number;
  strikePrice: number;
  expirationDate: string;
  tradeDate: string;
  delta?: number | null;
  premium: number;
  netPremium: number;
  status: OptionStatus;
  notes?: string | null;
}

export interface CreateOptionTradeInput {
  symbol: string;
  action: OptionAction;
  quantity: number;
  strikePrice: number;
  expirationDate: string;
  tradeDate: string;
  delta?: number | null;
  premium: number;
  status?: OptionStatus;
  notes?: string | null;
}

export interface UpdateOptionTradeInput extends Partial<CreateOptionTradeInput> {
  id: string;
}

export interface OptionPositionGroup {
  symbol: string;
  strikePrice: number;
  expirationDate: string;
  rows: OptionTrade[];
  netPremium: number;
  totalContracts: number;
  isAllClosed: boolean;
  hasOpen: boolean;
}

export function groupOptionTrades(trades: OptionTrade[]): OptionPositionGroup[] {
  const map = new Map<string, OptionPositionGroup>();
  for (const t of trades) {
    const key = `${t.symbol}|${t.strikePrice}|${t.expirationDate.slice(0, 10)}`;
    let g = map.get(key);
    if (!g) {
      g = {
        symbol: t.symbol,
        strikePrice: t.strikePrice,
        expirationDate: t.expirationDate,
        rows: [],
        netPremium: 0,
        totalContracts: 0,
        isAllClosed: true,
        hasOpen: false,
      };
      map.set(key, g);
    }
    g.rows.push(t);
    g.netPremium += t.netPremium;
    g.totalContracts += t.quantity;
    if (t.status === "OPEN") {
      g.hasOpen = true;
      g.isAllClosed = false;
    }
  }
  return Array.from(map.values());
}

export function signedPremium(action: OptionAction, absPremium: number): number {
  const abs = Math.abs(absPremium);
  return action.startsWith("BUY_") ? -abs : abs;
}

export function computeNetPremium(
  action: OptionAction,
  absPremium: number,
  quantity: number,
): number {
  return signedPremium(action, absPremium) * 100 * quantity;
}
