"use client";

import { useEffect, useRef, useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useT } from "@/lib/i18n";
import { formatPct, tradingViewUrl } from "@/lib/utils";
import type { MarketMapMarketPayload } from "@/types/market";
import type { Market } from "@/types/taiwan";

/**
 * 台股慣例熱度色（紅漲綠跌）。changePct 為小數，0.0123 = 1.23%。
 * 傳入 `null` 表示資料來源缺漏，用中性深灰與 0% 平盤區分。
 */
function getHeatColor(pct: number | null): string {
  if (pct === null) return "#1f2937"; // gray-800，代表無資料
  if (pct <= -0.03) return "#14532d"; // green-900
  if (pct <= -0.015) return "#15803d"; // green-700
  if (pct < 0) return "#22c55e"; // green-500
  if (pct === 0) return "#4b5563"; // gray-600
  if (pct < 0.015) return "#ef4444"; // red-500
  if (pct < 0.03) return "#b91c1c"; // red-700
  return "#7f1d1d"; // red-900
}

interface TreemapDatum {
  name: string;
  value: number;
  children?: TreemapDatum[];
  symbol?: string;
  stockName?: string;
  price?: number;
  /** `null` 表示資料來源缺漏 */
  changePct?: number | null;
  marketCap?: number;
  sector?: string;
  market?: Market;
}

function toTreemapData(data: MarketMapMarketPayload): TreemapDatum[] {
  // "equal" 模式：每個 List 佔相同面積，且同一個 List 內個股方塊也等大。
  // 做法：將每股 value 設為 1/N（N = 該清單個股數），使每個 List 的子節點總和 = 1。
  const equalSized = data.sizingMode === "equal";
  return data.groups
    .filter((g) => g.stocks.length > 0)
    .map((g) => {
      const perStockValue = equalSized ? 1 / g.stocks.length : 0;
      return {
        name: g.sector,
        value: equalSized ? 1 : g.marketCap,
        children: g.stocks.map<TreemapDatum>((s) => ({
          name: s.symbol,
          value: equalSized ? perStockValue : Math.max(s.marketCap, 1),
          symbol: s.symbol,
          stockName: s.name,
          price: s.price,
          changePct: s.changePct,
          marketCap: s.marketCap,
          sector: g.sector,
          market: s.market ?? data.market,
        })),
      };
    });
}

/* ── Custom cell content ── */

interface SectorBox {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CellProps {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  name: string;
  symbol?: string;
  stockName?: string;
  changePct?: number | null;
  sector?: string;
  market?: Market;
}

function Cell(props: CellProps) {
  const { x, y, width, height, depth, name, symbol, stockName, changePct, sector, market } = props;

  if (width <= 0 || height <= 0) return null;

  // depth 1: 產業群組 — 只畫較寬的分隔溝（gutter），標題與外框交由 overlay 在最上層繪製，
  // 因為 recharts 會把個股 leaf 疊在群組之上，群組自身畫的文字會被蓋掉。
  if (depth === 1) {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke="hsl(var(--background))"
        strokeWidth={4}
      />
    );
  }

  // depth 2: 個股 leaf
  if (depth !== 2) return null;

  const pct = changePct ?? null;
  const color = getHeatColor(pct);
  // 主標字體隨方塊大小動態調整
  const shorterSide = Math.min(width, height);
  const symbolFontSize = Math.max(10, Math.min(22, Math.floor(shorterSide / 3)));
  const pctFontSize = Math.max(9, Math.floor(symbolFontSize * 0.75));
  const showText = width > 34 && height > 24;
  const showName = width > 80 && height > 52;
  const showPct = width > 48 && height > 38;

  const pctText = pct === null ? "—" : formatPct(pct, 2);
  const href = symbol && market ? tradingViewUrl(symbol, market) : undefined;

