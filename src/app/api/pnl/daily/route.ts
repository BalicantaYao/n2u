import { NextRequest, NextResponse } from "next/server";
import { getDailyPnL } from "@/lib/pnl-calculator";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const data = await getDailyPnL(
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );

  return NextResponse.json(data);
}
