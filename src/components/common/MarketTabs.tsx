"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMarketViewStore, type MarketTab } from "@/store/useMarketViewStore";
import { useT } from "@/lib/i18n";

interface MarketTabsProps {
  tw: React.ReactNode;
  us: React.ReactNode;
  className?: string;
  listClassName?: string;
}

export function MarketTabs({ tw, us, className, listClassName }: MarketTabsProps) {
  const tab = useMarketViewStore((s) => s.tab);
  const setTab = useMarketViewStore((s) => s.setTab);
  const { t } = useT();

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as MarketTab)}
      className={className}
    >
      <TabsList className={listClassName}>
        <TabsTrigger value="TW">{t("marketTabs.tw")}</TabsTrigger>
        <TabsTrigger value="US">{t("marketTabs.us")}</TabsTrigger>
      </TabsList>
      <TabsContent value="TW" className="space-y-4 md:space-y-6">
        {tw}
      </TabsContent>
      <TabsContent value="US" className="space-y-4 md:space-y-6">
        {us}
      </TabsContent>
    </Tabs>
  );
}