  const content = (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="hsl(var(--background))"
        strokeWidth={1}
        style={href ? { cursor: "pointer" } : undefined}
      />
      {showText && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showPct ? pctFontSize / 2 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={symbolFontSize}
          fontWeight={700}
          style={{ pointerEvents: "none" }}
        >
          {symbol ?? name}
        </text>
      )}
      {showPct && (
        <text
          x={x + width / 2}
          y={y + height / 2 + symbolFontSize / 2 + 2}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="rgba(255,255,255,0.92)"
          fontSize={pctFontSize}
          style={{ pointerEvents: "none" }}
        >
          {pctText}
        </text>
      )}
      {showName && stockName && (
        <text
          x={x + width / 2}
          y={y + height - 6}
          textAnchor="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize={Math.max(9, pctFontSize - 1)}
          style={{ pointerEvents: "none" }}
        >
          {stockName}
        </text>
      )}
      {/* invisible hover target with full metadata for Tooltip */}
      <title>{`${symbol} ${stockName ?? ""} ${pctText}${sector ? ` · ${sector}` : ""}`}</title>
    </g>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${symbol} TradingView chart`}
    >
      {content}
    </a>
  ) : (
    content
  );
}

/* ── Tooltip 內容 ── */

interface TooltipPayloadItem {
  payload?: TreemapDatum;
}

function TreemapTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  const { t } = useT();
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p || !p.symbol) return null;

  const cap億 = p.marketCap ? p.marketCap / 1e8 : 0;
  const capText = cap億 >= 10000 ? `${(cap億 / 10000).toFixed(2)} 兆` : `${cap億.toFixed(0)} ${t("marketMap.marketCapUnit")}`;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-semibold">
        {p.symbol} · {p.stockName}
      </div>
      {p.sector && (
        <div className="text-muted-foreground">
          {t("marketMap.sector")}：{p.sector}
        </div>
      )}
      <div className="mt-1 flex items-center gap-3">
        <span>
          {t("marketMap.price")}：{p.price?.toFixed(2)}
        </span>
        <span style={{ color: getHeatColor(p.changePct ?? null) }}>
          {p.changePct == null ? t("marketMap.noData") : formatPct(p.changePct, 2)}
        </span>
      </div>
      <div className="text-muted-foreground">
        {t("marketMap.marketCap")}：{capText}
      </div>
    </div>
  );
}

/* ── Legend ── */

function Legend() {
  const { t } = useT();
  const steps: Array<{ label: string; color: string }> = [
    { label: "≤ -3%", color: "#14532d" },
    { label: "-3 ~ -1.5%", color: "#15803d" },
    { label: "-1.5 ~ 0%", color: "#22c55e" },
    { label: "0%", color: "#4b5563" },
    { label: "0 ~ +1.5%", color: "#ef4444" },
    { label: "+1.5 ~ +3%", color: "#b91c1c" },
    { label: "≥ +3%", color: "#7f1d1d" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium">{t("marketMap.legendHeader")}：</span>
      {steps.map((s) => (
        <span key={s.label} className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-4 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/* ── 產業框 overlay（疊在 treemap 最上層，標出每個產業區塊的邊界與名稱） ── */

const HEADER_HEIGHT = 18;

function SectorOverlay({ boxes }: { boxes: SectorBox[] }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      {boxes.map((b) => {
        const showHeader = b.width > 64 && b.height > 30;
        // 依寬度粗估可容納字數，超出截斷（中文約 12px/字）
        const maxChars = Math.max(0, Math.floor((b.width - 12) / 12));
        const label =
          maxChars >= b.name.length ? b.name : b.name.slice(0, Math.max(1, maxChars - 1)) + "…";
        return (
          <g key={`${b.name}-${Math.round(b.x)}-${Math.round(b.y)}`}>
            <rect
              x={b.x + 1}
              y={b.y + 1}
              width={Math.max(0, b.width - 2)}
              height={Math.max(0, b.height - 2)}
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth={2}
              rx={2}
            />
            {showHeader && (
              <>
                <rect
                  x={b.x + 1}
                  y={b.y + 1}
                  width={Math.max(0, b.width - 2)}
                  height={HEADER_HEIGHT}
                  fill="rgba(0,0,0,0.6)"
                />
                <text
                  x={b.x + 6}
                  y={b.y + 1 + HEADER_HEIGHT / 2}
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize={11}
                  fontWeight={700}
                  style={{ letterSpacing: "0.02em" }}
                >
                  {label}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── 主元件 ── */

interface MarketMapProps {
  data: MarketMapMarketPayload;
  height?: number;
  showLegend?: boolean;
}

export function MarketMap({ data, height = 560, showLegend = true }: MarketMapProps) {
  const { t } = useT();
  const treeData = toTreemapData(data);

  const [boxes, setBoxes] = useState<SectorBox[]>([]);
  const collectRef = useRef<SectorBox[]>([]);
  const sigRef = useRef<string>("");
  const rafRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // recharts 把每個產業群組的內容畫在其個股 leaf「之前」，群組自身的標題/外框會被 leaf 蓋掉；
  // 因此在繪製過程蒐集各群組版面框，於本幀繪製後（rAF）疊一層 overlay 在最上層畫邊框與名稱。
  // ResponsiveContainer 在視窗縮放時只會重繪圖表而不會重繪本元件，故不能依賴 render/effect，
  // 改以 rAF flush + 依產業名去重（取最後一次座標）確保縮放後仍正確且不累積重複。
  const renderCell = (props: CellProps) => {
    if (props.depth === 1 && props.width > 0 && props.height > 0) {
      collectRef.current.push({
        name: props.name,
        x: props.x,
        y: props.y,
        width: props.width,
        height: props.height,
      });
      if (rafRef.current == null && typeof requestAnimationFrame !== "undefined") {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const byName = new Map<string, SectorBox>();
          for (const b of collectRef.current) byName.set(b.name, b);
          collectRef.current = [];
          const next = Array.from(byName.values());
          const sig = next
            .map((b) => `${b.name}|${Math.round(b.x)}|${Math.round(b.y)}|${Math.round(b.width)}|${Math.round(b.height)}`)
            .join(";");
          if (sig !== sigRef.current) {
            sigRef.current = sig;
            setBoxes(next);
          }
        });
      }
    }
    return <Cell {...props} />;
  };

  if (treeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("marketMap.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative" style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treeData as unknown as never[]}
            dataKey="value"
            nameKey="name"
            aspectRatio={4 / 3}
            isAnimationActive={false}
            content={renderCell as unknown as never}
          >
            <Tooltip content={<TreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
        <SectorOverlay boxes={boxes} />
      </div>
      {showLegend && <Legend />}
    </div>
  );
}

export { getHeatColor };
