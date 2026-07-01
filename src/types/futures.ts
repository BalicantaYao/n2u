export type FuturesBasisKind = "INDEX" | "STOCK";

export interface FuturesBasisRow {
  /** 期貨合約代碼，例如 TXFR5、CDFR5 */
  symbol: string;
  /** 合約月份，例如 202506 */
  contractMonth: string;
  /** 現貨標的代碼：加權指數為 IX0001，股票期貨為股票代號 */
  underlyingSymbol: string;
  underlyingName?: string;
  kind: FuturesBasisKind;
  futuresPrice: number;
  spotPrice: number;
  /** futuresPrice - spotPrice */
  basis: number;
  /** basis / spotPrice */
  basisPct: number;
  updatedAt: string;
}

export interface FuturesBasisResponse {
  index: FuturesBasisRow | null;
  stockFutures: FuturesBasisRow[];
  /** 部分商品抓取失敗時的錯誤訊息，不會讓整個回應失敗 */
  errors: string[];
}
