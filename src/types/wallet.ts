import type { Currency } from "./taiwan";

export type WalletTxType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "TRADE_BUY"
  | "TRADE_SELL"
  | "REVERSAL";

export interface WalletBalance {
  currency: Currency;
  balance: number;
}

export interface WalletTransaction {
  id: string;
  createdAt: string;
  currency: Currency;
  type: WalletTxType;
  amount: number;
  balanceAfter: number;
  tradeId: string | null;
  note: string | null;
}
