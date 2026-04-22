"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketMap } from "./MarketMap";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type {
  MarketMapMarketPayload,
  MarketMapResponse,
} from "@/types/market";

const fetcher = async (url: string): Promise<MarketMapResponse> => {
  const res = await fetch(url);
  if (!res.ok && res.status !== 503) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const DEFAULT_RANGE = { from: 1, to: 100 } as const;

const PRESETS: Array<{ key: string; from: number; to: number; labelKey: string }> = [
  { key: "top50", from: 1, to: 50, labelKey: "marketMap.rangePresetTop50" },
  { key: "top100", from: 1, to: 100, labelKey: "marketMap.rangePresetTop100" },
  { key: "r100to300", from: 100, to: 300, labelKey: "marketMap.rangePreset100to300" },
  { key: "r300to500", from: 300, to: 500, labelKey: "marketMap.rangePreset300to500" },
];

function sizingNoteKey(mode: MarketMapMarketPayload["sizingMode"]): string | null {
  if (mode === "marketCap") return null;
  if (mode === "tradeValue") return "marketMap.sizingModeTradeValue";
  return "marketMap.sizingModeMixed";
}

function matchPresetKey(from: number, to: number): string | null {
  const p = PRESETS.find((p) => p.from === from && p.to === to);
  return p?.key ?? null;
}

export function MarketMapContent({ initial }: { initial: MarketMapResponse }) {
  const { t } = useT();
  const [range, setRange] = useState<{ from: number; to: number }>({ ...DEFAULT_RANGE });
  const [fromInput, setFromInput] = useState<string>(String(DEFAULT_RANGE.from));
  const [toInput, setToInput] = useState<string>(String(DEFAULT_RANGE.to));

  const { data } = useSWR<MarketMapResponse>(
    `/api/market/map?market=BOTH&rankFrom=${range.from}&rankTo=${range.to}`,
    fetcher,
    {
      fallbackData: range.from === DEFAULT_RANGE.from && range.to === DEFAULT_RANGE.to ? initial : undefined,
      refreshInterval: 5 * 60_000,
      revalidateOnFocus: false,
    },
  );

  const asOfText = useMemo(() => {
    if (!data?.asOf) return "";
    try {
      return formatDate(new Date(data.asOf));
    } catch {
      return data.asOf;
    }
  }, [data?.asOf]);

  const twse = data?.markets.find((m) => m.market === "TWSE");
  const tpex = data?.markets.find((m) => m.market === "TPEX");

  const selectedPreset = matchPresetKey(range.from, range.to);

  const applyPreset = (from: number, to: number) => {
    setRange({ from, to });
    setFromInput(String(from));
    setToInput(String(to));
  };

  const applyCustom = () => {
    const from = Math.max(1, Math.floor(Number(fromInput) || 1));
    const to = Math.max(from + 1, Math.floor(Number(toInput) || from + 1));
    applyPreset(from, to);
  };

  const maxUniverse = Math.max(twse?.universeCount ?? 0, tpex?.universeCount ?? 0, 0);

  return (
    <div>
      <Header titleKey="marketMap.title" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("marketMap.subtitle")}</p>
            {asOfText && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("marketMap.asOf", { time: asOfText })}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">
              {t("marketMap.rankRange")}
            </span>
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                variant={selectedPreset === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(p.from, p.to)}
              >
                {t(p.labelKey)}
              </Button>
            ))}
            <div className="flex items-center gap-1 ml-1">
              <Input
                type="number"
                min={1}
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                onBlur={applyCustom}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyCustom();
                }}
                className="h-9 w-20"
                aria-label={t("marketMap.rankFrom")}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                min={1}
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onBlur={applyCustom}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyCustom();
                }}
                className="h-9 w-20"
                aria-label={t("marketMap.rankTo")}
              />
            </div>
            {maxUniverse > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                {t("marketMap.universeCount", { count: maxUniverse })}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <MarketPanel payload={twse} headingKey="marketMap.twseHeading" />
          <MarketPanel payload={tpex} headingKey="marketMap.tpexHeading" />
        </div>
      </div>
    </div>
  );
}

function MarketPanel({
  payload,
  headingKey,
}: {
  payload: MarketMapMarketPayload | undefined;
  headingKey: string;
}) {
  const { t } = useT();
  const sizingKey = payload ? sizingNoteKey(payload.sizingMode) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t(headingKey)}</CardTitle>
        {payload && (
          <p className="text-xs text-muted-foreground">
            {t("marketMap.rankRangeDisplay", {
              from: payload.rankFrom,
              to: payload.rankTo,
            })}
            {" · "}
            {payload.totalCount} {t("common.stock")}
            {sizingKey && ` · ${t(sizingKey)}`}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-2 md:p-3">
        {payload && payload.groups.length > 0 ? (
          <MarketMap data={payload} height={560} />
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            {t("marketMap.empty")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
