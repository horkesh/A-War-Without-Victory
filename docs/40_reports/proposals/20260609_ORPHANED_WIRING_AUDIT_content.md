# Orphaned-Wiring Audit — CONTENT domain

**Date:** 2026-06-09
**Type:** READ-ONLY audit. No code/content changed. §6-adjacent (atrocity essays/events) — gaps inventoried factually; NO atrocity prose authored or altered.
**Scope:** events (`data/scenarios/events/`), essays (`data/scenarios/essays/`), codex (`src/sim/codex/`, `data/codex/`), dynamic sections, ghost entries. Cross-referenced content-on-disk vs index/registry vs runtime reachability.
**Rubric:** AUTHORED-NOT-INGESTED · DEFINED-NOT-TRIGGERED · REGISTERED-NOT-BACKED · CONTENT-NO-SURFACE · FLAG/EVENT-FAMILY declared-never-used.

---

## 0. Executive summary

The event loader (`event_loader.ts`) is **robust** — it fails closed on dangling event refs, unreachable `requires_enabled` gates, unknown effect kinds, and unknown dimension shifts. So the classic "event defined with a dangling trigger" bug-class is structurally prevented in the event catalog. The gaps are concentrated in the **essay/codex/ghost** surfaces, where the index→event join and the ghost-flag→writer join are NOT loader-guarded.

Most-significant findings:

1. **2 indexed essays can NEVER unlock** — `bijeljina_massacre_1992`, `independence_referendum_1992`: indexed, content-complete, but their `event_id` has no backing event AND no `ghost_when` AND no `requires_events`, so `baseUnlocked` is permanently false. (DEFINED-NOT-TRIGGERED / REGISTERED-NOT-REACHABLE).
2. **20 ghost-codex entries: ~9 are permanently dormant** — their gating flags have ZERO writer (events OR engine). The 2 that have an engine writer (`observer_threshold_flags.ts`) are also dark because that writer is `ENABLE_OBSERVER_THRESHOLD_FLAGS = false` by default. (FLAG declared-never-set.)
3. **Ghost-entry `.md` prose bodies are never displayed** — VerdictScreen renders `{ghost_id} — {repo-relative .md path}`, not the authored EN/BCS narrative. 20 authored `.md` bodies (+ 20 BCS) are CONTENT-NO-SURFACE.

Seed status: **13-deposit-essay seed largely RESOLVED** (camp/atrocity essays now indexed); only 6 non-§6 deposit essays remain unindexed. `rbih_state_identity` dynsec-prose seed CONFIRMED FIXED (no other essay has empty/dangling dynamic_sections). Srebrenica-genocide wiring CONFIRMED real (not a stub), with the codex-receipt surface intentionally §6-deferred.

---

## 1. Findings table

