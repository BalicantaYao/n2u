/**
 * 最小可用的 CSV / TSV 解析器，支援：
 *   - UTF-8 BOM 自動移除
 *   - 雙引號包覆欄位 + 引號跳脫（""）
 *   - \r\n 與 \n 兩種換行
 *   - 逗號 / Tab 分隔（自動偵測）
 *
 * 不引入第三方 dep；複雜情境若超出範圍可日後切換到 `papaparse` 或 `csv-parse`。
 */

export function parseDelimited(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // 簡單偵測：第一行 tab 多於 comma 則用 tab
  const firstNewline = text.indexOf("\n");
  const head = firstNewline >= 0 ? text.slice(0, firstNewline) : text;
  const delim = head.split("\t").length > head.split(",").length ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore; the \n will end the row
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 移除完全空白的列
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/** 將解析後的二維陣列轉成 header → cell 的 object 陣列 */
export function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      obj[header[i]] = (r[i] ?? "").trim();
    }
    return obj;
  });
}

/** 在多個可能的中文欄名中挑一個存在的回傳 */
export function pickField(
  row: Record<string, string>,
  aliases: readonly string[],
): string | undefined {
  for (const a of aliases) {
    if (a in row && row[a] !== "") return row[a];
  }
  return undefined;
}
