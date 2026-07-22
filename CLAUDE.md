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

**Not yet done / next candidates**: dev Discord app for local testing (see "Production hosting"), web dashboard (future), more family-admin features as Jess requests them.

## Production hosting (since 2026-07-22)

- **Oracle Cloud Always Free VM**: Ubuntu 24.04, `VM.Standard.E2.1.Micro` (1 OCPU/1GB + 1GB swap), region sa-saopaulo-1, public IP `146.235.44.150`, SSH key `~/.ssh/oracle-bot.key` (user `ubuntu`).
- Bot managed by systemd (`familia-bot.service`): starts on boot, `Restart=always`, logs via `journalctl -u familia-bot`. Repo cloned at `~/toryu-shinkai` via a read-only GitHub deploy key.
- **Prod DB lives only on the VM** (`~/toryu-shinkai/data/family.db`, started empty on purpose — local data was test-only). Prod `.env` holds the Tōryū Bot token.
- Update flow: `ssh -i ~/.ssh/oracle-bot.key ubuntu@146.235.44.150 'cd toryu-shinkai && git pull && npm ci && sudo systemctl restart familia-bot'`. Run `npm run deploy` (on any machine with the prod `.env`) only when slash commands change. Day-to-day commands are in README.md.
- **Dev/prod split**: prod token must never run locally (double-handling). Local development uses a separate Discord application ("Tōryū Bot Dev", pending creation) with its own token/CLIENT_ID in the local `.env` and the local SQLite file — interactions route per application, so dev clicks can never touch prod data.

## Setting up on a new machine

After cloning, three things do NOT come with the repo:

1. **`.env`** (gitignored) — copy from `.env.example` and fill `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`. The token is in the Discord Developer Portal (app "Tōryū Bot", account mj-jess); if lost, Reset Token there. IDs: CLIENT_ID `1529480366069383408`, GUILD_ID `1399382584101703723`.
2. **`data/family.db`** (gitignored) — the real enrollment data lives only on the machine that ran the bot. Copy `data/family.db` from the old machine to keep the records; otherwise the bot starts empty (schema is recreated by migrations automatically).
3. **Git credentials** — the remote is pinned to the mj-jess account. If the machine has multiple GitHub accounts on `gh`, reproduce the repo-local helper:
   ```bash
   git config credential.helper '!f() { echo username=mj-jess; echo "password=$(gh auth token --user mj-jess)"; }; f'
   ```

Then: `npm install` → `npm start`. Run `npm run deploy` only when slash commands change.

⚠️ **Run the bot on ONE machine at a time** — two processes with the same token both receive every interaction and will double-handle events.

## Code standards

- **All code in English**: identifiers, comments, commit messages, file names, DB schema.
- **TypeScript everywhere** (strict mode, `noUncheckedIndexedAccess`). No plain JS.
- **All user-facing text in Brazilian Portuguese**, centralized in `src/messages.ts`. Never hardcode user-visible strings elsewhere. Console logs are developer-facing → English.
- **Prettier** enforces formatting (`npm run format`). Config: single quotes, print width 100.
- **Domain values are English enums** (`'sandy' | 'vinewood' | 'both'`); Portuguese labels come from `gymLabels` in `src/messages.ts`.
- **UI rule from Jess**: any data shown to users must be labeled `Chave: valor` (embed fields or explicit labels) — never bare values. Record headers are `passaporte — nome`.

## Tests

- Vitest, colocated: `foo.test.ts` next to `foo.ts`. Shared doubles in `src/enrollment/test-utils.ts` (fake button/select/modal interactions + payload inspectors).
- Repository tests use an in-memory SQLite DB via `createDatabase(':memory:')` — which runs the real migrations, so tests always exercise the production schema.
- Handlers take dependencies as parameters (repository, sessions) so tests pass fakes — keep new handlers dependency-injected.
- Run: `npm test` (CI mode) or `npm run test:watch`.

## Architecture

- `src/index.ts` — client bootstrap; routes `/academia-setup` + delegates every `enrollment:*` interaction to the dispatcher.
- `src/messages.ts` — every Portuguese string.
- `src/database.ts` — SQLite connection (better-sqlite3, WAL); applies migrations on open.
- `src/migrations.ts` — migration runner (`PRAGMA user_version` tracks the applied version).
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

- Plain SQL files in `migrations/`, named `<version>-<kebab-description>.sql`. Versions are strictly increasing integers. Applied automatically on boot.
- Each migration runs in a transaction; **never edit a migration that may already be applied** — add a new one.
- Applied so far: 001 enrollments table, 002 deactivation audit columns, 003 unique phone index, 004 settings table.

## Domain rules (enrollment)

- Enrollments are **never deleted** — only marked `active = 0`, recording who deactivated and when.
- Re-enrolling an inactive passport **reactivates** it (via Add: with new data; via card 🔄: keeping data). Reactivation clears the deactivation audit.
- Passport and phone are unique. Phone stored formatted `(999) 999-999`. Dates stored ISO (`yyyy-mm-dd`), displayed `dd/mm/yyyy`.

## Database roadmap (decided 2026-07-22)

- **Now**: SQLite on the prod VM's persistent disk — hosting on a real VPS removed the need to migrate yet.
- **When the web dashboard starts**: migrate to **Drizzle ORM + Postgres**. Free-tier plan: Neon (Postgres), dashboard on Vercel. Keep everything as close to R$0/month as possible — explicit constraint from Jess.
- The repository pattern + versioned migrations exist to keep that future migration cheap: only `database.ts`, `migrations.ts`, and repositories should need to change.
- Jess knows: GitHub hosts code only (Pages = static files, no bot process); a 24/7 bot needs a real host.

## Environment constraints

- Current machine (since 2026-07-22): Node 24.18.0 (LTS, via winget). better-sqlite3 is pinned to `^12.11.1` — the newest npm release with prebuilt Windows binaries for Node 24 (ABI 137); v13.x ships no prebuilds yet and would require Python + VS Build Tools to compile. Vitest stays on v3 (v4 bump untested, optional).
- The repo sets `core.autocrlf false` locally (Git for Windows' system config sets it to `true`, which checks files out as CRLF and breaks `prettier --check`). On a fresh clone, run `git config core.autocrlf false` before anything else.

## Checks before finishing any task

```bash
npm run typecheck && npm test && npm run format:check
```
