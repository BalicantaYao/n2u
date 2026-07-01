import { NextResponse } from "next/server";
import { computeFuturesBasis } from "@/lib/futures-basis";

export async function GET() {
  const data = await computeFuturesBasis();
  return NextResponse.json(data);
}
