"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useUserProfile, setCachedProfile } from "@/lib/use-user-profile";
import { Trash2, GripVertical, Plus } from "lucide-react";

const MAX_ITEMS = 30;

export function TradeChecklistForm() {
  const { t } = useT();
  const profile = useUserProfile();
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (profile) setItems(profile.tradeChecklist ?? []);
  }, [profile]);

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.length >= MAX_ITEMS) {
      toast.error(t("settings.checklistMaxItems", { max: MAX_ITEMS }));
      return;
    }
    setItems((prev) => [...prev, trimmed]);
    setNewItem("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setItems(reordered);
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const cleaned = items.map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeChecklist: cleaned }),
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
    <div className="space-y-4 max-w-xl">
      <p className="text-xs text-muted-foreground">
        {t("settings.checklistHint")}
      </p>

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            {t("settings.checklistEmpty")}
          </p>
        )}
        {items.map((item, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 rounded-md border bg-background px-2 py-1 ${
              dragIndex === i ? "opacity-50" : ""
            }`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
            <span className="text-xs text-muted-foreground w-5 shrink-0 text-right tabular-nums">
              {i + 1}.
            </span>
            <Input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 px-1"
              maxLength={100}
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              title={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {items.length < MAX_ITEMS && (
        <div className="flex gap-2">
          <Input
            placeholder={t("settings.checklistNewItemPlaceholder")}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            maxLength={100}
            className="text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!newItem.trim()}>
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("settings.checklistAdd")}</span>
          </Button>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("settings.saving") : t("settings.save")}
        </Button>
      </div>
    </div>
  );
}
