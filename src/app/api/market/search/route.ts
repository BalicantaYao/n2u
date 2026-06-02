import { NextRequest, NextResponse } from "next/server";
import { searchTaiwanStocks } from "@/lib/twse-api";
import { searchSymbols as fugleSearch } from "@/lib/fugle-api";
import { searchSymbolsUS } from "@/lib/finnhub-api";

type TWResult = {
  symbol: string;
  symbolName?: string;
  name?: string;
  market: string;
  isETF?: boolean;
};

// GET /api/market/search?q=台積電
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q || q.length < 1) return NextResponse.json([]);

  // 台股來源：本地 TWSE/TPEX 清單（免 Fugle quota）＋ Fugle tickers（權威即時清單，
  // 24h 快取）。兩者合併去重，確保本地清單漏抓的個股（例如新上櫃股 6265 方土昶）
  // 仍能被搜尋到——先前只在本地清單「完全無結果」時才 fallback 到 Fugle，
  // 當其他代號（例如輸入「626」命中 6263…）讓本地清單非空時，漏抓的個股就會被吃掉。
  // 美股來源：Finnhub /search + symbol list。
  const [twLocal, twFugle, usRes] = await Promise.all([
    searchTaiwanStocks(q),
    fugleSearch(q).catch(() => []),
    searchSymbolsUS(q),
  ]);

  // 以 symbol 去重，保留先出現者（本地清單優先，名稱較穩定）。
  const seen = new Set<string>();
  const tw: TWResult[] = [];
  for (const item of [...twLocal, ...twFugle] as TWResult[]) {
    if (!item.symbol || seen.has(item.symbol)) continue;
    seen.add(item.symbol);
    tw.push(item);
  }

  // 合併：台股在前、美股在後，上限 20
  const merged = [...tw, ...usRes].slice(0, 20);
  return NextResponse.json(merged);
}
