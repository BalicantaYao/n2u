/**
 * 台股（TWSE/TPEX）與美股（NYSE/NASDAQ）交易備份。
 *
 * schemaVersion 1 的 JSON 含完整交易欄位、停損調整、與交易連結的錢包帳本，
 * 以及台股手續費折扣。掩護性買權、筆記、觀察清單、自選股與登入憑證不在範圍內。
 *
 * CSV 欄位順序與批次匯入（CSVImporter）相同，標題列使用英文
 * 「Trade Date,Symbol,Price,Shares,Stop Loss,Value,Notes」，
 * 匯入器會略過該標題。股數正數為買進、負數為賣出。
 */

export const TRADE_BACKUP_SCHEMA_VERSION = 1;

export const TRADE_BACKUP_SCOPE = "tw-us-stocks" as const;

/** 與設定頁英文 CSV 標題一致，批次匯入會辨識這個標題列。 */
export const TRADE_IMPORT_CSV_HEADER =
  "Trade Date,Symbol,Price,Shares,Stop Loss,Value,Notes";

export const STOCK_MARKETS = ["TWSE", "TPEX", "NYSE", "NASDAQ"] as const;

export type StockMarket = (typeof STOCK_MARKETS)[number];

const STOCK_MARKET_SET = new Set<string>(STOCK_MARKETS);

export const BACKUP_USER_FIELDS = { commissionDiscount: true } as const;

const MAX_RESTORE_ROWS = 20_000;
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

export function isStockMarket(market: string): market is StockMarket {
  return STOCK_MARKET_SET.has(market);
}

/** 查詢條件：只含指定使用者的上市／上櫃／美股交易。 */
export function stockScope(userId: string): {
  userId: string;
  market: { in: StockMarket[] };
} {
  return { userId, market: { in: [...STOCK_MARKETS] } };
}

/** 只含指定使用者、且有連結交易的錢包帳本（不含純儲值／提領）。 */
export function tradeLinkedWalletScope(userId: string): {
  userId: string;
  tradeId: { not: null };
} {
  return { userId, tradeId: { not: null } };
}

export interface BackupTrade {
  id: string;
  createdAt: string;
  updatedAt: string;
  symbol: string;
  symbolName: string | null;
  market: StockMarket;
  currency: "TWD" | "USD";
  side: "BUY" | "SELL";
  tradeDate: string;
  settlementDate: string | null;
  lotType: "ROUND" | "ODD";
  lots: number | null;
  shares: number;
  price: number;
  commission: number;
  transactionTax: number;
  totalFees: number;
  grossAmount: number;
  netAmount: number;
  realizedPnL: number | null;
  isETF: boolean;
  stopLoss: number | null;
  notes: string | null;
  tags: string | null;
}

export interface BackupStopLossAdjustment {
  id: string;
  createdAt: string;
  symbol: string;
  market: StockMarket;
  previousStopLoss: number | null;
  newStopLoss: number | null;
  note: string | null;
}

export interface BackupWalletTransaction {
  id: string;
  createdAt: string;
  currency: "TWD" | "USD";
  type: string;
  amount: number;
  balanceAfter: number;
  tradeId: string;
  note: string | null;
}

export interface TradeBackup {
  schemaVersion: typeof TRADE_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  scope: typeof TRADE_BACKUP_SCOPE;
  settings: { commissionDiscount: number | null };
  trades: BackupTrade[];
  stopLossAdjustments: BackupStopLossAdjustment[];
  walletTransactions: BackupWalletTransaction[];
}

export interface BackupSourceTrade {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  symbol: string;
  symbolName?: string | null;
  market: string;
  currency: string;
  side: string;
  tradeDate: Date | string;
  settlementDate?: Date | string | null;
  lotType: string;
  lots?: number | null;
  shares: number;
  price: number;
  commission: number;
  transactionTax: number;
  totalFees: number;
  grossAmount: number;
  netAmount: number;
  realizedPnL?: number | null;
  isETF?: boolean | null;
  stopLoss?: number | null;
  notes?: string | null;
  tags?: string | null;
}

export interface BackupSourceStopLoss {
  id: string;
  createdAt: Date | string;
  symbol: string;
  market: string;
  previousStopLoss?: number | null;
  newStopLoss?: number | null;
  note?: string | null;
}

