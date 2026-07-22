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

**Not yet done / next candidates**: web dashboard (decided 2026-07-22: read-only v1 — enrollments, renewals queue, audit history — Next.js in a `web/` folder of this repo, deployed on Vercel free, Discord OAuth login restricted to an ID allowlist; audit history needs a new `audit_events` table first), more family-admin features as Jess requests them.

## Production hosting (since 2026-07-22)

- **Oracle Cloud Always Free VM**: Ubuntu 24.04, `VM.Standard.E2.1.Micro` (1 OCPU/1GB + 1GB swap), region sa-saopaulo-1, public IP `146.235.44.150`, SSH key `~/.ssh/oracle-bot.key` (user `ubuntu`).
- Bot managed by systemd (`familia-bot.service`): starts on boot, `Restart=always`, logs via `journalctl -u familia-bot`. Repo cloned at `~/toryu-shinkai` via a read-only GitHub deploy key.
- **Database: Neon Postgres** (free tier), project "Toryu Shinkai" (`late-wind-42376214`, aws sa-east-1, account mj-jess). Branch `main` = production, branch `dev` = development. The old SQLite file remains on the VM as `data/family.db.sqlite-backup` (pre-migration snapshot, safe to delete later).
- Update flow: `ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'cd toryu-shinkai && git pull && npm ci && sudo systemctl restart familia-bot'`. Run `npm run deploy` (prod) / `npm run deploy:dev` (dev app) only when slash commands change. Day-to-day commands are in README.md.
- **Dev/prod split — two Discord apps + two DB branches**: `.env` = production (Tōryū Bot `1529480366069383408` + Neon `main`; used by the VM, `npm start`, `npm run deploy`). `.env.local` = development (Tōryū Bot Dev `1529575914307059855` + Neon `dev`; used by `npm run dev`, `npm run deploy:dev`). Interactions route per application, so dev clicks can never touch prod data. Never run the prod token locally (double-handling).

## Setting up on a new machine

After cloning, two things do NOT come with the repo:

1. **`.env` / `.env.local`** (gitignored) — copy from `.env.example` and fill `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `DATABASE_URL` for each environment (see "Production hosting" for which app/branch goes where). Tokens live in the Discord Developer Portal (account mj-jess); connection strings in the Neon dashboard. GUILD_ID `1399382584101703723`. There is no local data file to copy — all data is in Neon.
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
- New features follow the same shape: one directory per feature, strings in `messages.ts`, repository pattern for DB access, custom IDs namespaced via an `ids.ts`.

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
