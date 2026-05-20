import { NextResponse } from "next/server";
import { fetchWatchlistMap } from "@/lib/watchlist-map-data";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/market/watchlist-map
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const data = await fetchWatchlistMap(auth.userId);
  return NextResponse.json(data);
}
