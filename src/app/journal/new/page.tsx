import { Header } from "@/components/layout/Header";
import { TradeForm } from "@/components/trade-form/TradeForm";
import type { Market } from "@/types/taiwan";

interface NewTradePageProps {
  searchParams?: {
    symbol?: string;
    symbolName?: string;
    market?: string;
    isETF?: string;
  };
}

export default function NewTradePage({ searchParams }: NewTradePageProps) {
  const symbol = searchParams?.symbol?.trim() || undefined;
  const symbolName = searchParams?.symbolName?.trim() || undefined;
  const rawMarket = searchParams?.market;
  const market: Market | undefined =
    rawMarket === "TWSE" || rawMarket === "TPEX" ? rawMarket : undefined;
  const isETF =
    searchParams?.isETF === "1" || searchParams?.isETF === "true" ? true : undefined;

  const hasDefaults = symbol || symbolName || market || isETF !== undefined;
  const defaults = hasDefaults ? { symbol, symbolName, market, isETF } : undefined;

  return (
    <div>
      <Header titleKey="trade.newTrade" />
      <div className="p-4 md:p-6">
        <TradeForm defaults={defaults} />
      </div>
    </div>
  );
}
