# LANE-2026-05-02-A1-PER-TURN-BRIGADE-SNAPSHOT — Per-Turn Brigade-Keyed Observability Log

**Date:** 2026-05-02
**Status:** RESOLVED. Pure observability emit added to scenario harness; no engine behavior change. Hash byte-identical to predecessor 40w lineage (expected null result confirmed).
**Predecessor:** `173dd94d` KRIVAJA_BRIGADE_LIFECYCLE — successor handoff #1 (per-turn brigade-keyed snapshot emission, Ring 1, no § 6).
**Verification commit:** *(this commit)*

## Lane summary

The Krivaja-95 lifecycle lane (`173dd94d`) and the temporal-trace lane (`1e68d8dc`) both encountered the same artifact gap: per-turn brigade-keyed snapshots are NOT preserved in run artifacts. Only `weekly_report.jsonl` (op-aggregate counters), `final_save.json` (terminal state), and `destroyed_brigades.json` (terminal aggregate) are emitted. This blocks classification of "active throughout but absent from late-game ops" gaps such as `rs_1st_milii` in n1619.

This lane adds a deterministic, write-only, per-turn × per-brigade snapshot emit to the scenario harness. It is pure observability — no engine state mutation, no GameState shape change, no save-load impact, no run-hash impact. Always-on (no flag) per /technical-architect verdict; cost is well within `weekly_report.jsonl` precedent.

## Phase 0 — three-investigator design (parallel)

### `/scenario-harness-engineer` — emit design + cost model

- **Per-row payload:** ~280 bytes average (OSID strings dominate).
- **Cost projections:** 40w ≈ 1.8 MB; 188w ≈ 8.5–11.3 MB. Actual 40w smoke: 4.3 MB / 8,539 lines (~213 brigades/turn × 40 turns). Projected 188w ≈ 20 MB.
- **Output file:** `<run_dir>/brigade_temporal_log.jsonl` (one row per brigade per turn, mirrors `weekly_report.jsonl` JSONL format).
- **Schema:** 20 fixed fields — `turn`, `week_index`, `brigade_id`, `faction`, `corps_id`, `kind`, `status`, `lifecycle_status`, `location_osid`, `home_osid`, `sector_id`, `assigned_sub_segment_id`, `mv_state`, `mv_destinations`, `active_op_id`, `current_op_phase`, `personnel`, `morale`, `cohesion`, `fatigue`.
- **Implementation:** new `src/scenario/brigade_temporal_emit.ts` exporting `buildBrigadeTemporalRows(state, weekIndex)`; harness wiring in `src/scenario/scenario_runner.ts` (path constant, WriteStream, per-turn emit, close, return).
- **Filter rule:** brigade-kind formations only (`kind === 'brigade'` or undefined for backward compat). Corps / militia / paramilitary / OG / corps_asset / army_hq / phantom filtered out — they have separate lifecycles.

### `/determinism-auditor` — pre-flight emit-path determinism review

- **Determinism contract:** strictCompare-sorted brigade iteration, strictCompare-sorted `mv_destinations`, fixed JSON key sequence per row, `stableStringify` on serialization (defense in depth against V8 insertion-order assumptions), `createWriteStream({flags:'w'})` opened once + appended sequentially + closed at end-of-run.
- **Forbidden tokens:** no `Math.random`, `Date.now`, `new Date`, `performance.now`, `process.hrtime`, `localeCompare`, `Intl.*`, `os.EOL` in emit content, no `fs.readdir`/glob.
- **strictCompare citation:** `src/state/turn_phases.ts:29` (canonical export, JSDoc cites Engine Invariants §11.3).
- **Existing precedent:** `weekly_report.jsonl` at `scenario_runner.ts:1593-1597` (open) / `:2118` (write) / `:2154` (close). Brigade-keyed iteration precedent at `:1585`: `for (const id of Object.keys(state.military.formations ?? {}).sort(strictCompare))`.
- **Save/load:** disk-only; does NOT touch save_state schema, GameState mutation, or serialized fields.
- **Run hash:** `final_state_hash` is computed over `serializeState(state)`; disk artifacts are not in the hash domain → zero hash impact.
- **Pre-flight verdict:** **WELL-PRECEDENTED. No novel determinism plumbing required.**

### `/technical-architect` — emit pipeline placement

