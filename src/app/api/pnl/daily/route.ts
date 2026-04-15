import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDailyPnL } from "@/lib/pnl-calculator";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const data = await getDailyPnL(
    user.id,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );

  return NextResponse.json(data);
}
