"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

type DownloadFormat = "json" | "csv";

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1] || fallback;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function isBackupDocument(value: unknown): value is { trades: unknown[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const doc = value as Record<string, unknown>;
  return doc.schemaVersion === 1 && doc.scope === "tw-us-stocks" && Array.isArray(doc.trades);
}

export function TradeBackupSection() {
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [pending, setPending] = useState<{ name: string; text: string; trades: number } | null>(null);

  async function download(format: DownloadFormat) {
    setDownloading(format);
    try {
      const res = await fetch(`/api/trades/backup?format=${format}`);
      const contentType = res.headers.get("content-type") ?? "";
      const expected = format === "csv" ? "text/csv" : "application/json";
      if (!res.ok || !contentType.includes(expected)) {
        toast.error(t("settings.backupDownloadFailed"));
        return;
      }
      const blob = await res.blob();
      const filename = filenameFromDisposition(
        res.headers.get("content-disposition"),
        `n2u-trades-backup.${format}`,
      );
      triggerDownload(blob, filename);
      const count = Number(res.headers.get("x-backup-trade-count") ?? "0");
      toast.success(t("settings.backupDownloadSuccess", { count: Number.isFinite(count) ? count : 0 }));
    } catch {
      toast.error(t("settings.backupDownloadFailed"));
    } finally {
      setDownloading(null);
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isBackupDocument(parsed)) {
        setPending(null);
        toast.error(t("settings.backupInvalidJson"));
        return;
      }
      setPending({ name: file.name, text, trades: parsed.trades.length });
    } catch {
      setPending(null);
      toast.error(t("settings.backupInvalidJson"));
    }
  }

  async function handleRestore() {
    if (!pending) return;
    if (!window.confirm(t("settings.backupRestoreConfirm"))) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/trades/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: pending.text,
      });
      const data: { error?: unknown; imported?: unknown; stopLossAdjustments?: unknown } | null =
        await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.imported !== "number") {
        toast.error(typeof data?.error === "string" ? data.error : t("settings.backupRestoreFailed"));
        return;
      }
      toast.success(
        t("settings.backupRestoreSuccess", {
          trades: data.imported,
          adjustments: typeof data.stopLossAdjustments === "number" ? data.stopLossAdjustments : 0,
        }),
      );
      setPending(null);
    } catch {
      toast.error(t("settings.backupRestoreFailed"));
    } finally {
      setRestoring(false);
    }
  }

  const busy = downloading != null || restoring;

  return (
    <div className="space-y-6 max-w-xl">
      <p className="text-xs text-muted-foreground">{t("settings.backupScopeNote")}</p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => download("json")} disabled={busy}>
          <Download className="mr-2 h-4 w-4" />
          {downloading === "json" ? t("settings.backupDownloading") : t("settings.backupDownloadJson")}
        </Button>
        <Button type="button" variant="outline" onClick={() => download("csv")} disabled={busy}>
          <Download className="mr-2 h-4 w-4" />
          {downloading === "csv" ? t("settings.backupDownloading") : t("settings.backupDownloadCsv")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("settings.backupCsvHint")}{" "}
        <Link href="/journal/import" className="text-primary underline-offset-4 hover:underline">
          {t("trade.batchImportCsv")}
        </Link>
      </p>

      <div className="space-y-3 border-t pt-6">
        <p className="text-sm text-muted-foreground">{t("settings.backupRestoreHint")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("settings.backupChooseFile")}
          </Button>
          <Button type="button" onClick={handleRestore} disabled={busy || !pending}>
            {restoring ? t("settings.backupRestoring") : t("settings.backupRestore")}
          </Button>
        </div>
        {pending && (
          <p className="text-sm">
            {t("settings.backupFileSummary", { name: pending.name, count: pending.trades })}
          </p>
        )}
      </div>
    </div>
  );
}
