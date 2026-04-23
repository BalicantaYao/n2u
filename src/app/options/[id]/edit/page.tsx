"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { OptionForm } from "@/components/options-form/OptionForm";
import { useT } from "@/lib/i18n";
import type { OptionTrade } from "@/types/option";

export default function EditOptionPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [option, setOption] = useState<OptionTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useT();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/options/${params.id}`);
        if (!res.ok) {
          router.push("/options");
          return;
        }
        setOption(await res.json());
      } catch {
        router.push("/options");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <div>
        <Header titleKey="options.editOption" />
        <div className="p-4 md:p-6 text-center text-muted-foreground text-sm py-16">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!option) return null;

  return (
    <div>
      <Header titleKey="options.editOption" />
      <div className="p-4 md:p-6">
        <OptionForm mode="edit" initialData={option} />
      </div>
    </div>
  );
}
