import { NextRequest, NextResponse } from "next/server";
import { fetchPriceChangesBatch } from "@/lib/market-api";
import type { Market } from "@/types/taiwan";

// GET /api/market/price-changes?symbols=2330:TWSE,AAPL:NASDAQ
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") ?? "";
  if (!raw) return NextResponse.json({});

  const symbols = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [symbol, market] = s.split(":");
      return { symbol, market: (market ?? "TWSE") as Market };
    });

  const changes = await fetchPriceChangesBatch(symbols);
  return NextResponse.json(changes);
}
