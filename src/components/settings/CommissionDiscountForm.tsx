"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { useUserProfile, setCachedProfile } from "@/lib/use-user-profile";
import { calcTWCommission } from "@/lib/taiwan-fees";
import { formatCurrency } from "@/lib/utils";

const PRESETS: Array<{ value: number; labelKey: string }> = [
  { value: 1, labelKey: "settings.discountPresetNone" },
  { value: 0.65, labelKey: "settings.discountPreset65" },
  { value: 0.6, labelKey: "settings.discountPreset6" },
  { value: 0.5, labelKey: "settings.discountPreset5" },
  { value: 0.38, labelKey: "settings.discountPreset38" },
  { value: 0.28, labelKey: "settings.discountPreset28" },
];

const SAMPLE_GROSS = 100_000; // 預覽試算金額：10 萬元

export function CommissionDiscountForm() {
  const { t } = useT();
  const profile = useUserProfile();
  const [discount, setDiscount] = useState<string>("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setDiscount(String(profile.commissionDiscount));
  }, [profile]);

  const parsed = Number(discount);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= 1;
  const sampleCommission = valid ? calcTWCommission(SAMPLE_GROSS, parsed) : 0;
  const baseCommission = calcTWCommission(SAMPLE_GROSS, 1);
  const savedAmount = baseCommission - sampleCommission;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast.error(t("settings.discountInvalid"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionDiscount: parsed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? t("settings.saveFailed"));
      }
      const updated = await res.json();
      setCachedProfile(updated);
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="commissionDiscount">
          {t("settings.commissionDiscountLabel")}
        </Label>
        <p className="text-xs text-muted-foreground">
          {t("settings.commissionDiscountHint")}
        </p>
        <div className="flex items-center gap-2 max-w-xs">
          <Input
            id="commissionDiscount"
            type="number"
            min={0.01}
            max={1}
            step={0.01}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {valid
              ? `≈ ${(parsed * 10).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${t("settings.discountUnit")}`
              : t("settings.discountInvalid")}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setDiscount(String(p.value))}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              parsed === p.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-input hover:bg-accent"
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {valid && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("settings.previewHeader", { amount: formatCurrency(SAMPLE_GROSS, "TWD") })}
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("settings.previewBase")}</span>
            <span className="tabular-nums">{formatCurrency(baseCommission, "TWD")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("settings.previewActual")}
            </span>
            <span className="tabular-nums font-medium">
              {formatCurrency(sampleCommission, "TWD")}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2 font-bold">
            <span>{t("settings.previewSaved")}</span>
            <span
              className={
                savedAmount > 0
                  ? "text-green-600 dark:text-green-400 tabular-nums"
                  : "tabular-nums"
              }
            >
              {savedAmount > 0 ? "-" : ""}
              {formatCurrency(savedAmount, "TWD")}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving || !valid}>
          {saving ? t("settings.saving") : t("settings.save")}
        </Button>
      </div>
    </form>
  );
}
