# Map Runtime Contract Fixes — Execution Plan

> **For Claude:** When implementing, follow PARADOX_RULES.md: concrete phases with todos, refactor-pass between phases, delegate to Paradox roles, run tests and produce report, update napkin/ledger/docs, commit per phase.
>
> **Plan discipline:** (1) **Read** this plan at the start of implementation and at the start of each phase. (2) **Write** back to this plan as you go: check off completed todos (change `- [ ]` to `- [x]`), add a short "Status" or "Done" note under a phase when the phase is complete, and update the Summary checklist at the bottom. Do not leave the plan stale.
>
> **Refactor-pass:** After each of Phase A, B, C, run the **refactor-pass** workflow (see "Refactor-pass and code-simplifier" below). Use the checklist there; then run `npx tsc --noEmit`, `npx vitest run`, `npm run desktop:map:build`.
>
> **Code-simplifier:** When writing or modifying code in any phase, apply the **code-simplifier** skill: preserve functionality, follow project standards (CLAUDE.md), reduce nesting and duplication, avoid nested ternaries, prefer clarity over brevity. Refine recently modified code before considering the phase complete.

**Goal:** Resolve all issues from the 2026-03-03 map investigation: desktop build path vs Electron route, density-mode interactions, layer-binding race, protocol routes for `/data/runs` and `/data/source`, and Tailwind/build warnings—so the map runs correctly in both dev and desktop.

**Architecture:** Phases A–D address runtime contracts (build output, protocol routes, interaction binding lifecycle). Phase E adds tests and documentation. No canon or simulation logic changes; map and desktop only.

**Tech Stack:** Vite (map + warroom), Electron, MapLibre GL JS, Zustand, React. Data: `/data/derived`, `/data/source`, `/data/runs`; protocol `awwv`. **Desktop map loading:** Local HTTP server on 127.0.0.1 (random port) — see Architecture decision below.

**Authority:** Orchestrator owns sequencing; Technical Architect / Build Engineer / Graphics Programmer / UI-UX Developer own implementation slices. Process QA after handoffs.

---

## Architecture decision: HTTP server for map (implemented, uncommitted)

**Root cause:** MapLibre's blob Web Workers do not function under Electron's custom `awwv://` protocol scheme.

**Solution:** Local HTTP server on `127.0.0.1` with a random port. Map and warroom load map assets (PMTiles, GeoJSON, style) from `http://127.0.0.1:<port>/...` instead of `awwv://`.

**Status:** Confirmed working. Test harness `tools/test_electron_map.cjs` shows: 27 PMTiles Range requests, both tile archives loading, mun-borders GeoJSON loading, WebGL OK.

**Files modified (not yet committed):**
- `src/desktop/electron-main.cjs` — HTTP server, `data/source` route, DEBUG cleanup
- `src/ui/map/map/MapContainer.tsx` — reverted PMTiles pre-registration, simplified URL rewriting
- `src/ui/warroom/warroom.ts` — dynamic iframe URL via IPC
- `src/desktop/preload.cjs` — `getMapServerUrl` IPC method

**What remains (before considering Phase C complete):**
- Full end-to-end test of `electron-main.cjs` (warroom + tactical map window + iframe)
- Clean up test files (`test_maplibre_*.cjs` / `*.html`)
- Type check + test suite pass
- Commit (single commit per plan guidance, or split: "feat(desktop): HTTP map server for MapLibre workers" then phase-specific commits)

---

## Issue summary (from investigation)

| # | Severity | Issue | Target phase |
|---|----------|--------|--------------|
| 1 | Critical | Desktop map build outputs to `src/ui/map/dist`; Electron expects `dist/tactical-map` | A |
| 2 | High | Density mode: no click/hover on `osid-density-fill` | B |
| 3 | High | Interaction binding runs once; layers added later → front-edge/ethnic can stay dead | B |
| 4 | High | Load run: `/data/runs/<id>/final_save.json` not served in Electron | C |
| 5 | Medium | Style `mun-borders` uses `/data/source/boundaries/...`; `awwv://app` has no source route | C |
| 6 | Medium | Glyphs point to external URL (offline risk) | D (document only) |
| 7 | Medium | `desktop:map:build` Tailwind content warning | A |

---

## Phase A: Build output and Tailwind (Build Engineer + Platform Specialist)

**Owner:** Build Engineer. **Review:** Technical Architect.

**Deliverables:**
- Map Vite build outputs to `dist/tactical-map` when run via root `desktop:map:build`.
- No Tailwind "content missing" warning when running `desktop:map:build` from repo root.

