"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { CreateTradeInput } from "@/types/trade";

interface RawRow {
  index: number;
  tradeDate: string;
  symbol: string;
  price: number;
  rawShares: number;
  stopLoss?: number;
  notes?: string;
  parseError?: string;
}

interface PreviewRow extends RawRow {
  side: "BUY" | "SELL";
  shares: number;
  lotType: "ROUND" | "ODD";
  lots?: number;
  market?: "TWSE" | "TPEX";
  symbolName?: string;
  marketOverride?: "TWSE" | "TPEX";
  lookupStatus: "pending" | "found" | "not-found" | "manual";
}

interface ImportResult {
  index: number;
  success: boolean;
  error?: string;
}

type Phase = "input" | "preview" | "importing" | "done";

function deriveLotType(absShares: number): { lotType: "ROUND" | "ODD"; lots?: number } {
  if (absShares >= 1000 && absShares % 1000 === 0) {
    return { lotType: "ROUND", lots: absShares / 1000 };
  }
  return { lotType: "ODD" };
}

function parseCSV(raw: string, t: (key: string) => string): RawRow[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: RawRow[] = [];
  let dataIndex = 0;

  for (const line of lines) {
    const cols = line.split(",");
    // Skip header row
    if (cols[0].trim() === "交易日期" || cols[0].trim().toLowerCase() === "trade date") continue;

    dataIndex++;
    const tradeDate = cols[0]?.trim() ?? "";
    const symbol = cols[1]?.trim().toUpperCase() ?? "";
    const price = parseFloat(cols[2]?.trim() ?? "");
    const rawShares = parseInt(cols[3]?.trim() ?? "");
    const stopLossStr = cols[4]?.trim() ?? "";
    const stopLoss = stopLossStr ? parseFloat(stopLossStr) : undefined;
    // cols[5] is 價值 — ignored
    // Notes is everything from col 6 onward (may contain commas)
    const notesRaw = cols.slice(6).join(",").trim();
    const notes = notesRaw || undefined;

    const errors: string[] = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) errors.push(t("csv.dateFormatError"));
    if (!symbol) errors.push(t("csv.codeEmpty"));
    if (isNaN(price) || price <= 0) errors.push(t("csv.priceInvalid"));
    if (isNaN(rawShares) || rawShares === 0) errors.push(t("csv.sharesInvalid"));

    rows.push({
      index: dataIndex,
      tradeDate,
      symbol,
      price: isNaN(price) ? 0 : price,
      rawShares: isNaN(rawShares) ? 0 : rawShares,
      stopLoss,
      notes,
      parseError: errors.length ? errors.join(t("csv.errorSeparator")) : undefined,
    });
  }

  return rows;
}

