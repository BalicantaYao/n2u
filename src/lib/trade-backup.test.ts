import assert from "node:assert/strict";
import test from "node:test";
import en from "../locales/en.ts";
import {
  BACKUP_USER_FIELDS,
  backupFilename,
  buildTradeBackup,
  planRestore,
  serializeTradeBackup,
  stockScope,
  TRADE_IMPORT_CSV_HEADER,
  tradeLinkedWalletScope,
  tradesToImportCsv,
  type BackupSourceTrade,
} from "./trade-backup.ts";

function trade(overrides: Partial<BackupSourceTrade> = {}): BackupSourceTrade {
  return {
    id: "trade_1",
    createdAt: "2024-03-01T00:00:00.000Z",
    updatedAt: "2024-03-01T01:00:00.000Z",
    symbol: "2330",
    symbolName: "台積電",
    market: "TWSE",
    currency: "TWD",
    side: "BUY",
    tradeDate: "2024-03-01T00:00:00.000Z",
    settlementDate: "2024-03-05T00:00:00.000Z",
    lotType: "ROUND",
    lots: 1,
    shares: 1000,
    price: 580,
    commission: 20,
    transactionTax: 0,
    totalFees: 20,
    grossAmount: 580000,
    netAmount: 580020,
    realizedPnL: null,
    isETF: false,
    stopLoss: 560,
    notes: "突破月線",
    tags: "swing",
    ...overrides,
  };
}

/** Mirrors CSVImporter column rules, including the header skip. */
function parseLikeImporter(raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const cols = line.split(",");
    if (cols[0].trim() === "交易日期" || cols[0].trim().toLowerCase() === "trade date") continue;
    const tradeDate = cols[0]?.trim() ?? "";
    const symbol = cols[1]?.trim().toUpperCase() ?? "";
    const price = parseFloat(cols[2]?.trim() ?? "");
    const rawShares = parseFloat(cols[3]?.trim() ?? "");
    const stopLossStr = cols[4]?.trim() ?? "";
    const notesRaw = cols.slice(6).join(",").trim();
    rows.push({
      tradeDate,
      symbol,
      price,
      rawShares,
      side: rawShares > 0 ? "BUY" : "SELL",
      shares: Math.abs(rawShares),
      stopLoss: stopLossStr ? parseFloat(stopLossStr) : undefined,
      notes: notesRaw || undefined,
    });
  }
  return rows;
}

test("backup filename uses a Taipei timestamp", () => {
  const now = new Date("2026-10-21T16:05:06.000Z");
  assert.equal(backupFilename("json", now), "n2u-trades-backup-20261022-000506.json");
  assert.equal(backupFilename("csv", new Date("2026-10-21T01:02:03.000Z")), "n2u-trades-backup-20261021-090203.csv");
});

test("CSV header matches the English import header the importer accepts", () => {
  assert.equal(TRADE_IMPORT_CSV_HEADER, en.csv.csvHeader);
  assert.equal(TRADE_IMPORT_CSV_HEADER.split(",")[0].toLowerCase(), "trade date");
});

test("query scope is the current user and stock markets only", () => {
  assert.deepEqual(stockScope("user-123"), {
    userId: "user-123",
    market: { in: ["TWSE", "TPEX", "NYSE", "NASDAQ"] },
  });
  assert.deepEqual(tradeLinkedWalletScope("user-123"), {
    userId: "user-123",
    tradeId: { not: null },
  });
  assert.deepEqual(Object.keys(BACKUP_USER_FIELDS), ["commissionDiscount"]);
});

