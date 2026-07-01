"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { FuturesBasisTable } from "@/components/futures/FuturesBasisTable";
import { useT } from "@/lib/i18n";
import { cn, formatPct, formatTWD } from "@/lib/utils";
import { RefreshCw, AlertTriangle } from "lucide-react";
import type { FuturesBasisResponse } from "@/types/futures";

function basisColor(value: number): string {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

export default function FuturesBasisPage() {
  const { t } = useT();
  const [data, setData] = useState<FuturesBasisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/market/futures-basis");
      const json: FuturesBasisResponse = await res.json();
      setData(json);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <Header titleKey="futuresBasis.title" />
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("futuresBasis.description")}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
            {t("futuresBasis.refresh")}
          </Button>
        </div>

        {data?.errors && data.errors.length > 0 && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 p-3 text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {data.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          </div>
        )}

        {isLoading && !data ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">{t("futuresBasis.indexTitle")}</h2>
              {data?.index ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 tabular-nums">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("futuresBasis.futuresPrice")}</div>
                    <div className="text-lg font-semibold">{formatTWD(data.index.futuresPrice)}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{data.index.symbol}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("futuresBasis.spotPrice")}</div>
                    <div className="text-lg font-semibold">{formatTWD(data.index.spotPrice)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("futuresBasis.basis")}</div>
                    <div className={cn("text-lg font-semibold", basisColor(data.index.basis))}>
                      {formatTWD(data.index.basis, true)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("futuresBasis.basisPct")}</div>
                    <div className={cn("text-lg font-semibold", basisColor(data.index.basisPct))}>
                      {formatPct(data.index.basisPct)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("futuresBasis.noData")}</p>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold mb-3">{t("futuresBasis.stockFuturesTitle")}</h2>
              <FuturesBasisTable rows={data?.stockFutures ?? []} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
