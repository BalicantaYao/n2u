/**
 * 主動式 ETF（00980A 系列起）發行投信清單與 PCF 下載設定。
 *
 * 為什麼採用程式碼設定而非 DB seed：
 *   1. 投信改 URL 的頻率比新增基金高，PR-able 設定檔比資料表 migrate 容易。
 *   2. 多數投信 PCF 規格穩定（CSV / Excel 固定欄位），用欄位映射就能解析。
 *
 * 維運 TODO（標 ⚠️ 者請在實際環境驗證後填入）：
 *   - 每家投信的 `pcfUrlTemplate` 多為固定路徑 + 商品代碼；本檔僅放佔位字串
 *     `__VERIFY__`，避免我猜的 URL 被誤用。實際 URL 請從投信官網「基金資訊
 *     → ETF → 該檔 ETF → 投資組合/持股明細/PCF」抓取 fixed download link。
 *   - 若某投信改用 JavaScript 動態載入（無固定 URL），請保留 `pcfUrlTemplate:
 *     null`，前端會顯示「需手動補資料」提示。
 *
 * 支援的 URL placeholder：
 *   {symbol}              → ETF 代碼，例 "00980A"
 *   {symbolNoSuffix}      → 去掉字母後綴（"00980A" → "00980"）
 *   {date:YYYYMMDD}       → 指定日期或當日
 *   {date:YYYY-MM-DD}
 */

import type { EtfFundConfig, EtfIssuer } from "@/types/etf-holdings";

/** 共用的欄位中文別名 — 大多投信 CSV 都採類似的命名 */
const DEFAULT_COLUMN_MAP = {
  symbol: ["股票代碼", "證券代號", "成份證券代碼", "Symbol", "代碼", "標的代碼"],
  name: ["股票名稱", "證券名稱", "成份證券名稱", "Name", "名稱", "標的名稱"],
  shares: ["持有股數", "股數", "Shares", "Quantity", "庫存股數"],
  weight: ["比重", "權重", "佔淨值比", "占淨值比", "比重(%)", "Weight"],
  marketValue: ["市值", "市值(TWD)", "Market Value", "Value"],
  price: ["參考價", "收盤價", "Price", "單價"],
  market: ["市場別", "Market", "交易所"],
} as const;

export const ISSUERS: Record<string, EtfIssuer> = {
  yuanta: {
    id: "yuanta",
    name: "元大投信",
    website: "https://www.yuantaetfs.com/",
    pcfUrlTemplate: "__VERIFY__", // ⚠️ 請從元大 ETF 商品頁的 PCF 下載連結填入
    pcfFormat: "csv",
    pcfEncoding: "big5",
    columnMap: { ...DEFAULT_COLUMN_MAP },
  },
  cathay: {
    id: "cathay",
    name: "國泰投信",
    website: "https://www.cathaysite.com.tw/",
    pcfUrlTemplate: "__VERIFY__",
    pcfFormat: "csv",
    pcfEncoding: "big5",
    columnMap: { ...DEFAULT_COLUMN_MAP },
  },
  capital: {
    id: "capital",
    name: "群益投信",
    website: "https://www.capitalfund.com.tw/",
    pcfUrlTemplate: "__VERIFY__",
    pcfFormat: "csv",
    pcfEncoding: "big5",
    columnMap: { ...DEFAULT_COLUMN_MAP },
  },
  "uni-president": {
    id: "uni-president",
    name: "統一投信",
    website: "https://www.pcsfunds.com/",
    pcfUrlTemplate: "__VERIFY__",
    pcfFormat: "csv",
    pcfEncoding: "big5",
    columnMap: { ...DEFAULT_COLUMN_MAP },
  },
  "fuh-hwa": {
    id: "fuh-hwa",
    name: "復華投信",
    website: "https://www.fhtrust.com.tw/",
    pcfUrlTemplate: "__VERIFY__",
    pcfFormat: "csv",
    pcfEncoding: "big5",
    columnMap: { ...DEFAULT_COLUMN_MAP },
  },
  ctbc: {
    id: "ctbc",
    name: "中信投信",
    website: "https://www.ctbcinvestments.com/",
    pcfUrlTemplate: "__VERIFY__",
    pcfFormat: "csv",
    pcfEncoding: "big5",
    columnMap: { ...DEFAULT_COLUMN_MAP },
  },
  "first-capital": {
    id: "first-capital",
    name: "第一金投信",
    website: "https://www.firstsec.com.tw/",
    pcfUrlTemplate: "__VERIFY__",
    pcfFormat: "csv",
    pcfEncoding: "big5",
    columnMap: { ...DEFAULT_COLUMN_MAP },
  },
  nomura: {
    id: "nomura",
    name: "野村投信",
    website: "https://www.nomurafunds.com.tw/",
    pcfUrlTemplate: "__VERIFY__",
    pcfFormat: "csv",
    pcfEncoding: "big5",
    columnMap: { ...DEFAULT_COLUMN_MAP },
  },
};

/**
 * 已知主動式 ETF 清單。
 *
 * 注意：以下「issuerId 對應」係依公開掛牌資料的常見記載，但因主動式 ETF 仍持續
 * 新發行，使用前請以證交所/投信官網為準。標 ⚠️ 表示資訊待確認，請維運實際填入。
 */
export const ACTIVE_ETFS: EtfFundConfig[] = [
  {
    symbol: "00980A",
    name: "統一台股增長主動式 ETF", // ⚠️ 名稱請以投信官網為準
    issuerId: "uni-president",
    market: "TWSE",
  },
  {
    symbol: "00981A",
    name: "群益台灣強棒主動式 ETF", // ⚠️
    issuerId: "capital",
    market: "TWSE",
  },
  {
    symbol: "00982A",
    name: "野村臺灣優選主動式 ETF", // ⚠️
    issuerId: "nomura",
    market: "TWSE",
  },
  {
    symbol: "00983A",
    name: "第一金太空衛星主動式 ETF", // ⚠️
    issuerId: "first-capital",
    market: "TWSE",
  },
  {
    symbol: "00984A",
    name: "元大台灣優選主動式 ETF", // ⚠️
    issuerId: "yuanta",
    market: "TWSE",
  },
  {
    symbol: "00985A",
    name: "中信台灣優選成長主動式 ETF", // ⚠️
    issuerId: "ctbc",
    market: "TWSE",
  },
];

const SYMBOL_INDEX = new Map(ACTIVE_ETFS.map((f) => [f.symbol.toUpperCase(), f]));

export function getFundConfig(symbol: string): EtfFundConfig | null {
  return SYMBOL_INDEX.get(symbol.toUpperCase()) ?? null;
}

export function getIssuer(issuerId: string): EtfIssuer | null {
  return ISSUERS[issuerId] ?? null;
}

/** 依 fund + issuer 設定組出最終的下載 URL；若任一未配置則回 null。 */
export function resolvePcfUrl(
  fund: EtfFundConfig,
  date: Date,
): { url: string; issuer: EtfIssuer } | null {
  const issuer = getIssuer(fund.issuerId);
  if (!issuer) return null;
  const template = fund.pcfUrlOverride ?? issuer.pcfUrlTemplate;
  if (!template || template === "__VERIFY__") return null;

  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const url = template
    .replace(/\{symbol\}/g, fund.symbol)
    .replace(/\{symbolNoSuffix\}/g, fund.symbol.replace(/[A-Za-z]+$/, ""))
    .replace(/\{date:YYYYMMDD\}/g, `${yyyy}${mm}${dd}`)
    .replace(/\{date:YYYY-MM-DD\}/g, `${yyyy}-${mm}-${dd}`);

  return { url, issuer };
}
