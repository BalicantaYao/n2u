"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useT } from "@/lib/i18n";
import { formatPct } from "@/lib/utils";
import type { MarketMapMarketPayload } from "@/types/market";

/**
 * 台股慣例熱度色（紅漲綠跌）。changePct 為小數，0.0123 = 1.23%。
 */
function getHeatColor(pct: number): string {
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
  changePct?: number;
  marketCap?: number;
  sector?: string;
}

function toTreemapData(data: MarketMapMarketPayload): TreemapDatum[] {
  return data.groups
    .filter((g) => g.stocks.length > 0)
    .map((g) => ({
      name: g.sector,
      value: g.marketCap,
      children: g.stocks.map<TreemapDatum>((s) => ({
        name: s.symbol,
        value: Math.max(s.marketCap, 1),
        symbol: s.symbol,
        stockName: s.name,
        price: s.price,
        changePct: s.changePct,
        marketCap: s.marketCap,
        sector: g.sector,
      })),
    }));
}

/* ── Custom cell content ── */

interface CellProps {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  name: string;
  symbol?: string;
  stockName?: string;
  changePct?: number;
  sector?: string;
}

function Cell(props: CellProps) {
  const { x, y, width, height, depth, name, symbol, stockName, changePct, sector } = props;

  if (width <= 0 || height <= 0) return null;

  // depth 1: sector group — 畫透明背景 + 標題
  if (depth === 1) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="transparent"
          stroke="hsl(var(--background))"
          strokeWidth={2}
        />
        {width > 80 && height > 24 && (
          <text
            x={x + 6}
            y={y + 14}
            textAnchor="start"
            fill="rgba(255,255,255,0.55)"
            fontSize={11}
            fontWeight={600}
            style={{ pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            {name}
          </text>
        )}
      </g>
    );
  }

  // depth 2: 個股 leaf
  if (depth !== 2) return null;

  const pct = changePct ?? 0;
  const color = getHeatColor(pct);
  // 主標字體隨方塊大小動態調整
  const shorterSide = Math.min(width, height);
  const symbolFontSize = Math.max(10, Math.min(22, Math.floor(shorterSide / 3)));
  const pctFontSize = Math.max(9, Math.floor(symbolFontSize * 0.75));
  const showText = width > 34 && height > 24;
  const showName = width > 80 && height > 52;
  const showPct = width > 48 && height > 38;

  const pctText = formatPct(pct, 2);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="hsl(var(--background))"
        strokeWidth={1}
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
        <span style={{ color: getHeatColor(p.changePct ?? 0) }}>
          {formatPct(p.changePct ?? 0, 2)}
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

/* ── 主元件 ── */

interface MarketMapProps {
  data: MarketMapMarketPayload;
  height?: number;
  showLegend?: boolean;
}

export function MarketMap({ data, height = 560, showLegend = true }: MarketMapProps) {
  const { t } = useT();
  const treeData = toTreemapData(data);

  if (treeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {t("marketMap.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treeData as unknown as never[]}
            dataKey="value"
            nameKey="name"
            aspectRatio={4 / 3}
            isAnimationActive={false}
            content={<Cell {...({} as CellProps)} />}
          >
            <Tooltip content={<TreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
      {showLegend && <Legend />}
    </div>
  );
}

export { getHeatColor };
