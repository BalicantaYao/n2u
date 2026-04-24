"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { WatchlistTabs } from "@/components/watchlist/WatchlistTabs";
import { AddItemForm } from "@/components/watchlist/AddItemForm";
import { WatchlistItemRow } from "@/components/watchlist/WatchlistItemRow";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useT } from "@/lib/i18n";
import { RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WatchlistPage() {
  const { t } = useT();
  const watchlists = useWatchlistStore((s) => s.watchlists);
  const activeId = useWatchlistStore((s) => s.activeId);
  const activeItems = useWatchlistStore((s) => s.activeItems);
  const quotes = useWatchlistStore((s) => s.quotes);
  const isLoading = useWatchlistStore((s) => s.isLoading);
  const isLoadingItems = useWatchlistStore((s) => s.isLoadingItems);
  const fetchWatchlists = useWatchlistStore((s) => s.fetchWatchlists);
  const refreshQuotes = useWatchlistStore((s) => s.refreshQuotes);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  const hasWatchlists = watchlists.length > 0;

  return (
    <div>
      <Header titleKey="watchlist.title" />
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <WatchlistTabs />

        {isLoading && !hasWatchlists ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : !hasWatchlists ? (
          <div className="rounded-lg border bg-card p-10 text-center space-y-3">
            <Eye className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("watchlist.emptyLists")}
            </p>
          </div>
        ) : !activeId ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {t("watchlist.selectAList")}
          </div>
        ) : (
          <>
            <AddItemForm watchlistId={activeId} />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t("watchlist.itemCount").replace(
                  "{count}",
                  String(activeItems.length),
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshQuotes}
                disabled={isLoadingItems || activeItems.length === 0}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {t("watchlist.refreshQuotes")}
              </Button>
            </div>

            {isLoadingItems ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : activeItems.length === 0 ? (
              <div className="rounded-lg border bg-card text-center py-12 text-sm text-muted-foreground">
                {t("watchlist.noItems")}
              </div>
            ) : (
              <div className="space-y-2">
                {activeItems.map((item) => (
                  <WatchlistItemRow
                    key={item.id}
                    item={item}
                    quote={quotes[item.symbol]}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
