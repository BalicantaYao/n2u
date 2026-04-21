/**
 * 美股費用計算引擎
 *
 * 手續費：預設 0（多數美券商 IBKR Lite / Firstrade / 嘉信 已零佣金），由呼叫端以 commission 覆寫
 * 無證交稅（美國不收 transaction tax；賣出後之資本利得由報稅時處理）
 * 交割日：T+1 日曆日（2024-05-28 起美國 equities 改為 T+1）
 */

import type { FeeInput, FeeResult } from "./taiwan-fees";

export type USFeeInput = Omit<FeeInput, "isETF"> & { commission?: number };

export function calculateUSFees(input: USFeeInput): FeeResult {
  const { price, shares, side, commission = 0 } = input;
  const grossAmount = price * shares;

  const commissionAmount = Math.max(0, commission);
  const transactionTax = 0;
  const totalFees = commissionAmount + transactionTax;

  const netAmount =
    side === "BUY" ? grossAmount + totalFees : grossAmount - totalFees;

  return {
    grossAmount,
    commission: commissionAmount,
    transactionTax,
    totalFees,
    netAmount,
  };
}

/** 美股交割日：T+1 日曆日 */
export function calcUSSettlementDate(tradeDate: Date): Date {
  const d = new Date(tradeDate);
  d.setDate(d.getDate() + 1);
  return d;
}
