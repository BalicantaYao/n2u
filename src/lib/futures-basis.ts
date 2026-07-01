/**
 * 台指期貨 / 股票期貨 正逆價差計算
 *
 * 正價差（Contango）：期貨價 > 現貨價，basis > 0
 * 逆價差（Backwardation）：期貨價 < 現貨價，basis < 0
 */

import type { FuturesBasisResponse, FuturesBasisRow } from "@/types/futures";
import {
  fetchFutoptProducts,
  fetchFutoptQuotesBatch,
  type FutoptProduct,
} from "./fugle-futopt-api";
import { fetchQuote as fetchStockQuote, fetchSnapshotQuotes } from "./fugle-api";

const RESULT_TTL_MS = 90 * 1000;
let resultCache: { data: FuturesBasisResponse; expiresAt: number } | null = null;

function nearestContract(contracts: FutoptProduct[]): FutoptProduct | null {
  if (contracts.length === 0) return null;
  const now = Date.now();
  const upcoming = contracts.filter((c) => c.expiryDate.getTime() >= now);
  const pool = upcoming.length > 0 ? upcoming : contracts;
  return pool.reduce((min, c) => (c.expiryDate < min.expiryDate ? c : min));
}

function contractMonthOf(expiryDate: Date): string {
  return `${expiryDate.getFullYear()}${String(expiryDate.getMonth() + 1).padStart(2, "0")}`;
}

function cleanContractName(name: string | undefined): string | undefined {
  return name?.replace(/期貨.*$/, "").trim() || name;
}

export async function computeFuturesBasis(): Promise<FuturesBasisResponse> {
  if (resultCache && resultCache.expiresAt > Date.now()) return resultCache.data;

  const errors: string[] = [];
  const products = await fetchFutoptProducts();

  if (products.length === 0) {
    const empty: FuturesBasisResponse = {
      index: null,
      stockFutures: [],
      errors: ["無法取得期貨商品清單，請確認 Fugle API 金鑰是否已開通期貨資料權限。"],
    };
    resultCache = { data: empty, expiresAt: Date.now() + RESULT_TTL_MS };
    return empty;
  }

  const indexCandidates = products.filter((p) => p.symbol.startsWith("TXF"));
  const stockCandidates = products.filter((p) => /^\d{4,6}$/.test(p.underlyingSymbol));

  const indexContract = nearestContract(indexCandidates);

  const byUnderlying = new Map<string, FutoptProduct[]>();
  for (const p of stockCandidates) {
    const list = byUnderlying.get(p.underlyingSymbol) ?? [];
    list.push(p);
    byUnderlying.set(p.underlyingSymbol, list);
  }
  const stockContracts = Array.from(byUnderlying.values())
    .map((list) => nearestContract(list))
    .filter((c): c is FutoptProduct => c != null);

  const futuresSymbols = [
    ...(indexContract ? [indexContract.symbol] : []),
    ...stockContracts.map((c) => c.symbol),
  ];

  const [{ quotes: futuresQuotes, failed }, tseSnapshot, otcSnapshot, indexSpot] = await Promise.all([
    fetchFutoptQuotesBatch(futuresSymbols),
    fetchSnapshotQuotes("TSE"),
    fetchSnapshotQuotes("OTC"),
    fetchStockQuote("IX0001", "TWSE"),
  ]);

  if (failed.length > 0) {
    errors.push(`${failed.length} 檔期貨合約報價取得失敗。`);
  }

  const spotBySymbol = new Map<string, number>();
  for (const row of [...tseSnapshot, ...otcSnapshot]) {
    const price = row.lastPrice ?? row.referencePrice ?? row.previousClose;
    if (row.symbol && price != null) spotBySymbol.set(row.symbol, price);
  }

  let index: FuturesBasisRow | null = null;
  if (indexContract) {
    const fq = futuresQuotes[indexContract.symbol];
    if (fq && indexSpot?.price != null) {
      const basis = fq.price - indexSpot.price;
      index = {
        symbol: indexContract.symbol,
        contractMonth: contractMonthOf(indexContract.expiryDate),
        underlyingSymbol: "IX0001",
        underlyingName: "台灣加權指數",
        kind: "INDEX",
        futuresPrice: fq.price,
        spotPrice: indexSpot.price,
        basis,
        basisPct: indexSpot.price !== 0 ? basis / indexSpot.price : 0,
        updatedAt: fq.updatedAt.toISOString(),
      };
    } else {
      errors.push("台指期貨或加權指數報價取得失敗。");
    }
  }

  const stockFutures: FuturesBasisRow[] = [];
  for (const c of stockContracts) {
    const fq = futuresQuotes[c.symbol];
    const spot = spotBySymbol.get(c.underlyingSymbol);
    if (!fq || spot == null) continue;
    const basis = fq.price - spot;
    stockFutures.push({
      symbol: c.symbol,
      contractMonth: contractMonthOf(c.expiryDate),
      underlyingSymbol: c.underlyingSymbol,
      underlyingName: cleanContractName(c.name),
      kind: "STOCK",
      futuresPrice: fq.price,
      spotPrice: spot,
      basis,
      basisPct: spot !== 0 ? basis / spot : 0,
      updatedAt: fq.updatedAt.toISOString(),
    });
  }

  stockFutures.sort((a, b) => b.basisPct - a.basisPct);

  const result: FuturesBasisResponse = { index, stockFutures, errors };
  resultCache = { data: result, expiresAt: Date.now() + RESULT_TTL_MS };
  return result;
}
