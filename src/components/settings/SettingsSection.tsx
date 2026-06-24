"use client";

import { useT } from "@/lib/i18n";
import { CommissionDiscountForm } from "./CommissionDiscountForm";
import { TradeChecklistForm } from "./TradeChecklistForm";
import { WalletForm } from "./WalletForm";

export function SettingsSection() {
  const { t } = useT();
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold mb-1">{t("wallet.sectionTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("wallet.sectionDesc")}</p>
        <WalletForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">
          {t("settings.tradingSection")}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("settings.tradingSectionDesc")}
        </p>
        <CommissionDiscountForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">
          {t("settings.checklistSection")}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("settings.checklistSectionDesc")}
        </p>
        <TradeChecklistForm />
      </section>
    </div>
  );
}
