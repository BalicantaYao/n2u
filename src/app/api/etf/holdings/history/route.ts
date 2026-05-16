import { NextRequest, NextResponse } from "next/server";
import { getSnapshotHistory } from "@/lib/etf-holdings";

export const dynamic = "force-dynamic";

/** GET /api/etf/holdings/history?symbol=00980A&limit=30 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json(
      { error: "Missing required query param: symbol" },
      { status: 400 },
    );
  }
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 30, 1), 365) : 30;

  const history = await getSnapshotHistory(symbol, limit);
  return NextResponse.json(history);
}