- **Canonical owner:** scenario harness (`src/scenario/scenario_runner.ts`), NOT engine. The engine pipeline does not know `weekly_report.jsonl` exists; the new emit must follow the same convention.
- **Placement:** harness emit block at `scenario_runner.ts:2118` vicinity, AFTER `runTurn` returns (so all 151 war steps + briefing tail have completed: `update-formation-lifecycle`, `check-brigade-dissolution`, `reconstitute-brigades`, `apply-brigade-movement`, `assign-brigades-to-subsegments`, `advance-sector-offensives`, `assemble-command-briefing`, `reconcile-final-sector-truth-after-ops`).
- **Layer hygiene verdict (a):** callback / direct harness call. Pattern (b) (transient state field) violates "GameState is single source of truth, no derived state in saves" (Engine Invariants §13.1).
- **Always-on:** 4.5 MB / 188w (estimate; actual ~20 MB) is within `weekly_report.jsonl` precedent. Flags are technical debt; only add one if disk pressure becomes real.
- **Scope guard:** brigades only. Corps / sectors / ops have separate lifecycles and need separate emits if they become observability targets.

## Phase 1 — red-first tests

`tests/brigade_temporal_emit.test.ts` (9 tests):

| Test | Purpose | Pre | Post |
|---|---|---|---|
| T1 schema_lock | exact field set + types on a built row | RED | GREEN |
| T2 deterministic_byte_identity | two builds produce identical JSONL | RED | GREEN |
| T3 stable_brigade_ordering | strictCompare-sorted, faction-agnostic interleave | RED | GREEN |
| T4 active_op_attribution | brigade in any corps active_operations → active_op_id set | RED | GREEN |
| T5 mv_state_passthrough | brigade_movement_state and orders surface on row | RED | GREEN |
| T6 lifecycle_status_passthrough | destroyed brigade reflected | RED | GREEN |
| T7 empty_state | empty formations returns [] | RED | GREEN |
| T8 forbidden_token_grep | no `Math.random`/`Date.now`/`new Date`/`performance.now`/`localeCompare`/`Intl.` in emit source | RED (one false-positive on doc literal token list — fixed by rewriting doc to non-literal phrasing) | GREEN |
| T9 non_brigade_kind_filter | only brigade-kind formations are emitted | RED | GREEN |

Pre-implementation RED confirmed (file did not exist). Post-implementation **9/9 GREEN** in 8ms.

## Phase 2 — implementation

### `src/scenario/brigade_temporal_emit.ts` (NEW)

Exports `BrigadeTemporalRow` type + `buildBrigadeTemporalRows(state, weekIndex): BrigadeTemporalRow[]` pure function. Imports `strictCompare` from `src/state/turn_phases.ts` (canonical).

Implementation invariants:
- `Object.keys(state.military.formations).sort(strictCompare)` for brigade iteration.
- `kind !== 'brigade'` filter (allows undefined for backward compat → treated as 'brigade').
- `Object.keys(state.military.corps_command).sort(strictCompare)` for corps iteration during active-op attribution; first-match wins (architecturally a brigade can be in only one op at a time, but defended for stability).
- `mv_destinations` sorted via strictCompare.
- All optional fields default to `null` rather than `undefined` for stable JSON shape.
- Row-key insertion order is fixed in source; downstream `stableStringify` enforces alphabetized output regardless.

### `src/scenario/scenario_runner.ts` (PATCH, 7 small edits)

1. Import `buildBrigadeTemporalRows`.
2. `RunScenarioResult.paths` interface: add `brigade_temporal_log: string;`.
3. Early-return paths block: add `brigade_temporal_log: join(outDir, 'brigade_temporal_log.jsonl')`.
4. Path constant: add `const brigadeTemporalLogPath = join(outDir, 'brigade_temporal_log.jsonl')`.
5. `WriteStream` opened alongside `reportStream` (line 1596 vicinity).
6. Per-turn emit alongside weekly_report write (line 2118 vicinity).
7. Stream close + final-return paths registration alongside reportStream.end().

Each edit lane-tagged. No engine code touched.

## Phase 3 — verification

