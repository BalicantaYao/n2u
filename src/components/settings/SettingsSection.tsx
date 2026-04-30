"use client";

import { useT } from "@/lib/i18n";
import { CommissionDiscountForm } from "./CommissionDiscountForm";

export function SettingsSection() {
  const { t } = useT();
  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">
        {t("settings.tradingSection")}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t("settings.tradingSectionDesc")}
      </p>
      <CommissionDiscountForm />
    </section>
  );
}
