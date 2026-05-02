# LANE-2026-05-02-KRIVAJA-BRIGADE-LIFECYCLE — Krivaja-95 Roster Collapse Diagnosed; Close as Diagnostic with Named Handoffs

**Date:** 2026-05-02
**Status:** RESOLVED-as-diagnostic. No generic lifecycle bug proven; lifecycle subsystems operate correctly given upstream causes. Diagnostic + structural test added. No engine code changed. Four successor handoffs named with Ring + § 6 classification.
**Predecessor:** `1e68d8dc` TRIGGERED_OP_TEMPORAL_TRACE — successor handoff #1 (named blocker: brigade-roster lifecycle).
**Verification commit:** *(this commit)*

## Lane summary

The previous lane proved that on the Krivaja-95 trigger turn (t179 in n1619), only 2 of 5 named participants are runtime-active — `rs_1st_milii` and `rs_5th_podrinje` — and that 3 named participants (`rs_1st_zvornik`, `rs_1st_bratunac`, `rs_skelani_battalion`) are INACTIVE/0-personnel before trigger evaluation. This lane explains, with deterministic repo evidence, exactly when and how each watched brigade reached that state, and decides whether any generic, canon-safe, deterministic engine repair is implementable inside the lane's stop gates.

**Verdict:** No generic lifecycle bug. Each lifecycle subsystem fired correctly given upstream causes. Per the lane brief: close as diagnostic/report lane with named successor handoffs; do not churn engine code; do not touch combat-math, enclave, rupture, OOB, painted targets, queued-order predicate, or calibration.

## Phase 0 — four-investigator audit (parallel)

### `/historian` — roster citation safety

All five Krivaja-95 brigades currently in catalog (`triggered_operations.ts:402-408`) trace to direct ICTY *Popović et al.* (IT-05-88-T) Trial Judgment paragraph text:

| Brigade | Primary citation | Supplementary |
|---|---|---|
| `rs_1st_zvornik` | Popović §244 | §245 fn 757; §247 (Pandurević / TG-1) |
| `rs_1st_bratunac` | Popović §244 | §245 fn 757 (Potočari blocking) |
| `rs_1st_milii` | Popović §244 | — |
| `rs_5th_podrinje` | Popović §244 | — |
| `rs_skelani_battalion` | Popović §244 | — |

All citations were verified by direct paragraph extraction (`pdftotext -layout`) on the corrective patch `98446604`, not subagent summary. Roster is a defensible subset of §244's eight-brigade preparatory-order list. Two §244-named brigades (1st Birac, Romanija) intentionally omitted with documented engineering rationale.

**Verdict: SAFE — no replacements or augmentations proposed.** § 6 sign-off grandfathered by `98446604` (lane brief contained a minor SHA error citing `8dec8f58`; provenance unchanged).

### `/operations-expert` — operational lifecycle per watched brigade (n1619 trace)

