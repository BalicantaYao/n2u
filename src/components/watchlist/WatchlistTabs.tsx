"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function WatchlistTabs() {
  const { t } = useT();
  const watchlists = useWatchlistStore((s) => s.watchlists);
  const activeId = useWatchlistStore((s) => s.activeId);
  const setActive = useWatchlistStore((s) => s.setActive);
  const createWatchlist = useWatchlistStore((s) => s.createWatchlist);
  const updateWatchlist = useWatchlistStore((s) => s.updateWatchlist);
  const deleteWatchlist = useWatchlistStore((s) => s.deleteWatchlist);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    try {
      await createWatchlist({ name });
      toast.success(t("watchlist.listCreated"));
      setNewName("");
      setCreating(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("watchlist.saveFailed"));
    }
  }

  async function handleRename(id: string) {
    const name = editName.trim();
    if (!name) return;
    try {
      await updateWatchlist(id, { name });
      toast.success(t("watchlist.listUpdated"));
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("watchlist.saveFailed"));
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t("watchlist.deleteListConfirm").replace("{name}", name))) {
      return;
    }
    try {
      await deleteWatchlist(id);
      toast.success(t("watchlist.listDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("watchlist.deleteFailed"));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {watchlists.map((w) => {
        const active = w.id === activeId;
        const isEditing = editingId === w.id;
        return (
          <div
            key={w.id}
            className={cn(
              "group inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {isEditing ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-6 w-28 text-xs bg-background text-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleRename(w.id)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleRename(w.id)}
                  className="p-1 hover:opacity-80"
                  aria-label="save"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="p-1 hover:opacity-80"
                  aria-label="cancel"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActive(w.id)}
                  className="font-medium"
                >
                  {w.name}
                </button>
                {active && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(w.id);
                        setEditName(w.name);
                      }}
                      className="ml-1 p-0.5 opacity-70 hover:opacity-100"
                      aria-label="rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(w.id, w.name)}
                      className="p-0.5 opacity-70 hover:opacity-100"
                      aria-label="delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}

      {creating ? (
        <div className="inline-flex items-center gap-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("watchlist.listNamePlaceholder")}
            className="h-7 w-36 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setNewName("");
              }
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleCreate} className="h-7 px-2 text-xs">
            {t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            className="h-7 px-2 text-xs"
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          {t("watchlist.newList")}
        </button>
      )}
    </div>
  );
}