test("export keeps stock trades and strips secrets and other records", () => {
  const backup = buildTradeBackup({
    exportedAt: new Date("2026-01-02T03:04:05.000Z"),
    commissionDiscount: 0.28,
    trades: [
      trade({
        id: "later",
        tradeDate: "2024-04-01T00:00:00.000Z",
        side: "SELL",
        shares: 1000,
        price: 600,
        commission: 20,
        transactionTax: 1740,
        totalFees: 1760,
        grossAmount: 600000,
        netAmount: 598240,
        realizedPnL: 18220,
        notes: "獲利, 出場",
      }),
      trade(),
      trade({ id: "us", symbol: "aapl", symbolName: "Apple", market: "NASDAQ", currency: "USD", lotType: "ODD", lots: 3, shares: 1.5, price: 180, commission: 0, transactionTax: 0, totalFees: 0, grossAmount: 270, netAmount: 270, stopLoss: null, notes: "line1\nline2" }),
      trade({ id: "other-market", market: "TAIEX", symbol: "TX" }),
    ],
    stopLossAdjustments: [
      { id: "adj_1", createdAt: "2024-03-02T00:00:00.000Z", symbol: "2330", market: "TWSE", previousStopLoss: 560, newStopLoss: 570, note: "提高" },
      { id: "adj_cc", createdAt: "2024-03-02T00:00:00.000Z", symbol: "TX", market: "TAIEX", previousStopLoss: null, newStopLoss: 1, note: "ignore" },
    ],
    walletTransactions: [
      { id: "w1", createdAt: "2024-03-01T00:00:01.000Z", currency: "TWD", type: "TRADE_BUY", amount: -580020, balanceAfter: 1000, tradeId: "trade_1", note: null },
      { id: "deposit", createdAt: "2024-02-01T00:00:00.000Z", currency: "TWD", type: "DEPOSIT", amount: 1000, balanceAfter: 1000, tradeId: null, note: "secret-deposit" },
      { id: "orphan", createdAt: "2024-03-03T00:00:00.000Z", currency: "TWD", type: "TRADE_BUY", amount: -1, balanceAfter: 0, tradeId: "missing", note: null },
    ],
  });

  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.scope, "tw-us-stocks");
  assert.equal(backup.settings.commissionDiscount, 0.28);
  assert.deepEqual(backup.trades.map((row) => row.id), ["trade_1", "us", "later"]);
  const us = backup.trades[1];
  assert.equal(us.symbol, "AAPL");
  assert.equal(us.market, "NASDAQ");
  assert.equal(us.currency, "USD");
  assert.equal(us.lotType, "ROUND");
  assert.equal(us.lots, null);
  assert.equal(us.shares, 1.5);
  assert.deepEqual(backup.stopLossAdjustments.map((row) => row.id), ["adj_1"]);
  assert.deepEqual(backup.walletTransactions.map((row) => row.id), ["w1"]);
  const exported = serializeTradeBackup(backup);
  assert.equal(exported.includes("secret-deposit"), false);
  assert.equal(exported.includes("adj_cc"), false);
  assert.equal(exported.includes("TAIEX"), false);

  const leaked = {
    ...trade(),
    userId: "user_secret",
    email: "secret@example.com",
    access_token: "token_secret",
  };
  const leakedWallet = {
    id: "w1",
    createdAt: "2024-03-01T00:00:01.000Z",
    currency: "TWD",
    type: "TRADE_BUY",
    amount: -1,
    balanceAfter: 0,
    tradeId: "trade_1",
    note: null,
    userId: "user_secret",
    walletId: "wallet_secret",
  };
  const json = serializeTradeBackup(buildTradeBackup({
    exportedAt: new Date("2026-01-02T03:04:05.000Z"),
    commissionDiscount: 1,
    trades: [leaked],
    walletTransactions: [leakedWallet],
  }));
  assert.equal(json.includes("userId"), false);
  assert.equal(json.includes("user_secret"), false);
  assert.equal(json.includes("secret@example.com"), false);
  assert.equal(json.includes("token_secret"), false);
  assert.equal(json.includes("walletId"), false);
  assert.equal(json.includes("wallet_secret"), false);
  assert.equal(json.includes("refresh_token"), false);
  assert.match(json, /"schemaVersion": 1/);
});

test("Taiwan integer trades round-trip through the importer column rules", () => {
  const backup = buildTradeBackup({
    exportedAt: new Date("2026-01-02T03:04:05.000Z"),
    commissionDiscount: 0.6,
    trades: [
      trade({ notes: "突破, 月線" }),
      trade({
        id: "sell",
        side: "SELL",
        tradeDate: "2024-03-20T00:00:00.000Z",
        createdAt: "2024-03-20T00:00:00.000Z",
        shares: 1000,
        price: 600,
        stopLoss: null,
        grossAmount: 600000,
        notes: null,
      }),
    ],
  });
  const csv = tradesToImportCsv(backup.trades);
  assert.equal(csv.startsWith(`${TRADE_IMPORT_CSV_HEADER}\n`), true);
  const rows = parseLikeImporter(csv);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    tradeDate: "2024-03-01",
    symbol: "2330",
    price: 580,
    rawShares: 1000,
    side: "BUY",
    shares: 1000,
    stopLoss: 560,
    notes: "突破, 月線",
  });
  assert.equal(rows[1].side, "SELL");
  assert.equal(rows[1].rawShares, -1000);
  assert.equal(rows[1].shares, 1000);
  assert.equal(rows[1].stopLoss, undefined);
  assert.equal(rows[1].notes, undefined);
});