async function lookupMarkets(
  symbols: string[]
): Promise<Map<string, { market: "TWSE" | "TPEX"; symbolName: string } | null>> {
  const unique = Array.from(new Set(symbols));
  const entries = await Promise.all(
    unique.map(async (sym) => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(sym)}`);
        const data: Array<{ symbol: string; name?: string; symbolName?: string; market: "TWSE" | "TPEX" }> =
          await res.json();
        const match = data.find((d) => d.symbol.toUpperCase() === sym.toUpperCase());
        if (match) {
          return [sym, { market: match.market, symbolName: match.symbolName ?? match.name ?? sym }] as const;
        }
        return [sym, null] as const;
      } catch {
        return [sym, null] as const;
      }
    })
  );
  return new Map(entries);
}

export function CSVImporter() {
  const [phase, setPhase] = useState<Phase>("input");
  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importSummary, setImportSummary] = useState({ imported: 0, failed: 0 });
  const { t } = useT();

  async function handleParse() {
    const rawRows = parseCSV(csvText, t);
    if (rawRows.length === 0) {
      toast.error(t("csv.noDataRows"));
      return;
    }

    const initial: PreviewRow[] = rawRows.map((r) => {
      const absShares = Math.abs(r.rawShares);
      const { lotType, lots } = deriveLotType(absShares);
      return {
        ...r,
        side: r.rawShares > 0 ? "BUY" : "SELL",
        shares: absShares,
        lotType,
        lots,
        lookupStatus: "pending",
      };
    });

    setPreviewRows(initial);
    setPhase("preview");

    const validSymbols = initial.filter((r) => !r.parseError).map((r) => r.symbol);
    if (validSymbols.length === 0) return;

    setLookupLoading(true);
    try {
      const marketMap = await lookupMarkets(validSymbols);
      setPreviewRows((prev) =>
        prev.map((r) => {
          if (r.parseError) return { ...r, lookupStatus: "found" };
          const info = marketMap.get(r.symbol);
          if (info) {
            return { ...r, market: info.market, symbolName: info.symbolName, lookupStatus: "found" };
          }
          return { ...r, lookupStatus: "not-found" };
        })
      );
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleImport() {
    const validRows = previewRows.filter((r) => {
      if (r.parseError) return false;
      return !!(r.marketOverride ?? r.market);
    });

    if (validRows.length === 0) {
      toast.error(t("csv.noValidData"));
      return;
    }

    // Sort chronologically for FIFO correctness
    const sorted = [...validRows].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));

    const payload: CreateTradeInput[] = sorted.map((r) => ({
      symbol: r.symbol,
      symbolName: r.symbolName,
      market: (r.marketOverride ?? r.market) as "TWSE" | "TPEX",
      side: r.side,
      tradeDate: r.tradeDate,
      lotType: r.lotType,
      lots: r.lots,
      shares: r.shares,
      price: r.price,
      isETF: false,
      stopLoss: r.stopLoss,
      notes: r.notes,
    }));

    setImporting(true);
    setPhase("importing");

    try {
      const res = await fetch("/api/trades/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? t("csv.importFailed"));
        setPhase("preview");
        return;
      }

      setImportResults(data.results);
      setImportSummary({ imported: data.imported, failed: data.failed });
      setPhase("done");

      if (data.failed === 0) {
        toast.success(t("csv.importSuccess", { count: data.imported }));
      } else {
        toast.warning(t("csv.importPartial", { success: data.imported, failed: data.failed }));
      }
    } catch {
      toast.error(t("csv.networkError"));
      setPhase("preview");
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setPhase("input");
    setCsvText("");
    setPreviewRows([]);
    setImportResults([]);
    setImportSummary({ imported: 0, failed: 0 });
  }

  const validCount = previewRows.filter((r) => !r.parseError && !!(r.marketOverride ?? r.market)).length;
  const errorCount = previewRows.filter((r) => !!r.parseError).length;
  const pendingLookup = previewRows.some((r) => !r.parseError && r.lookupStatus === "pending");
  const unresolvedMarket = previewRows.some(
    (r) => !r.parseError && r.lookupStatus === "not-found" && !r.marketOverride
  );
  const canImport = !lookupLoading && !pendingLookup && !unresolvedMarket && validCount > 0;

  // ── Phase: input ────────────────────────────────────────────────────────────
  if (phase === "input") {
    return (
      <div className="max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("csv.pasteInstruction")}
          <code className="ml-1 text-xs bg-muted px-1 py-0.5 rounded">
            {t("csv.csvHeader")}
          </code>
        </p>
        <textarea
          className="w-full h-56 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={t("csv.pastePlaceholder")}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
        <Button onClick={handleParse} disabled={!csvText.trim()}>
          {t("csv.parsePreview")}
        </Button>
      </div>
    );
  }

  // ── Phase: done ─────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="p-4 rounded-lg bg-muted/30 text-sm">
          <p className="font-semibold">
            {t("csv.importComplete")}
            <span className="text-green-600 ml-1">{t("csv.successCount", { count: importSummary.imported })}</span>
            {importSummary.failed > 0 && (
              <span className="text-red-600 ml-2">{t("csv.failCount", { count: importSummary.failed })}</span>
            )}
          </p>
        </div>

        {importResults.some((r) => !r.success) && (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2">{t("csv.row")}</th>
                  <th className="text-left px-3 py-2">{t("csv.status")}</th>
                  <th className="text-left px-3 py-2">{t("csv.errorMessage")}</th>
                </tr>
              </thead>
              <tbody>
                {importResults
                  .filter((r) => !r.success)
                  .map((r) => (
                    <tr key={r.index} className="border-b last:border-0 bg-red-50 dark:bg-red-950/20">
                      <td className="px-3 py-2">{r.index + 1}</td>
                      <td className="px-3 py-2 text-red-600">{t("csv.failed")}</td>
                      <td className="px-3 py-2 text-red-600 text-xs">{r.error}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <Link href="/journal">
            <Button>{t("csv.goToJournal")}</Button>
          </Link>
          <Button variant="outline" onClick={handleReset}>
            {t("csv.restart")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Phase: preview / importing ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {t("csv.totalRows", { count: previewRows.length })}
          <span className="text-green-600 font-semibold">{t("csv.importable", { count: validCount })}</span>
          {errorCount > 0 && (
            <span className="text-red-600 font-semibold ml-2">{t("csv.errorRows", { count: errorCount })}</span>
          )}
          {lookupLoading && (
            <span className="text-muted-foreground ml-2">{t("csv.lookingUpMarket")}</span>
          )}
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={importing}>
            {t("csv.rePaste")}
          </Button>
          <Button onClick={handleImport} disabled={!canImport || importing}>
            {importing ? t("csv.importing") : t("csv.importN", { count: validCount })}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">{t("common.date")}</th>
              <th className="text-left px-3 py-2">{t("csv.code")}</th>
              <th className="text-left px-3 py-2">{t("common.direction")}</th>
              <th className="text-right px-3 py-2">{t("csv.sharesCount")}</th>
              <th className="text-left px-3 py-2">{t("journal.type")}</th>
              <th className="text-right px-3 py-2">{t("csv.price")}</th>
              <th className="text-right px-3 py-2">{t("csv.stopLoss")}</th>
              <th className="text-left px-3 py-2">{t("trade.market")}</th>
              <th className="text-left px-3 py-2">{t("common.notes")}</th>
              <th className="text-left px-3 py-2">{t("csv.status")}</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr
                key={row.index}
                className={`border-b last:border-0 ${row.parseError ? "bg-red-50 dark:bg-red-950/20" : ""}`}
              >
                <td className="px-3 py-2 text-muted-foreground">{row.index}</td>
                <td className="px-3 py-2 tabular-nums">{row.tradeDate}</td>
                <td className="px-3 py-2 font-mono font-semibold">{row.symbol}</td>
                <td className="px-3 py-2">
                  {!row.parseError && (
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        row.side === "BUY"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {row.side === "BUY" ? t("common.buy") : t("common.sell")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{!row.parseError && row.shares}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {!row.parseError && (row.lotType === "ROUND" ? t("csv.roundLotN", { n: row.lots ?? 0 }) : t("common.oddLot"))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{!row.parseError && row.price}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {row.stopLoss ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {row.parseError ? null : row.lookupStatus === "pending" ? (
                    <span className="text-xs text-muted-foreground">{t("csv.lookingUp")}</span>
                  ) : row.lookupStatus === "found" || row.lookupStatus === "manual" ? (
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        (row.marketOverride ?? row.market) === "TWSE"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}
                    >
                      {(row.marketOverride ?? row.market) === "TWSE" ? t("common.twse") : t("common.tpex")}
                    </span>
                  ) : (
                    <select
                      className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
                      value={row.marketOverride ?? ""}
                      onChange={(e) => {
                        const val = e.target.value as "TWSE" | "TPEX";
                        setPreviewRows((prev) =>
                          prev.map((r) =>
                            r.index === row.index
                              ? { ...r, marketOverride: val, lookupStatus: "manual" }
                              : r
                          )
                        );
                      }}
                    >
                      <option value="">{t("csv.selectMarket")}</option>
                      <option value="TWSE">{t("common.twseFull")}</option>
                      <option value="TPEX">{t("common.tpexFull")}</option>
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate text-xs text-muted-foreground" title={row.notes}>
                  {row.notes}
                </td>
                <td className="px-3 py-2">
                  {row.parseError ? (
                    <span className="text-xs text-red-600">{row.parseError}</span>
                  ) : (
                    <span className="text-xs text-green-600">✓</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
