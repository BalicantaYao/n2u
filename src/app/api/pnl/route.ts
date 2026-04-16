import { NextResponse } from "next/server";
import { computePnLSummary } from "@/lib/pnl-calculator";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const summary = await computePnLSummary(userId);
  return NextResponse.json(summary);
}
