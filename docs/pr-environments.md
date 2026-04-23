# Railway PR Environments

每次開 PR，Railway 會自動複製一份 preview 環境；`scripts/pr-env-init.sh` 會把
production 的 Postgres 整包 dump 到這個 PR 專屬的空 DB，讓你用擬真資料測試。

## 流程

1. 在 GitHub 開 PR。
2. Railway 依 `production` environment clone 出新的 PR environment，包含一個空的 Postgres addon。
3. Container 啟動，`startCommand` 依序執行：
   1. `bash scripts/pr-env-init.sh` — 偵測非 production 環境，從 `PROD_DATABASE_URL` 用 `pg_dump | psql` 串流到本 env 的 `DATABASE_URL`，寫入 sentinel 表 `_pr_env_seeded`。
   2. `prisma migrate deploy` — 在 prod schema 之上套用 PR branch 新增的 migration。
   3. `next start` — 正式啟動 Next.js。
4. 之後再 push 新 commit 時，sentinel 仍在，script 會 skip，deploy 變快。

## 初次設定（只需做一次）

**Railway Dashboard**
1. Project Settings → Environments → 啟用 **PR Environments**，source = `production`。
2. `production` 環境必須使用 Railway 內建的 Postgres addon（不是外部 DB），PR env 複製時才會拿到**全新、獨立**的 Postgres。
3. Project Shared Variables 新增：
   - `PROD_DATABASE_URL` = prod Postgres 的 **Public / TCP proxy** 連線字串（PR env 走不到 prod 的 private network，必須用 public URL）。
4. 確認 App service 的 `DATABASE_URL` 是 service reference（例如 `${{Postgres.DATABASE_URL}}`），而非硬編碼。
5. `NEXTAUTH_URL` 設為 `https://${{RAILWAY_PUBLIC_DOMAIN}}`，讓 PR env 自動有正確 callback URL。

**Google OAuth**

Google Console 不支援 wildcard redirect URI。要在 PR env 測 Google 登入，需要：
- 每個 PR 手動把 `https://<pr-subdomain>.up.railway.app/api/auth/callback/google` 加進 OAuth client，或
- 準備一個 dev-only OAuth client，PR env 的 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` 覆寫為 dev client，或
- 直接用 prod 複製過來的 session cookie 測（不走登入流程）。

## 安全注意

PR env 的 DB 包含**真實**使用者 email、Google OAuth access/refresh tokens、交易損益。**絕對不要**把 PR env 的 URL 貼到公開頻道，也不要給外部人員存取權。每個有 repo PR 讀寫權的開發者等同於有 prod 資料讀寫權。

## 常見操作

**強制重新 seed**（例如剛在 prod 灌了新資料想同步過來）：
```sql
-- 在 PR env 的 Postgres shell 執行
DROP TABLE _pr_env_seeded;
```
然後在 Railway Dashboard 對該 PR env redeploy。

**跳過 seed**（想用空 DB 測）：
在該 PR env 把 `PROD_DATABASE_URL` 清空，redeploy。Script 會 log `PROD_DATABASE_URL unset, skip` 然後放行。

**確認 seed 成功**：
Railway deploy log 應依序看到：
```
[pr-env-init] env=pr-123 branch=...
[pr-env-init] streaming pg_dump | psql from prod…
[pr-env-init] writing sentinel…
[pr-env-init] done.
```
之後 `prisma migrate deploy` 輸出，再接 Next listening。

## 成本

每個 PR env = 一份 Next.js service + 一份 Postgres。PR merge/close 後 Railway 預設會自動回收，但建議定期檢查 Project → Environments 清單，確認沒有殘留。

## Postgres 版本對齊

`nixpacks.toml` 目前鎖 `postgresql_16` client。`pg_dump` 要求 client 版本 **>=** server 版本，否則拒絕連線。若 prod Postgres 升級為 17，請同步把 `nixpacks.toml` 改成 `postgresql_17` 後 redeploy。
