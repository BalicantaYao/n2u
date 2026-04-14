import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/yahoo-finance";
import type { Market } from "@/types/taiwan";

// GET /api/market/quote?symbols=2330:TWSE,3008:TPEX
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

  const quotes = await fetchQuotes(symbols);
  return NextResponse.json(quotes);
}
