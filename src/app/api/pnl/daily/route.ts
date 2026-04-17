import { NextRequest, NextResponse } from "next/server";
import { getDailyPnL } from "@/lib/pnl-calculator";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const data = await getDailyPnL(
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined,
    auth.userId
  );

  return NextResponse.json(data);
}
