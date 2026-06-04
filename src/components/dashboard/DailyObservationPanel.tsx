"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ListChecks, Check, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useObservationStore } from "@/store/useObservationStore";
import { isCheckedToday } from "@/lib/observation-date";
import { tradingViewUrl } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/**
 * 總覽頁最上方的「今日待確認」面板，即每天的提醒核心。
 * 列出未封存且今天尚未確認的觀察標的，逐筆打勾完成。
 */
export function DailyObservationPanel() {
  const { t } = useT();
  const targets = useObservationStore((s) => s.targets);
  const isLoading = useObservationStore((s) => s.isLoading);
  const fetch = useObservationStore((s) => s.fetch);
  const check = useObservationStore((s) => s.check);

  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    fetch({ pending: true });
  }, [fetch]);

  // 後端已回傳 pending 清單，但打勾後該筆 lastCheckedDate 變動，於前端再過濾一次即時消失
  const pending = targets.filter(
    (tg) => !tg.archived && !isCheckedToday(tg.lastCheckedDate),
  );
  const total = targets.filter((tg) => !tg.archived).length;

  async function handleCheck(id: string) {
    setCheckingId(id);
    try {
      await check(id, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("observations.updateFailed"));
    } finally {
      setCheckingId(null);
    }
  }

  // 沒有任何觀察標的時不顯示面板，避免雜訊
  if (!isLoading && total === 0) return null;

  return (
    <Card className="mb-4 border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" />
          {t("observations.dailyTitle")}
          {pending.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {pending.length}
            </span>
          )}
          <Link
            href="/observations"
            className="ml-auto text-xs font-normal text-muted-foreground hover:text-foreground hover:underline"
          >
            {t("observations.manage")}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && targets.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : pending.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {t("observations.allDone")}
          </div>
        ) : (
          <ul className="space-y-2">
            {pending.map((tg) => (
              <li
                key={tg.id}
                className="flex items-start gap-3 rounded-md border bg-muted/20 p-2.5"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 text-xs"
                  disabled={checkingId === tg.id}
                  onClick={() => handleCheck(tg.id)}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {t("observations.done")}
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={tradingViewUrl(tg.symbol, tg.market)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {tg.symbol}
                    </a>
                    {tg.symbolName && (
                      <span className="truncate text-xs text-muted-foreground">
                        {tg.symbolName}
                      </span>
                    )}
                  </div>
                  {tg.note && (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {tg.note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
