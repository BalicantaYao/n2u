"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Pin, PinOff, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMemoStore } from "@/store/useMemoStore";
import { useTradeStore } from "@/store/useTradeStore";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Memo } from "@/types/memo";

interface Props {
  memo?: Memo;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultLinkedSymbol?: string;
  lockLinkedSymbol?: boolean;
}

export function MemoComposer({
  memo,
  onCancel,
  onSubmitted,
  defaultLinkedSymbol,
  lockLinkedSymbol,
}: Props) {
  const { t } = useT();
  const addMemo = useMemoStore((s) => s.addMemo);
  const updateMemo = useMemoStore((s) => s.updateMemo);
  const { trades, fetchTrades } = useTradeStore();

  const initialSymbol =
    memo?.linkedSymbol ?? defaultLinkedSymbol?.toUpperCase() ?? "";
  const [content, setContent] = useState(memo?.content ?? "");
  const [linkedSymbol, setLinkedSymbol] = useState(initialSymbol);
  const [tradeId, setTradeId] = useState(memo?.tradeId ?? "");
  const [pinned, setPinned] = useState(memo?.pinned ?? false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (trades.length === 0) fetchTrades();
  }, [trades.length, fetchTrades]);

  const availableTrades = useMemo(() => {
    if (!linkedSymbol) return [] as typeof trades;
    return trades.filter(
      (tr) => tr.symbol === linkedSymbol.toUpperCase()
    );
  }, [trades, linkedSymbol]);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const payload = {
        content: trimmed,
        linkedSymbol: linkedSymbol.trim() || null,
        tradeId: tradeId || null,
        pinned,
      };
      if (memo) {
        await updateMemo(memo.id, payload);
        toast.success(t("memos.updated"));
      } else {
        await addMemo(payload);
        toast.success(t("memos.created"));
        setContent("");
        setLinkedSymbol(lockLinkedSymbol ? initialSymbol : "");
        setTradeId("");
        setPinned(false);
      }
      onSubmitted?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("memos.saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("memos.composerPlaceholder")}
        rows={memo ? 6 : 3}
        className="resize-y"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("memos.linkSymbol")}
          value={linkedSymbol}
          onChange={(e) => {
            setLinkedSymbol(e.target.value.toUpperCase());
            setTradeId("");
          }}
          disabled={lockLinkedSymbol}
          className="w-28 md:w-32 h-8 text-xs"
          maxLength={12}
        />
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs max-w-[16rem]"
          value={tradeId}
          onChange={(e) => setTradeId(e.target.value)}
          disabled={availableTrades.length === 0}
        >
          <option value="">{t("memos.linkTrade")}</option>
          {availableTrades.map((tr) => {
            const d = new Date(tr.tradeDate);
            const label = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${tr.side} ${tr.shares} @ ${tr.price}`;
            return (
              <option key={tr.id} value={tr.id}>
                {label}
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={() => setPinned(!pinned)}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors",
            pinned
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:bg-accent"
          )}
          title={pinned ? t("memos.unpin") : t("memos.pin")}
        >
          {pinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
          <span>{pinned ? t("memos.pinned") : t("memos.pin")}</span>
        </button>

        <div className="flex-1" />

        <span className="hidden md:inline text-xs text-muted-foreground">
          {t("memos.hotkeyHint")}
        </span>

        {memo && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            <X className="h-4 w-4 mr-1" />
            {t("common.cancel")}
          </Button>
        )}
        <Button
          size="sm"
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          <Send className="h-4 w-4 mr-1" />
          {memo ? t("common.save") : t("memos.post")}
        </Button>
      </div>
    </div>
  );
}
