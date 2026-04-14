"use client";

import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { OHLCVBar } from "@/types/market";

interface PriceChartProps {
  data: OHLCVBar[];
  prevClose?: number;
}

export function PriceChart({ data, prevClose }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-muted-foreground text-sm">
        請搜尋股票代碼以顯示走勢圖
      </div>
    );
  }

  const chartData = data.map((bar) => ({
    date: new Date(bar.date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" }),
    close: bar.close,
    volume: bar.volume,
    open: bar.open,
    high: bar.high,
    low: bar.low,
  }));

  const minPrice = Math.min(...data.map((b) => b.low)) * 0.99;
  const maxPrice = Math.max(...data.map((b) => b.high)) * 1.01;
  const isPositive = data[data.length - 1]?.close >= (data[0]?.close ?? 0);

  return (
    <div className="space-y-2">
      {/* Price chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? "#16a34a" : "#dc2626"}
                stopOpacity={0.25}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? "#16a34a" : "#dc2626"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => v.toLocaleString()}
            width={60}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="rounded-lg border bg-popover p-3 text-xs shadow-lg space-y-1">
                  <p className="font-semibold">{label}</p>
                  <p>收盤：{d?.close?.toLocaleString()}</p>
                  <p>開盤：{d?.open?.toLocaleString()}</p>
                  <p>最高：{d?.high?.toLocaleString()}</p>
                  <p>最低：{d?.low?.toLocaleString()}</p>
                </div>
              );
            }}
          />
          {prevClose && (
            <>
              <ReferenceLine
                y={prevClose * 1.1}
                stroke="#dc2626"
                strokeDasharray="4 2"
                label={{ value: "漲停", position: "right", fontSize: 10, fill: "#dc2626" }}
              />
              <ReferenceLine
                y={prevClose * 0.9}
                stroke="#16a34a"
                strokeDasharray="4 2"
                label={{ value: "跌停", position: "right", fontSize: 10, fill: "#16a34a" }}
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="close"
            stroke={isPositive ? "#16a34a" : "#dc2626"}
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume chart */}
      <ResponsiveContainer width="100%" height={80}>
        <ComposedChart data={chartData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis
            tick={{ fontSize: 9 }}
            tickFormatter={(v) => `${Math.round(v / 1000)}K`}
            width={60}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [`${((v as number) / 1000).toFixed(0)}K 股`, "成交量"]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Bar dataKey="volume" fill="#94a3b8" opacity={0.7} radius={[1, 1, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
