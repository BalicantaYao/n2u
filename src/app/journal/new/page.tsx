import { Header } from "@/components/layout/Header";
import { TradeForm } from "@/components/trade-form/TradeForm";

export default function NewTradePage() {
  return (
    <div>
      <Header title="新增交易" />
      <div className="p-6">
        <TradeForm />
      </div>
    </div>
  );
}
