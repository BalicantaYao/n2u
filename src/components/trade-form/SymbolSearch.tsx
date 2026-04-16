"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";

import type { Market } from "@/types/taiwan";

interface SearchResult {
  symbol: string;
  symbolName?: string;
  name?: string;
  market: Market;
  isETF: boolean;
}

interface SymbolSearchProps {
  value: string;
  onChange: (symbol: string, symbolName: string, market: Market, isETF: boolean) => void;
  placeholder?: string;
}

export function SymbolSearch({ value, onChange, placeholder }: SymbolSearchProps) {
  const { t } = useT();
  const resolvedPlaceholder = placeholder ?? t("trade.searchPlaceholder");
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    if (!query || query.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 pr-9"
          placeholder={resolvedPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-lg py-1">
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent text-left"
              onClick={() => {
                const name = r.symbolName ?? r.name ?? r.symbol;
                onChange(r.symbol, name, r.market, r.isETF);
                setQuery(`${r.symbol} ${name}`);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{r.symbol}</span>
                <span className="text-muted-foreground">{r.symbolName ?? r.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {r.isETF && (
                  <Badge variant="secondary" className="text-xs py-0">ETF</Badge>
                )}
                <Badge
                  variant={r.market === "TWSE" ? "twse" : "tpex"}
                  className="text-xs py-0"
                >
                  {r.market === "TWSE" ? t("common.twse") : t("common.tpex")}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
