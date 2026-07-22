# Família Bot — Project Standards

Discord bot for a GTA RP family server. First feature: gym enrollment management (Sandy / Vinewood).

## Code standards

- **All code in English**: identifiers, comments, commit messages, file names, DB schema.
- **TypeScript everywhere** (strict mode, `noUncheckedIndexedAccess`). No plain JS.
- **All user-facing text in Brazilian Portuguese**, centralized in `src/messages.ts`. Never hardcode user-visible strings elsewhere. Console logs are developer-facing → English.
- **Prettier** enforces formatting (`npm run format`). Config: single quotes, print width 100.
- **Domain values are English enums** (`'sandy' | 'vinewood' | 'both'`); Portuguese labels come from `gymLabels` in `src/messages.ts`.

## Tests

- Vitest, colocated: `foo.test.ts` next to `foo.ts`.
- Repository tests use an in-memory SQLite DB via `createDatabase(':memory:')`.
- Interaction handlers take their dependencies as parameters (e.g. `handleAddModalSubmit(interaction, repository)`) so tests can pass fakes — keep new handlers dependency-injected.
- Run: `npm test` (CI mode) or `npm run test:watch`.

## Architecture

- `src/index.ts` — client bootstrap + interaction routing (custom IDs are namespaced: `enrollment:*`).
- `src/messages.ts` — every Portuguese string.
- `src/database.ts` — SQLite connection (better-sqlite3, WAL); applies migrations on open.
- `src/migrations.ts` — migration runner (`PRAGMA user_version` tracks the applied version).
- `src/enrollment/` — feature module: `panel.ts` (fixed message), `add-modal.ts` (form + handler), `repository.ts` (queries), `format.ts` (phone/date helpers), `types.ts`.
- New features follow the same shape: one directory per feature, strings in `messages.ts`, repository pattern for DB access.

## Migrations

- Plain SQL files in `migrations/`, named `<version>-<kebab-description>.sql` (e.g. `002-add-points-table.sql`). Versions are strictly increasing integers.
- Applied automatically on boot (and in tests via `createDatabase(':memory:')` — tests always run against the real schema).
- Each migration runs in a transaction; **never edit a migration that may already be applied** — add a new one.

## Database roadmap (decided 2026-07-22)

- **Now**: SQLite. A single bot process with light writes doesn't need more, and hosting is still undecided.
- **When hosting is decided** (or when the planned web dashboard starts): migrate to **Drizzle ORM + Postgres**. Free-tier plan: Neon (Postgres), bot on Oracle Always Free VPS or a home machine, dashboard on Vercel. Keep everything as close to R$0/month as possible — that's an explicit constraint from Jess.
- The repository pattern + versioned migrations exist precisely to keep that future migration cheap: only `database.ts`, `migrations.ts`, and repositories should need to change.

## Domain rules (enrollment)

- Enrollments are **never deleted** — only marked `active = 0` (deactivated).
- Re-enrolling an inactive passport **reactivates** it with the new data.
- Passport is unique. Phone is stored formatted as `(999) 999-999`. Dates stored as ISO (`yyyy-mm-dd`), displayed as `dd/mm/yyyy`.

## Environment constraints

- Node 22.2.0 — this pins better-sqlite3 to v11 and vitest to v3 (newer majors need Node ≥22.12; segfault/rolldown failures otherwise). If Node gets upgraded, these can be bumped.
- Before running: `.env` with `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` (see `.env.example`).

## Checks before finishing any task

```bash
npm run typecheck && npm test && npm run format:check
```
