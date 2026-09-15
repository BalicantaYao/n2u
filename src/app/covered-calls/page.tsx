import { Header } from "@/components/layout/Header";
import { CoveredCallContent } from "@/components/covered-calls/CoveredCallContent";

export default function CoveredCallsPage() {
  return (
    <div>
      <Header titleKey="coveredCalls.title" />
      <CoveredCallContent />
    </div>
  );
}
