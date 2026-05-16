import { NextResponse } from "next/server";
import { ACTIVE_ETFS, getIssuer, resolvePcfUrl } from "@/lib/etf-holdings";
import type { EtfFundResponse } from "@/types/etf-holdings";

export const dynamic = "force-dynamic";

/** GET /api/etf/funds — 列出所有已知的主動式 ETF（含 issuer 名稱與是否可抓） */
export function GET() {
  const today = new Date();
  const funds: EtfFundResponse[] = ACTIVE_ETFS.map((f) => {
    const issuer = getIssuer(f.issuerId);
    const resolved = resolvePcfUrl(f, today);
    return {
      ...f,
      issuerName: issuer?.name ?? f.issuerId,
      hasUrl: resolved !== null,
    };
  });
  return NextResponse.json(funds);
}
