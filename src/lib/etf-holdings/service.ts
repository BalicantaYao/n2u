/**
 * ETF 持股快照的高階 API：抓取、解析、寫入 DB、查詢。
 *
 * 行為：
 *   - getLatestSnapshot：先查 DB 該檔最新一筆快照
 *   - ensureTodaySnapshot：若 DB 沒有今天的快照，呼叫 fetcher 抓並寫入；
 *     失敗時回 EtfRefreshError，DB 不寫入
 *   - getSnapshotHistory：列出某檔過往 N 筆快照（不含持股明細，給歷史頁面用）
 */

import { prisma } from "@/lib/prisma";
import type {
  EtfFundConfig,
  EtfRefreshError,
  EtfSnapshotResponse,
  NormalizedHolding,
  NormalizedSnapshot,
} from "@/types/etf-holdings";
import { getFundConfig } from "./issuers";
import { fetchAndParsePcf } from "./fetcher";

function isError(x: NormalizedSnapshot | EtfRefreshError): x is EtfRefreshError {
  return "code" in x;
}

function toSnapshotResponse(snapshot: {
  fundSymbol: string;
  asOfDate: Date;
  fetchedAt: Date;
  nav: number | null;
  totalAssets: number | null;
  source: string | null;
  holdings: Array<{
    symbol: string;
    name: string;
    market: string | null;
    shares: number;
    weight: number | null;
    marketValue: number | null;
    price: number | null;
  }>;
}): EtfSnapshotResponse {
  return {
    fundSymbol: snapshot.fundSymbol,
    asOfDate: snapshot.asOfDate.toISOString().slice(0, 10),
    fetchedAt: snapshot.fetchedAt.toISOString(),
    nav: snapshot.nav,
    totalAssets: snapshot.totalAssets,
    source: snapshot.source,
    holdings: snapshot.holdings
      .slice()
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || b.shares - a.shares)
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        market: h.market ?? undefined,
        shares: h.shares,
        weight: h.weight ?? undefined,
        marketValue: h.marketValue ?? undefined,
        price: h.price ?? undefined,
      })),
  };
}

export async function getLatestSnapshot(
  fundSymbol: string,
): Promise<EtfSnapshotResponse | null> {
  const snap = await prisma.etfHoldingSnapshot.findFirst({
    where: { fundSymbol },
    orderBy: { asOfDate: "desc" },
    include: { holdings: true },
  });
  if (!snap) return null;
  return toSnapshotResponse(snap);
}

export async function getSnapshotByDate(
  fundSymbol: string,
  asOfDate: Date,
): Promise<EtfSnapshotResponse | null> {
  const snap = await prisma.etfHoldingSnapshot.findUnique({
    where: { fundSymbol_asOfDate: { fundSymbol, asOfDate } },
    include: { holdings: true },
  });
  if (!snap) return null;
  return toSnapshotResponse(snap);
}

export async function getSnapshotHistory(
  fundSymbol: string,
  limit = 30,
): Promise<Array<{ asOfDate: string; fetchedAt: string; holdingsCount: number }>> {
  const snaps = await prisma.etfHoldingSnapshot.findMany({
    where: { fundSymbol },
    orderBy: { asOfDate: "desc" },
    take: limit,
    include: { _count: { select: { holdings: true } } },
  });
  return snaps.map((s) => ({
    asOfDate: s.asOfDate.toISOString().slice(0, 10),
    fetchedAt: s.fetchedAt.toISOString(),
    holdingsCount: s._count.holdings,
  }));
}

async function persistSnapshot(
  snapshot: NormalizedSnapshot,
): Promise<EtfSnapshotResponse> {
  const asOfDate = new Date(`${snapshot.asOfDate}T00:00:00.000Z`);

  // 先刪掉同日舊資料避免重複（unique constraint 會擋插入），再 create
  await prisma.etfHoldingSnapshot.deleteMany({
    where: { fundSymbol: snapshot.fundSymbol, asOfDate },
  });

  const created = await prisma.etfHoldingSnapshot.create({
    data: {
      fundSymbol: snapshot.fundSymbol,
      asOfDate,
      nav: snapshot.nav ?? null,
      totalAssets: snapshot.totalAssets ?? null,
      source: snapshot.source,
      holdings: {
        create: snapshot.holdings.map((h: NormalizedHolding) => ({
          symbol: h.symbol,
          name: h.name,
          market: h.market ?? null,
          shares: h.shares,
          weight: h.weight ?? null,
          marketValue: h.marketValue ?? null,
          price: h.price ?? null,
        })),
      },
    },
    include: { holdings: true },
  });

  return toSnapshotResponse(created);
}

/**
 * 強制重新抓取並寫入 DB。
 * 若資料源失敗：回傳錯誤，DB 不變動。
 */
export async function refreshSnapshot(
  fundSymbol: string,
): Promise<EtfSnapshotResponse | EtfRefreshError> {
  const fund: EtfFundConfig | null = getFundConfig(fundSymbol);
  if (!fund) {
    return {
      code: "unknown_fund",
      message: `Fund ${fundSymbol} is not registered.`,
      hint: "請於 src/lib/etf-holdings/issuers.ts 的 ACTIVE_ETFS 加入該檔 ETF。",
    };
  }
  const result = await fetchAndParsePcf(fund);
  if (isError(result)) return result;
  return persistSnapshot(result);
}

/**
 * 若 DB 還沒有今天的快照就抓並寫入；否則直接回 DB 中的最新一筆。
 */
export async function ensureTodaySnapshot(
  fundSymbol: string,
): Promise<EtfSnapshotResponse | EtfRefreshError> {
  const fund = getFundConfig(fundSymbol);
  if (!fund) {
    return {
      code: "unknown_fund",
      message: `Fund ${fundSymbol} is not registered.`,
    };
  }

  // 用台北日期當「今天」
  const taipei = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const today = new Date(
    Date.UTC(taipei.getUTCFullYear(), taipei.getUTCMonth(), taipei.getUTCDate()),
  );

  const existing = await getSnapshotByDate(fundSymbol, today);
  if (existing) return existing;

  const result = await fetchAndParsePcf(fund, today);
  if (isError(result)) {
    // 抓失敗仍可退回 DB 中最新一筆（讓 UI 不會全空）
    const latest = await getLatestSnapshot(fundSymbol);
    if (latest) return latest;
    return result;
  }
  return persistSnapshot(result);
}
