"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { MarketMap } from "@/components/market-map/MarketMap";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type {
  MarketMapMarketPayload,
  MarketMapSector,
  WatchlistMapResponse,
  WatchlistMapTimeframe,
} from "@/types/market";

const fetcher = async (url: string): Promise<WatchlistMapResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const TIMEFRAMES: Array<{ key: WatchlistMapTimeframe; labelKey: string }> = [
  { key: "today", labelKey: "watchlistMap.tfToday" },
  { key: "5d", labelKey: "watchlistMap.tf5d" },
  { key: "30d", labelKey: "watchlistMap.tf30d" },
];

function changeFor(
  s: WatchlistMapResponse["groups"][number]["stocks"][number],
  tf: WatchlistMapTimeframe,
): number | null {
  if (tf === "today") return s.changePctToday;
  if (tf === "5d") return s.changePct5d;
  return s.changePct30d;
}

const ALL = "__all__";

export function WatchlistMapContent({ initial }: { initial: WatchlistMapResponse }) {
  const { t } = useT();
  const [timeframe, setTimeframe] = useState<WatchlistMapTimeframe>("today");
  const [activeWatchlist, setActiveWatchlist] = useState<string>(ALL);

  const { data } = useSWR<WatchlistMapResponse>(
    "/api/market/watchlist-map",
    fetcher,
    {
      fallbackData: initial,
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    },
  );

  const groups = useMemo(() => data?.groups ?? [], [data?.groups]);

  const asOfText = useMemo(() => {
    if (!data?.asOf) return "";
    try {
      return formatDate(new Date(data.asOf));
    } catch {
      return data.asOf;
    }
  }, [data?.asOf]);

  // 依選取週期把資料整形成 MarketMap 需要的 payload（版塊 = 觀察清單）
  const payload = useMemo<MarketMapMarketPayload>(() => {
    const selected =
      activeWatchlist === ALL
        ? groups
        : groups.filter((g) => g.watchlistId === activeWatchlist);

    const sectors: MarketMapSector[] = selected
      .filter((g) => g.stocks.length > 0)
      .map((g) => ({
        sector: g.watchlistName,
        stocks: g.stocks.map((s) => ({
          symbol: s.symbol,
          name: s.name,
          sector: g.watchlistName,
          market: s.market,
          price: s.price,
          change: null,
          changePct: changeFor(s, timeframe),
          marketCap: s.marketCap,
        })),
        marketCap: g.marketCap,
      }));

    return {
      market: "TWSE",
      groups: sectors,
      asOf: data?.asOf ?? new Date().toISOString(),
      totalCount: sectors.reduce((acc, g) => acc + g.stocks.length, 0),
      universeCount: sectors.reduce((acc, g) => acc + g.stocks.length, 0),
      sizingMode: "marketCap",
      rankFrom: 1,
      rankTo: sectors.reduce((acc, g) => acc + g.stocks.length, 0),
    };
  }, [groups, activeWatchlist, timeframe, data?.asOf]);

  const isEmpty = groups.every((g) => g.stocks.length === 0);

  return (
    <div>
      <Header titleKey="watchlistMap.title" />
      <div className="p-4 md:p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("watchlistMap.subtitle")}</p>
          {asOfText && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("watchlistMap.asOf", { time: asOfText })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* 週期切換 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">
              {t("watchlistMap.timeframe")}
            </span>
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.key}
                variant={timeframe === tf.key ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf.key)}
              >
                {t(tf.labelKey)}
              </Button>
            ))}
          </div>

          {/* 觀察清單篩選（多於一份時才顯示） */}
          {groups.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">
                {t("watchlistMap.watchlist")}
              </span>
              <Button
                variant={activeWatchlist === ALL ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveWatchlist(ALL)}
              >
                {t("watchlistMap.allWatchlists")}
              </Button>
              {groups.map((g) => (
                <Button
                  key={g.watchlistId}
                  variant={activeWatchlist === g.watchlistId ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveWatchlist(g.watchlistId)}
                >
                  {g.watchlistName}
                </Button>
              ))}
            </div>
          )}
        </div>

        {isEmpty ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            {t("watchlistMap.empty")}
          </div>
        ) : (
          <MarketMap data={payload} height={620} />
        )}
      </div>
    </div>
  );
}
