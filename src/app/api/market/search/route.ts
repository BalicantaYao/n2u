import { NextRequest, NextResponse } from "next/server";
import { searchTaiwanStocks } from "@/lib/twse-api";
import { searchSymbols as fugleSearch } from "@/lib/fugle-api";
import { searchSymbolsUS } from "@/lib/finnhub-api";

// GET /api/market/search?q=台積電
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q || q.length < 1) return NextResponse.json([]);

  // 台股來源：優先用本地 TWSE/TPEX 清單（免 Fugle quota），空則 fallback 到 Fugle tickers。
  // 美股來源：Finnhub /search + symbol list。
  const [twLocal, usRes] = await Promise.all([
    searchTaiwanStocks(q),
    searchSymbolsUS(q),
  ]);

  let tw: Array<{
    symbol: string;
    symbolName?: string;
    name?: string;
    market: string;
    isETF?: boolean;
  }> = twLocal;

  if (tw.length === 0) {
    tw = await fugleSearch(q);
  }

  // 合併：台股在前、美股在後，上限 20
  const merged = [...tw, ...usRes].slice(0, 20);
  return NextResponse.json(merged);
}
