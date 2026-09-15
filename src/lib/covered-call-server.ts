/** Covered Call API 路由共用的驗證與查詢片段（僅供伺服器端使用） */

/** 底倉一律連同賣出腳一起回傳，前端才能算出權利金與掩護比例 */
export const legsInclude = {
  legs: {
    orderBy: [{ openDate: "desc" as const }, { createdAt: "desc" as const }],
  },
};

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** 解析 YYYY-MM-DD 或 ISO 日期字串；無效值回傳 null */
export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
