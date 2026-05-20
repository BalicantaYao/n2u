"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { MarketMap, getHeatColor } from "@/components/market-map/MarketMap";
import { useT } from "@/lib/i18n";
import { formatDate, formatPct } from "@/lib/utils";
import type {
  MarketMapMarketPayload,
  MarketMapSector,
  WatchlistMapGroup,
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

const OVERVIEW = "__overview__";

/** 以市值加權平均計算某清單在指定週期的整體漲跌幅；資料不足時回傳 null。 */
function weightedChange(
  group: WatchlistMapGroup,
  tf: WatchlistMapTimeframe,
): number | null {
  let sumWeight = 0;
  let sumWeighted = 0;
  for (const s of group.stocks) {
    const change = changeFor(s, tf);
    if (change === null) continue;
    const weight = Math.max(s.marketCap, 0);
    if (weight <= 0) continue;
    sumWeight += weight;
    sumWeighted += weight * change;
  }
  if (sumWeight === 0) return null;
  return sumWeighted / sumWeight;
}

export function WatchlistMapContent({ initial }: { initial: WatchlistMapResponse }) {
  const { t } = useT();
  const [timeframe, setTimeframe] = useState<WatchlistMapTimeframe>("today");
  // OVERVIEW = 總覽排名；否則為下鑽中的單一清單 id
  const [activeWatchlist, setActiveWatchlist] = useState<string>(OVERVIEW);

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

  // 總覽排名：各清單以市值加權平均漲跌幅排序，變動最顯著（絕對值大）在前
  const ranking = useMemo(() => {
    return groups
      .filter((g) => g.stocks.length > 0)
      .map((g) => ({ group: g, change: weightedChange(g, timeframe) }))
      .sort((a, b) => {
        if (a.change === null) return b.change === null ? 0 : 1;
        if (b.change === null) return -1;
        return Math.abs(b.change) - Math.abs(a.change);
      });
  }, [groups, timeframe]);

  // 依選取週期把資料整形成 MarketMap 需要的 payload（版塊 = 觀察清單）
  const payload = useMemo<MarketMapMarketPayload>(() => {
    const selected = groups.filter((g) => g.watchlistId === activeWatchlist);

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
  const isOverview = activeWatchlist === OVERVIEW;
  const activeGroup = isOverview
    ? null
    : groups.find((g) => g.watchlistId === activeWatchlist) ?? null;

  return (
    <div>
      <Header titleKey="watchlistMap.title" />
      <div className="p-4 md:p-6 space-y-4">
        <div>
          {isOverview ? (
            <p className="text-sm text-muted-foreground">
              {t("watchlistMap.overviewSubtitle")}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setActiveWatchlist(OVERVIEW)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("watchlistMap.back")}
            </button>
          )}
          {asOfText && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("watchlistMap.asOf", { time: asOfText })}
            </p>
          )}
        </div>

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

        {isEmpty ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            {t("watchlistMap.empty")}
          </div>
        ) : isOverview ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ranking.map(({ group, change }, idx) => (
              <button
                key={group.watchlistId}
                type="button"
                onClick={() => setActiveWatchlist(group.watchlistId)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{group.watchlistName}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("watchlistMap.symbolsCount", { count: group.stocks.length })}
                  </div>
                </div>
                <span
                  className="shrink-0 text-base font-semibold tabular-nums"
                  style={{ color: getHeatColor(change) }}
                >
                  {change === null
                    ? t("watchlistMap.noChangeData")
                    : formatPct(change)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : activeGroup ? (
          <>
            <h2 className="text-lg font-semibold">{activeGroup.watchlistName}</h2>
            <MarketMap data={payload} height={620} />
          </>
        ) : null}
      </div>
    </div>
  );
}
