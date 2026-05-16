/** 主動式 ETF 持股明細相關型別。對應 prisma schema 中的 EtfHoldingSnapshot / EtfHolding。 */

export type PcfFormat = "csv" | "excel" | "html" | "json";
export type PcfEncoding = "utf-8" | "big5";

/** 欄位中文/英文名稱對應到我們的標準化欄位 */
export interface PcfColumnMap {
  symbol: readonly string[];
  name: readonly string[];
  shares: readonly string[];
  weight?: readonly string[];
  marketValue?: readonly string[];
  price?: readonly string[];
  market?: readonly string[];
}

/** issuer 設定（同一家投信通常共用 URL 模板與欄位對應） */
export interface EtfIssuer {
  /** 內部代碼，e.g. "yuanta" */
  id: string;
  /** 顯示名稱 */
  name: string;
  /** 官網首頁，作為使用者的參考連結 */
  website?: string;
  /** PCF 下載 URL 模板。支援的 placeholder：{symbol} {date:YYYYMMDD} {date:YYYY-MM-DD} */
  pcfUrlTemplate: string | null;
  pcfFormat: PcfFormat;
  pcfEncoding: PcfEncoding;
  columnMap: PcfColumnMap;
  /** 額外給 fetch 用的 headers，部分投信會擋無 UA 的 request */
  headers?: Record<string, string>;
  /** 註解（給維運看的） */
  notes?: string;
}

/** 已知主動式 ETF 的登記表，由 src/lib/etf-holdings/issuers.ts 維護 */
export interface EtfFundConfig {
  symbol: string;
  name: string;
  issuerId: string;
  market?: "TWSE" | "TPEX";
  inceptionDate?: string;
  /** override：若該檔 ETF 不使用 issuer 預設模板，可指定獨立 URL */
  pcfUrlOverride?: string;
  notes?: string;
}

/** 標準化後的單列持股 */
export interface NormalizedHolding {
  symbol: string;
  name: string;
  market?: string;
  shares: number;
  weight?: number;
  marketValue?: number;
  price?: number;
}

/** 一份完整的 PCF 快照（尚未進 DB 的中介結構） */
export interface NormalizedSnapshot {
  fundSymbol: string;
  asOfDate: string; // YYYY-MM-DD
  nav?: number;
  totalAssets?: number;
  source: string;
  holdings: NormalizedHolding[];
}

/** API 回傳給前端的型別 */
export interface EtfFundResponse extends EtfFundConfig {
  issuerName: string;
  hasUrl: boolean;
}

export interface EtfSnapshotResponse {
  fundSymbol: string;
  asOfDate: string;
  fetchedAt: string;
  nav: number | null;
  totalAssets: number | null;
  source: string | null;
  holdings: NormalizedHolding[];
}

export interface EtfRefreshError {
  code:
    | "unknown_fund"
    | "url_not_configured"
    | "fetch_failed"
    | "parse_failed"
    | "unsupported_format"
    | "empty_response";
  message: string;
  hint?: string;
}
