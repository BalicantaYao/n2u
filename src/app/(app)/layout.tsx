import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="md:ml-56 min-h-screen pb-safe-bottom md:pb-0">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