Source artifacts: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1619/{weekly_report.jsonl, operation_aars.json, destroyed_brigades.json, final_save.json}`.

| Brigade | Lifecycle path | Evidence |
|---|---|---|
| `rs_1st_zvornik` | **Destroyed t95 in honest combat.** Drina opener t0-6 (3/3 captured). Cerska-Kamenica axis kamenica t40-42 `planning_invalidated` (0 attacks). Then defender duty on Zvornik–Brčko corridor (battles t93/94/96/106). Dissolution t94 (cohesion=1, morale=1, personnel=400→reserve=399). Destroyed t95: 2358 total casualties, 6 battles, last location `op:zvornik:krizevici`. **Never participated in Krivaja-95 — destroyed 84 turns before trigger.** | `destroyed_brigades.json`; `weekly_report.jsonl[t94].brigade_dissolution[]` |
| `rs_1st_bratunac` | **Destroyed t101 in honest combat.** Drina opener (3/3). Podrinje Sweep t6-8 axis srebrenica_ring `planning_invalidated`. Cerska-Kamenica axis kamenica `planning_invalidated`. Probe t10-11. Then no further op participation; reactive defense / attrition on Srebrenica enclave perimeter. Dissolution t100, destroyed t101: 1335 cas / 4 battles, last location `op:srebrenica:osmace_2`. **Destroyed 78 turns before Krivaja trigger.** | `destroyed_brigades.json`; AAR participants list |
| `rs_skelani_battalion` | **Destroyed t171 by NON-COMBAT attrition. NEVER op participant. Fought 0 battles.** Bled out from frontline_attrition / supply / morale across t0-170. Dissolution t170 (cohesion=65, morale=10, personnel=236→reserve=118). Destroyed t171: 214 cas, 0 battles, last location `op:srebrenica:mala_daljegosta_2` (its own home OSID, inside Srebrenica enclave). **Destroyed 8 turns before Krivaja trigger, 1 turn before Stupčanica trigger.** | `destroyed_brigades.json` (battles_fought=0) |
| `rs_1st_milii` | **Active 2000 personnel at t188.** Drina, Podrinje Sweep, Cerska-Kamenica (all planning_invalidated). Stupčanica-95 t171-176 (max_failures, 1 attack). Krivaja-95 t178-184 (planning_invalidated, 0 attacks). At t188 idle at `op:sekovici:sekovici_2` (Šekovići, ~30 km north of staging). `mv_state=none mv_order=none` is post-Krivaja-conclusion idle. | `operation_aars.json`; `final_save.json` |
| `rs_5th_podrinje` | **Active 1336 personnel at t188.** Podrinje Sweep t6-8. Dissolution-to-reserve t85 (cohesion=0, no destruction record — partial dissolve). Rebuilt and re-fielded. Krivaja-95 t178-184 (planning_invalidated). Did NOT participate in Stupčanica. At t188 idle at `op:vlasenica:sebiocina` (~25 km west of staging). | AAR; `final_save.json` |

**Krivaja-95 runtime AAR participant list = exactly `[rs_1st_milii, rs_5th_podrinje]`** (ICTY-named destroyed brigades not even runtime-listed as participants).

**Movement-order trace** for the destroyed brigades cannot be reconstructed from preserved artifacts (no per-turn brigade-keyed snapshots). Operational lifecycle classification still possible from terminal aggregates + per-turn op participation rows.

### `/formation-expert` — lifecycle owner code path

Inventoried 10 distinct paths that can transition a brigade to INACTIVE/destroyed/dissolved/reconstituting. Canonical INACTIVE predicate is `formation.status === 'inactive'` AND `lifecycle_status === 'destroyed'` (`game_state.ts:597, 718`).

Per-watched-brigade classification:

| Brigade | Most-plausible path | File / function | Trigger |
|---|---|---|---|
| `rs_1st_zvornik` | Path #1: `dissolveCombatIneffectiveBrigades` | `brigade_dissolution.ts:76-177` | 2-of-3 thresholds met after catastrophic battle (nadir 100 personnel < absolute floor 150) |
| `rs_1st_bratunac` | Path #1 same | same | 2-of-3 thresholds met after attrition (morale=0, cohesion=18) |
| `rs_skelani_battalion` | Path #2: `updateStrandedBrigadeLifecycle` collapse | `stranded_brigade_lifecycle.ts:140-265` | Homed inside Srebrenica enclave at scenario start; BFS-unreachable to same-corps friendly territory; 0 battles_fought rules out dissolution path |
| `rs_1st_milii` | Active-throughout | — | — |
| `rs_5th_podrinje` | Path #1 partial-dissolve t85 → reconstituted → active at t188 | `brigade_dissolution.ts` + `brigade_reconstitution.ts` | Combat losses + recovery |

**No generic lifecycle bug.** Each subsystem operates correctly given upstream inputs. Owner ranking for next-phase work:

1. **Bot AI op generation** (`bot_corps_directives.ts` / `sector_offensive.ts`) — burning historical-mandatory brigades 67-73 turns pre-trigger in pre-Krivaja Cerska-Kamenica + Brčko corridor defense. Not a lifecycle file.
2. **Reconstitution policy** (`brigade_reconstitution.ts`) — 1/turn corps cap + same-corps territory gate may be too strict in late-war Drina Corps when multiple historical-mandatory brigades are simultaneously dead.
3. **OOB seeding** (`data/source/oob_brigades.json` — DATA, not engine) — `rs_skelani_battalion` homed at `op:srebrenica:mala_daljegosta_2` is destruction-on-arrival under stranded mechanics.

### `/scenario-harness-engineer` — artifact sufficiency + diagnostic

Artifacts MOSTLY SUFFICIENT for 4 of 5 watched brigades. Only `rs_1st_milii` (active throughout, no dissolution/destruction record) requires per-turn brigade-keyed snapshots to fully classify between (a) reconstitution-delay-trap, (b) cascade-deactivation, (c) sector-reassignment idle, (d) morale-floor garrison.

**Diagnostic created:** `tools/diagnostics/krivaja_brigade_lifecycle.cjs <run_dir> [brigade_id_csv]`. Read-only. Parametric over arbitrary brigade-id watch-list (CLI arg or `<run_dir>/krivaja_watch_brigades.json` fallback). Faction-agnostic in implementation (genuine `Set.has(bid)` membership, no prefix scan). Closed lifecycle_path enum: `destroyed_in_combat | dissolved | active_throughout | silent_inactive | unknown_inactive`.

**Test created:** `tests/krivaja_brigade_lifecycle_diagnostic.test.ts` — 4/4 GREEN against n1619 (schema lock + classification truth + byte-stability across two invocations + missing-arg negative case). 967ms runtime.

## Phase 1 — diagnostic + test (already complete from Phase 0d)

Verified mid-orchestrator: re-ran 4/4 PASS in 445ms, file modification times confirm Phase 0d agent created them.

## Phase 2 — closure review

### `/game-designer` verdict

> **Close-as-diagnostic verdict CORRECT.** Each subsystem operated correctly. Player command model: bot AI burning brigades pre-trigger does NOT violate constrained-agency. "Preserve Krivaja-95 roster t1→t168" framed as a hard preservation rule IS god-mode hindsight and would railroad the outcome (life lesson: emergent mechanics, not railroads). A historical Drina Corps CO at t28 had no foreknowledge of a July 1995 directive.

Successor handoff classification (Ring + § 6 sign-off):

| # | Handoff | Ring | § 6 sign-off | § 8.3 distinction |
|---|---|---|---|---|
| 1 | Bot AI op-generator awareness of triggered-op rosters | **Ring 3** | **REQUIRED** | CROSSES into (b) lane-tuning if scoped to Krivaja roster preservation. **Block under § 8.3 unless reframed faction-agnostic with § 6 sign-off** |
| 2 | Reconstitution policy review (1/turn cap + same-corps gate) | **Ring 1** if corps-agnostic | not required if scoped corps-agnostic | (a) honest if reviewed corps-agnostic; (b) lane-tuning if narrowed to late-war Drina Corps |
| 3 | OOB seeding for enclave-homed brigades (Skelani) | **Ring 2** | **REQUIRED** (Srebrenica-adjacent OOB fact) | (a) honest if it reflects a verifiable historical garrison fact (Skelani battalion was real and based at Skelani town, not inside the enclave) — potentially a citation correction |
| 4 | Per-turn brigade-keyed snapshot emission | **Ring 1** | not required (pure observability) | (a) — no behavior change |

**Recommended close-out priority: (4) → (2) → (3) → (1).** Do not churn engine code in this lane.

### `/determinism-auditor` verdict

> **SAFE TO COMMIT.** Both `tools/diagnostics/krivaja_brigade_lifecycle.cjs` and `tests/krivaja_brigade_lifecycle_diagnostic.test.ts` PASS all checks: no forbidden tokens (no `Math.random` / `Date.now` / `new Date(` / `performance.now` / `Date.parse` / `toLocaleString` / `localeCompare` / `Intl.` / `process.hrtime` / mtime reads), deterministic sort comparators (`strictCompare` for both numeric and string sorts), stable iteration (Map consumption only via keyed lookup, no order-dependent reads), stable JSON output (fixed key order + 2-space indent), no `fs.readdir` / glob, watch-list parametric semantics genuinely faction-agnostic via `watchSet.has(bid)`, test idempotence preserved via `it.skipIf(!HAS_RUN_DIR)`.

## Stop-gate compliance

| # | Gate | Status |
|---|---|---|
| 1 | NO `combat_math.ts` outcome-formula changes | ✓ — no engine code changed |
| 2 | NO `enclave_resilience.ts` | ✓ |
| 3 | NO `rupture_consequences.ts` | ✓ |
| 4 | NO controller flips / painted-target reads | ✓ |
| 5 | NO OOB JSON edits or roster substitutions | ✓ — Skelani's OOB seeding flagged as Ring 2 / § 6 required handoff, not changed |
| 6 | NO calibration tuning (force-ratio balancing) | ✓ |
| 7 | NO hardcoded Srebrenica/Krivaja outcomes | ✓ |
| 8 | NO queued-order predicate revival | ✓ — predicate is structurally retired by `1e68d8dc` |
| 9 | NO `Math.random` / `Date.now` / `new Date(` / `performance.now` | ✓ (determinism-auditor verified) |
| 10 | NO faction-specific hardcode in implementation logic | ✓ — diagnostic accepts arbitrary brigade-id watch-list |
| 11 | NO Codex UI/product files touched | ✓ |
| 12 | NO FORAWWV touch | ✓ |
| 13 | NO `--no-verify` | ✓ |

## Sensitive-history compliance

- **No Ring 3 surface.** Read-only docs/diagnostic/test; no engine behavior change; no rupture/enclave/OOB touch.
- **No § 6 sign-off chain required for THIS lane.** Diagnostic is read-only observability; the watched-brigade list is a test fixture, not new historical data. Game-designer explicitly approved close-as-diagnostic.
- **§ 8.3 distinction (a) preserved.** This lane does not lane-tune any specific historical outcome. Krivaja/Stupčanica acceptance metrics are untouched by construction (no engine code changed). Future engine repair attempts at the named upstream causes are classified above with Ring/§ 6 status.

`tools/diagnostics/sensitive_history_status.cjs` not re-run because no scenario was executed in this lane. Last status (n1619, predecessor lineage): OPEN_P0 — Srebrenica capital RBiH, rupture not fired, Krivaja force_ratio 0.094 / planning_invalidated, Stupčanica force_ratio 0.831 / max_failures. **No movement attributable to this lane** by construction.

## Hash drift class

**No hash drift.** Engine code and scenario data unchanged. Diagnostic + test are off-pipeline read-only artifacts.

## Files changed

- NEW: `tools/diagnostics/krivaja_brigade_lifecycle.cjs` (read-only deterministic diagnostic, ~9.7 KB, parametric watch-list)
- NEW: `tests/krivaja_brigade_lifecycle_diagnostic.test.ts` (4/4 GREEN, ~8.3 KB, schema + classification + byte-stability + negative-case)
- NEW: `docs/40_reports/implemented/20260502_KRIVAJA_BRIGADE_LIFECYCLE.md` (this report)
- PATCH: `docs/PROJECT_LEDGER.md` (append entry; do not rewrite predecessor entries)
- PATCH: `.claude/napkin.md` (prepend Current State; coordinate with concurrent UI lane)
- PATCH: `docs/PROJECT_LEDGER_KNOWLEDGE.md` if a durable lesson is reusable

## Successor handoffs (named, prioritized, Ring-classified)

Per /game-designer recommended priority:

1. **Per-turn brigade-keyed snapshot emission (Ring 1, no § 6, pure observability).** Owner: `/scenario-harness-engineer`. Add deterministic write-only emit to scenario harness — per-turn `{turn, brigade_id, location_osid, mv_state, mv_order, personnel, sector_id, op_id}` rows under a flag. Mirrors existing `weekly_report.jsonl` emit pattern. Unblocks classification of `rs_1st_milii`-shape "active throughout but absent from late-game ops" gaps and any future temporal-trace investigation.

2. **Reconstitution policy review (Ring 1 corps-agnostic, no § 6).** Owner: `/systems-programmer` + `/game-designer` review (Ring boundary check before merge). Audit `brigade_reconstitution.ts` `RECONSTITUTION_MAX_PER_CORPS = 1` cap and `corpsTerritoryOsids(...)` same-corps refugee-mun gate. Question: is 1/turn cap too tight when multiple historical-mandatory brigades are simultaneously dead? Is the same-corps gate appropriate for late-war Drina Corps when corps territory has shrunk below brigade-recovery viability? **Must remain corps-agnostic to avoid § 8.3 lane-tuning.** Full calibration regression sweep required.

3. **OOB seeding for enclave-homed brigades (Ring 2, § 6 REQUIRED).** Owner: `/historian` + `/game-designer` + Sensitive-History Design Gate § 6 sign-off chain. Question: was `rs_skelani_battalion` historically based at Skelani town (not inside the enclave) per ICTY/Popović §244? If yes, the current `home_osid: op:srebrenica:mala_daljegosta_2` may be a citation error and a legitimate corrective edit; if no, the brigade IS structurally destruction-on-arrival under stranded mechanics and the design question is whether stranded mechanics handle ICTY-named enclave-perimeter formations correctly. § 8.3 distinction: (a) honest if grounded in citation; (b) lane-tuning if not.

4. **Bot AI op-generator awareness of triggered-op rosters (Ring 3, § 6 REQUIRED, BLOCKED until reframed).** Owner: `/corps-army-commander` + `/operations-expert` + `/game-designer` + § 6 sign-off. Question: should VRS Drina Corps CO have organic-formation-continuity preference (favors named brigades over reconstituted shells for cohesion/morale) without future-trigger awareness? Per /game-designer: "Preserve Krivaja-95 roster t1→t168" as a hard preservation rule IS god-mode hindsight and a railroad. Any acceptable framing must be faction-agnostic, scenario-agnostic, and motivated by emergent commander preference (organic continuity), not triggered-op catalog awareness. **DO NOT IMPLEMENT** without reframed design proposal + § 6 sign-off chain.

## Cross-lane attribution

- Roster citation safety: `/historian`.
- Operational lifecycle trace: `/operations-expert`.
- Lifecycle owner code paths: `/formation-expert`.
- Diagnostic + test design: `/scenario-harness-engineer`.
- Closure verdict + Ring/§ 6 classification: `/game-designer`.
- Determinism review: `/determinism-auditor`.
- Synthesis + handoff prioritization: `/orchestrator` (this lane).