**Todos:**
- [x] A1 — In `src/ui/map/vite.config.ts` (or root vite config used by `desktop:map:build`), set `outDir` so build writes to repo root `dist/tactical-map`. If the config is under `src/ui/map/`, use `path.resolve(__dirname, '../../../dist/tactical-map')` so `vite build --config src/ui/map/vite.config.ts` from root produces `dist/tactical-map/`.
- [x] A2 — Ensure `desktop:map:build` is run from repo root and that `dist/tactical-map` is created (run script, list `dist/tactical-map`).
- [x] A3 — Fix Tailwind content warning: when Vite is invoked from root with `--config src/ui/map/vite.config.ts`, Tailwind may resolve `content` paths from root. Adjust `tailwind.config.ts` in `src/ui/map/` to use paths relative to config file (e.g. `path.join(__dirname, '...')`) or add a root-level Tailwind config that explicitly includes map sources for the desktop build. Choose one approach and document in plan.
- [x] A4 — Run `npx tsc --noEmit`, `npx vitest run`, `npm run desktop:map:build`; confirm no regressions.
- [x] A5 — Refactor-pass (dead code, duplicate config). Re-run gates.
- [x] A6 — Ledger entry (blast-radius: build output path, desktop map load). Commit: "fix(map): align desktop map build output with dist/tactical-map".

**Files:** `src/ui/map/vite.config.ts`, `src/ui/map/tailwind.config.ts`; possibly root `vite.config.*` if used.

**Determinism:** Build output path change only; no simulation or ordering impact.

---

## Phase B: Map interactions — density + layer-aware binding (UI/UX Developer + Graphics Programmer)

**Owner:** UI/UX Developer. **Review:** Graphics Programmer, QA Engineer.

**Deliverables:**
- In density map mode, OSID click/hover/tooltips work (same behavior as political/ethnic).
- Front-edge and ethnic layer interactions attach reliably even when those layers are added after first paint (e.g. after loadedGameState).

**Todos:**
- [ ] B1 — **Density:** In `src/ui/map/map/useMapInteractions.ts`, add the same `safeOn` / `safeOff` bindings for `osid-density-fill` as for `osid-control-fill` and `osid-ethnic-fill` (click, mousemove, mouseleave with handleOsidClick, handleOsidMouseMove, handleOsidMouseLeave). Ensure cleanup in the returned function unregisters density listeners.
- [ ] B2 — **Layer-aware binding:** Introduce a small helper or effect in `MapContainer` that (a) knows the set of “interaction layers” (osid-control-fill, osid-ethnic-fill, osid-density-fill, front-edges-hover-pos, front-edges-hover-neg), (b) after map is ready, either polls or subscribes to style/layer load and (c) (re)registers interactions when a layer appears. Alternative: call `useMapInteractions` from an effect that depends on a “layers ready” signal (e.g. when all of these layers exist), and re-run the effect when that signal flips. Implement one approach; document in code comment.
- [ ] B3 — Ensure `useMapInteractions` is still cleaned up on unmount and when map ref is lost; no duplicate handlers.
- [ ] B4 — Manual smoke: load save → switch to density mode → click/hover OSIDs → switch to ethnic → click/hover → open sector (front-edge click). Confirm tooltips and selection.
- [ ] B5 — Refactor-pass in `useMapInteractions.ts` and `MapContainer.tsx` (no dead code, clear naming). Run `npx tsc --noEmit`, `npx vitest run`, `npm run desktop:map:build`.
- [ ] B6 — Ledger entry (blast-radius: map interactions, density mode, front-edge/ethnic). Commit: "fix(map): density OSID interactions and layer-aware interaction binding".

**Files:** `src/ui/map/map/useMapInteractions.ts`, `src/ui/map/map/MapContainer.tsx`.

**Determinism:** UI event handling only; no simulation or ordering impact.

---

## Phase C: Protocol / HTTP routes — /data/runs and map data (Platform Specialist + Technical Architect)

**Owner:** Platform Specialist. **Review:** Technical Architect.

**Deliverables:**
- Electron serves `/data/runs/<runId>/final_save.json` for map (and warroom if needed) so “Load run” works in desktop.
- Standalone map (`awwv://app/*`) can load `mun-borders` and any style reference to `/data/source/...` (e.g. boundaries).

