import { NextRequest, NextResponse } from "next/server";
import { getDailyPnL } from "@/lib/pnl-calculator";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const data = await getDailyPnL(
    userId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );

  return NextResponse.json(data);
}
