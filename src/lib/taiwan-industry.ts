/**
 * 台股產業別代碼 ↔ 中英文名稱對照。
 *
 * 代碼來源：Fugle 文件 /intraday/tickers 的 `industry` 欄位，
 * 與 TWSE/TPEX 產業別分類（02 桁碼）一致。
 */

export const TAIWAN_INDUSTRY_CODES: Record<string, { zh: string; en: string }> = {
  "01": { zh: "水泥工業", en: "Cement" },
  "02": { zh: "食品工業", en: "Food" },
  "03": { zh: "塑膠工業", en: "Plastics" },
  "04": { zh: "紡織纖維", en: "Textiles" },
  "05": { zh: "電機機械", en: "Electric Machinery" },
  "06": { zh: "電器電纜", en: "Electrical & Cable" },
  "08": { zh: "玻璃陶瓷", en: "Glass & Ceramics" },
  "09": { zh: "造紙工業", en: "Paper & Pulp" },
  "10": { zh: "鋼鐵工業", en: "Iron & Steel" },
  "11": { zh: "橡膠工業", en: "Rubber" },
  "12": { zh: "汽車工業", en: "Automobile" },
  "14": { zh: "建材營造", en: "Building Materials & Construction" },
  "15": { zh: "航運業", en: "Shipping & Transportation" },
  "16": { zh: "觀光事業", en: "Tourism" },
  "17": { zh: "金融保險", en: "Finance & Insurance" },
  "18": { zh: "貿易百貨", en: "Trading & Consumers' Goods" },
  "19": { zh: "綜合企業", en: "Conglomerates" },
  "20": { zh: "其他", en: "Other" },
  "21": { zh: "化學工業", en: "Chemical" },
  "22": { zh: "生技醫療", en: "Biotechnology & Medical Care" },
  "23": { zh: "油電燃氣業", en: "Oil, Gas & Electricity" },
  "24": { zh: "半導體業", en: "Semiconductor" },
  "25": { zh: "電腦及週邊設備業", en: "Computer & Peripheral Equipment" },
  "26": { zh: "光電業", en: "Optoelectronic" },
  "27": { zh: "通信網路業", en: "Communications & Internet" },
  "28": { zh: "電子零組件業", en: "Electronic Parts / Components" },
  "29": { zh: "電子通路業", en: "Electronic Products Distribution" },
  "30": { zh: "資訊服務業", en: "Information Service" },
  "31": { zh: "其他電子業", en: "Other Electronic" },
  "32": { zh: "文化創意業", en: "Cultural & Creative" },
  "33": { zh: "農業科技業", en: "Agricultural Technology" },
  "34": { zh: "電子商務", en: "E-Commerce" },
  "35": { zh: "綠能環保", en: "Green Energy & Environmental Services" },
  "36": { zh: "數位雲端", en: "Digital & Cloud Services" },
  "37": { zh: "運動休閒", en: "Sports & Leisure" },
  "38": { zh: "居家生活", en: "Household" },
  "80": { zh: "管理股票", en: "Managed Stocks" },
};

const UNKNOWN = { zh: "其他", en: "Other" };

export function industryLabel(code: string | undefined, lang: "zh-TW" | "en"): string {
  const key = (code ?? "").trim();
  const entry = TAIWAN_INDUSTRY_CODES[key] ?? UNKNOWN;
  return lang === "zh-TW" ? entry.zh : entry.en;
}
