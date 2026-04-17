import { NextResponse } from "next/server";
import { computePnLSummary } from "@/lib/pnl-calculator";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const summary = await computePnLSummary(auth.userId);
  return NextResponse.json(summary);
}
