/**
 * Watchlist Map 資料層：把使用者的觀察清單組成熱度地圖所需的資料。
 *
 * 每檔個股提供「方塊大小（市值）」與三種週期漲跌幅（今日 / 五日 / 三十日），
 * 讓前端切換週期時不需重新打 API。
 *
 * 資料來源：
 *   - 報價（價格 + 今日漲跌幅）：market-api fetchQuotes（台股 Fugle、美股 Finnhub）
 *   - 五日 / 三十日漲跌幅：market-api fetchPriceChangesBatch（歷史日 K）
 *   - 台股市值：TWSE 股本資料 × 現價
 *   - 美股市值：Finnhub profile2（換算為 TWD 以便同圖比較面積）
 */

import { prisma } from "@/lib/prisma";
import { fetchQuotes, fetchPriceChangesBatch } from "@/lib/market-api";
import { fetchTwseSharesMap } from "@/lib/twse-market-data";
import { fetchMarketCapUS } from "@/lib/finnhub-api";
import { isUSMarket, type Market } from "@/types/taiwan";
import type {
  WatchlistMapGroup,
  WatchlistMapResponse,
  WatchlistMapStock,
} from "@/types/market";

/**
 * 僅供「方塊面積」跨幣別比較的近似匯率（美元 → 新台幣）。
 * 不用於任何金額顯示，只決定美股相對台股的相對大小，因此用常數即可。
 */
const USD_TWD_FOR_SIZING = 32;

interface DbItem {
  symbol: string;
  symbolName: string | null;
  market: string;
}

export async function fetchWatchlistMap(userId: string): Promise<WatchlistMapResponse> {
  const watchlists = await prisma.watchlist.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  // 收集去重後的 {symbol, market}
  const uniqueKey = (s: string, m: string) => `${s}:${m}`;
  const uniqueMap = new Map<string, { symbol: string; market: Market }>();
  for (const wl of watchlists) {
    for (const it of wl.items as DbItem[]) {
      const market = it.market as Market;
      uniqueMap.set(uniqueKey(it.symbol, it.market), { symbol: it.symbol, market });
    }
  }
  const uniqueSymbols = [...uniqueMap.values()];

  const usSymbols = uniqueSymbols.filter((s) => isUSMarket(s.market));

  const [quotes, priceChanges, sharesMap, usCapEntries] = await Promise.all([
    fetchQuotes(uniqueSymbols),
    fetchPriceChangesBatch(uniqueSymbols),
    fetchTwseSharesMap(),
    Promise.all(
      usSymbols.map(async (s) => {
        const capUsd = await fetchMarketCapUS(s.symbol).catch(() => null);
        return [s.symbol, capUsd] as const;
      }),
    ),
  ]);

  const usCapBySymbol = new Map<string, number | null>(usCapEntries);

  const marketCapFor = (symbol: string, market: Market, price: number): number => {
    if (isUSMarket(market)) {
      const capUsd = usCapBySymbol.get(symbol);
      if (capUsd && capUsd > 0) return capUsd * USD_TWD_FOR_SIZING;
      return price > 0 ? price * USD_TWD_FOR_SIZING : 0;
    }
    const shares = sharesMap.get(symbol)?.shares ?? 0;
    if (shares > 0 && price > 0) return shares * price;
    return price > 0 ? price : 0;
  };

  const groups: WatchlistMapGroup[] = [];
  for (const wl of watchlists) {
    const stocks: WatchlistMapStock[] = [];
    for (const it of wl.items as DbItem[]) {
      const market = it.market as Market;
      const quote = quotes[it.symbol];
      const changes = priceChanges[it.symbol];
      const price = quote?.price ?? 0;
      const marketCap = marketCapFor(it.symbol, market, price);

      stocks.push({
        symbol: it.symbol,
        name: (it.symbolName ?? quote?.symbolName ?? it.symbol).trim(),
        market,
        price,
        marketCap,
        changePctToday: quote ? quote.changePct : null,
        changePct5d: changes?.changePct5d ?? null,
        changePct30d: changes?.changePct30d ?? null,
      });
    }

    stocks.sort((a, b) => b.marketCap - a.marketCap);
    const sum = stocks.reduce((acc, s) => acc + s.marketCap, 0);

    groups.push({
      watchlistId: wl.id,
      watchlistName: wl.name,
      stocks,
      marketCap: sum,
    });
  }

  // 版塊以總市值排序，大的在前
  groups.sort((a, b) => b.marketCap - a.marketCap);

  return {
    groups,
    asOf: new Date().toISOString(),
  };
}
