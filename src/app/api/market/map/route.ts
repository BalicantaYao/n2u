import { NextRequest, NextResponse } from "next/server";
import { fetchMarketMap } from "@/lib/twse-market-data";

export const revalidate = 300;

// GET /api/market/map?limit=150
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("limit");
  const parsed = raw ? Number(raw) : NaN;
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 150;

  const data = await fetchMarketMap(limit);
  if (data.totalCount === 0) {
    return NextResponse.json(data, { status: 503 });
  }
  return NextResponse.json(data);
}
