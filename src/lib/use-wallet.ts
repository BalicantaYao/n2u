"use client";

import { useEffect, useState } from "react";
import type { WalletBalance } from "@/types/wallet";
import type { Currency } from "@/types/taiwan";

let cached: WalletBalance[] | null = null;
let inflight: Promise<WalletBalance[] | null> | null = null;
const listeners = new Set<(w: WalletBalance[] | null) => void>();

function notify(w: WalletBalance[] | null) {
  for (const fn of listeners) fn(w);
}

async function fetchWallets(force = false): Promise<WalletBalance[] | null> {
  if (cached && !force) return cached;
  if (inflight) return inflight;
  inflight = fetch("/api/wallet")
    .then((res) => (res.ok ? (res.json() as Promise<WalletBalance[]>) : null))
    .then((data) => {
      cached = data;
      notify(data);
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 交易或儲值後呼叫，重新抓取錢包餘額並通知所有訂閱者 */
export function refreshWallet() {
  void fetchWallets(true);
}

/** 讀取目前使用者的 TWD/USD 錢包餘額，共用單一快取避免重複請求 */
export function useWallet() {
  const [wallets, setWallets] = useState<WalletBalance[] | null>(cached);

  useEffect(() => {
    const handler = (w: WalletBalance[] | null) => setWallets(w);
    listeners.add(handler);
    if (!cached) void fetchWallets();
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return wallets;
}

/** 取得指定幣別的餘額（找不到回傳 0），未載入時回傳 null */
export function useWalletBalance(currency: Currency): number | null {
  const wallets = useWallet();
  if (wallets === null) return null;
  return wallets.find((w) => w.currency === currency)?.balance ?? 0;
}