| # | Finding | Category | Path / evidence | Evidence-unwired | Player-facing impact | §6? | 1.0 assessment |
|---|---------|----------|-----------------|------------------|----------------------|-----|----------------|
| C1 | `bijeljina_massacre_1992` essay indexed but unreachable | DEFINED-NOT-TRIGGERED | `data/scenarios/essays/essay_index.json` (event_id=`bijeljina_massacre_1992`); no event of that id in `data/scenarios/events/*.json`; resolver `codexEssayResolver.ts:688-690` `baseUnlocked = eventUnlocked \|\| isGhost`; essay has no `ghost_when`/`requires_events` | event_id absent from 293-event catalog; ghost_when undefined → baseUnlocked永 false | Authored essay (sources+BCS) never appears in Codex | §6-ADJACENT (named 1992 atrocity) | **polish / owner-decision**: either add a triggering event or a `ghost_when` so it can surface. §6 sign-off on the trigger. |
| C2 | `independence_referendum_1992` essay indexed but unreachable | DEFINED-NOT-TRIGGERED | same index; no backing event; no ghost_when | identical mechanism to C1 | Authored essay never appears in Codex | No (referendum, not atrocity) | **polish**: add backing event or `ghost_when`. Low-risk; no §6 gate. |
| C3 | ~9 ghost-codex entries gate on flags with ZERO writer | FLAG declared-never-set | `dynamic_section_builder.ts` GHOST_ENTRIES; flags `federation_never_fractured`, `patron_pressure_refused`, `vrs_quality_inverted`, `ceasefire_held_through_turn`, `mediator_trust_held_through_turn`, `rear_pocket_discipline_held_through_turn`, `civilian_displacement_contained_through_turn`, `negotiation_capital_recovered`, `enclave_held_through_turn` — none written by any event or engine file (grep: 0 writers) | predicate can never return true → ghost never emits | "Paths Not Taken" section under-populated vs authored intent; ~9 of 20 dormant | enclave one is §6-deferred (intentional) | **polish / intentional-future**: the comments call them "wired-but-dark" awaiting an observer lane. Not a blocker; document expected-dark vs accidentally-dark. |
| C4 | Observer-flag writer disabled by default | FLAG declared-never-set | `observer_threshold_flags.ts:51` `ENABLE_OBSERVER_THRESHOLD_FLAGS = false` | only writer of `equipment_quality_collapsed` + `negotiation_capital_exhausted`; gate off → 2 more ghosts dark | 2 further ghosts never emit on any current run | No | **intentional-future**: default-off pending dual-horizon re-floor. Documented. Flip is calibration-flat by design. |
| C5 | Ghost-entry `.md` prose bodies never displayed | CONTENT-NO-SURFACE | `VerdictScreen.tsx:514-515` renders `{ghost_id}` + raw `g.path` string; `buildGhostEntries` returns `path` not content; no reader of `data/codex/ghost_entries/*.md` exists in `src/` (grep) | 20 authored EN bodies + 20 BCS bodies (`data/codex/ghost_entries/`, `ghost_entries_bcs/`) are read by no runtime code | When a ghost DOES emit, player sees a label + a literal repo path like `data/codex/ghost_entries/winter_held.md`, never the prose | Some bodies are §6-adjacent (cleansing_refused, enclave_defended framing) | **polish (but visible-ugly)**: a real player seeing a file path in the endgame screen is a defect. Wire the `.md` (+BCS) body into the Codex/Verdict render. No new prose needed — bodies exist. |
| C6 | 6 deposit essays on disk, unindexed (no BCS, no event) | AUTHORED-NOT-INGESTED | `data/scenarios/essays/`: `cutileiro_plan_lisbon_1992`, `gorazde_pocket_consolidation_1992`, `kupres_battle_1992`, `milosevic_isolation_warning_aug92`, `sarajevo_jna_column_dobrovoljacka_1992`, `vase_miskina_breadline_1992` — all lack `localizations.bcs`; absent from index | not in `essay_index.json`; index gate `tests/ui/codex_essay_localization.test.ts` requires BCS to index | 6 content-complete (3.2k–4.8k chars), ICTY/BB-cited essays never reach the Codex | None are §6 camp/atrocity content (1 is the Vase Miskina breadline — civilian-massacre adjacent) | **polish**: author BCS + a trigger/ghost_when, then index. Down from the 13-deposit seed. |
| C7 | `image` event-schema field validated but used by 0 events | DEFINED-NOT-USED | `event_loader.ts:413` validates `image`; `EventModal.tsx` resolves it; 0 of 293 events carry `image` | no event data populates the documentary-realism illustration slot | Event modals are text-only; the wired illustration path is never exercised | No | **cosmetic / intentional-future**: capability shipped ahead of content. Not a defect. |

---

## 2. Seed confirm / refute

