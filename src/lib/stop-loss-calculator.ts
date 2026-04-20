/**
 * 停損建議計算引擎
 *
 * 純計算函式，無副作用。提供多種策略的停損價位建議：
 * - 固定百分比 (percentage)
 * - ATR 波動率 (atr)
 * - 技術支撐 (support)
 * - 均線 (ma)
 * - 跌停板 (limit)
 */

import { calcLowerLimit } from "@/lib/taiwan-fees";
import type { OHLCVBar, StopLossSuggestion, PositionImpact } from "@/types/market";

export interface StopLossCalcInput {
  entryPrice: number;
  bars: OHLCVBar[];
  prevClose: number;
  existingPosition?: {
    avgCostPerShare: number;
    avgPricePerShare: number;
    totalShares: number;
    totalCost: number;
  };
  newShares: number;
}

/** 計算 Average True Range */
export function calculateATR(bars: OHLCVBar[], period: number = 14): number {
  if (bars.length < 2) return 0;

  const trValues: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trValues.push(tr);
  }

  if (trValues.length === 0) return 0;

  const sliced = trValues.slice(-period);
  return sliced.reduce((sum, v) => sum + v, 0) / sliced.length;
}

/** 計算簡單移動平均 (SMA) */
export function calculateMA(bars: OHLCVBar[], period: number): number | null {
  if (bars.length < period) return null;
  const sliced = bars.slice(-period);
  return sliced.reduce((sum, b) => sum + b.close, 0) / period;
}

/** 取最近 N 根 K 棒的最低價 */
export function findRecentLow(bars: OHLCVBar[], period: number): number | null {
  if (bars.length === 0) return null;
  const sliced = bars.slice(-period);
  return Math.min(...sliced.map((b) => b.low));
}

/** 計算加碼後的倉位影響 */
export function calculatePositionImpact(
  input: StopLossCalcInput
): PositionImpact | null {
  if (input.newShares <= 0) return null;

  const { entryPrice, existingPosition, newShares } = input;
  const addedCost = newShares * entryPrice;

  if (existingPosition && existingPosition.totalShares > 0) {
    const newTotalShares = existingPosition.totalShares + newShares;
    const newTotalCost = existingPosition.totalCost + addedCost;
    const newAvgCost = newTotalCost / newTotalShares;
    const newAvgPrice =
      (existingPosition.avgPricePerShare * existingPosition.totalShares +
        entryPrice * newShares) /
      newTotalShares;

    return {
      currentAvgCost: existingPosition.avgCostPerShare,
      currentAvgPrice: existingPosition.avgPricePerShare,
      currentShares: existingPosition.totalShares,
      newAvgCost,
      newAvgPrice,
      newTotalShares,
      newTotalCost,
      referencePrice: newAvgCost,
    };
  }

  // 無既有持倉
  return {
    currentAvgCost: 0,
    currentAvgPrice: 0,
    currentShares: 0,
    newAvgCost: entryPrice,
    newAvgPrice: entryPrice,
    newTotalShares: newShares,
    newTotalCost: addedCost,
    referencePrice: entryPrice,
  };
}

/** 主要計算函式：產生所有策略的停損建議 */
export function suggestStopLossLevels(
  input: StopLossCalcInput
): StopLossSuggestion[] {
  const impact = calculatePositionImpact(input);
  const refPrice = impact?.referencePrice ?? input.entryPrice;
  const isAddingToPosition =
    input.existingPosition != null && input.existingPosition.totalShares > 0;
  const refLabel = isAddingToPosition ? "新均價" : "進場價";

  const suggestions: StopLossSuggestion[] = [];

  // ── 1. 固定百分比 ──
  for (const pct of [3, 5, 7, 10]) {
    const price = refPrice * (1 - pct / 100);
    suggestions.push({
      strategy: `pct-${pct}`,
      label: `固定 -${pct}%`,
      description: `從${refLabel}下跌 ${pct}%`,
      price: Math.round(price * 100) / 100,
      distancePct: -pct,
      category: "percentage",
    });
  }

  // ── 2. ATR 波動率 ──
  if (input.bars.length >= 15) {
    const atr = calculateATR(input.bars, 14);
    if (atr > 0) {
      for (const mult of [1.5, 2, 3]) {
        const price = refPrice - mult * atr;
        if (price > 0 && price < refPrice) {
          const distancePct = ((price - refPrice) / refPrice) * 100;
          suggestions.push({
            strategy: `atr-${mult}`,
            label: `${mult}× ATR(14)`,
            description: `ATR=${atr.toFixed(2)}，${refLabel} - ${mult}×${atr.toFixed(2)}`,
            price: Math.round(price * 100) / 100,
            distancePct: Math.round(distancePct * 100) / 100,
            category: "atr",
          });
        }
      }
    }
  }

  // ── 3. 技術支撐 ──
  const supportPeriods = [
    { period: 1, label: "前日低點" },
    { period: 5, label: "5 日低點" },
    { period: 20, label: "20 日低點" },
  ];
  for (const { period, label } of supportPeriods) {
    if (input.bars.length >= period) {
      const low = findRecentLow(input.bars, period);
      if (low != null && low > 0 && low < refPrice) {
        const distancePct = ((low - refPrice) / refPrice) * 100;
        suggestions.push({
          strategy: `support-${period}d`,
          label,
          description: `近 ${period} 日最低價`,
          price: Math.round(low * 100) / 100,
          distancePct: Math.round(distancePct * 100) / 100,
          category: "support",
        });
      }
    }
  }

  // ── 4. 均線 ──
  for (const period of [5, 10, 20]) {
    const ma = calculateMA(input.bars, period);
    if (ma != null && ma > 0 && ma < refPrice) {
      const distancePct = ((ma - refPrice) / refPrice) * 100;
      suggestions.push({
        strategy: `ma-${period}`,
        label: `${period}MA`,
        description: `${period} 日移動平均線`,
        price: Math.round(ma * 100) / 100,
        distancePct: Math.round(distancePct * 100) / 100,
        category: "ma",
      });
    }
  }

  // ── 5. 跌停板 ──
  if (input.prevClose > 0) {
    const limitDown = calcLowerLimit(input.prevClose);
    if (limitDown > 0 && limitDown < refPrice) {
      const distancePct = ((limitDown - refPrice) / refPrice) * 100;
      suggestions.push({
        strategy: "limit-down",
        label: "跌停價",
        description: `前收 ${input.prevClose.toFixed(2)} × 0.9`,
        price: limitDown,
        distancePct: Math.round(distancePct * 100) / 100,
        category: "limit",
      });
    }
  }

  // 按 price 降序（最緊的停損在前）
  suggestions.sort((a, b) => b.price - a.price);

  return suggestions;
}
