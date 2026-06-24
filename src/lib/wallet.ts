import { PrismaClient } from "@prisma/client";
import type { Currency } from "@/types/taiwan";

/** Prisma transaction client (matches the shape used by prisma.$transaction callbacks) */
export type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;

export type WalletTxType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "TRADE_BUY"
  | "TRADE_SELL"
  | "REVERSAL";

/** 餘額不足錯誤：供 API 轉成 400 回應 */
export class InsufficientFundsError extends Error {
  currency: Currency;
  required: number;
  balance: number;
  constructor(currency: Currency, required: number, balance: number) {
    super("餘額不足");
    this.name = "InsufficientFundsError";
    this.currency = currency;
    this.required = required;
    this.balance = balance;
  }
}

/** 取得或建立（預設 balance 0）對應幣別錢包 */
export async function getOrCreateWallet(
  tx: TxClient,
  userId: string,
  currency: Currency,
) {
  const existing = await tx.wallet.findUnique({
    where: { userId_currency: { userId, currency } },
  });
  if (existing) return existing;
  return tx.wallet.create({
    data: { userId, currency, balance: 0 },
  });
}

/**
 * 套用一筆錢包異動：更新餘額並寫入帳本。
 * amount 帶正負號（儲值/賣出為正，提領/買入為負）。回傳異動後餘額。
 */
export async function applyWalletMovement(
  tx: TxClient,
  params: {
    userId: string;
    currency: Currency;
    type: WalletTxType;
    amount: number;
    tradeId?: string | null;
    note?: string | null;
  },
): Promise<number> {
  const { userId, currency, type, amount, tradeId, note } = params;
  const wallet = await getOrCreateWallet(tx, userId, currency);
  const balanceAfter = wallet.balance + amount;

  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: balanceAfter },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      currency,
      type,
      amount,
      balanceAfter,
      tradeId: tradeId ?? null,
      note: note ?? null,
    },
  });

  return balanceAfter;
}

/** 餘額不足時拋出 InsufficientFundsError */
export async function assertSufficientBalance(
  tx: TxClient,
  userId: string,
  currency: Currency,
  cost: number,
): Promise<void> {
  const wallet = await getOrCreateWallet(tx, userId, currency);
  if (wallet.balance < cost) {
    throw new InsufficientFundsError(currency, cost, wallet.balance);
  }
}
