import { NextRequest, NextResponse } from "next/server";
import {
  ensureTodaySnapshot,
  getLatestSnapshot,
  getSnapshotByDate,
} from "@/lib/etf-holdings";

export const dynamic = "force-dynamic";

/**
 * GET /api/etf/holdings?symbol=00980A
 *   - 預設先查 DB 最新一筆；若沒有任何快照，會嘗試抓今日 PCF
 *
 * GET /api/etf/holdings?symbol=00980A&date=2026-05-15
 *   - 只查 DB 中指定日期的快照（不會觸發外網 fetch）
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json(
      { error: "Missing required query param: symbol" },
      { status: 400 },
    );
  }
  const dateParam = req.nextUrl.searchParams.get("date");

  if (dateParam) {
    const d = new Date(`${dateParam}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const snap = await getSnapshotByDate(symbol, d);
    if (!snap) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }
    return NextResponse.json(snap);
  }

  // 預設行為：DB 有最新快照就用；空則嘗試 fetch
  const latest = await getLatestSnapshot(symbol);
  if (latest) return NextResponse.json(latest);

  const ensured = await ensureTodaySnapshot(symbol);
  if ("code" in ensured) {
    return NextResponse.json({ error: ensured }, { status: 404 });
  }
  return NextResponse.json(ensured);
}
