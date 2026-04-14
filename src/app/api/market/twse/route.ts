import { NextResponse } from "next/server";
import { fetchTWSEStocks, fetchTPEXStocks } from "@/lib/twse-api";

export async function GET() {
  const [twse, tpex] = await Promise.all([fetchTWSEStocks(), fetchTPEXStocks()]);
  return NextResponse.json([...twse, ...tpex]);
}
