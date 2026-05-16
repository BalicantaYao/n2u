import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { refreshSnapshot } from "@/lib/etf-holdings";

export const dynamic = "force-dynamic";

/**
 * POST /api/etf/holdings/refresh
 * body: { symbol: string }
 *
 * 強制重新抓取 PCF 並寫入 DB（覆蓋同日舊資料）。需登入避免被外部觸發濫用。
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = (await req.json().catch(() => null)) as { symbol?: string } | null;
  const symbol = body?.symbol?.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing required field: symbol" }, { status: 400 });
  }

  const result = await refreshSnapshot(symbol);
  if ("code" in result) {
    return NextResponse.json({ error: result }, { status: 502 });
  }
  return NextResponse.json(result);
}
