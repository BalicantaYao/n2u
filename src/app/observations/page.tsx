"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { ObservationRow } from "@/components/observations/ObservationRow";
import { useObservationStore } from "@/store/useObservationStore";
import { useT } from "@/lib/i18n";

export default function ObservationsPage() {
  const { t } = useT();
  const targets = useObservationStore((s) => s.targets);
  const isLoading = useObservationStore((s) => s.isLoading);
  const fetch = useObservationStore((s) => s.fetch);

  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetch({ archived: showArchived });
  }, [fetch, showArchived]);

  // 切換封存檢視期間，避免顯示舊資料的殘留
  const visible = targets.filter((tg) => tg.archived === showArchived);

  return (
    <div>
      <Header titleKey="observations.title" />
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t("observations.subtitle")}
          </p>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            {showArchived
              ? t("observations.showActive")
              : t("observations.showArchived")}
          </button>
        </div>

        {isLoading && visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : visible.length === 0 ? (
          <div className="space-y-3 rounded-lg border bg-card p-10 text-center">
            <ListChecks className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {showArchived
                ? t("observations.emptyArchived")
                : t("observations.empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((tg) => (
              <ObservationRow key={tg.id} target={tg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