export interface BackupSourceWalletTx {
  id: string;
  createdAt: Date | string;
  currency: string;
  type: string;
  amount: number;
  balanceAfter: number;
  tradeId?: string | null;
  note?: string | null;
}

export interface RestoreTrade {
  symbol: string;
  symbolName: string | null;
  market: StockMarket;
  currency: "TWD" | "USD";
  side: "BUY" | "SELL";
  tradeDate: Date;
  settlementDate: Date | null;
  lotType: "ROUND" | "ODD";
  lots: number | null;
  shares: number;
  price: number;
  commission: number;
  transactionTax: number;
  totalFees: number;
  grossAmount: number;
  netAmount: number;
  realizedPnL: number | null;
  isETF: boolean;
  stopLoss: number | null;
  notes: string | null;
  tags: string | null;
  createdAt: Date;
}

export interface RestoreStopLoss {
  symbol: string;
  market: StockMarket;
  previousStopLoss: number | null;
  newStopLoss: number | null;
  note: string | null;
  createdAt: Date;
}

export interface RestorePlan {
  trades: RestoreTrade[];
  stopLossAdjustments: RestoreStopLoss[];
  commissionDiscount: number | null;
  ignoredWalletTransactions: number;
}

export type PlanRestoreResult =
  | { ok: true; plan: RestorePlan }
  | { ok: false; error: string };

function currencyForMarket(market: StockMarket): "TWD" | "USD" {
  return market === "NYSE" || market === "NASDAQ" ? "USD" : "TWD";
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: Date | string | null | undefined): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDiscount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0 || value > 1) return null;
  return Math.round(value * 10000) / 10000;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function normalizeTrade(source: BackupSourceTrade): BackupTrade | null {
  if (!isStockMarket(source.market)) return null;
  if (source.side !== "BUY" && source.side !== "SELL") return null;
  if (source.lotType !== "ROUND" && source.lotType !== "ODD") return null;
  const createdAt = toIso(source.createdAt);
  const updatedAt = toIso(source.updatedAt);
  const tradeDate = toIso(source.tradeDate);
  if (!createdAt || !updatedAt || !tradeDate) return null;
  const symbol = source.symbol.trim().toUpperCase();
  if (!symbol) return null;
  const currency = currencyForMarket(source.market);
  const isUS = currency === "USD";
  return {
    id: source.id,
    createdAt,
    updatedAt,
    symbol,
    symbolName: emptyToNull(source.symbolName),
    market: source.market,
    currency,
    side: source.side,
    tradeDate,
    settlementDate: toIso(source.settlementDate),
    lotType: isUS ? "ROUND" : source.lotType,
    lots: isUS ? null : source.lots ?? null,
    shares: source.shares,
    price: source.price,
    commission: source.commission,
    transactionTax: source.transactionTax,
    totalFees: source.totalFees,
    grossAmount: source.grossAmount,
    netAmount: source.netAmount,
    realizedPnL: source.realizedPnL ?? null,
    isETF: source.isETF ?? false,
    stopLoss: source.stopLoss ?? null,
    notes: emptyToNull(source.notes),
    tags: emptyToNull(source.tags),
  };
}

function normalizeAdjustment(
  source: BackupSourceStopLoss,
): BackupStopLossAdjustment | null {
  if (!isStockMarket(source.market)) return null;
  const createdAt = toIso(source.createdAt);
  const symbol = source.symbol.trim().toUpperCase();
  if (!createdAt || !symbol) return null;
  return {
    id: source.id,
    createdAt,
    symbol,
    market: source.market,
    previousStopLoss: source.previousStopLoss ?? null,
    newStopLoss: source.newStopLoss ?? null,
    note: emptyToNull(source.note),
  };
}

