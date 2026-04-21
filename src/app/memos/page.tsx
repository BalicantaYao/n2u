"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { MemoComposer } from "@/components/memos/MemoComposer";
import { MemoFilters } from "@/components/memos/MemoFilters";
import { MemoList } from "@/components/memos/MemoList";
import { useMemoStore } from "@/store/useMemoStore";

export default function MemosPage() {
  const { memos, isLoading, fetchMemos, filters } = useMemoStore();

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos, filters]);

  return (
    <div>
      <Header titleKey="memos.title" />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <MemoComposer />
        <MemoFilters memos={memos} />
        <MemoList memos={memos} isLoading={isLoading} />
      </div>
    </div>
  );
}
