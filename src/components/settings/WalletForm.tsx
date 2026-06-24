"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useWallet, refreshWallet } from "@/lib/use-wallet";
import { formatCurrency } from "@/lib/utils";
import type { Currency } from "@/types/taiwan";
import type { WalletTransaction } from "@/types/wallet";

const CURRENCIES: Currency[] = ["TWD", "USD"];

function WalletCard({ currency, balance }: { currency: Currency; balance: number }) {
  const { t } = useT();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  async function loadHistory() {
    try {
      const res = await fetch(`/api/wallet/transactions?currency=${currency}`);
      if (res.ok) setHistory(await res.json());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (showHistory) void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory]);

  async function submit(type: "DEPOSIT" | "WITHDRAW") {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t("wallet.invalidAmount"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, type, amount: value, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("wallet.actionFailed"));
      toast.success(type === "DEPOSIT" ? t("wallet.depositSuccess") : t("wallet.withdrawSuccess"));
      setAmount("");
      setNote("");
      refreshWallet();
      if (showHistory) void loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("wallet.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4 max-w-xl">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">
          {currency === "TWD" ? t("marketTabs.tw") : t("marketTabs.us")} · {currency}
        </span>
        <span
          className={`text-xl font-bold tabular-nums ${
            balance < 0 ? "text-red-600 dark:text-red-400" : ""
          }`}
        >
          {formatCurrency(balance, currency)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          type="number"
          min={0}
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t("wallet.amountPlaceholder")}
          className="max-w-[160px]"
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("wallet.notePlaceholder")}
          className="flex-1 min-w-[140px]"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => submit("DEPOSIT")} disabled={busy}>
          {t("wallet.deposit")}
        </Button>
        <Button variant="outline" onClick={() => submit("WITHDRAW")} disabled={busy}>
          {t("wallet.withdraw")}
        </Button>
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => setShowHistory((s) => !s)}
        >
          {t("wallet.history")}
        </Button>
      </div>

      {showHistory && (
        <div className="border-t pt-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("wallet.noHistory")}</p>
          ) : (
            <ul className="space-y-1 text-sm max-h-64 overflow-y-auto">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString()} ·{" "}
                    {t(`wallet.type${h.type}`)}
                    {h.note ? ` · ${h.note}` : ""}
                  </span>
                  <span
                    className={`tabular-nums ${
                      h.amount >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {h.amount >= 0 ? "+" : ""}
                    {formatCurrency(h.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function WalletForm() {
  const wallets = useWallet();

  return (
    <div className="space-y-4">
      {CURRENCIES.map((currency) => {
        const balance = wallets?.find((w) => w.currency === currency)?.balance ?? 0;
        return <WalletCard key={currency} currency={currency} balance={balance} />;
      })}
    </div>
  );
}
