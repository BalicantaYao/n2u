export interface Memo {
  id: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  tags: string | null;
  linkedSymbol: string | null;
  tradeId: string | null;
  pinned: boolean;
  userId: string;
}

export interface CreateMemoInput {
  content: string;
  linkedSymbol?: string | null;
  tradeId?: string | null;
  pinned?: boolean;
}

export type UpdateMemoInput = Partial<CreateMemoInput>;

export interface MemoFilters {
  tag?: string;
  symbol?: string;
  search?: string;
  from?: string;
  to?: string;
}
