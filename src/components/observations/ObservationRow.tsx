"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useObservationStore } from "@/store/useObservationStore";
import { isCheckedToday } from "@/lib/observation-date";
import { tradingViewUrl } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { ObservationTarget } from "@/types/observation";

export function ObservationRow({ target }: { target: ObservationTarget }) {
  const { t } = useT();
  const check = useObservationStore((s) => s.check);
  const update = useObservationStore((s) => s.update);
  const remove = useObservationStore((s) => s.remove);

  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(target.note ?? "");
  const [busy, setBusy] = useState(false);

  const checked = isCheckedToday(target.lastCheckedDate);

  async function run(fn: () => Promise<unknown>, failKey: string) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(failKey));
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    await run(async () => {
      await update(target.id, { note });
      setEditing(false);
    }, "observations.updateFailed");
  }

  async function handleDelete() {
    if (!window.confirm(t("observations.confirmDelete"))) return;
    await run(() => remove(target.id), "observations.deleteFailed");
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        {!target.archived && (
          <Button
            size="sm"
            variant={checked ? "ghost" : "outline"}
            className="h-7 shrink-0 text-xs"
            disabled={busy}
            onClick={() =>
              run(() => check(target.id, !checked), "observations.updateFailed")
            }
          >
            {checked ? (
              <>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                {t("observations.checkedToday")}
              </>
            ) : (
              <>
                <Check className="mr-1 h-3.5 w-3.5" />
                {t("observations.done")}
              </>
            )}
          </Button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <a
              href={tradingViewUrl(target.symbol, target.market)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-primary hover:underline"
            >
              {target.symbol}
            </a>
            {target.symbolName && (
              <span className="truncate text-xs text-muted-foreground">
                {target.symbolName}
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={t("observations.notePlaceholder")}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setNote(target.note ?? "");
                    setEditing(false);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={busy}
                  onClick={saveNote}
                >
                  {t("common.save")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {target.note || t("observations.noNote")}
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              title={t("common.edit")}
              aria-label={t("common.edit")}
              onClick={() => setEditing(true)}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={
                target.archived
                  ? t("observations.unarchive")
                  : t("observations.archive")
              }
              aria-label={
                target.archived
                  ? t("observations.unarchive")
                  : t("observations.archive")
              }
              disabled={busy}
              onClick={() =>
                run(
                  () => update(target.id, { archived: !target.archived }),
                  "observations.updateFailed",
                )
              }
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {target.archived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              title={t("common.delete")}
              aria-label={t("common.delete")}
              disabled={busy}
              onClick={handleDelete}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
