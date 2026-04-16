"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { TradeForm } from "@/components/trade-form/TradeForm";
import { useT } from "@/lib/i18n";
import type { Trade } from "@/types/trade";

interface PositionLot {
  id: string;
  isOpen: boolean;
  shares: number;
}

export default function EditTradePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [editableFields, setEditableFields] = useState<"all" | "metadata-only">(
    "all"
  );
  const { t } = useT();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/trades/${params.id}`);
        if (!res.ok) {
          router.push("/journal");
          return;
        }
        const data = await res.json();
        setTrade(data);

        // Determine editability based on trade type and position lot status
        if (data.side === "SELL") {
          setEditableFields("metadata-only");
        } else {
          const lots: PositionLot[] = data.positionLots ?? [];
          const isConsumed = lots.some(
            (l) => !l.isOpen || l.shares < data.shares
          );
          setEditableFields(isConsumed ? "metadata-only" : "all");
        }
      } catch {
        router.push("/journal");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <div>
        <Header titleKey="trade.editTrade" />
        <div className="p-4 md:p-6 text-center text-muted-foreground text-sm py-16">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!trade) return null;

  return (
    <div>
      <Header titleKey="trade.editTrade" />
      <div className="p-4 md:p-6">
        <TradeForm
          mode="edit"
          initialData={trade}
          editableFields={editableFields}
        />
      </div>
    </div>
  );
}
