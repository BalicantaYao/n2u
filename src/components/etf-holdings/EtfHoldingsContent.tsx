"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { PieChart, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type {
  EtfFundResponse,
  EtfRefreshError,
  EtfSnapshotResponse,
} from "@/types/etf-holdings";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error("Request failed") as Error & {
      status?: number;
      info?: { error?: EtfRefreshError | string };
    };
    err.status = res.status;
    err.info = body;
    throw err;
  }
  return res.json();
};

function formatShares(n: number): string {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(n);
}
function formatPercent(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}
function formatTWD(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function EtfHoldingsContent() {
  const { t } = useT();
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<EtfRefreshError | null>(null);

  const { data: funds = [] } = useSWR<EtfFundResponse[]>("/api/etf/funds", fetcher);

  useEffect(() => {
    if (!activeSymbol && funds.length > 0) setActiveSymbol(funds[0].symbol);
  }, [funds, activeSymbol]);

  const activeFund = useMemo(
    () => funds.find((f) => f.symbol === activeSymbol) ?? null,
    [funds, activeSymbol],
  );

  const {
    data: snapshot,
    error: snapshotError,
    isLoading: snapshotLoading,
    mutate: mutateSnapshot,
  } = useSWR<EtfSnapshotResponse>(
    activeSymbol ? `/api/etf/holdings?symbol=${activeSymbol}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const handleRefresh = useCallback(async () => {
    if (!activeSymbol) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/etf/holdings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: activeSymbol }),
      });
      const body = await res.json();
      if (!res.ok) {
        const err = (body?.error ?? body) as EtfRefreshError;
        setRefreshError(err);
        return;
      }
      await mutateSnapshot(body as EtfSnapshotResponse, false);
    } catch (e) {
      setRefreshError({
        code: "fetch_failed",
        message: (e as Error).message,
      });
    } finally {
      setRefreshing(false);
    }
  }, [activeSymbol, mutateSnapshot]);

  const snapshotErrorInfo = snapshotError as
    | (Error & { status?: number; info?: { error?: EtfRefreshError } })
    | undefined;
  const snapshotErrorDetail = snapshotErrorInfo?.info?.error;

  return (
    <div className="space-y-4">
      {/* ETF picker */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <PieChart className="h-4 w-4 text-primary" />
          {t("etfHoldings.selectFund")}
        </div>
        <div className="flex flex-wrap gap-2">
          {funds.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              {t("common.loading")}
            </span>
          ) : (
            funds.map((f) => {
              const active = f.symbol === activeSymbol;
              return (
                <button
                  key={f.symbol}
                  onClick={() => setActiveSymbol(f.symbol)}
                  className={
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " +
                    (active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent hover:text-accent-foreground")
                  }
                  title={`${f.name} (${f.issuerName})`}
                >
                  <span className="font-mono">{f.symbol}</span>
                  <span className="ml-2 text-muted-foreground">{f.issuerName}</span>
                  {!f.hasUrl && (
                    <span
                      className="ml-2 inline-block rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                      title={t("etfHoldings.noUrlConfigured")}
                    >
                      !
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active fund detail */}
      {activeFund && (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold leading-tight">
                {activeFund.name}{" "}
                <span className="font-mono text-base text-muted-foreground">
                  ({activeFund.symbol})
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("etfHoldings.issuer")}: {activeFund.issuerName}
                {snapshot && (
                  <>
                    {" · "}
                    {t("etfHoldings.asOfDate")}: {snapshot.asOfDate}
                    {" · "}
                    {t("etfHoldings.holdingsCount", {
                      n: snapshot.holdings.length,
                    })}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing || !activeFund.hasUrl}
                title={
                  !activeFund.hasUrl ? t("etfHoldings.noUrlConfigured") : undefined
                }
              >
                <RefreshCw
                  className={"mr-2 h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")}
                />
                {refreshing
                  ? t("etfHoldings.refreshing")
                  : t("etfHoldings.refresh")}
              </Button>
            </div>
          </div>

          {/* Errors banner */}
          {(refreshError || (!snapshot && snapshotErrorDetail)) && (
            <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <div className="font-medium">
                    {(refreshError ?? snapshotErrorDetail)!.code}
                  </div>
                  <div className="text-xs">
                    {(refreshError ?? snapshotErrorDetail)!.message}
                  </div>
                  {(refreshError ?? snapshotErrorDetail)!.hint && (
                    <div className="text-xs italic">
                      {(refreshError ?? snapshotErrorDetail)!.hint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Holdings table */}
          <div className="p-2 sm:p-4">
            {snapshotLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : !snapshot || snapshot.holdings.length === 0 ? (
              <EmptyState fund={activeFund} t={t} />
            ) : (
              <HoldingsTable snapshot={snapshot} />
            )}
          </div>

          {snapshot?.source && (
            <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
              {t("etfHoldings.source")}:{" "}
              <a
                href={snapshot.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                {snapshot.source}
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              · {t("etfHoldings.fetchedAt")}:{" "}
              {new Date(snapshot.fetchedAt).toLocaleString("zh-TW")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HoldingsTable({ snapshot }: { snapshot: EtfSnapshotResponse }) {
  const { t } = useT();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left font-medium">#</th>
            <th className="px-2 py-2 text-left font-medium">
              {t("etfHoldings.colSymbol")}
            </th>
            <th className="px-2 py-2 text-left font-medium">
              {t("etfHoldings.colName")}
            </th>
            <th className="px-2 py-2 text-right font-medium">
              {t("etfHoldings.colShares")}
            </th>
            <th className="px-2 py-2 text-right font-medium">
              {t("etfHoldings.colWeight")}
            </th>
            <th className="px-2 py-2 text-right font-medium">
              {t("etfHoldings.colMarketValue")}
            </th>
          </tr>
        </thead>
        <tbody>
          {snapshot.holdings.map((h, idx) => (
            <tr
              key={`${h.symbol}-${idx}`}
              className="border-b last:border-0 hover:bg-accent/40"
            >
              <td className="px-2 py-2 text-muted-foreground">{idx + 1}</td>
              <td className="px-2 py-2 font-mono">{h.symbol}</td>
              <td className="px-2 py-2">{h.name}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatShares(h.shares)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatPercent(h.weight)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatTWD(h.marketValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  fund,
  t,
}: {
  fund: EtfFundResponse;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground space-y-3">
      <PieChart className="mx-auto h-8 w-8 opacity-50" />
      <p>{t("etfHoldings.empty")}</p>
      {!fund.hasUrl && (
        <p className="text-xs italic">{t("etfHoldings.noUrlConfigured")}</p>
      )}
    </div>
  );
}
