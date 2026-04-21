import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency, Market } from "@/types/taiwan";
import { isUSMarket } from "@/types/taiwan";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 格式化台幣金額，例如 1234567 → "NT$1,234,567" */
export function formatTWD(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);

  if (showSign) {
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
  }
  return amount < 0 ? `-${formatted}` : formatted;
}

/** 格式化美元金額，例如 1234.56 → "$1,234.56" */
export function formatUSD(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  if (showSign) {
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
  }
  return amount < 0 ? `-${formatted}` : formatted;
}

/** 依幣別派發到 formatTWD / formatUSD */
export function formatCurrency(
  amount: number,
  currency: Currency | undefined,
  showSign = false,
): string {
  return currency === "USD"
    ? formatUSD(amount, showSign)
    : formatTWD(amount, showSign);
}

/** 格式化百分比，例如 0.1234 → "+12.34%" */
export function formatPct(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

/** 格式化數量：
 *  - 台股 ROUND：顯示「N 張」
 *  - 台股 ODD：顯示「N 股」
 *  - 美股：一律顯示「N 股」
 */
export function formatShares(
  shares: number,
  lotType: "ROUND" | "ODD",
  market?: Market,
): string {
  if (market && isUSMarket(market)) {
    return `${shares.toLocaleString()} 股`;
  }
  if (lotType === "ROUND") {
    return `${shares / 1000} 張`;
  }
  return `${shares} 股`;
}

/** 格式化日期為台灣常用格式 YYYY/MM/DD */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/** 判斷是否為台灣市場開盤時間（週一至週五 09:00–13:30 TST） */
export function isMarketOpen(): boolean {
  const now = new Date();
  const tst = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Taipei" })
  );
  const day = tst.getDay();
  const minutes = tst.getHours() * 60 + tst.getMinutes();
  return day >= 1 && day <= 5 && minutes >= 540 && minutes <= 810;
}

/** 取得今日台灣時間的 YYYY-MM-DD 字串 */
export function getTodayTW(): string {
  return new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}

/** 組出 TradingView 頁面的 URL。台股：TWSE-2330；美股：NASDAQ-AAPL、NYSE-IBM */
export function tradingViewUrl(symbol: string, market: Market): string {
  const upper = isUSMarket(market) ? symbol.toUpperCase() : symbol;
  return `https://www.tradingview.com/symbols/${market}-${upper}/`;
}
