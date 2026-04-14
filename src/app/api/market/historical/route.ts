import { NextRequest, NextResponse } from "next/server";
import { fetchHistorical } from "@/lib/yahoo-finance";
import type { Market } from "@/types/taiwan";

// GET /api/market/historical?symbol=2330&market=TWSE&interval=1d&from=2024-01-01&to=2025-01-01
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol");
  const market = (searchParams.get("market") ?? "TWSE") as Market;
  const interval = (searchParams.get("interval") ?? "1d") as "1d" | "1wk" | "1mo";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!symbol) return NextResponse.json({ error: "缺少 symbol" }, { status: 400 });

  const toDate = to ? new Date(to) : new Date();
  const fromDate = from
    ? new Date(from)
    : new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000);

  const bars = await fetchHistorical(symbol, market, fromDate, toDate, interval);
  return NextResponse.json(bars);
}
