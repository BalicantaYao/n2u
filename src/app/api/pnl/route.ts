import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { computePnLSummary } from "@/lib/pnl-calculator";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const summary = await computePnLSummary(user.id);
  return NextResponse.json(summary);
}
