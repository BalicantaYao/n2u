import { Header } from "@/components/layout/Header";
import { EtfHoldingsContent } from "@/components/etf-holdings/EtfHoldingsContent";

export const dynamic = "force-dynamic";

export default function EtfHoldingsPage() {
  return (
    <div>
      <Header titleKey="etfHoldings.title" />
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <EtfHoldingsContent />
      </div>
    </div>
  );
}
