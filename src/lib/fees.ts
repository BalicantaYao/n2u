/**
 * 費用計算派發層：依照 market 路由到 taiwan-fees 或 us-fees。
 * 既有直接 import taiwan-fees 的地方建議改 import 此檔以支援多市場。
 */

import type { Market } from "@/types/taiwan";
import { isUSMarket } from "@/types/taiwan";
import {
  calculateFees as calcTWFees,
  calcSettlementDate as calcTWSettlementDate,
  type FeeInput,
  type FeeResult,
} from "./taiwan-fees";
import { calculateUSFees, calcUSSettlementDate } from "./us-fees";

export type { FeeInput, FeeResult } from "./taiwan-fees";

export interface MarketFeeInput extends FeeInput {
  commission?: number;
}

export function calculateFees(
  market: Market,
  input: MarketFeeInput,
): FeeResult {
  if (isUSMarket(market)) {
    return calculateUSFees({
      price: input.price,
      shares: input.shares,
      side: input.side,
      commission: input.commission,
    });
  }
  return calcTWFees({
    price: input.price,
    shares: input.shares,
    side: input.side,
    isETF: input.isETF,
    commissionDiscount: input.commissionDiscount,
  });
}

export function calcSettlementDate(market: Market, tradeDate: Date): Date {
  return isUSMarket(market)
    ? calcUSSettlementDate(tradeDate)
    : calcTWSettlementDate(tradeDate);
}