export function buildTradeBackup(input: {
  exportedAt?: Date;
  commissionDiscount?: number | null;
  trades: BackupSourceTrade[];
  stopLossAdjustments?: BackupSourceStopLoss[];
  walletTransactions?: BackupSourceWalletTx[];
}): TradeBackup {
  const trades = input.trades
    .map(normalizeTrade)
    .filter((trade): trade is BackupTrade => trade != null)
    .sort(
      (a, b) =>
        compareText(a.tradeDate, b.tradeDate) ||
        compareText(a.createdAt, b.createdAt) ||
        compareText(a.id, b.id),
    );

  const tradeIds = new Set(trades.map((trade) => trade.id));

  const stopLossAdjustments = (input.stopLossAdjustments ?? [])
    .map(normalizeAdjustment)
    .filter((row): row is BackupStopLossAdjustment => row != null)
    .sort(
      (a, b) => compareText(a.createdAt, b.createdAt) || compareText(a.id, b.id),
    );

  const walletTransactions = (input.walletTransactions ?? [])
    .flatMap((row) => {
      if (!row.tradeId || !tradeIds.has(row.tradeId)) return [];
      if (row.currency !== "TWD" && row.currency !== "USD") return [];
      if (!row.type) return [];
      const createdAt = toIso(row.createdAt);
      if (!createdAt || !Number.isFinite(row.amount) || !Number.isFinite(row.balanceAfter)) {
        return [];
      }
      const tx: BackupWalletTransaction = {
        id: row.id,
        createdAt,
        currency: row.currency,
        type: row.type,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        tradeId: row.tradeId,
        note: emptyToNull(row.note),
      };
      return [tx];
    })
    .sort(
      (a, b) => compareText(a.createdAt, b.createdAt) || compareText(a.id, b.id),
    );

  const exportedAt = toIso(input.exportedAt ?? new Date()) ?? new Date().toISOString();

  return {
    schemaVersion: TRADE_BACKUP_SCHEMA_VERSION,
    exportedAt,
    scope: TRADE_BACKUP_SCOPE,
    settings: { commissionDiscount: normalizeDiscount(input.commissionDiscount) },
    trades,
    stopLossAdjustments,
    walletTransactions,
  };
}

