import { Header } from "@/components/layout/Header";
import { OptionForm } from "@/components/options-form/OptionForm";

export default function NewOptionPage() {
  return (
    <div>
      <Header titleKey="options.newOption" />
      <div className="p-4 md:p-6">
        <OptionForm />
      </div>
    </div>
  );
}
