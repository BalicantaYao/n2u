import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { fetchQuote, fetchHistorical } from "@/lib/fugle-api";
import {
  suggestStopLossLevels,
  calculatePositionImpact,
} from "@/lib/stop-loss-calculator";
import type { Market } from "@/types/taiwan";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const market = (searchParams.get("market") ?? "TWSE") as Market;
  const entryPrice = parseFloat(searchParams.get("entryPrice") ?? "0");
  const newShares = parseInt(searchParams.get("newShares") ?? "0", 10);
  const excludeTradeId = searchParams.get("excludeTradeId") ?? undefined;
  const baseModeParam = searchParams.get("baseMode");
  const requestedBaseMode: "entry" | "market" =
    baseModeParam === "market" ? "market" : "entry";

  if (!symbol || !entryPrice || entryPrice <= 0) {
    return NextResponse.json(
      { error: "缺少 symbol 或 entryPrice" },
      { status: 400 }
    );
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);

  // Fetch market data and position in parallel; DB failure is non-fatal
  const [bars, quote, openLots] = await Promise.all([
    fetchHistorical(symbol, market, fromDate, new Date(), "1d"),
    fetchQuote(symbol, market),
    prisma.positionLot
      .findMany({
        where: {
          symbol,
          isOpen: true,
          userId: auth.userId,
          ...(excludeTradeId ? { openTradeId: { not: excludeTradeId } } : {}),
        },
        select: { shares: true, costPerShare: true },
      })
      .catch(() => [] as { shares: number; costPerShare: number }[]),
  ]);

  // Aggregate existing position
  let existingPosition:
    | { avgCostPerShare: number; totalShares: number; totalCost: number }
    | undefined;

  if (openLots.length > 0) {
    const totalShares = openLots.reduce((sum: number, lot: { shares: number }) => sum + lot.shares, 0);
    const totalCost = openLots.reduce(
      (sum: number, lot: { shares: number; costPerShare: number }) => sum + lot.shares * lot.costPerShare,
      0
    );
    existingPosition = {
      totalShares,
      totalCost,
      avgCostPerShare: totalShares > 0 ? totalCost / totalShares : 0,
    };
  }

  const prevClose = quote?.prevClose ?? 0;
  const mode: "scale-in" | "edit" = excludeTradeId ? "edit" : "scale-in";

  // 若使用者選擇以市價為基準，但市價不可用，退回進場價
  const marketPrice = quote?.price ?? 0;
  const effectiveBaseMode: "entry" | "market" =
    requestedBaseMode === "market" && marketPrice > 0 ? "market" : "entry";
  const referencePrice =
    effectiveBaseMode === "market" ? marketPrice : entryPrice;
  const referenceLabel = effectiveBaseMode === "market" ? "市價" : "進場價";

  const input = {
    entryPrice,
    bars,
    prevClose,
    existingPosition,
    newShares: newShares || 0,
    mode,
    referencePrice,
    referenceLabel,
  };

  const suggestions = suggestStopLossLevels(input);
  const positionImpact = calculatePositionImpact(input);

  return NextResponse.json({
    suggestions,
    positionImpact,
    existingPosition: existingPosition ?? null,
    editingMode: mode === "edit",
    baseMode: effectiveBaseMode,
    referencePrice,
    quote: quote
      ? {
          price: quote.price,
          prevClose: quote.prevClose,
          low: quote.low,
          high: quote.high,
        }
      : null,
    meta: {
      barsCount: bars.length,
      hasHistoricalData: bars.length > 0,
    },
  });
}