test("fractional US shares stay exact in JSON and CSV text", () => {
  const backup = buildTradeBackup({
    trades: [trade({
      id: "us",
      symbol: "AAPL",
      market: "NASDAQ",
      currency: "USD",
      shares: 1.25,
      lots: null,
      lotType: "ROUND",
      price: 180.5,
      commission: 0,
      transactionTax: 0,
      totalFees: 0,
      grossAmount: 225.625,
      netAmount: 225.625,
      stopLoss: null,
      notes: null,
    })],
  });
  assert.equal(backup.trades[0].shares, 1.25);
  const rows = parseLikeImporter(tradesToImportCsv(backup.trades));
  assert.equal(rows[0].shares, 1.25);
  assert.equal(rows[0].price, 180.5);
  assert.equal(rows[0].symbol, "AAPL");
});

test("newlines in notes stay on one CSV row", () => {
  const backup = buildTradeBackup({
    trades: [trade({ notes: "第一行\r\n第二行" })],
  });
  const csv = tradesToImportCsv(backup.trades);
  assert.equal(csv.trim().split(/\r?\n/).length, 2);
  const rows = parseLikeImporter(csv);
  assert.equal(rows[0].notes, "第一行 第二行");
});

test("restore plan round-trips fees and ignores wallet replay", () => {
  const backup = buildTradeBackup({
    exportedAt: new Date("2026-01-02T03:04:05.000Z"),
    commissionDiscount: 0.6,
    trades: [
      trade({ id: "b", tradeDate: "2024-05-01T00:00:00.000Z", createdAt: "2024-05-01T00:00:00.000Z" }),
      trade({ id: "a" }),
    ],
    stopLossAdjustments: [
      { id: "adj_1", createdAt: "2024-03-02T00:00:00.000Z", symbol: "2330", market: "TWSE", previousStopLoss: 560, newStopLoss: 570, note: "提高" },
    ],
    walletTransactions: [
      { id: "w1", createdAt: "2024-03-01T00:00:01.000Z", currency: "TWD", type: "TRADE_BUY", amount: -580020, balanceAfter: 1000, tradeId: "a" },
    ],
  });

  const planned = planRestore(JSON.parse(serializeTradeBackup(backup)));
  assert.equal(planned.ok, true);
  if (!planned.ok) return;
  assert.deepEqual(planned.plan.trades.map((row) => row.symbol), ["2330", "2330"]);
  assert.equal(planned.plan.trades[0].createdAt.toISOString(), "2024-03-01T00:00:00.000Z");
  assert.equal(planned.plan.trades[0].commission, 20);
  assert.equal(planned.plan.trades[0].transactionTax, 0);
  assert.equal(planned.plan.trades[0].netAmount, 580020);
  assert.equal(planned.plan.trades[0].shares, 1000);
  assert.equal(planned.plan.trades[0].lots, 1);
  assert.equal("id" in planned.plan.trades[0], false);
  assert.equal("index" in planned.plan.trades[0], false);
  assert.equal(JSON.stringify(planned.plan.trades[0]).includes("userId"), false);
  assert.equal(planned.plan.commissionDiscount, 0.6);
  assert.equal(planned.plan.stopLossAdjustments.length, 1);
  assert.equal(planned.plan.stopLossAdjustments[0].newStopLoss, 570);
  assert.equal(planned.plan.ignoredWalletTransactions, 1);
  assert.equal("walletTransactions" in planned.plan, false);
});

test("restore rejects the wrong schema, non-stock markets, and bad discounts", () => {
  const backup = buildTradeBackup({ trades: [trade()], commissionDiscount: 0.6 });
  const wrongVersion = planRestore({ ...backup, schemaVersion: 2 });
  assert.equal(wrongVersion.ok, false);

  const wrongScope = planRestore({ ...backup, scope: "covered-calls" });
  assert.equal(wrongScope.ok, false);

  const badMarket = planRestore({
    ...backup,
    trades: [{ ...backup.trades[0], market: "TAIEX" }],
  });
  assert.equal(badMarket.ok, false);

  const badDiscount = planRestore({
    ...backup,
    settings: { commissionDiscount: 1.5 },
  });
  assert.equal(badDiscount.ok, false);
});

test("US odd-lot rows are restored as round lots without multiplying shares", () => {
  const backup = buildTradeBackup({
    trades: [trade({
      market: "NYSE",
      currency: "USD",
      symbol: "IBM",
      lotType: "ODD",
      lots: 2,
      shares: 2,
      price: 100,
      grossAmount: 200,
      netAmount: 200,
      commission: 0,
      transactionTax: 0,
      totalFees: 0,
    })],
  });
  const row = backup.trades[0];
  const planned = planRestore({
    ...backup,
    trades: [{ ...row, lotType: "ODD", lots: 2, shares: 2 }],
  });
  assert.equal(planned.ok, true);
  if (!planned.ok) return;
  assert.equal(planned.plan.trades[0].lotType, "ROUND");
  assert.equal(planned.plan.trades[0].lots, null);
  assert.equal(planned.plan.trades[0].shares, 2);
  assert.equal(planned.plan.trades[0].currency, "USD");
});
