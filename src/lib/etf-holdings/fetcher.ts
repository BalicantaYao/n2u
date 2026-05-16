/**
 * 從 issuer 的 PCF URL 下載並解析成 NormalizedSnapshot。
 *
 * 設計重點：
 *   - 不假設 issuer 有可用 URL：若 URL 未配置回傳 EtfRefreshError，前端會顯示提示。
 *   - 支援 Big5 / UTF-8 自動判斷（依 issuer.pcfEncoding，UTF-8 解碼失敗時退回 Big5）。
 *   - 只支援 CSV 與 JSON 兩種格式；Excel 需另引入 xlsx 套件（之後再加）。
 */

import type {
  EtfFundConfig,
  EtfRefreshError,
  NormalizedHolding,
  NormalizedSnapshot,
} from "@/types/etf-holdings";
import { resolvePcfUrl } from "./issuers";
import { parseDelimited, pickField, rowsToObjects } from "./csv";

function todayInTaipei(): Date {
  // 簡單把 UTC 加 8 小時當「台北的今天」用，足夠 PCF 抓檔日期
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000);
}

function toAsOfDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseNumber(value: string | undefined): number | undefined {
  if (value == null) return undefined;
  const cleaned = value.replace(/[,％%\s]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "--") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

async function decodeResponse(res: Response, encoding: "utf-8" | "big5"): Promise<string> {
  const buf = await res.arrayBuffer();
  if (encoding === "big5") {
    return new TextDecoder("big5").decode(buf);
  }
  // 嘗試 UTF-8，若內含 replacement char (�) 過多則改用 Big5
  const utf8 = new TextDecoder("utf-8").decode(buf);
  const repCount = (utf8.match(/�/g) ?? []).length;
  if (repCount > 5) {
    return new TextDecoder("big5").decode(buf);
  }
  return utf8;
}

/**
 * 抓取並解析單一 fund 的 PCF。
 * 成功回傳 NormalizedSnapshot；失敗回傳 EtfRefreshError，不丟例外（呼叫端可直接序列化）。
 */
export async function fetchAndParsePcf(
  fund: EtfFundConfig,
  asOfDate?: Date,
): Promise<NormalizedSnapshot | EtfRefreshError> {
  const date = asOfDate ?? todayInTaipei();
  const resolved = resolvePcfUrl(fund, date);
  if (!resolved) {
    return {
      code: "url_not_configured",
      message: `Fund ${fund.symbol} (issuer ${fund.issuerId}) has no PCF URL configured.`,
      hint: "請編輯 src/lib/etf-holdings/issuers.ts 中對應 issuer 的 pcfUrlTemplate。",
    };
  }
  const { url, issuer } = resolved;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; n2u-etf-holdings/1.0; +https://github.com/balicantayao/n2u)",
        Accept: "text/csv,application/json,application/octet-stream,*/*;q=0.5",
        ...(issuer.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    return {
      code: "fetch_failed",
      message: `Network error fetching ${url}: ${(err as Error).message}`,
    };
  }

  if (!res.ok) {
    return {
      code: "fetch_failed",
      message: `HTTP ${res.status} fetching ${url}`,
      hint:
        res.status === 404
          ? "URL 可能不再可用，請到投信官網重新確認 PCF 下載連結。"
          : undefined,
    };
  }

  if (issuer.pcfFormat === "excel" || issuer.pcfFormat === "html") {
    return {
      code: "unsupported_format",
      message: `Format "${issuer.pcfFormat}" is not yet supported. Consider exposing a CSV/JSON endpoint.`,
    };
  }

  let body: string;
  try {
    body = await decodeResponse(res, issuer.pcfEncoding);
  } catch (err) {
    return {
      code: "parse_failed",
      message: `Failed to decode response: ${(err as Error).message}`,
    };
  }

  if (!body.trim()) {
    return { code: "empty_response", message: `Empty body from ${url}` };
  }

  try {
    const holdings =
      issuer.pcfFormat === "json"
        ? parseJsonPcf(body, issuer.columnMap)
        : parseCsvPcf(body, issuer.columnMap);

    if (holdings.length === 0) {
      return {
        code: "parse_failed",
        message: "Parsed 0 holdings — column mapping may be wrong.",
        hint: "請檢查 issuer 設定的 columnMap，欄位名稱需與 CSV header 完全一致。",
      };
    }

    return {
      fundSymbol: fund.symbol,
      asOfDate: toAsOfDate(date),
      source: url,
      holdings,
    };
  } catch (err) {
    return {
      code: "parse_failed",
      message: `Parse failed: ${(err as Error).message}`,
    };
  }
}

function parseCsvPcf(
  body: string,
  columnMap: import("@/types/etf-holdings").PcfColumnMap,
): NormalizedHolding[] {
  const rows = rowsToObjects(parseDelimited(body));
  const holdings: NormalizedHolding[] = [];
  for (const row of rows) {
    const symbol = pickField(row, columnMap.symbol)?.trim();
    const name = pickField(row, columnMap.name)?.trim();
    const sharesRaw = pickField(row, columnMap.shares);
    if (!symbol || !name || !sharesRaw) continue;

    const shares = parseNumber(sharesRaw);
    if (shares === undefined || shares <= 0) continue;

    let weight = columnMap.weight ? parseNumber(pickField(row, columnMap.weight)) : undefined;
    // 若資料用百分比（>1.5 視為百分比），轉成小數
    if (weight !== undefined && weight > 1.5) weight = weight / 100;

    holdings.push({
      symbol,
      name,
      market: columnMap.market ? pickField(row, columnMap.market) : undefined,
      shares,
      weight,
      marketValue: columnMap.marketValue
        ? parseNumber(pickField(row, columnMap.marketValue))
        : undefined,
      price: columnMap.price ? parseNumber(pickField(row, columnMap.price)) : undefined,
    });
  }
  return holdings;
}

function parseJsonPcf(
  body: string,
  columnMap: import("@/types/etf-holdings").PcfColumnMap,
): NormalizedHolding[] {
  const data = JSON.parse(body);
  const rows: Array<Record<string, unknown>> = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown }).data)
      ? ((data as { data: Array<Record<string, unknown>> }).data)
      : [];

  const holdings: NormalizedHolding[] = [];
  for (const r of rows) {
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      stringified[k] = v == null ? "" : String(v);
    }
    const symbol = pickField(stringified, columnMap.symbol)?.trim();
    const name = pickField(stringified, columnMap.name)?.trim();
    const shares = parseNumber(pickField(stringified, columnMap.shares));
    if (!symbol || !name || shares === undefined || shares <= 0) continue;
    let weight = columnMap.weight
      ? parseNumber(pickField(stringified, columnMap.weight))
      : undefined;
    if (weight !== undefined && weight > 1.5) weight = weight / 100;

    holdings.push({
      symbol,
      name,
      market: columnMap.market ? pickField(stringified, columnMap.market) : undefined,
      shares,
      weight,
      marketValue: columnMap.marketValue
        ? parseNumber(pickField(stringified, columnMap.marketValue))
        : undefined,
      price: columnMap.price ? parseNumber(pickField(stringified, columnMap.price)) : undefined,
    });
  }
  return holdings;
}
