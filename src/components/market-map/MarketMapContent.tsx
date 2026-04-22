"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketMap } from "./MarketMap";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { MarketMapResponse } from "@/types/market";

const fetcher = async (url: string): Promise<MarketMapResponse> => {
  const res = await fetch(url);
  if (!res.ok && res.status !== 503) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const TOP_N_OPTIONS = [50, 100, 150, 300] as const;

export function MarketMapContent({ initial }: { initial: MarketMapResponse }) {
  const { t } = useT();
  const [topN, setTopN] = useState<number>(150);

  const { data } = useSWR<MarketMapResponse>(
    `/api/market/map?limit=${topN}`,
    fetcher,
    {
      fallbackData: topN === 150 ? initial : undefined,
      refreshInterval: 60_000,
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

  return (
    <div>
      <Header titleKey="marketMap.title" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("marketMap.subtitle")}
            </p>
            {asOfText && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("marketMap.asOf", { time: asOfText })}
                {data && ` · ${data.totalCount} ${t("common.stock")}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("marketMap.topN")}
            </span>
            <Select
              value={String(topN)}
              onValueChange={(v) => setTopN(Number(v))}
            >
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOP_N_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-2 md:p-3">
            {data && data.groups.length > 0 ? (
              <MarketMap data={data} height={680} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                {t("marketMap.empty")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