**Todos:**
- [ ] C1 — **Runs route:** In `src/desktop/electron-main.cjs`, add `/data/runs` (or `data/runs`) handling to the **HTTP server** (same path-traversal guard as derived/source). Resolve to project-root `runs/` or `data/runs/`, serve with `Content-Type: application/json`. Reuse or share `isPathInside` and response helpers used for derived/source.
- [ ] C2 — **Source route:** Already implemented on HTTP server (see "Architecture decision" above). Confirm mun-borders and any `/data/source/...` requests return 200 in E2E.
- [ ] C3 — E2E: warroom + tactical map window + iframe load; confirm 27 PMTiles Range, both tile archives, mun-borders GeoJSON, WebGL OK (per `tools/test_electron_map.cjs`). Then full desktop run, "Load run" with known run ID.
- [ ] C4 — Clean up test files: `test_maplibre_*.cjs`, `test_maplibre_*.html` (remove or consolidate). Type check + test suite pass. Ledger entry. Commit: "feat(desktop): HTTP map server for MapLibre workers; data/source + runs route".

**Files:** `src/desktop/electron-main.cjs`, `src/desktop/protocol_data_route.cjs` (or equivalent).

**Determinism:** I/O routes only; no simulation or ordering impact.

---

## Phase D: Glyphs and style contract (Documentation + optional hardening)

**Owner:** Documentation Specialist; optional implementation by Build Engineer.

**Deliverables:**
- Document glyph dependency and offline/air-gap limitation; optionally add a single “style contract” check that validates required sources/layers exist after style load.

**Todos:**
- [ ] D1 — In `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` or `DESKTOP_GUI_IPC_CONTRACT.md`, add a short subsection: “Glyphs: style uses `https://demotiles.maplibre.org/...`. Offline/air-gapped deployments will not have labels unless glyphs are bundled and style updated.” No code change required for D1.
- [ ] D2 — (Optional) In map init (e.g. after style load in `MapContainer`), add a one-time check: required source IDs (`osid-control`, `front-lines`, `formations`, `order-arrows`) and key layer IDs exist; log a clear warning or set a non-blocking error state if missing. Keeps future style changes from silently breaking. If implemented, add to ledger and commit.

**Files:** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` or `DESKTOP_GUI_IPC_CONTRACT.md`; optionally `src/ui/map/map/MapContainer.tsx`.

---

## Phase E: Tests and report (QA Engineer + Process QA)

**Owner:** QA Engineer. **Process QA:** Invoke quality-assurance-process after Phase E.

**Deliverables:**
- Vitest tests for density-mode interaction wiring and (if feasible) for “Load run” route returning 200 for a fixture path.
- Full implementation report under `docs/40_reports/implemented/`.

**Todos:**
- [ ] E1 — Add or extend test: “map interactions include osid-density-fill” (e.g. in a describe that mocks the map and checks that handlers are registered for osid-density-fill when present). Prefer unit test in `src/ui/map` or `tests/` as appropriate.
- [ ] E2 — Add or extend desktop protocol test: request to `awwv://app/data/runs/<safe-id>/final_save.json` (or equivalent) with a temp file returns 200 and correct body when path is allowed; path traversal returns 403. Reuse pattern from `tests/desktop_pmtiles_protocol_route.test.ts`.
- [ ] E3 — Run full gate: `npx tsc --noEmit`, `npx vitest run`, `npm run desktop:map:build`, and (if available) open desktop and smoke “Load run” + density mode.
- [ ] E4 — Write `docs/40_reports/implemented/20260303_MAP_RUNTIME_CONTRACT_FIXES.md`: what was fixed (phases A–D), files changed, decisions (e.g. build outDir, binding strategy), verification evidence, and “Decisions for review” if any (e.g. Tailwind resolution from root).
- [ ] E5 — Update `docs/40_reports/README.md` to link the new report.
- [ ] E6 — Invoke Process QA (quality-assurance-process) for this execution: context/napkin/ledger/commit discipline.
- [ ] E7 — Final ledger entry and napkin update; commit: "docs: add map runtime contract fixes report and tests".

**Files:** `tests/` (new or updated), `docs/40_reports/implemented/20260303_MAP_RUNTIME_CONTRACT_FIXES.md`, `docs/40_reports/README.md`, `docs/PROJECT_LEDGER.md`, `.claude/napkin.md`.

---

## Refactor-pass and code-simplifier

**When:** After **each** of Phase A, B, C (and optionally after D if code was added). Before considering a phase complete, also apply code-simplifier to recently modified files.

**Refactor-pass checklist** (run in order):