- **Lane tests:** `tests/brigade_temporal_emit.test.ts` 9/9 PASS in 8ms.
- **Focused regression:** 18/18 PASS across 3 suites (`brigade_temporal_emit`, `triggered_op_temporal_contract`, `krivaja_brigade_lifecycle_diagnostic`).
- **Typecheck:** `npx tsc --noEmit -p tsconfig.json` clean.
- **40w smoke:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1620` hash `0c2fc264112dec1f` — **byte-identical** to predecessor 40w lineage (n1610 / n1616 / n1618). brigade_temporal_log.jsonl emitted at 4,277,040 bytes / 8,539 lines (turn=1 first row → turn=40 last row, ~213 brigades/turn).
- **`/scenario-creator-runner-tester` verdict:** **PASS**. Hash byte-stability confirmed. Cost in-band with `weekly_report.jsonl` precedent. No anomalies suggesting harness wiring mutates state. Schema validated against first/last row of emitted log.

## Stop-gate compliance

| # | Gate | Status |
|---|---|---|
| 1 | NO behavior change | ✓ — hash byte-identical to predecessor |
| 2 | NO new state mutation | ✓ — pure read-only projection |
| 3 | NO combat math touched | ✓ |
| 4 | NO new sim step | ✓ — emit lives in harness, not engine pipeline |
| 5 | NO Math.random / Date.now / new Date | ✓ — T8 static-grep enforces |
| 6 | NO faction-specific hardcode | ✓ — pure read of formation primitives |
| 7 | NO sensitive-history surface | ✓ — Ring 1 observability |
| 8 | NO save/load schema change | ✓ — emit is to disk artifact only |
| 9 | NO run-hash impact | ✓ — confirmed by smoke |
| 10 | NO Codex UI files | ✓ |
| 11 | NO `--no-verify` | ✓ |

## Sensitive-history compliance

- **Ring 1.** Pure read-only observability. No engine mutation. No rupture / enclave / OOB / controller flips.
- **No § 6 sign-off required.** /game-designer pre-classified per `20260502_KRIVAJA_BRIGADE_LIFECYCLE.md` Phase 2 closure verdict (handoff #4: "pure observability, no Section 6").
- **§ 8.3 distinction (a) preserved.** No outcome tuning. By construction.

## Hash drift class

**No hash drift.** GameState unchanged. 40w smoke `0c2fc264112dec1f` byte-identical to n1610/n1616/n1618.

## Files changed

- NEW: `src/scenario/brigade_temporal_emit.ts` (~140 LOC, pure builder)
- NEW: `tests/brigade_temporal_emit.test.ts` (9 tests, ~270 LOC)
- NEW: `docs/40_reports/implemented/20260502_PER_TURN_BRIGADE_SNAPSHOT.md` (this report)
- PATCH: `src/scenario/scenario_runner.ts` (7 small edits: import, type, paths block, path constant, WriteStream open, per-turn emit, close + final-return)
- PATCH: `docs/PROJECT_LEDGER.md` (entry appended at top)
- PATCH: `.claude/napkin.md` (Current State prepended)

## Cross-lane attribution

- Emit design + cost model: `/scenario-harness-engineer`.
- Determinism pre-flight: `/determinism-auditor`.
- Pipeline placement + layer-hygiene verdict: `/technical-architect`.
- Smoke verification: `/scenario-creator-runner-tester`.
- Synthesis: `/orchestrator` (this lane).

## Successor handoffs (carrying over from `173dd94d`)

This lane closes handoff #4 (per-turn brigade-keyed snapshot emission). Remaining KRIVAJA_BRIGADE_LIFECYCLE handoffs:

1. **(2) Reconstitution policy review** (Ring 1 if corps-agnostic, no § 6) — owner /systems-programmer + /game-designer Ring-boundary check; full calibration regression required.
2. **(3) OOB seeding for `rs_skelani_battalion`** (Ring 2, § 6 REQUIRED) — owner /historian + /game-designer; ICTY-citation question.
3. **(1) Bot AI op-generator awareness of triggered-op rosters** (Ring 3, § 6 REQUIRED, BLOCKED until reframed faction-agnostic).

## Future use

The diagnostic at `tools/diagnostics/krivaja_brigade_lifecycle.cjs` can now be enhanced (in a future lane) to consume `<run_dir>/brigade_temporal_log.jsonl` for per-turn classification of `unknown_inactive` brigades like `rs_1st_milii` (currently classified as such because terminal artifacts cannot disambiguate "active throughout but late-game idle" from other lifecycle paths). Out of scope for this lane.