export function serializeTradeBackup(backup: TradeBackup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

/**
 * 檔名使用台北時間（UTC+8，無日光節約）。
 * 例如 2026-10-21T16:05:06Z → n2u-trades-backup-20261022-000506.json
 */
export function backupFilename(format: "json" | "csv", now = new Date()): string {
  const taipei = new Date(now.getTime() + TAIPEI_OFFSET_MS).toISOString();
  const stamp = `${taipei.slice(0, 4)}${taipei.slice(5, 7)}${taipei.slice(8, 10)}-${taipei.slice(11, 13)}${taipei.slice(14, 16)}${taipei.slice(17, 19)}`;
  return `n2u-trades-backup-${stamp}.${format}`;
}

function formatCsvNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function csvNotes(notes: string | null): string {
  if (!notes) return "";
  return notes.replace(/[\r\n]+/g, " ").trim();
}

export function tradesToImportCsv(trades: BackupTrade[]): string {
  const lines = [TRADE_IMPORT_CSV_HEADER];
  for (const trade of trades) {
    const signedShares = trade.side === "SELL" ? -trade.shares : trade.shares;
    lines.push(
      [
        trade.tradeDate.slice(0, 10),
        trade.symbol.replace(/[,\r\n]/g, ""),
        formatCsvNumber(trade.price),
        formatCsvNumber(signedShares),
        trade.stopLoss == null ? "" : formatCsvNumber(trade.stopLoss),
        formatCsvNumber(trade.grossAmount),
        csvNotes(trade.notes),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function optionalText(
  value: unknown,
  label: string,
  max: number,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "string") return fail(`${label}格式錯誤`);
  const trimmed = value.trim();
  if (trimmed.length > max) return fail(`${label}過長`);
  return { ok: true, value: trimmed || null };
}

function requiredNumber(
  value: unknown,
  label: string,
  { min }: { min?: number } = {},
): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof value !== "number" || !Number.isFinite(value)) return fail(`${label}格式錯誤`);
  if (min != null && value < min) return fail(`${label}不正確`);
  return { ok: true, value };
}

function optionalNumber(
  value: unknown,
  label: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, value: null };
  return requiredNumber(value, label);
}

export function planRestore(input: unknown): PlanRestoreResult {
  if (!isRecord(input)) return fail("備份格式錯誤");
  if (input.schemaVersion !== TRADE_BACKUP_SCHEMA_VERSION) return fail("不支援的備份版本");
  if (input.scope !== TRADE_BACKUP_SCOPE) return fail("備份範圍不正確");
  if (!Array.isArray(input.trades)) return fail("缺少交易資料");
  if (input.trades.length > MAX_RESTORE_ROWS) return fail("交易筆數超過上限");

  let commissionDiscount: number | null = null;
  if (input.settings != null) {
    if (!isRecord(input.settings)) return fail("設定格式錯誤");
    if ("commissionDiscount" in input.settings && input.settings.commissionDiscount != null) {
      const discount = normalizeDiscount(
        typeof input.settings.commissionDiscount === "number"
          ? input.settings.commissionDiscount
          : Number.NaN,
      );
      if (discount == null) return fail("手續費折扣無效");
      commissionDiscount = discount;
    }
  }

  let ignoredWalletTransactions = 0;
  if (input.walletTransactions != null) {
    if (!Array.isArray(input.walletTransactions)) return fail("錢包紀錄格式錯誤");
    ignoredWalletTransactions = input.walletTransactions.length;
  }

  if (input.stopLossAdjustments != null && !Array.isArray(input.stopLossAdjustments)) {
    return fail("停損調整格式錯誤");
  }
  const rawAdjustments = Array.isArray(input.stopLossAdjustments) ? input.stopLossAdjustments : [];
  if (rawAdjustments.length > MAX_RESTORE_ROWS) return fail("停損調整筆數超過上限");

  const indexedTrades: Array<RestoreTrade & { id: string; index: number }> = [];
  for (let index = 0; index < input.trades.length; index += 1) {
    const row = input.trades[index];
    const label = `第 ${index + 1} 筆交易`;
    if (!isRecord(row)) return fail(`${label}格式錯誤`);
    if (typeof row.symbol !== "string" || !row.symbol.trim()) return fail(`${label}代碼空白`);
    const symbol = row.symbol.trim().toUpperCase();
    if (symbol.length > 32 || /[,\r\n]/.test(symbol)) return fail(`${label}代碼不正確`);
    if (typeof row.market !== "string" || !isStockMarket(row.market)) {
      return fail(`${label}市場不正確`);
    }
    const currency = currencyForMarket(row.market);
    if (row.currency != null && row.currency !== currency) return fail(`${label}幣別不正確`);
    if (row.side !== "BUY" && row.side !== "SELL") return fail(`${label}方向不正確`);
    const tradeDate = typeof row.tradeDate === "string" ? toDate(row.tradeDate) : null;
    const createdAt = typeof row.createdAt === "string" ? toDate(row.createdAt) : null;
    if (!tradeDate || !createdAt) return fail(`${label}日期不正確`);
    let settlementDate: Date | null = null;
    if (row.settlementDate != null) {
      if (typeof row.settlementDate !== "string") return fail(`${label}交割日不正確`);
      settlementDate = toDate(row.settlementDate);
      if (!settlementDate) return fail(`${label}交割日不正確`);
    }
    if (row.lotType !== "ROUND" && row.lotType !== "ODD") return fail(`${label}股別不正確`);
    const isUS = currency === "USD";
    const lotType: "ROUND" | "ODD" = isUS ? "ROUND" : row.lotType;
    let lots: number | null = null;
    if (!isUS && lotType === "ROUND" && row.lots != null) {
      if (typeof row.lots !== "number" || !Number.isInteger(row.lots) || row.lots <= 0) {
        return fail(`${label}張數不正確`);
      }
      lots = row.lots;
    }
    const shares = requiredNumber(row.shares, `${label}股數`, { min: 0 });
    if (!shares.ok || shares.value <= 0) return fail(`${label}股數不正確`);
    const price = requiredNumber(row.price, `${label}價格`, { min: 0 });
    if (!price.ok || price.value <= 0) return fail(`${label}價格不正確`);
    const commission = requiredNumber(row.commission, `${label}手續費`, { min: 0 });
    if (!commission.ok) return commission;
    const transactionTax = requiredNumber(row.transactionTax, `${label}證交稅`, { min: 0 });
    if (!transactionTax.ok) return transactionTax;
    const totalFees = requiredNumber(row.totalFees, `${label}費用`, { min: 0 });
    if (!totalFees.ok) return totalFees;
    const grossAmount = requiredNumber(row.grossAmount, `${label}成交金額`, { min: 0 });
    if (!grossAmount.ok) return grossAmount;
    const netAmount = requiredNumber(row.netAmount, `${label}淨額`);
    if (!netAmount.ok) return netAmount;
    const realizedPnL = optionalNumber(row.realizedPnL, `${label}已實現損益`);
    if (!realizedPnL.ok) return realizedPnL;
    const stopLoss = optionalNumber(row.stopLoss, `${label}停損`);
    if (!stopLoss.ok) return stopLoss;
    if (row.isETF != null && typeof row.isETF !== "boolean") return fail(`${label}ETF 標記不正確`);
    const symbolName = optionalText(row.symbolName, `${label}名稱`, 200);
    if (!symbolName.ok) return symbolName;
    const notes = optionalText(row.notes, `${label}備註`, 100_000);
    if (!notes.ok) return notes;
    const tags = optionalText(row.tags, `${label}標籤`, 2_000);
    if (!tags.ok) return tags;

    indexedTrades.push({
      id: typeof row.id === "string" ? row.id : "",
      index,
      symbol,
      symbolName: symbolName.value,
      market: row.market,
      currency,
      side: row.side,
      tradeDate,
      settlementDate,
      lotType,
      lots,
      shares: shares.value,
      price: price.value,
      commission: commission.value,
      transactionTax: transactionTax.value,
      totalFees: totalFees.value,
      grossAmount: grossAmount.value,
      netAmount: netAmount.value,
      realizedPnL: realizedPnL.value,
      isETF: row.isETF === true,
      stopLoss: stopLoss.value,
      notes: notes.value,
      tags: tags.value,
      createdAt,
    });
  }

  indexedTrades.sort(
    (a, b) =>
      a.tradeDate.getTime() - b.tradeDate.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      compareText(a.id, b.id) ||
      a.index - b.index,
  );

  const stopLossAdjustments: Array<RestoreStopLoss & { id: string; index: number }> = [];
  for (let index = 0; index < rawAdjustments.length; index += 1) {
    const row = rawAdjustments[index];
    const label = `第 ${index + 1} 筆停損調整`;
    if (!isRecord(row)) return fail(`${label}格式錯誤`);
    if (typeof row.symbol !== "string" || !row.symbol.trim()) return fail(`${label}代碼空白`);
    const symbol = row.symbol.trim().toUpperCase();
    if (symbol.length > 32) return fail(`${label}代碼不正確`);
    if (typeof row.market !== "string" || !isStockMarket(row.market)) return fail(`${label}市場不正確`);
    const createdAt = typeof row.createdAt === "string" ? toDate(row.createdAt) : null;
    if (!createdAt) return fail(`${label}日期不正確`);
    const previousStopLoss = optionalNumber(row.previousStopLoss, `${label}原停損`);
    if (!previousStopLoss.ok) return previousStopLoss;
    const newStopLoss = optionalNumber(row.newStopLoss, `${label}新停損`);
    if (!newStopLoss.ok) return newStopLoss;
    const note = optionalText(row.note, `${label}筆記`, 100_000);
    if (!note.ok) return note;
    stopLossAdjustments.push({
      id: typeof row.id === "string" ? row.id : "",
      index,
      symbol,
      market: row.market,
      previousStopLoss: previousStopLoss.value,
      newStopLoss: newStopLoss.value,
      note: note.value,
      createdAt,
    });
  }
  stopLossAdjustments.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || compareText(a.id, b.id) || a.index - b.index,
  );

  return {
    ok: true,
    plan: {
      trades: indexedTrades.map(dropSortKeys),
      stopLossAdjustments: stopLossAdjustments.map(dropSortKeys),
      commissionDiscount,
      ignoredWalletTransactions,
    },
  };
}

function dropSortKeys<T extends { id: string; index: number }>(row: T): Omit<T, "id" | "index"> {
  const copy: Omit<T, "id" | "index"> & { id?: string; index?: number } = { ...row };
  delete copy.id;
  delete copy.index;
  return copy;
}
