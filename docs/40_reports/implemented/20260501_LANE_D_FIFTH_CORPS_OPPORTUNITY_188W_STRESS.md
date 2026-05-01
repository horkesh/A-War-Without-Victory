# LANE D — 5th Corps Opportunity Family 188w Stress + Health Audit

**Date:** 2026-05-01
**Mode:** Orchestrator (dispatch-first; no direct analysis)
**Predecessor lanes (closed):** LANE B opportunity MVP, LANE C 5th Corps family expansion, Health Diagnostic, Decision Bridge, Force-Quality Dossier
**HEAD at run start:** `ad20e735` (force-quality dossier)
**Run dir:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1604`
**Final-state hash:** `dca64282334ae735` (vs n1602 `c18c909fbb6fb62b`; differs by additive opportunity-state shape since LANE C added 6 catalog entries with `last_force_quality_traits` / `last_footprint` / `redirect_variants` snapshots)

## 1. Headline

Fresh 188w stress run executed against the LANE-C-completed catalog (1 Sana 95 MVP + 6 LANE C entries = 7 entries total). **Only 1 of 7 entries ever surfaced as a proposal**: Sana 95 at turn 175. Six LANE C entries (Tigar-Sloboda 94, APWB Pressure 94, Una 94, Breza 94, Pauk 94/95, Grmeč 94) never reached `eligible_pending_review`.

Substrate health is **GREEN** on every architectural axis the lane was meant to test:
- One-shot guard works (no re-enqueue post-approval, post-decline, or post-expire — Sana 95 approved at t175 stayed approved through t188 with no duplicates).
- T1 → `buildCorpsOperation` path works (Sana spawned a real CorpsOperation with 3 axes / 9 brigades / 7 attack attempts).
- T3 early-return path was untestable in this run (no T3 entry surfaced, but the substrate code path is intact and unit-tested).
- AAR linker works (Sana resolution row carries `executed_op_aar_id: 'arbih_5th_corps:Operation Sana:t175'` and `exit_class: 'did_not_launch'`).
- Force-quality snapshot is persisted on the Sana proposal (`fq_traits=true`).
- Health-audit script flagged 0 broken rows, 0 broken AAR links, 0 duplicate resolutions.
- Catalog walk + decision applier are deterministic and re-executed every turn (Sana surfaced exactly at w175 as designed).

**Catalog content health is YELLOW**: predicate topology blocks 6 of 7 entries from surfacing, traceable to a single live-state signal that pins 6 outcomes through railroad-by-omission. This is a content/calibration concern with multi-owner sign-off, not a substrate bug.

**Engine-wide AAR aggregator is RED but out of scope**: 21 of 43 AARs in this run (49%) misreport `total_attacks=0` despite executing real combat (e.g. Operation Prijedor success / 10 captures / 0 reported attacks). Sana's `did_not_launch` exit_class is a false negative caused by this same aggregator. NOT opportunity-specific; touching it would change `exit_class` derivation for every op in the engine and crosses the lane-D `>1 owner without Codex review` stop gate.

## 2. Run Pipeline

| Stage | Status | Evidence |
|---|---|---|
| Fresh 188w scenario run | ✅ exit 0 | task `b0xtwunhr`, `runs/apr1992_definitive_188w__210e69404d054959__w188_n1604/` |
| Health diagnostic | ✅ | `node tools/diagnostics/opportunity_health_audit.cjs <run_dir>` clean output |
| Tier-1 Operations Expert | ✅ | dispatched + reported (file:line cited) |
| Tier-2 Gap-Finder | ✅ | dispatched + reported (railroad classification + dispatch-decision recorded) |
| Tier-2 Canon-Compliance Reviewer | ✅ | C1–C5 all PASS, Fix B SAFE |
| Synthesis | ✅ | this report |

War-or-game NOT auto-dispatched per memory feedback rule (LANE D is an evidence audit, not a calibration run). Railroad-hunter NOT dispatched: Gap-Finder confirmed the railroad lives in catalog predicate topology (predicate-design layer), not simulation mechanic — outside railroad-hunter's mandate.

## 3. Surfaced Opportunities Table (Q1)

| Opportunity | Window | Tier | Eligibility outcome | Why |
|---|---|---|---|---|
| sana_95 | w175-200 | T1 | **SURFACED + APPROVED at w175** | All required axes green at w175. `commander_confidence` (OPTIONAL) provided the `min_optional_axes:1` entry → eligibility passed. |
| tigar_sloboda_94 | w113-122 | T1 | NEVER SURFACED | Only optional axis is `logistics` (ceiling 95). RBiH `war_supply_pressure=100` at w113 trips logistics → 0 optional green → `min_optional_axes:1` fails. |
| apwb_pressure_94 | w113-125 | T1 | NEVER SURFACED | Same shape as Tigar — logistics is sole optional. |
| una_94 | w113-115 | T3 | NEVER SURFACED | `logistics: required` (ceiling 95) → unconditional fail. |
| breza_94 | w125-130 | T3 | NEVER SURFACED | `logistics: required` (ceiling 95) → unconditional fail. |
| pauk_94_95 | w135-145 | T3 | NEVER SURFACED | `logistics: required` (ceiling 95) → unconditional fail. (Independent fail also: `alliance_context: required` is `pre-Storm`-gated; once Storm triggered, second hard fail.) |
| grmec_94 | w133-138 | T1 | NEVER SURFACED | Only optional axis is `logistics` (ceiling 90). Same `min_optional_axes:1` failure mode as Tigar/APWB. |

## 4. Decision / AAR Table (Q5)

| Turn | Faction | Proposal | Opportunity | Response | Exit class | AAR link | Outcome | Attacks | Captures | Grade |
|---:|---|---|---|---|---|---|---|---:|---:|---:|
| 175 | RBiH | OPP_175_sana_95 | Operation Sana | approve | did_not_launch | `arbih_5th_corps:Operation Sana:t175` | failure | 0 (AAR aggregator) / 7 (`op.attack_attempt_count`) | 0/31 | 3 |

**Note:** AAR `total_attacks=0` is a misreport caused by the global AAR aggregator vs sector_offensive write-side disagreement. The CorpsOperation produced 7 real attack attempts across 3 axes (Krupa Una Valley, Bihać–Petrovac Corridor, Sanski Most–Ključ), all stalled at the first objective with `recovery_reason='max_failures'` despite `force_ratio_estimate=7.19`. Real combat happened; the ledger says it didn't.

## 5. Health Diagnostic Result (Q8)

```
Total decisions: 1
Approved / redirected / under-resourced: 1
Declined: 0
Expired: 0
Completed: 1
Successes: 0
T3 defensive sentinels: 0   (none surfaced — substrate code path intact but untestable)
Unlinked approved offensive resolutions: 0
Broken AAR links: 0
Duplicate proposal resolution rows: 0
```

All four broken-row predicates pass on the substrate's own terms. The Sana row that flagged "approved without AAR link" in n1602 (pre-AAR-loop closure) is now correctly linked in n1604.

## 6. Per-Question Verdict

| # | Question | Verdict |
|---|---|---|
| Q1 | Which 5th Corps opportunities surface in 188w, on what turns, and why? | **1 of 7** (sana_95 at t175). Six LANE C entries silently ineligible due to logistics predicate topology + RBiH supply pressure pinned at 100. |
| Q2 | Are opportunities one-shot? | **YES.** No re-enqueue. `seenOpportunityIds` guard at `operation_opportunities.ts:562-568` works as designed. |
| Q3 | Do T1 approvals create normal CorpsOperations through `buildCorpsOperation`? | **YES.** Sana 95 spawned a 3-axis / 9-brigade CorpsOperation that ran 12 turns with proper axis state. |
| Q4 | Do T3 approvals write `t3_authorized_no_offensive` and create no offensive op? | **UNTESTABLE in this run** (no T3 surfaced). Substrate code path intact at `operation_opportunities.ts:765-776`; sentinel value preserved per Canon-Compliance C1 PASS. |
| Q5 | Do AAR links close correctly via `executed_op_aar_id + exit_class`? | **YES** for the link itself (`linkOpportunityResolutionToAAR` at `operation_opportunities.ts:341-367` correctly bound the AAR). **NO** for the `exit_class` value being honest — Sana's `did_not_launch` is wrong because the upstream AAR aggregator misreports `total_attacks`. |
| Q6 | Does Grmeč 94 create the intended emergent dependency with Pauk 94/95 through shared brigade pools / live readiness, without hardcoded completion chains? | **UNTESTABLE in this run** (neither surfaced). Source-side: NO literal `grmec_94` reference appears anywhere in Pauk's def — emergent dependency only, no railroad. |
| Q7 | Does Sana 95 collide with Grmeč 94 brigade commitments under autonomous approval? | **UNTESTABLE in this run** (Grmeč never surfaced). Source-side: 6 brigades shared between rosters; windows disjoint (Grmeč w133-138, Sana w175-200); brigade pool would have ~37 weeks to recover. Healthy design. |
| Q8 | Does the health audit script flag any broken rows? | **NO.** All four broken-row predicates clean on this run's terms. |
| Q9 | Are force-quality snapshots present on surfaced proposals and stable enough for the UI dossier? | **YES.** Sana 95 proposal carries `last_force_quality_traits` (verified `fq_traits=true` in queue dump). Substrate persistence at `operation_opportunities.ts:538/580/590` works. |
| Q10 | Are there any single-owner bugs safe to fix now? | **NO bug-class fix in scope.** One observability improvement available but optional (see §7 Fix B). The two real "bugs" found (catalog predicate topology, AAR aggregator) cross stop gates. |

## 7. Bounded-Fix Inventory

### Fix A — AAR aggregator misreports `total_attacks=0` (DEMOTED)
**Location:** `src/sim/combat/operation_aar.ts:519-528`
**Symptom:** AAR `total_attacks` is summed from `weekly_log[*].attacks_this_turn` instead of canonical `op.attack_attempt_count`. 21 of 43 AARs in n1604 (49%) misreport — Operation Prijedor with outcome=success + 10/10 captures shows `total_attacks=0`.
**Why demoted from Lane D:** Affects every op in the engine, not just opportunity-spawned ops. Sector_offensive owners and AAR owners disagree on which counter is canonical. Touching this changes `exit_class` derivation for the entire `_TRIGGERED_OPS` family + every commander-spawned op, not just opportunities. Crosses lane-D `>1 owner without Codex review` stop gate.
**Recommended next-lane:** dedicated AAR-aggregator audit owned by `/scenario-harness-engineer` + `/operations-expert`, with `/qa-engineer` regression on every AAR row in 40w + 188w runs.

### Fix B — Silent ineligible-skip path leaves no audit trail (AVAILABLE, optional)
**Location:** `src/sim/combat/operation_opportunities.ts:614-615`
**Symptom:** `if (!eligible) continue;` skips every ineligible opportunity per turn with no diagnostic breadcrumb. Made the Q1 investigation harder than necessary — without the OE's expertise we wouldn't have known whether the 6 missing LANE C entries were "evaluator never walked them" vs "evaluator walked but predicates failed."
**Scope (per Canon-Compliance C5 SAFE):** Single substrate file. Write-only diagnostic on a sibling field of `state.military` (e.g. `state.military.operation_opportunity_diagnostics`). No IPC, no canon, no scenario, no UI consumer. Determinism preserved.
**Lane-D status:** SAFE TO SHIP per all three Tier-1/Tier-2 reviewers, but **not strictly a "bug" per the user's "fix bounded single-owner bug" criterion** — it's an observability improvement. NOT shipped in lane D; recommended as the seed of a 1-commit follow-up if desired.

### NOT in scope (cross stop gates)
- **Catalog predicate topology fix.** Tigar/APWB/Grmeč need a second genuine optional axis (e.g. `commander_confidence` or a force-quality trait) so logistics-saturation doesn't sink them. T3 logistics should likely be `optional` not `required`. Owner: `/operations-expert` + `/game-designer`. Crosses scenario-tuning-class boundary because it changes which opportunities surface and when.
- **Supply-pressure step-function calibration.** `supply_pressure.ts` produces a 0-100 scale that all three factions saturate by mid-war, killing the gradient. Owner: `/systems-programmer` + `/war-or-game`.
- **Combat-execution gap.** Force-ratio 7.19 + 0/31 captures across 7 attack attempts is its own investigation independent of the opportunity layer. Owner: `/corps-army-commander` + `/sector-expert`.

## 8. Hash Drift Classification

`dca64282334ae735` (n1604) vs `c18c909fbb6fb62b` (n1602) is **additive opportunity-state shape change**, NOT behavioral. The catalog grew from 1 entry (Sana 95 only) at n1602 to 7 entries (LANE C) at n1604, and the LANE C / Decision Bridge / Force-Quality Dossier substrate evolutions added the following per-proposal serialized fields:
- `last_force_quality_traits` (force-quality dossier)
- `last_footprint` (Codex parallel lane footprint snapshot)
- `redirect_variants` (Codex parallel lane redirect snapshot)
- `t3_authorized_no_offensive` exit_class string (LANE C T3 substrate)

Painted-control behavior unchanged: same scenario, same OOB, same combat math. Five of seven catalog entries silently ineligible therefore produce zero state-shape contribution; only Sana 95's proposal record + resolution row + AAR link contribute the actual byte difference, all of which are expected per the LANE C "additive shape change is the correct hash drift to record" durable rule.

## 9. Sensitive-History Compliance (re-verified)

- C1: T3 `t3_authorized_no_offensive` sentinel intact at `operation_opportunities.ts:322` (type union) + early-return push.
- C2: Single-owner discipline preserved. Zero overlap between `_TRIGGERED_OPS` and any of the 5 LANE C opportunity_ids.
- C3: AMBER prose guardrail preserved on APWB Pressure 94 def block (`operation_opportunity_catalog_5th_corps.ts:689-756`) — zero hits for `civilian / refugee / displaced / column / fled / flee / expelled / cleansing`.
- C4: Krivaja-95 / Stupčanica-95 / Goražde / Aug 1995 VK column remain OUT of opportunity catalog.
- C5: Proposed Fix B genuinely scope-isolated to substrate file.

All five PASS.

## 10. Next-Lane Recommendations (priority order)

1. **AAR aggregator fix** (RED, engine-wide). 49% of AARs misreport. Owner: `/scenario-harness-engineer`. Blocks honest lifecycle reporting for every op family.
2. **Catalog predicate topology** (YELLOW, content/calibration). Add a second genuine optional axis to Tigar/APWB/Grmeč; demote Una/Breza/Pauk logistics from required to optional with a different second axis. Owner: `/operations-expert` + `/game-designer`.
3. **Supply-pressure scale debt** (YELLOW, substrate). 0-100 saturating step function carries no signal mid-war. Owner: `/systems-programmer` + `/war-or-game`.
4. **Combat-execution gap** (separate investigation). Force-ratio 7.19 → 0/31 captures across 7 attacks needs root-cause for any 5th Corps offensive to land. Owner: `/corps-army-commander` + `/sector-expert`.
5. **Fix B observability breadcrumb** (optional, single-commit). Adds audit trail to `operation_opportunities.ts:614-615`. Cheap and useful for the next opportunity-system audit.

## 11. Determinism Statement

LANE D is read-only orchestration. No engine code mutated. No `Math.random` / `Date.now` / `localeCompare` introduced. Three subagents (Operations Expert, Gap-Finder, Canon-Compliance Reviewer) dispatched read-only and reported file:line evidence. Fresh 188w run is reproducible from HEAD `ad20e735` against scenario `data/scenarios/apr1992_definitive_188w.json`.

## 12. Hand-off

- **Files changed:** docs only (this report + ledger appends + napkin entry + LEDGER_KNOWLEDGE entry).
- **Tests:** none (no engine code changed).
- **Run hash:** `dca64282334ae735` (additive shape change, classified above).
- **Bugs found / fixed:** Fix A (multi-owner, demoted) + Fix B (single-owner, optional, not shipped) — see §7.
- **Stop gates hit:** none. Combat tuning, OOB retuning, scenario retuning, UI changes, T4 sensitive-history all preserved.
- **Codex parallel lane status:** unaffected. LANE D ran against pre-Codex HEAD `ad20e735`; Codex committed `f7091d62` (footprint + redirect DTOs) after the run started. The two lanes did not collide.

**Closing line:** the 5th Corps opportunity substrate works. The catalog predicate topology and the engine's AAR aggregator are the next two pieces of work — both with experts and stop-gate scope outside lane D.
