/**
 * 觀察待辦的「每日」邊界統一以台北時區（UTC+8，無日光節約）計算。
 * 用本地日期字串（YYYY-MM-DD）而非 DateTime 比較，可完全避開時區邊界問題。
 */

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 回傳台北時區的今天日期，格式 YYYY-MM-DD。 */
export function todayTaipei(now: Date = new Date()): string {
  return new Date(now.getTime() + TAIPEI_OFFSET_MS).toISOString().slice(0, 10);
}

/** 某觀察標的是否在「今天（台北）」已確認過。 */
export function isCheckedToday(
  lastCheckedDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return !!lastCheckedDate && lastCheckedDate === todayTaipei(now);
}
