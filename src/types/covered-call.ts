import type { Market, Currency } from "./taiwan";

/** 底倉型態：目前只支援買進買權（long call） */
export type UnderlyingType = "LONG_CALL";

/**
 * 掩護性買權目前只做台股加權股價指數（台指選擇權 TXO）這一個標的，
 * 標的、市場與契約乘數都由這裡固定，不由使用者輸入。
 */
export const TAIEX_UNDERLYING = {
  symbol: "TAIEX",
  /** 顯示名稱；與其他台股標的一樣存中文名 */
  symbolName: "加權指數",
  market: "TWSE" as Market,
  /** 台指選擇權每 1 點 50 元 */
  contractMultiplier: 50,
  underlyingType: "LONG_CALL" as UnderlyingType,
} as const;

/** 底倉狀態 */
export type CoveredCallStatus = "OPEN" | "CLOSED";

/**
 * 賣出 Call 的結束方式：
 * OPEN         尚未平倉
 * BOUGHT_BACK  買回平倉
 * EXPIRED      到期歸零（權利金全數賺取）
 * ASSIGNED     被指派（依結算價值結算）
 * ROLLED       轉倉（買回後另開一腳）
 */
export type LegStatus = "OPEN" | "BOUGHT_BACK" | "EXPIRED" | "ASSIGNED" | "ROLLED";

export const LEG_CLOSE_STATUSES: LegStatus[] = [
  "BOUGHT_BACK",
  "EXPIRED",
  "ASSIGNED",
  "ROLLED",
];

export interface CoveredCallLeg {
  id: string;
  positionId: string;
  strike: number;
  /** ISO 日期字串 */
  expiry: string;
  contracts: number;
  openDate: string;
  openPremium: number;
  openFee: number;
  status: LegStatus;
  closeDate: string | null;
  closePremium: number | null;
  closeFee: number | null;
  rolledFromId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoveredCallPosition {
  id: string;
  symbol: string;
  symbolName: string | null;
  market: Market;
  currency: Currency;
  underlyingType: UnderlyingType;
  contractMultiplier: number;
  quantity: number;
  openDate: string;
  openPrice: number;
  openFee: number;
  strike: number | null;
  expiry: string | null;
  status: CoveredCallStatus;
  closeDate: string | null;
  closePrice: number | null;
  closeFee: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  legs: CoveredCallLeg[];
}

/**
 * 建立底倉；標的（加權指數）、市場與契約乘數由後端以
 * {@link TAIEX_UNDERLYING} 固定，前端只送買進資訊。
 */
export interface CreateCoveredCallInput {
  quantity: number;
  openDate: string;
  openPrice: number;
  openFee?: number;
  strike: number;
  expiry: string;
  notes?: string;
}

export interface UpdateCoveredCallInput {
  quantity?: number;
  openPrice?: number;
  openFee?: number;
  strike?: number;
  expiry?: string;
  notes?: string;
  /** 帶入 closeDate 即結束底倉；傳 null 代表重新開啟 */
  closeDate?: string | null;
  closePrice?: number | null;
  closeFee?: number | null;
}

export interface CreateLegInput {
  strike: number;
  expiry: string;
  contracts: number;
  openDate: string;
  openPremium: number;
  openFee?: number;
  notes?: string;
  /** 由哪一腳轉倉而來（轉倉時帶入，後端會一併將該腳結算為 ROLLED） */
  rolledFromId?: string;
  /** 轉倉時買回舊腳的權利金與手續費 */
  rollClosePremium?: number;
  rollCloseFee?: number;
}

export interface UpdateLegInput {
  strike?: number;
  expiry?: string;
  contracts?: number;
  openDate?: string;
  openPremium?: number;
  openFee?: number;
  notes?: string;
  /** 平倉：帶入結束方式與平倉資訊；status 傳 "OPEN" 可還原成未平倉 */
  status?: LegStatus;
  closeDate?: string | null;
  closePremium?: number | null;
  closeFee?: number | null;
}
