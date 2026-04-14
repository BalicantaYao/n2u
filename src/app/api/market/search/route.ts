import { NextRequest, NextResponse } from "next/server";
import { searchTaiwanStocks } from "@/lib/twse-api";
import { searchSymbols } from "@/lib/yahoo-finance";

// GET /api/market/search?q=台積電
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q || q.length < 1) return NextResponse.json([]);

  // 優先從 TWSE/TPEX 清單搜尋（名稱/代碼模糊），fallback 到 yahoo search
  const localResults = await searchTaiwanStocks(q);

  if (localResults.length > 0) {
    return NextResponse.json(localResults);
  }

  // fallback: yahoo-finance2 search
  const yahooResults = await searchSymbols(q);
  return NextResponse.json(yahooResults);
}
