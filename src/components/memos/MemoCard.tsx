"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pin, Pencil, Trash2, Link2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemoStore } from "@/store/useMemoStore";
import { useT } from "@/lib/i18n";
import { stringToTags } from "@/lib/memo-tags";
import { cn } from "@/lib/utils";
import { MemoMarkdown } from "./MemoMarkdown";
import { MemoComposer } from "./MemoComposer";
import type { Memo } from "@/types/memo";

interface Props {
  memo: Memo;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

export function MemoCard({ memo }: Props) {
  const { t } = useT();
  const setFilters = useMemoStore((s) => s.setFilters);
  const updateMemo = useMemoStore((s) => s.updateMemo);
  const deleteMemo = useMemoStore((s) => s.deleteMemo);
  const [editing, setEditing] = useState(false);

  const tags = stringToTags(memo.tags);

  async function togglePin() {
    try {
      await updateMemo(memo.id, { pinned: !memo.pinned });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("memos.saveFailed"));
    }
  }

  async function handleDelete() {
    if (!confirm(t("memos.confirmDelete"))) return;
    try {
      await deleteMemo(memo.id);
      toast.success(t("memos.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("memos.deleteFailed"));
    }
  }

  if (editing) {
    return (
      <MemoComposer
        memo={memo}
        onCancel={() => setEditing(false)}
        onSubmitted={() => setEditing(false)}
      />
    );
  }

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-3 md:p-4 space-y-2",
        memo.pinned && "border-primary/40 bg-primary/[0.03]"
      )}
    >
      <header className="flex items-center gap-2 text-xs text-muted-foreground">
        <time dateTime={memo.createdAt}>{formatTime(memo.createdAt)}</time>
        {memo.pinned && (
          <Pin className="h-3 w-3 text-primary" aria-hidden />
        )}
        {memo.createdAt !== memo.updatedAt && (
          <span className="italic">{t("memos.editedBadge")}</span>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={togglePin}
          className="rounded p-1 hover:bg-accent"
          title={memo.pinned ? t("memos.unpin") : t("memos.pin")}
        >
          <Pin
            className={cn(
              "h-3.5 w-3.5",
              memo.pinned ? "text-primary" : "text-muted-foreground"
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 hover:bg-accent"
          title={t("common.edit")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded p-1 hover:bg-accent text-destructive"
          title={t("common.delete")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>

      <MemoMarkdown content={memo.content} />

      {(tags.length > 0 || memo.linkedSymbol || memo.tradeId) && (
        <footer className="flex flex-wrap items-center gap-1.5 pt-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setFilters({ tag })}
              className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors"
            >
              #{tag}
            </button>
          ))}
          {memo.linkedSymbol && (
            <button
              type="button"
              onClick={() => setFilters({ symbol: memo.linkedSymbol ?? undefined })}
              className="inline-flex"
            >
              <Badge variant="twse" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {memo.linkedSymbol}
              </Badge>
            </button>
          )}
          {memo.tradeId && (
            <Link href={`/journal/${memo.tradeId}/edit`} className="inline-flex">
              <Badge variant="outline" className="gap-1">
                <Link2 className="h-3 w-3" />
                {t("memos.linkedTradeBadge")}
              </Badge>
            </Link>
          )}
          <div className="flex-1" />
          {editing ? null : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs md:hidden"
              onClick={() => setEditing(true)}
            >
              {t("common.edit")}
            </Button>
          )}
        </footer>
      )}
    </article>
  );
}
