import { Header } from "@/components/layout/Header";
import { CSVImporter } from "@/components/trade-form/CSVImporter";

export default function ImportPage() {
  return (
    <div>
      <Header title="批量匯入 CSV" />
      <div className="p-4 md:p-6">
        <CSVImporter />
      </div>
    </div>
  );
}
