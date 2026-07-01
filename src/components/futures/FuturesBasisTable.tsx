"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn, formatPct, formatTWD, tradingViewUrl } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { FuturesBasisRow } from "@/types/futures";

interface Props {
  rows: FuturesBasisRow[];
}

type SortKey = "underlyingSymbol" | "futuresPrice" | "spotPrice" | "basis" | "basisPct";
type SortDir = "asc" | "desc";

function sortValue(row: FuturesBasisRow, key: SortKey): number | string {
  switch (key) {
    case "underlyingSymbol":
      return row.underlyingSymbol;
    default:
      return row[key];
  }
}

function basisColor(value: number): string {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

export function FuturesBasisTable({ rows }: Props) {
  const { t } = useT();
  const [sortKey, setSortKey] = useState<SortKey>("basisPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (column !== sortKey) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  const columns: { key: SortKey; labelKey: string; align?: "right" }[] = [
    { key: "underlyingSymbol", labelKey: "futuresBasis.underlying" },
    { key: "futuresPrice", labelKey: "futuresBasis.futuresPrice", align: "right" },
    { key: "spotPrice", labelKey: "futuresBasis.spotPrice", align: "right" },
    { key: "basis", labelKey: "futuresBasis.basis", align: "right" },
    { key: "basisPct", labelKey: "futuresBasis.basisPct", align: "right" },
  ];

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-center py-12 text-sm text-muted-foreground">
        {t("futuresBasis.noData")}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2 font-medium cursor-pointer select-none whitespace-nowrap",
                  col.align === "right" ? "text-right" : "text-left"
                )}
                onClick={() => handleSort(col.key)}
              >
                <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                  {t(col.labelKey)}
                  <SortIcon column={col.key} />
                </span>
              </th>
            ))}
            <th className="px-3 py-2 font-medium text-left whitespace-nowrap">
              {t("futuresBasis.contract")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.symbol} className="border-b last:border-0 hover:bg-accent/40">
              <td className="px-3 py-2">
                <a
                  href={tradingViewUrl(row.underlyingSymbol, "TWSE")}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-semibold hover:underline"
                >
                  {row.underlyingSymbol}
                </a>
                {row.underlyingName && (
                  <span className="ml-2 text-xs text-muted-foreground">{row.underlyingName}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatTWD(row.futuresPrice)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatTWD(row.spotPrice)}</td>
              <td className={cn("px-3 py-2 text-right tabular-nums", basisColor(row.basis))}>
                {formatTWD(row.basis, true)}
              </td>
              <td className={cn("px-3 py-2 text-right tabular-nums font-medium", basisColor(row.basisPct))}>
                {formatPct(row.basisPct)}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground font-mono whitespace-nowrap">
                {row.symbol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
