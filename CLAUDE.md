# dagskra-mcp

Remote MCP server exposing the broadcast schedule (dagskrá) of Icelandic TV channels.
Runs on a Cloudflare Worker, **live at `https://dagskra.9z.is/mcp`**. Clients connect over
the internet — no local install.

## Status
- **Live & deployed.** GitHub: `git@github.com:HermannBjorgvin/dagskra.git` (branch `main`).
- **Covered: 21 channels** — RÚV (+ RÚV 2); Sýn + 18 sport channels. See "Data sources".
- **Out of scope:** Sjónvarp Símans (no public schedule feed).
- **Paused:** Alþingi (parliament) — removed pending better support (sittings have no
  published end and can run past midnight; needs live end-time tracking). Source dossier
  kept in agent memory for re-adding.
- **Deploy is manual** (`npx wrangler deploy`, run by Hermann). The committed code can be ahead
  of the live worker — check before assuming a change is live.

## Architecture
```
Cron (daily 05:00 UTC) ─▶ source adapters ─▶ normalize ─▶ KV cache ─▶ McpAgent (/mcp)
```
- `src/index.ts` — Worker entry: routes `/mcp`, `/health`; `scheduled()` runs the cron.
- `src/mcp.ts` — `DagskraMCP extends McpAgent` (Cloudflare Agents SDK). Tools + resources.
- `src/cache.ts` — KV read with fetch-on-miss; `refreshAll()` warms the forward window.
- `src/sources/{ruv,syn}.ts` — fetch + parse one source into `Program[]` (`src/schema.ts`).
- `src/channels.ts` — the channel registry (id → source + upstream slug).
- MCP reads the **cache only** (via `getSchedule`), so query latency is decoupled from the
  sometimes-flaky upstreams.

## Tools & resources
- Tools: `list_channels`, `get_schedule(channel, date?)`, `whats_on(channel, at?)`,
  `search_programs(query, days?, channels?)`.
- Resources: `dagskra://channels` (catalog) and template `dagskra://schedule/{channel}/{date}`.

## Data sources (verified 2026-05-24)
- **RÚV** — `https://muninn.ruv.is/files/xml/{slug}/{from}/{to}/` (official XML). Slugs `ruv`,
  `ruv2` (TV); `ras1`/`ras2` are radio (unused). Times are Icelandic local = **UTC** (no DST).
- **Sýn** — `https://www.syn.is/api/epg/{slug}/{YYYY-MM-DD}` (JSON, Vercel-hosted, can be slow).
  Slugs: `syn`, `synsport`–`synsport6`, `synsportisland` (+ `2`–`5`), `synsportviaplay`,
  `kkitv1`–`6`. Full lineup discovered via `/api/epg/beint`. No `stod2*` slugs (those requests
  hang). Higher Ísland/KKI TV numbers are per-event overflow (often empty).
- **Alþingi** — *paused, not wired up.* Was `https://www.althingi.is/altext/xml/dagskra/`
  (official XML, ISO-8859-1). Full dossier in agent memory; re-add with live end-time tracking.
- **Original broadcaster sources only — never aggregators** (sjonvarp.is, apis.is). If a channel
  is only on an aggregator it's out of scope (why Omega and N4 were dropped).
- **Dead, do not use:** `apis.is/tv` (expired SSL), `api.stod2.is` (404, old host).

## Commands
- `npm test` — vitest (offline, deterministic parser tests).
- `npm run type-check` — `tsc --noEmit`.
- `npm run dev` — `wrangler dev` (local KV simulation, `http://localhost:8787/mcp`).
- `npx wrangler deploy` — deploy (Hermann runs the interactive auth himself).
- Test the MCP without a chat client: `node scripts/smoke.mjs` (override host with `MCP_URL=…`),
  or `npx @modelcontextprotocol/inspector` then set Transport "Streamable HTTP" + the /mcp URL.

## Conventions
- npm/npx (not pnpm/yarn). ESM; imports use `.js` extensions.
- **All API/interface strings are English** — error messages, display labels (e.g. `LIVE`,
  `episode`), and placeholders like `(unknown)`. Only **upstream content** stays in its
  original Icelandic: program titles, descriptions, categories, and channel/station names.
- Commit incrementally with a clean, readable history (Conventional Commits) — this matters here.
- Surface tradeoffs before fighting a library's conventions; surgical changes only.

> Persistent cross-session notes live in the agent memory dir (see MEMORY.md there):
> user profile, project decisions, the full data-source dossier, and the agentic workflow.
