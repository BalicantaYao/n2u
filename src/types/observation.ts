import type { Market, Currency } from "./taiwan";

export interface ObservationTarget {
  id: string;
  symbol: string;
  symbolName: string | null;
  market: Market;
  currency: Currency;
  note: string | null;
  /** 最後一次「今日已確認」的台北日期（YYYY-MM-DD），null = 從未確認 */
  lastCheckedDate: string | null;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObservationInput {
  symbol: string;
  market: Market;
  symbolName?: string;
  note?: string;
}

export interface UpdateObservationInput {
  note?: string;
  archived?: boolean;
  sortOrder?: number;
  /** true = 標記今日已確認；false = 取消今日確認 */
  checked?: boolean;
}
