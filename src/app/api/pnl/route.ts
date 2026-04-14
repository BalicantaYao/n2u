import { NextResponse } from "next/server";
import { computePnLSummary } from "@/lib/pnl-calculator";

export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await computePnLSummary();
  return NextResponse.json(summary);
}
