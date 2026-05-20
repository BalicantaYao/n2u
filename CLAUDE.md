# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Nothing 2 You" (n2u) is a stock trading journal for Taiwan (TWSE/TPEX) and US (NYSE/NASDAQ) markets. Next.js 14 App Router, TypeScript, Prisma 7 (PostgreSQL), NextAuth (Google), Tailwind + shadcn/ui, Zustand for client state. UI strings are bilingual (zh-TW / en). Most code comments are in Traditional Chinese.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # next build (also runs prisma generate via postinstall)
npm run lint         # next lint (eslint: next/core-web-vitals + next/typescript)
npx prisma generate  # regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>   # create + apply a migration locally
npx prisma migrate deploy              # apply migrations (used in prod deploy)
```

There is no test suite. Verification is via `npm run build` (type-check + compile) and `npm run lint`.

Note: a `.claude` PostToolUse hook runs `npm run build` automatically after every Edit/Write. Expect build output after edits; fix type errors it surfaces.

Requires a `.env` with at minimum: `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FUGLE_API_KEY` (TW market data), `FINNHUB_API_KEY` (US quotes/search). Deployed on Railway (see `railway.toml`).

## Architecture

### Request flow
Pages under `src/app/**/page.tsx` are mostly client components that read/write via Zustand stores (`src/store/`), which call REST routes under `src/app/api/**/route.ts`. API routes use Prisma directly. `src/middleware.ts` redirects unauthenticated requests to `/login` for everything except `/login`, `/api/auth`, `/api/health`, and static assets. The root `/` redirects to `/dashboard`.

### Auth pattern (important)
Every protected API route must call `requireAuth()` from `src/lib/session.ts` and bail on `auth.error`, then scope all Prisma queries by `auth.userId`. NextAuth uses JWT sessions; `src/lib/auth.ts` injects `user.id` into the token/session. Never query trades/positions/memos/watchlists without a `userId` filter.

### Multi-market dispatch layers
Market-specific logic is centralized behind two dispatch modules — route by `market` here rather than branching on market in callers:
- `src/lib/market-api.ts` — quotes, historical OHLCV, price changes, symbol search. Dispatches TW → `fugle-api.ts`, US → `finnhub-api.ts` (quotes/search) + `yahoo-finance-api.ts` (historical bars; Finnhub free tier dropped US candles).
- `src/lib/fees.ts` — fee/settlement calculation. Dispatches TW → `taiwan-fees.ts`, US → `us-fees.ts`.

`src/types/taiwan.ts` holds the market enums and helpers (`isUSMarket`, `marketToCurrency`). TW currency is TWD, US is USD.

### P&L engine (FIFO recompute)
`src/lib/pnl-calculator.ts` is the core of the journal. `recomputeSymbolPnL(tx, userId, symbol)` must run inside a Prisma transaction. The strategy is full recompute: it deletes all `PositionLot`s for that user×symbol, replays every trade in `(tradeDate, createdAt, id)` order, rebuilds lots, and writes `realizedPnL` back onto each SELL. FIFO matching is partitioned by `currency` to avoid cross-currency mixing. **Any trade mutation (create/update/delete) must call `recomputeSymbolPnL` for the affected symbol(s) within the same transaction** — see `src/app/api/trades/route.ts` for the canonical pattern. `computePnLSummary` derives unrealized P&L by combining open lots with live quotes from `fetchQuotes`.

### Data model (`prisma/schema.prisma`)
`Trade` is the source of truth (user enters BUY/SELL). `PositionLot` is *derived* state produced by the P&L engine — never edit it directly outside `recomputeSymbolPnL`. `Memo` (markdown notes, optionally linked to a symbol/trade), `Watchlist`/`WatchlistItem`, plus NextAuth's `User`/`Account`/`Session`. `User.commissionDiscount` is a TW-only broker commission multiplier (1.0 = none, 0.6 = 6折).

Shares are stored as `Float` to support fractional/odd lots. TW trades use `lotType` ROUND/ODD with `lots` (1 lot = 1000 shares, via `lotsToShares`); US trades are forced to ROUND and use raw `shares`.

### Prisma client
`src/lib/prisma.ts` exports a singleton using the `@prisma/adapter-pg` driver adapter over a `pg.Pool`. `@prisma/client`, `@prisma/adapter-pg`, and `pg` are marked as server external packages in `next.config.mjs` — keep them server-side only.

### i18n
`src/lib/i18n.ts` exposes `useT()` returning `t(key, values?)` with dot-path lookup and `{{var}}` interpolation. Strings live in `src/locales/{zh-TW,en}.ts`; `zh-TW` is the canonical shape and `en` must mirror its structure. Locale is persisted in `useLocaleStore`.

### Conventions
- Path alias `@/*` → `src/*`.
- shadcn/ui primitives in `src/components/ui/`; feature components grouped by domain (`dashboard/`, `journal/`, `watchlist/`, `memos/`, `market-map/`, etc.).
- Symbols are uppercased before storage/query.
- API error responses are `{ error: string }`; store actions throw with that message (often in Chinese) for toast display.
