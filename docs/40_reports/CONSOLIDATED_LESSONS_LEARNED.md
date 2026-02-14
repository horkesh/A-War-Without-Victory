# Consolidated: Lessons Learned (40_reports + napkin)

**Purpose:** Single view of patterns that work, patterns that don’t, and corrections drawn from docs/40_reports and `.agent/napkin.md`. Keeps report-derived lessons findable without replacing the napkin.

**Source of truth for session discipline:** `.agent/napkin.md` (read at session start; update as you work). This doc is a **consolidated reference** for report-level and cross-cutting lessons.

---

## 1. Corrections (what went wrong → what to do instead)

| Area | What went wrong | What to do instead |
|------|------------------|---------------------|
| Voronoi / geometry | Boolean ops produced failures/leftover patches despite normalization | Add explicit post-merge coverage/overlap validation per mun1990; drive fixes from diagnostics |
| Imports | martinez-polygon-clipping default import (ESM error) | Use namespace import (`* as martinez`) |
| Imports | jsts package root (no index.js export) | Import from `jsts/org/locationtech/jts/io/*.js` (e.g. GeoJSONReader/Writer) |
| Types | Removed legacy export from displacement_hooks after refactor | Preserve exported type aliases (`export type { ... }`) when downstream imports from old locations |
| Git | Resolved add/add by deleting markers only → duplicated content | For whole-file add/add conflicts, pick one side or fully dedupe before staging |
| Handoffs | Left Phase A handoff ambiguity open after roadmap | Close each open question with run artifact evidence; publish decision memo linked from handoff report |
| Docs / paths | Trusted stale links to `.cursor/agents/*` | Validate referenced paths with glob; this repo has skills under `.cursor/skills/`, no `.cursor/agents` |
| Doc edits | ApplyPatch reported success but content unchanged | Verify with Read + git diff; if mismatch, use deterministic scripted replacement and re-verify |

---

## 2. Patterns that work (selected; full list in napkin)

- **Brigade AoR:** Phase II start — initialize `brigade_aor` explicitly for `start_phase: "phase_ii"`; same-HQ fix via `findAlternativeSeed` + `rebalanceZeroAoRSharedHq`; missing-HQ — deterministic fallback seed from front-envelope. MAX_MUNICIPALITIES_PER_BRIGADE (8); ensure step only for home muns.
- **Control / init:** Scenario with `init_control` but no `init_control_mode` → default `hybrid_1992`. Phase II scenario init must set `meta.rbih_hrhb_war_earliest_turn` and call `ensureRbihHrhbState(...)`.
- **Phase I no-flip:** `disable_phase_i_control_flip` = military-action-only (militia-pressure off; brigade-led flips still possible). Scenario names with `no_flip` do not imply strict zero control changes.
- **Scenario harness:** `run_summary.json` includes `phase_ii_attack_resolution` rollup to explain 0-flip or low-flip outcomes. Handoff closure: open questions in handoff report + separate decision memo, cross-linked.
- **Canon reflection:** When behavior changes are implemented, add or extend canon (Phase I/II specs, Systems Manual §5/§6.5/§7, context implementation refs) and ledger entry.
- **Determinism:** Seeded RNG in BotManager; no `Math.random()` in bot logic; sort edge/formation traversal before selection. Recruitment: sort faction/facility/municipality/pool/brigade IDs; enforce `available_from`; cap elective recruits per faction per turn.
- **Tactical map:** Null-control fixed at init/source (prepareNewGameState, deterministic null coercion). Single `FACTION_DISPLAY_ORDER` for OOB and army strength. Dataset failure → reset lookups and clear game state.
- **Testing:** Node vs Vitest separate; `npm test` = node:test only. Alliance tests use turn >= `rbih_hrhb_war_earliest_turn`; Phase I pipeline tests assert specific steps, not just `phase-i-` prefix.
- **Windows / scripts:** Use `;` not `&&` in PowerShell. Avoid spawning npx from Node wrappers; use `node_modules/tsx/dist/cli.mjs` via process.execPath for stable `npm test`/canon:check.
- **Replay / long runs:** Stream-write `replay_timeline.json` to avoid RangeError on 40+ week runs.

---

## 3. Patterns that don’t work (selected; full list in napkin)

- Simplify + turf fallback alone did not reduce Voronoi polyclip failures.
- Gap-based salvage that collapses most municipalities to single polygons is too destructive.
- Chaikin smoothing on Voronoi edges caused white gaps between settlements (reverted).
- `npx tsx --test` on full scenario tests can hang on Windows; run faster unit subsets first.
- Two test runners (Node vs Vitest): use correct script per suite; Vitest limited to its configured files.

---

## 4. Report-specific lessons (from 40_reports)

| Report / area | Lesson |
|----------------|--------|
| Battle resolution | Phase II attack orders resolved as discrete battles (combat power, casualty_ledger, snap events); pressure remains substrate. Canon: Phase II §5, §12; Systems Manual §7. |
| Brigade strength / 803rd | Casualties are applied; “full strength” often means wrong dataset (e.g. initial vs 20w final). Large AoR from ensure step → cap municipalities per brigade and restrict ensure to home muns. |
| Bot AI (BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13) | Zero attack orders from pipeline ordering (lifecycle after bot AI), posture-attack same-pass stale read, supply-gate deadlock. Fix: pipeline order, fresh read of posture, supply gate before attack gate. Strategic objectives and scoring improved; remaining issues (AoR imbalance, RS underperformance, defender casualties, HRHB passive) in backlog. |
| Scenario handoffs (ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS) | 0 flips from `orders_processed: 0` (not defender-favored); formation count change from OOB/recruitment path. Close with decision memo + run evidence. |
| No-flip (PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL) | player_choice GO for recruitment-centric; ethnic/hybrid NO-GO default. Canon-safe vs implementation-note called out. |
| Municipality supra-layer | `brigade_municipality_assignment` as deployment layer; derive `brigade_aor` each validation/init turn; process brigade_mun_orders before pressure/attack; sync after reshape. |

---

## 5. Where to update lessons

- **Session-level corrections and preferences:** Update `.agent/napkin.md` (Corrections, User Preferences, Patterns That Work, Patterns That Don’t Work, Domain Notes).
- **Project-level decisions and rationale:** Add to `docs/PROJECT_LEDGER_KNOWLEDGE.md` and link ledger date; append changelog to `docs/PROJECT_LEDGER.md` when behavior or workflow is affected.
- **This doc:** When a 40_report yields a new cross-cutting lesson, add it to §2–§4 and note the source report. Do not duplicate napkin line-by-line; keep this as a high-level consolidation.

---

*For implemented work, see [CONSOLIDATED_IMPLEMENTED.md](CONSOLIDATED_IMPLEMENTED.md). For backlog, see [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md).*
