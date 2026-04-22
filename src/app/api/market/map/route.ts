import { NextRequest, NextResponse } from "next/server";
import { fetchMarketMap } from "@/lib/market-map-data";

export const revalidate = 300;

// GET /api/market/map?market=BOTH&rankFrom=1&rankTo=100
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const marketRaw = (sp.get("market") ?? "BOTH").toUpperCase();
  const market: "TWSE" | "TPEX" | "BOTH" =
    marketRaw === "TWSE" || marketRaw === "TPEX" ? marketRaw : "BOTH";

  const rankFromRaw = Number(sp.get("rankFrom"));
  const rankToRaw = Number(sp.get("rankTo"));
  const rankFrom = Number.isFinite(rankFromRaw) && rankFromRaw > 0 ? Math.floor(rankFromRaw) : 1;
  const rankTo =
    Number.isFinite(rankToRaw) && rankToRaw > 0
      ? Math.min(Math.floor(rankToRaw), 2000)
      : 100;

  const data = await fetchMarketMap({ market, rankFrom, rankTo });

  const hasAny = data.markets.some((m) => m.totalCount > 0);
  if (!hasAny) {
    return NextResponse.json(data, { status: 503 });
  }
  return NextResponse.json(data);
}
