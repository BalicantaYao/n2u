import { Header } from "@/components/layout/Header";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function SettingsPage() {
  return (
    <div>
      <Header titleKey="settings.title" />
      <div className="p-4 md:p-6 space-y-8">
        <SettingsSection />
      </div>
    </div>
  );
}
