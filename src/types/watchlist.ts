import type { Market } from "./taiwan";

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  symbol: string;
  symbolName: string | null;
  market: Market;
  note: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items?: WatchlistItem[];
}

export interface CreateWatchlistInput {
  name: string;
  description?: string;
}

export type UpdateWatchlistInput = Partial<CreateWatchlistInput> & {
  sortOrder?: number;
};

export interface CreateWatchlistItemInput {
  symbol: string;
  market: Market;
  symbolName?: string;
  note?: string;
}

export interface UpdateWatchlistItemInput {
  note?: string;
  sortOrder?: number;
}
