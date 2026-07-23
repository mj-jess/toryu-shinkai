# Família Bot — Project Context & Standards

Discord bot for Jess's GTA RP family server (guild: Tōryū Shinkai). First feature: gym enrollment management (Sandy / Vinewood academies). The bot will keep growing — more admin features are planned.

## Working with Jess

- **Always respond in Brazilian Portuguese** (she's a professional developer, freelancing here; other projects live in `~/projects/nobe`).
- **Never add AI attribution**: no `Co-Authored-By: Claude` in commits, no "generated with" in PRs, code, or docs. Her repos carry her authorship only.
- For **product/UX decisions, discuss options first** before implementing (she asked for this explicitly — present possibilities, trade-offs, and a recommendation, then let her choose).
- She tests features live on the real Discord server and gives quick feedback; commit and push after each validated feature.

## Current status (2026-07-22)

**Working in production** (bot runs 24/7 on an Oracle Cloud Always Free VM — see "Production hosting" below; command `/academia-setup` publishes the panel):

- Fixed panel with three entry points: 💪 Adicionar, 📋 Matrículas, and 🕒 Renovações
- Add modal: passport, name, phone (masked to `(999) 999-999`), gym select ("As duas" pre-selected), date pre-filled with today
- Browse navigator (ephemeral, per-user): paginated list (10/page) with filter (exact passport or partial name) → pick a record → detail card with labeled data → actions: edit (pre-filled modal), deactivate (with confirmation + audit), reactivate (keeps data)
- Re-enrolling an inactive passport via Add reactivates it with the new data
- Unique passport AND phone (DB constraints + friendly conflict messages naming the conflicting record)
- Renewals view (🕒): active enrollments older than the selected period (1 month default — a fixed 30 days — or 2 weeks), most overdue first with "(há N dias)"; record card gains a 💰 Renovar button that sets the enrollment date to today (audited as "Matrícula renovada"). Prev/next/back are shared with the browse list — the session tracks which view is active.
- Audit log channel (#log-matriculas): `/academia-log-setup` run inside a channel registers it (stored in the `settings` table); every create/edit/deactivate/reactivate posts a color-coded embed there — vertical `Chave: valor` list (full snapshot; on edits changed fields render as `before → after` inline), author line with Twemoji PNG icon (emoji in embed titles can't be baseline-aligned). Add replies with a short confirmation linking to the audit message (falls back to the full embed when no log channel is set). Audit failures never break the enrollment flow.

**Dashboard v1 LIVE (2026-07-22)** — `web/` npm workspace, deployed on Vercel:

- **URL: https://toryu-shinkai-web-mu.vercel.app** (Vercel project `toryu-shinkai-web`, team "Jess' projects", Hobby/free, account created with the mj-jess GitHub). The `-mu` suffix was auto-assigned by Vercel (plain name was taken). Root Directory `web`; every push to `main` auto-deploys — no manual step.
- Env vars live in the Vercel project settings: `DATABASE_URL` (Neon `main`), `AUTH_SECRET` (prod-only, generated 2026-07-22), `AUTH_DISCORD_ID`/`AUTH_DISCORD_SECRET` (**prod** app Tōryū Bot `1529480366069383408`), `ALLOWED_DISCORD_IDS` (4 IDs). Redirect registered on the prod app: `https://toryu-shinkai-web-mu.vercel.app/api/auth/callback/discord`.
- Login validated live by Jess against production data.
- The long `*-jess-projects-*.vercel.app` URLs are Vercel-internal (SSO-protected) — the public domain is only the `-mu` one.

What v1 contains:

- Next.js 16 (App Router) + MUI v9 + MUI X DataGrid (free tier) + Auth.js (next-auth v5 beta), dark/light toggle (dark default), all UI text in `web/src/messages.ts`
- Login with Discord OAuth restricted to `ALLOWED_DISCORD_IDS` (comma-separated env; may become a UI-managed table later). Denied accounts land back on `/login?error=AccessDenied` with a friendly message
- Layout: fixed navbar + sidebar (permanent on desktop, drawer on mobile) + footer + content area; SPA navigation via next/link
- **Matrículas** page: read-only DataGrid (columns passaporte/nome/telefone/status/ações — sort, per-column filter, quick search, pagination, pt-BR locale) + eye action → read-only detail page (labeled `Chave: valor` fields per Jess's UI rule)
- Reads the same Neon DB via `drizzle-orm/neon-http` (`@neondatabase/serverless`) — schema/types/labels imported from the bot via the `@bot/*` → `src/` tsconfig alias (single source of truth; only pure modules: `db/schema`, `enrollment/types`, `enrollment/format`, `messages`)
- `npm run seed:dev` resets the **dev** branch with 24 test enrollments (guarded: refuses to run against the prod endpoint)

**Local dev of the dashboard works** (fixed 2026-07-22): `web/.env.local` has the dev app's Client Secret and the localhost redirect is registered on the dev Discord app. Visual identity shipped the same day: dragon-logo palette (azure light / navy dark, gold secondary), Zen Kaku Gothic New (headings) + Inter (body) via next/font, dragon favicon (`web/src/app/icon.png`) and login logo (`web/public/logo.png` — cut out from Jess's art with a flood-fill white-removal script).

**KOI restaurant module — Fase 1 (2026-07-23)**: the family also runs the KOI restaurant in the RP (see the `koi-restaurant-feature` memory for the full in-game data). Shipped: `koi_products`/`koi_ingredients`/`koi_recipe_items` tables (migration `0001` DDL + `0002` seed with the in-game catalog, `ON CONFLICT DO NOTHING` so edits survive re-runs), pure pricing module `src/koi/pricing.ts` (+ PGlite tests validating the seed against hand-checked numbers), and the dashboard **KOI** page: margins table (buying vs collecting scenarios), street-price simulator with per-row save, and a Preços tab editing product/ingredient prices (first write feature of the web — server actions in `web/src/app/(dashboard)/koi/actions.ts`, each one calls `requireUser()`). Fase 2 (deferred, opt-in): Discord street-sale shift summary + weekly bot post.

**Not yet done / next candidates**: KOI Fase 2, Renovações page, audit history page (needs the `audit_events` table), allowlist management UI, more family-admin features as Jess requests them.

## Production hosting (since 2026-07-22)

- **Oracle Cloud Always Free VM**: Ubuntu 24.04, `VM.Standard.E2.1.Micro` (1 OCPU/1GB + 1GB swap), region sa-saopaulo-1, public IP `146.235.44.150`, SSH key `~/.ssh/oracle-bot.key` (user `ubuntu`).
- Bot managed by systemd (`familia-bot.service`): starts on boot, `Restart=always`, logs via `journalctl -u familia-bot`. Repo cloned at `~/toryu-shinkai` via a read-only GitHub deploy key.
- **Database: Neon Postgres** (free tier), project "Toryu Shinkai" (`late-wind-42376214`, aws sa-east-1, account mj-jess). Branch `main` = production, branch `dev` = development. The old SQLite file remains on the VM as `data/family.db.sqlite-backup` (pre-migration snapshot, safe to delete later).
- Update flow: `ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'cd toryu-shinkai && git pull && npm ci --workspaces=false && sudo systemctl restart familia-bot'` (`--workspaces=false` skips the dashboard deps — the 1GB VM only runs the bot). Run `npm run deploy` (prod) / `npm run deploy:dev` (dev app) only when slash commands change. Day-to-day commands are in README.md.
- **Dev/prod split — two Discord apps + two DB branches**: `.env` = production (Tōryū Bot `1529480366069383408` + Neon `main`; used by the VM, `npm start`, `npm run deploy`). `.env.local` = development (Tōryū Bot Dev `1529575914307059855` + Neon `dev`; used by `npm run dev`, `npm run deploy:dev`). Interactions route per application, so dev clicks can never touch prod data. Never run the prod token locally (double-handling).

## Setting up on a new machine

After cloning, two things do NOT come with the repo:

1. **`.env` / `.env.local` / `web/.env.local`** (gitignored) — copy from the `.env.example` files and fill in (see "Production hosting" for which app/branch goes where). Tokens live in the Discord Developer Portal (account mj-jess); connection strings in the Neon dashboard. GUILD_ID `1399382584101703723`. For the dashboard, `AUTH_DISCORD_SECRET` comes from the app's OAuth2 page (register the redirect `http://localhost:3000/api/auth/callback/discord` on the dev app). There is no local data file to copy — all data is in Neon.
2. **Git credentials** — the remote is pinned to the mj-jess account. If the machine has multiple GitHub accounts on `gh`, reproduce the repo-local helper:
   ```bash
   git config credential.helper '!f() { echo username=mj-jess; echo "password=$(gh auth token --user mj-jess)"; }; f'
   ```

Then: `npm install` → `npm run dev` (local dev bot). Production runs on the VM via systemd — never `npm start` locally.

⚠️ **One process per token** — two processes with the same token both receive every interaction and will double-handle events.

## Code standards

- **All code in English**: identifiers, comments, commit messages, file names, DB schema.
- **TypeScript everywhere** (strict mode, `noUncheckedIndexedAccess`). No plain JS.
- **All user-facing text in Brazilian Portuguese**, centralized in `src/messages.ts`. Never hardcode user-visible strings elsewhere. Console logs are developer-facing → English.
- **Prettier** enforces formatting (`npm run format`). Config: single quotes, print width 100.
- **Domain values are English enums** (`'sandy' | 'vinewood' | 'both'`); Portuguese labels come from `gymLabels` in `src/messages.ts`.
- **UI rule from Jess**: any data shown to users must be labeled `Chave: valor` (embed fields or explicit labels) — never bare values. Record headers are `passaporte — nome`.

## Tests

- Vitest, colocated: `foo.test.ts` next to `foo.ts`. Shared doubles in `src/enrollment/test-utils.ts` (fake button/select/modal interactions + payload inspectors + `browseState` factory + `fakeAuditLog`).
- DB-touching tests use **PGlite** (in-process Postgres) via `createTestDatabase()` from `src/db/test-database.ts` — it runs the real Drizzle migrations, so tests always exercise the production schema. Pattern: one instance per file (`beforeAll`), `testDb.reset()` in `beforeEach`, `close()` in `afterAll`.
- Handlers take dependencies as parameters (repository, sessions, audit) so tests pass fakes — keep new handlers dependency-injected.
- Run: `npm test` (CI mode) or `npm run test:watch`.

## Architecture

- `src/index.ts` — client bootstrap; routes `/academia-setup` + delegates every `enrollment:*` interaction to the dispatcher.
- `src/messages.ts` — every Portuguese string.
- `src/database.ts` — Postgres connection (Drizzle + node-postgres pool); applies the `drizzle/` migrations on boot. Exports the driver-agnostic `Database` type.
- `src/db/schema.ts` — Drizzle schema, the single source of truth for tables. `src/db/test-database.ts` — PGlite factory for tests.
- `src/settings.ts` — key-value settings repository (e.g. the audit log channel id).
- `src/enrollment/` — feature module:
  - `panel.ts` (fixed message with the two entry points: add + browse)
  - `browse-handlers.ts` (dispatcher for all `enrollment:*` interactions), `browse-session.ts` (per-user page/filter state, in-memory; lost on restart by design)
  - `list-view.ts` (paginated browser), `due-view.ts` (renewals list), `detail-view.ts` (record card + deactivate confirmation)
  - `add-modal.ts`, `edit-modal.ts` (edit is pre-filled, opened from the record card — Discord cannot chain modal→modal, but component→modal works)
  - `audit-log.ts` (`AuditLog` interface + embed builder + `EnrollmentAuditLog`, which posts to the channel registered via `/academia-log-setup`)
  - `repository.ts` (queries), `format.ts` (phone/date helpers), `display.ts` (shared embed pieces), `ids.ts` (custom ID build/parse), `types.ts`
- `src/koi/` — KOI restaurant module: `types.ts`, `pricing.ts` (pure margin math, shared with the web), `catalog.ts` (loads products+recipes; bot/test side only — see import rule below).
- `src/db/migrate.ts` — applies migrations without booting the bot (`npm run db:migrate:dev`). Production migrates on bot boot (VM restart).
- New features follow the same shape: one directory per feature, strings in `messages.ts`, repository pattern for DB access, custom IDs namespaced via an `ids.ts`.

### Dashboard (`web/` — npm workspace)

- `web/src/messages.ts` — every Portuguese string of the dashboard (same rule as the bot).
- `web/src/auth.ts` — Auth.js config (Discord provider + `ALLOWED_DISCORD_IDS` allowlist in the `signIn` callback); `web/src/session.ts` — `requireUser()` guard called in the dashboard layout and every page.
- `web/src/db.ts` — queries over `drizzle-orm/neon-http` (enrollments read-only; KOI catalog read + price updates); imports the schema via `@bot/db/schema`. `getKoiCatalog` mirrors `src/koi/catalog.ts` on purpose (see import rule).
- `web/src/app/` — App Router: `login/`, `(dashboard)/matriculas` (grid) and `(dashboard)/matriculas/[passport]` (detail); `actions.ts` holds the `signIn`/`signOut` server actions.
- `web/src/components/` — client components (`dashboard-shell` with navbar/sidebar/footer, `enrollments-table` DataGrid, `color-mode-toggle`, `button-link`).
- Import rule: `@bot/*` may only pull **pure** bot modules (schema, types, format, messages, koi/pricing) — never anything that imports `discord.js` or `pg`, and never a module with a **runtime** relative `.js` import (Turbopack won't resolve it back to `.ts`; type-only imports are fine because they're erased). Modules that break the rule get a small mirror in `web/src` instead.
- Server components must not pass functions (e.g. `component={Link}`) to client components — wrap the pairing in a client component like `button-link.tsx`.
- **TypeScript nuance**: the repo root has `typescript@7` (native compiler) which the bot uses, but Next needs the classic TS JS API, so `web/` pins `typescript@^5.9` as its own devDependency (nested in `web/node_modules`).

## Migrations

- Managed by **drizzle-kit**: edit `src/db/schema.ts`, run `npm run db:generate` — it emits SQL to `drizzle/` (committed). Applied automatically on boot (bot) and in `createTestDatabase()` (tests).
- **Never edit a migration that may already be applied** — change the schema and generate a new one.
- `drizzle/0000_*.sql` is the baseline: enrollments + settings, carrying over everything from the four SQLite-era migrations (unique passport/phone, deactivation audit columns, gym check).

## Domain rules (enrollment)

- Enrollments are **never deleted** — only marked `active = 0`, recording who deactivated and when.
- Re-enrolling an inactive passport **reactivates** it (via Add: with new data; via card 🔄: keeping data). Reactivation clears the deactivation audit.
- Passport and phone are unique. Phone stored formatted `(999) 999-999`. Dates stored ISO (`yyyy-mm-dd`), displayed `dd/mm/yyyy`.

## Database roadmap

- **Done (2026-07-22)**: migrated SQLite → **Neon Postgres with Drizzle ORM**, triggered by the dashboard decision, exactly as planned — only `database.ts`, migrations, and repositories changed (plus the async ripple through handlers). Repositories are async now.
- **Next (dashboard)**: `web/` Next.js app on Vercel reading the same Neon DB (read-only v1), Discord OAuth allowlist login. Requires an `audit_events` table so audit history is queryable. Keep everything as close to R$0/month as possible — explicit constraint from Jess.
- Dates stay ISO **text** columns (`yyyy-mm-dd` / `yyyy-mm-dd hh:mm:ss`) on purpose — the app logic and formatters are string-based; revisit only if the dashboard needs real timestamps.

## Environment constraints

- Current machine (since 2026-07-22): Node 24.18.0 (LTS, via winget) — same version on the prod VM. Vitest stays on v3 (v4 bump untested, optional).
- The repo sets `core.autocrlf false` locally (Git for Windows' system config sets it to `true`, which checks files out as CRLF and breaks `prettier --check`). On a fresh clone, run `git config core.autocrlf false` before anything else.

## Checks before finishing any task

```bash
npm run typecheck && npm test && npm run format:check
```

When the task touched `web/`, also:

```bash
npm run typecheck -w web && npm run build -w web
```
