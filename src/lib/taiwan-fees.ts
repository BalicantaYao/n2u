/**
 * 台灣股市費用計算引擎
 *
 * 手續費（買賣皆收）：price × shares × 0.001425 × discount，最低 max(1, round(20 × discount)) 元
 * 證交稅（僅賣出）  ：price × shares × 0.003（一般股票）或 0.001（ETF）
 * 交割日           ：T+2 交易日（略過週末，未計算國定假日）
 */

export interface FeeInput {
  price: number;
  shares: number;
  side: "BUY" | "SELL";
  isETF?: boolean;
  /** 券商手續費折扣係數，1 = 無折扣，0.6 = 6 折 */
  commissionDiscount?: number;
}

export interface FeeResult {
  grossAmount: number;      // 成交金額（price × shares）
  commission: number;       // 手續費（已套用折扣）
  transactionTax: number;   // 證交稅（買進為 0）
  totalFees: number;        // commission + transactionTax
  netAmount: number;        // 買進: grossAmount + totalFees；賣出: grossAmount - totalFees
}

const BASE_COMMISSION_RATE = 0.001425;
const BASE_MIN_COMMISSION = 20;

/** 將折扣係數限制在合理範圍 (0, 1] */
function clampDiscount(d: number | undefined): number {
  if (d == null || !Number.isFinite(d)) return 1;
  if (d > 1) return 1;
  if (d <= 0) return 1;
  return d;
}

/** 計算台股手續費（含折扣與底價） */
export function calcTWCommission(grossAmount: number, discount = 1): number {
  const d = clampDiscount(discount);
  const minFloor = Math.max(1, Math.round(BASE_MIN_COMMISSION * d));
  return Math.max(minFloor, Math.round(grossAmount * BASE_COMMISSION_RATE * d));
}

export function calculateFees(input: FeeInput): FeeResult {
  const { price, shares, side, isETF = false, commissionDiscount } = input;
  const grossAmount = price * shares;

  const commission = calcTWCommission(grossAmount, commissionDiscount);

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
