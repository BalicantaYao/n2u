/**
 * 台灣股市費用計算引擎
 *
 * 手續費（買賣皆收）：price × shares × 0.001425，最低 20 元
 * 證交稅（僅賣出）  ：price × shares × 0.003（一般股票）或 0.001（ETF）
 * 交割日           ：T+2 交易日（略過週末，未計算國定假日）
 */

export interface FeeInput {
  price: number;
  shares: number;
  side: "BUY" | "SELL";
  isETF?: boolean;
}

export interface FeeResult {
  grossAmount: number;      // 成交金額（price × shares）
  commission: number;       // 手續費
  transactionTax: number;   // 證交稅（買進為 0）
  totalFees: number;        // commission + transactionTax
  netAmount: number;        // 買進: grossAmount + totalFees；賣出: grossAmount - totalFees
}

export function calculateFees(input: FeeInput): FeeResult {
  const { price, shares, side, isETF = false } = input;
  const grossAmount = price * shares;

  const commission = Math.max(20, Math.round(grossAmount * 0.001425));

  const transactionTax =
    side === "SELL"
      ? Math.round(grossAmount * (isETF ? 0.001 : 0.003))
      : 0;

  const totalFees = commission + transactionTax;

  const netAmount =
    side === "BUY" ? grossAmount + commission : grossAmount - totalFees;

  return { grossAmount, commission, transactionTax, totalFees, netAmount };
}

/** 計算交割日（T+2 交易日，略過週末） */
export function calcSettlementDate(tradeDate: Date): Date {
  const d = new Date(tradeDate);
  let count = 0;
  while (count < 2) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d;
}

/** 計算漲停價（前收盤 × 1.1，四捨五入至分） */
export function calcUpperLimit(prevClose: number): number {
  return Math.round(prevClose * 1.1 * 100) / 100;
}

/** 計算跌停價（前收盤 × 0.9，四捨五入至分） */
export function calcLowerLimit(prevClose: number): number {
  return Math.round(prevClose * 0.9 * 100) / 100;
}

/** 整張股數換算 */
export function lotsToShares(lots: number): number {
  return lots * 1000;
}