- **"13 deposit essays unindexed (Omarska/Keraterm/Trnopolje/Foča/Višegrad/Prijedor/Zvornik 1992 …)"** — **MOSTLY RESOLVED since the 2026-05-29 report.** Index grew 96→146 rows; disk 110→152. All previously-flagged camp/atrocity essays are now INDEXED with `event_id`s present in the catalog: `omarska_camp_1992`, `keraterm_camp_1992`, `trnopolje_camp_1992`, `foca_1992`, `visegrad_1992`, `prijedor_takeover_1992`, `zvornik_takeover_1992`, `bijeljina_massacre_1992` (indexed — but see C1: its EVENT is missing), `drina_cleansing_decision_1992`, `drina_valley_ethnic_cleansing_1992`. Only **6** non-camp deposit essays remain unindexed (finding C6). The §6 prose was authored + BCS-localized by a gated lane between the seed report and now.
- **"`rbih_state_identity` dynsec entry without backing prose (FIXED #361) — look for others"** — **CONFIRMED FIXED; no others.** Programmatic scan of all 146 indexed essays found **0** `dynamic_sections` with empty `content` and **0** referencing a missing `RESPONSE:`/`EVENT:` event. `rbih_state_identity` is also a load-bearing dynamic-section spec in `dynamic_section_builder.ts:806-811`.
- **"Phase-D event packets (39) — events that can never trigger / unindexed essays?"** — **NO orphan events.** The loader's `validateUnreachableGates` + `validateEventReferences` would fail catalog load on a dangling/unreachable `requires_enabled` event; the catalog loads (293 events). No Phase-D essay orphans beyond C1/C2.
- **"essay_index.json integrity (index→missing-file / file-not-in-index)"** — **Index→disk: 0 missing** (all 146 rows have a backing file). **Disk→index: 6 unindexed** (C6). Integrity guard `tests/essay_index_integrity.test.ts` exists.
- **"Srebrenica-fall codex/decision keyed on `srebrenica_genocide_1995` (#78) — wired or stub?"** — **WIRED, not a stub.** `srebrenica_genocide_1995` is referenced across the engine: `rupture_consequences.ts`, `enclave_resilience.ts`, `contain_posture_gate.ts`, `event_loader.ts` (rupture-foreclosure prohibition list), `endgame/cost_ledger.ts`, `endgame_comparison.ts`. The **codex/Verdict receipt surface** for it is **intentionally §6-DEFERRED** — explicit `TODO(§6-sensitive-history)` at `dynamic_section_builder.ts:752-756` states the registry must NOT add a Srebrenica entry without the sensitive-history gate + /historian + ICTY sourcing + owner sign-off. So the mechanical rupture is wired; only the narrative codex-receipt is a deliberate gap.

---

## 3. Items needing OWNER / §6 decision

- **C1 `bijeljina_massacre_1992`** — to make this authored essay reachable requires either a triggering event (a named 1992 atrocity → §6 gate) or a `ghost_when` audit predicate. Owner + §6/historian decision on which, and on the trigger's framing.
- **C6 (6 deposit essays)** — `vase_miskina_breadline_1992` and `sarajevo_jna_column_dobrovoljacka_1992` are atrocity-adjacent (civilian massacre / column killings); their BCS authoring + trigger is §6-sensitive. The other 4 (Cutileiro, Goražde consolidation, Kupres battle, Milošević warning) are diplomatic/military and lower-sensitivity.
- **C5** — wiring the ghost `.md` bodies into the surface will display `cleansing_refused.md` / `enclave_defended.md` prose; those bodies are already authored under §6 discipline (AUDIT-ONLY, variant `context`), so this is a render-wiring task, but the owner should confirm the surfacing of those two specific bodies.

---

## 4. Method notes (for reproducibility)

- Event catalog = 5 files in `data/scenarios/events/` (`war_199{2,3,4,5}.json` + `consequences.json`), 293 rows, loaded by `event_loader.ts` with fail-closed validation.
- Essay reachability: `codexEssayResolver.ts:682-696` — `baseUnlocked = firedEventIds.has(event_id) || ghost_when`. There is NO tier-0 "always unlocked" path; tier only affects panel grouping (`effectiveTier`).
- Ghost flags cross-referenced against `sets_flags` keys in all 5 event files AND non-test `src/**/*.ts`.
- Read-only throughout; no file under `data/`, `src/`, or `docs/10_canon/` was modified.
