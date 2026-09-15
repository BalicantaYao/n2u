/**
 * Covered Call 結構的損益計算。
 *
 * 一個「底倉」(CoveredCallPosition) 是買進的 Call（long call）或現股，
 * 底下掛著多筆「賣出 Call」(CoveredCallLeg)，每次賣出收取權利金。
 *
 * 金額換算一律為：價格 × 契約乘數 × 數量。
 * 台股股票選擇權每口 2,000 股、台指選擇權每點 50 元、現股一張 1,000 股，
 * 乘數由使用者於底倉設定，同一底倉的所有賣出腳共用。
 */

import type { CoveredCallLeg, CoveredCallPosition } from "@/types/covered-call";

/** 取日期字串的日期部分（YYYY-MM-DD），可吃 ISO 字串 */
export function dateOnly(value: string): string {
  return value.slice(0, 10);
}

/** 以 YYYY/MM/DD 呈現日期；直接切字串，不經過 Date 以免時區位移 */
export function formatDateOnly(value: string): string {
  return dateOnly(value).replace(/-/g, "/");
}

/** 距離指定日期還有幾天（負值代表已過期）；以 UTC 當日零時為基準避免時區偏移 */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const target = Date.parse(`${dateOnly(date)}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.round((target - today) / 86_400_000);
}

/** 單腳賣出 Call 的權利金收入（未扣手續費） */
export function legGrossPremium(
  leg: Pick<CoveredCallLeg, "openPremium" | "contracts">,
  multiplier: number,
): number {
  return leg.openPremium * multiplier * leg.contracts;
}

/** 單腳賣出 Call 開倉實收金額（權利金 − 開倉費用） */
export function legNetCredit(
  leg: Pick<CoveredCallLeg, "openPremium" | "contracts" | "openFee">,
  multiplier: number,
): number {
  return legGrossPremium(leg, multiplier) - leg.openFee;
}

/**
 * 單腳賣出 Call 的已實現損益；尚未平倉回傳 null。
 * 到期歸零 (EXPIRED) 的平倉權利金視為 0，被指派 (ASSIGNED) 則填入結算價值。
 */
export function legRealizedPnL(
  leg: CoveredCallLeg,
  multiplier: number,
): number | null {
  if (leg.status === "OPEN") return null;
  const closePremium = leg.closePremium ?? 0;
  return (
    (leg.openPremium - closePremium) * multiplier * leg.contracts -
    leg.openFee -
    (leg.closeFee ?? 0)
  );
}

export interface CoveredCallSummary {
  /** 底倉成本（含買進手續費） */
  longCost: number;
  /** 底倉已了結損益；未平倉為 null */
  longRealizedPnL: number | null;
  /** 已平倉賣出腳累計實現權利金損益 */
  realizedPremium: number;
  /** 未平倉賣出腳已收到的權利金淨額（尚未實現） */
  openPremiumCredit: number;
  /** 已實現淨損益 = 賣出腳實現 + 底倉實現 */
  netRealizedPnL: number;
  /** 權利金回收底倉成本的比例；底倉成本為 0 時為 null */
  costRecoveryPct: number | null;
  /** 扣掉已收權利金後的每單位有效成本 */
  effectiveCostPerUnit: number;
  /** 損益兩平價；long call 為履約價 + 有效成本，現股即有效成本 */
  breakeven: number;
  /** 未平倉賣出口數 */
  openContracts: number;
  /** 掩護比例 = 未平倉賣出口數 / 底倉數量 */
  coverageRatio: number;
  /** 賣出口數超過底倉數量（等同裸賣，風險警示） */
  isOverWritten: boolean;
  /** 已平倉腳數 / 總腳數 */
  closedLegCount: number;
  legCount: number;
  /** 未平倉賣出腳中最近的到期日與剩餘天數 */
  nearestExpiry: string | null;
  nearestExpiryDays: number | null;
  /** 底倉到期日剩餘天數（現股底倉為 null） */
  longDaysToExpiry: number | null;
}

export function summarizePosition(
  position: CoveredCallPosition,
): CoveredCallSummary {
  const m = position.contractMultiplier;
  const legs = position.legs ?? [];

  const longCost = position.openPrice * m * position.quantity + position.openFee;
  const longRealizedPnL =
    position.status === "CLOSED" && position.closePrice != null
      ? (position.closePrice - position.openPrice) * m * position.quantity -
        position.openFee -
        (position.closeFee ?? 0)
      : null;

  let realizedPremium = 0;
  let openPremiumCredit = 0;
  let openContracts = 0;
  let closedLegCount = 0;
  let nearestExpiry: string | null = null;

  for (const leg of legs) {
    const realized = legRealizedPnL(leg, m);
    if (realized == null) {
      openPremiumCredit += legNetCredit(leg, m);
      openContracts += leg.contracts;
      const expiry = dateOnly(leg.expiry);
      if (nearestExpiry == null || expiry < nearestExpiry) nearestExpiry = expiry;
    } else {
      realizedPremium += realized;
      closedLegCount += 1;
    }
  }

  const unitValue = m * position.quantity;
  const effectiveCostPerUnit =
    unitValue > 0 ? (longCost - realizedPremium) / unitValue : 0;

  return {
    longCost,
    longRealizedPnL,
    realizedPremium,
    openPremiumCredit,
    netRealizedPnL: realizedPremium + (longRealizedPnL ?? 0),
    costRecoveryPct: longCost > 0 ? realizedPremium / longCost : null,
    effectiveCostPerUnit,
    breakeven:
      position.strike != null
        ? position.strike + effectiveCostPerUnit
        : effectiveCostPerUnit,
    openContracts,
    coverageRatio: position.quantity > 0 ? openContracts / position.quantity : 0,
    isOverWritten: openContracts > position.quantity,
    closedLegCount,
    legCount: legs.length,
    nearestExpiry,
    nearestExpiryDays: daysUntil(nearestExpiry),
    longDaysToExpiry: daysUntil(position.expiry),
  };
}

export interface CoveredCallTotals {
  positionCount: number;
  openPositionCount: number;
  /** 各幣別分開加總，避免台幣與美元混加 */
  byCurrency: Record<
    string,
    {
      longCost: number;
      realizedPremium: number;
      openPremiumCredit: number;
      netRealizedPnL: number;
    }
  >;
  openLegCount: number;
  /** 未平倉賣出腳中 7 天內到期的腳數 */
  expiringSoonCount: number;
  /** 有裸賣（賣超過底倉）的底倉數 */
  overWrittenCount: number;
}

const EXPIRING_SOON_DAYS = 7;

export function summarizeAll(
  positions: CoveredCallPosition[],
): CoveredCallTotals {
  const totals: CoveredCallTotals = {
    positionCount: positions.length,
    openPositionCount: 0,
    byCurrency: {},
    openLegCount: 0,
    expiringSoonCount: 0,
    overWrittenCount: 0,
  };

  for (const position of positions) {
    const s = summarizePosition(position);
    if (position.status === "OPEN") totals.openPositionCount += 1;
    if (s.isOverWritten) totals.overWrittenCount += 1;

    const bucket = (totals.byCurrency[position.currency] ??= {
      longCost: 0,
      realizedPremium: 0,
      openPremiumCredit: 0,
      netRealizedPnL: 0,
    });
    if (position.status === "OPEN") bucket.longCost += s.longCost;
    bucket.realizedPremium += s.realizedPremium;
    bucket.openPremiumCredit += s.openPremiumCredit;
    bucket.netRealizedPnL += s.netRealizedPnL;

    for (const leg of position.legs ?? []) {
      if (leg.status !== "OPEN") continue;
      totals.openLegCount += 1;
      const days = daysUntil(leg.expiry);
      if (days != null && days <= EXPIRING_SOON_DAYS) totals.expiringSoonCount += 1;
    }
  }

  return totals;
}
