"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ListPlus, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useObservationStore } from "@/store/useObservationStore";
import { useT } from "@/lib/i18n";
import type { Market } from "@/types/taiwan";

interface Props {
  symbol: string;
  symbolName?: string | null;
  market: Market;
}

/**
 * 「交易成果」每個標的旁的「加入每日觀察」按鈕。
 * 點擊展開一個小面板輸入確認筆記，送出後加入每日觀察待辦。
 */
export function AddObservationButton({ symbol, symbolName, market }: Props) {
  const { t } = useT();
  const add = useObservationStore((s) => s.add);
  const targets = useObservationStore((s) => s.targets);

  // 此標的是否已在每日觀察清單中（後端會將代號轉為大寫儲存）。
  const alreadyAdded = targets.some(
    (target) =>
      target.symbol === symbol.trim().toUpperCase() && target.market === market,
  );

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    setSubmitting(true);
    try {
      await add({
        symbol,
        market,
        symbolName: symbolName || undefined,
        note: note.trim() || undefined,
      });
      toast.success(t("observations.added"));
      setOpen(false);
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("observations.addFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  // 已加入：顯示綠色勾記號，並停用新增（不可再次加入）。
  if (alreadyAdded) {
    return (
      <span
        title={t("observations.added")}
        aria-label={t("observations.added")}
        className="inline-flex rounded p-1 text-green-600 dark:text-green-400 cursor-default"
      >
        <Check className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={t("observations.addToDaily")}
        aria-label={t("observations.addToDaily")}
        className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
      >
        <ListPlus className="h-4 w-4" />
      </button>

      {open && (
        <>
          {/* 點擊外部關閉 */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-card p-3 shadow-lg space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-medium">
              {t("observations.addToDaily")}
              <span className="ml-1 text-muted-foreground">{symbol}</span>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("observations.notePlaceholder")}
              rows={3}
              maxLength={500}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={submitting}
                onClick={handleAdd}
              >
                {t("observations.add")}
              </Button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}