1. **Dead code:** Remove unused imports, interfaces, types, functions, and variables. If something is only referenced by other dead code, remove the entire chain.
2. **Duplication:** If two or more blocks share near-identical logic, extract a shared helper. Name it clearly and co-locate it with the callers.
3. **Over-engineered stubs:** Remove functions that only wrap a single constant or trivially delegate. Inline the constant or call directly.
4. **Unnecessary complexity:** Simplify conditionals, flatten nested ifs, remove redundant guards. Prefer early returns.
5. **Backward-compat shims:** If old names were kept just for compatibility but nothing imports them, delete them entirely. No `_unused` variables or `// removed` comments.

**Code-simplifier** (skill): Apply to recently modified code. Preserve exact functionality; follow project standards (CLAUDE.md); reduce nesting and duplication; avoid nested ternaries (prefer switch or if/else); prefer clarity over brevity. Focus only on code touched in the current phase.

**Verification after refactor-pass:**
- `npx tsc --noEmit` — must pass clean.
- `npx vitest run` — all tests must pass.
- `npm run desktop:map:build` — must succeed (when applicable).

**Output:** Briefly note in the plan or report what was removed, extracted, or simplified (and before/after line counts if significant).

---

## Ledger and napkin

- **Before implementation:** Append to `docs/PROJECT_LEDGER.md`: “[2026-03-03] Map runtime contract fixes (plan). Blast-radius: build output path, map interactions, desktop protocol routes, Load run, mun-borders. Plan: docs/plans/2026-03-03-map-runtime-contract-fixes.md.”
- **After each phase:** Append phase completion line and files modified.
- **Napkin:** Add/update entries in `.claude/napkin.md`: (1) Desktop map uses local HTTP server (127.0.0.1, random port) because MapLibre blob workers do not work under awwv://; (2) Desktop map build must output to `dist/tactical-map` for Electron; (3) Map interaction layers (control, ethnic, density, front-edges) must be bound when present—prefer layer-aware or “layers ready” re-registration; (4) HTTP server serves `data/source` and (after C1) `data/runs` for map and standalone app.

---

## Execution order and handoffs

**Plan discipline:** At the **start** of implementation and at the **start of each phase**, read this plan (goal, phase deliverables, todos). As you complete each todo, **update this plan file**: change `- [ ]` to `- [x]` for that todo; when a full phase is done, add a one-line "**Done:** &lt;date&gt; — &lt;summary&gt;" under that phase's Deliverables or at the end of its Todos. Update the Summary checklist at the bottom so the plan stays the single source of truth for progress.

| Step | Who | Action |
|------|-----|--------|
| 1 | Orchestrator | Confirm plan and single priority: Phase A → B → C → D → E. |
| 2 | Build Engineer | Execute Phase A (build path + Tailwind). **Read** plan; **write** plan (check off todos as done). |
| 3 | Refactor + code-simplifier | After A: run **refactor-pass** checklist and **code-simplifier** on modified files; then gates (`tsc`, `vitest`, `desktop:map:build`). Update plan with refactor summary if significant. |
| 4 | UI/UX Developer | Execute Phase B (density + layer-aware binding). **Read** plan; **write** plan (check off todos). |
| 5 | Refactor + code-simplifier | After B: refactor-pass + code-simplifier; gates. Update plan. |
| 6 | Platform Specialist | Execute Phase C (protocol routes). **Read** plan; **write** plan (check off todos). |
| 7 | Refactor + code-simplifier | After C: refactor-pass + code-simplifier; gates. Update plan. |
| 8 | Documentation Specialist | Execute Phase D (glyphs doc + optional style check). **Read** plan; **write** plan. |
| 9 | QA Engineer | Execute Phase E (tests + report). Process QA after E. **Read** plan; **write** plan. |
| 10 | Ledger / napkin | Update throughout and final commit. |

---

## STOP AND ASK

- If any change touches canon (phase specs, invariants, Systems Manual): STOP AND ASK with conflict list.
- If build path change would break an existing CI or packaging script: STOP AND ASK with script name and proposed change.
- If protocol route addition introduces a new security surface (e.g. serving arbitrary paths): STOP AND ASK; path traversal guard is non-negotiable.

---

## Summary checklist

- [x] Phase A: Build output `dist/tactical-map`, Tailwind warning gone.
- [x] Phase B: Density interactions + layer-aware binding.
- [x] Phase C: HTTP server serves `/data/runs`; data/source + mun-borders already done; E2E + test file cleanup + commit.
- [ ] Phase D: Glyphs documented; optional style contract.
- [ ] Phase E: Tests added, report written, Process QA run, ledger/napkin updated, final commit.
