# LANE C — 5th Corps Opportunity Family Expansion — Implemented Report

**Date:** 2026-05-01
**Lane:** Operation Opportunity Family Expansion (5th Corps / Bihać pocket arc)
**Status:** SHIPPED + VERIFIED through Phase 5; Phase 6 close-out (this report)
**Predecessor lane:** LANE B Operation Opportunity MVP + AAR-loop closure (closed @ commit `cecaaa02`)
**Commit chain:** `14dc48e1` (Phase 1 substrate) → `77e68d0a` (Phase 2 Tigar-Sloboda 94) → `34211f9c` (Phase 3 APWB Pressure 94) → `f22c743e` (Phase 4 Una/Breza/Pauk T3 triad) → `2a790255` (Phase 5 Grmeč 94 precursor)

---

## 1. Headline

LANE C ships the post-Washington / Bihać-pocket 5th Corps opportunity family on top of the LANE B substrate, lifting `FIFTH_CORPS_OPPORTUNITIES` from the single Sana-95 MVP entry to **7 entries** (1 pre-existing + 6 new). The lane consumed two LANE B substrate primitives without inventing new combat math, new lifecycle, new IPC contracts, or new UI surfaces. Single-owner discipline preserved across the lane: zero overlap between `_TRIGGERED_OPS` and any of the 5 new opportunity_ids. Test pack final state: **9 suites, 163/163 PASS**, `tsc --noEmit` clean. No scenario-scale 40w/188w rerun was required because every change is additive (catalog content + tests; no engine math, no scenario data, no painted targets, no canon).

What this lane changes about engine truth:

- **The 5th Corps arc is now a multi-entry opportunity family, not a single Sana endgame.** Tigar-Sloboda 94 (T1), APWB Pressure 94 (T1, AMBER prose-guarded), Una 94 (T3 defensive crisis), Breza 94 (T3), Pauk 94/95 (T3, pre-Storm only), and Grmeč 94 (T1, vanilla precursor) all surface through the same `OPERATION_OPPORTUNITY_CATALOG` walk and route through the same `applyOpportunityDecision` decision applier. The pocket-survival, theater-opening, and brigade-pool dynamics are expressed in live-state predicates, not calendar gates.
- **APWB OSIDs (Pecigrad / Velika Kladuša / Cazin southern flank) are reachable as opportunity targets without modeling APWB as a fourth faction.** Phase 1 added `targets_friendly_overrides?: string[]` to `OperationOpportunityDef` with a scope-restricted apply (T1 + family `fifth_corps`). The substrate primitive lets RBiH-painted-but-historically-enemy OSIDs be valid opportunity objectives.
- **T3 defensive-crisis opportunities are first-class without inventing a new lifecycle.** Phase 1 added a T3 early-return in `applyOpportunityDecision`: approve = "commit reserves to defend" with `exit_class: 't3_authorized_no_offensive'` and `executed_op_aar_id: undefined`; no `CorpsOperation` is pushed onto the corps's `active_operations`. Reactive defense / sector morale chain handles outcome.

What this lane does NOT change:

- No combat math. No new lifecycle. No painted-target overrides. No scenario data. No canon. No FORAWWV touch. No new IPC contracts. No new UI surfaces (Phase 1 widened `OpportunityLedgerPanel.tsx` exhaustive maps to recognize the new `t3_authorized_no_offensive` exit_class — non-functional consumer plumbing only).
- No T4 sensitive-history entries. Krivaja-95, Stupčanica-95, Goražde, and the August 1995 VK civilian column remain explicitly OUT OF SCOPE (see §6 and §8).
- No SVK / APWB modeling as a fourth faction. APWB pressure is expressed at the OSID-targeting level via `targets_friendly_overrides` only; pressure-state combat math remains future-lane work.

---

## 2. Phase Ledger

| Phase | Status | Commit | Files (delta) | Tests added |
|---|---|---|---|---|
| 0 — Repo audit | DONE | (no code) | 3 investigators returned: ops-expert + historian + canon-compliance-reviewer | n/a |
| 1 — Substrate (`targets_friendly_overrides` + T3 early-return) | DONE | `14dc48e1` | 4 files (+407 lines: substrate +68, types +1, OpportunityLedgerPanel +3, substrate test +338) | 11 new (Substrate A: 6, Substrate B: 5) |
| 2 — Tigar-Sloboda 94 (T1) | DONE | `77e68d0a` | 2 files (+657 lines: catalog +221, new test +439) | 18 new |
| 3 — APWB Pressure 94 (T1, AMBER prose-guarded) | DONE | `34211f9c` | 2 files (+787 lines: catalog +260, new test +529) | 20 new |
| 4 — Una/Breza/Pauk T3 triad | DONE | `f22c743e` | 4 files (+1397 lines: catalog +383, una test +332, breza test +329, pauk test +356) | 46 new (15 + 15 + 16) |
| 5 — Grmeč 94 precursor (T1, vanilla) | DONE | `2a790255` | 2 files (+750 lines: catalog +237, new test +515) | 21 new |
| 6 — Close-out (this report) | DONE | (this commit) | 4 files (this report new + ledger appends + napkin edit + working-on.md) | n/a |

**Net code delta across LANE C (Phases 1–5):** ~+3,998 lines across 5 source-or-test commits; ~+1,101 lines on `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` alone (the canonical content owner); no other src file modified beyond the +68 substrate edit on `operation_opportunities.ts` and the +3 cosmetic exhaustive-map widening on `OpportunityLedgerPanel.tsx`.

---

## 3. Catalog Summary — 7 Entries After LANE C

| id | name | tier | window (turns) | friendly-overrides? | brigade roster | prereq-axis shape | citation |
|---|---|---|---|---|---|---|---|
| `sana_95` | Operation Sana 95 (LANE B MVP) | T1 | 175–200 | n/a | 9 brigades across 3 axes (2/6 + 3/12 + 4/13) | date_window / corps_readiness / staging_access / enemy_weakness / alliance_context REQUIRED; logistics + commander_confidence OPTIONAL (min 1); political_authorization + weather_season n_a | BB1 + design doc §8 |
| `tigar_sloboda_94` | Tigar-Sloboda 94 / Abdić containment | T1 | 113–122 | YES — 4 OSIDs: `op:cazin:{coralici, liskovac_2, mutnik_2, sturlic_2}` | 6 brigades, single axis (501st/502nd/503rd/505th/510th/517th — canonical OOB IDs verified at `data/source/order_of_battle/oob_brigades.json` lines 1099, 1117, 1134, 1152, 1185, 1218) | date_window / corps_readiness / staging_access / commander_confidence REQUIRED; logistics OPTIONAL (min 1); political_authorization / weather_season / enemy_weakness / alliance_context n_a | BB2 pp.532–534, 541, 555 (Atif Dudaković, 7–10 Jul 1994 Bihać deception, ~3,000 small arms + 200,000 rounds captured, Pecigrad fall 4 Aug 1994); design doc §4.1 |
| `apwb_pressure_94` | APWB / Velika Kladuša pressure | T1 (AMBER) | 113–125 | YES — 5 OSIDs: `op:cazin:sturlic_2` (overlap with Tigar-Sloboda), `op:velika_kladusa:{vejinac_2, zboriste_2, poljana_2, velika_kladusa_2}` | 7 brigades, single axis (incl. arbih_506th_mountain — home OSID `op:velika_kladusa:poljana_2` confirms canonical VK-axis brigade) | date_window / corps_readiness / staging_access REQUIRED; logistics + commander_confidence OPTIONAL (min 1); political_authorization / weather_season / enemy_weakness / alliance_context n_a | BB2 pp.541–545 (Velika Kladuša reduction, summer 1994); design doc §4.2 |
| `una_94` | Una 94 (T3 defensive crisis) | T3 | 113–115 | n/a (T3 early-return skips iteration) | full 9-brigade 5th Corps reserves (501st/502nd/503rd/504th/505th/506th/510th/511th/517th — verified against OOB lines 1099–1247) | date_window / corps_readiness / pocket_survival / logistics / alliance_context REQUIRED (pre-Storm only); min_optional_axes 0 | BB2 p.534 (11–15 Jul 1994 VRS 2nd Krajina probe along the Una); design doc §4.3 |
| `breza_94` | Breza 94 (T3 three-axis defensive fight) | T3 | 125–130 | n/a | 9-brigade reserves (same roster) | same shape as una_94, 6-turn window | BB2 pp.540–542 (31 Aug–15 Sep 1994 Grabež/Otoka/Buzim three-axis offensive + 12 Sep Mladić near-capture); design doc §4.4 |
| `pauk_94_95` | Operation Pauk / Spider 94/95 (T3 sustained siege) | T3 | 135–145 | n/a | 9-brigade reserves (same roster) | same shape as breza_94, 10-turn window, **alliance_context required pre-Storm only** (historian gate: Pauk impossible after Oluja) | BB1 p.417 + BB2 p.556 (~25 Nov 1994–Spring 1995 sustained APWB/SVK/VRS counteroffensive, ~25,000 attackers vs ~15,000 5th Corps); design doc §4.5 |
| `grmec_94` | Grmeč 94 ridge breakout (T1 vanilla) | T1 | 133–138 | n/a (all targets RS-painted in jan1993 baseline) | 6-of-9 brigades single axis "Grmeč Ridge Breakout" (501st/502nd spearhead + 503rd/505th/510th/511th depth; 504th/506th/517th intentionally excluded — architectural hook for emergent Pauk overextension via brigade-pool scarcity) | date_window / corps_readiness / staging_access / commander_confidence / enemy_weakness REQUIRED; logistics OPTIONAL (min 1); political_authorization / weather_season / alliance_context n_a (Grmeč is pre-Storm precursor, NOT Storm-gated unlike Sana 95) | BB2 pp.546–547 (25 Oct 1994 surprise breakout, ~1 Nov 1994 high-water at Orašac plateau / Grabež crest); design doc §4.6 |

---

## 4. Substrate Primitives Consumed

LANE C consumed exactly two LANE B substrate primitives, both landed in Phase 1 commit `14dc48e1` and both additive:

### 4.1 `targets_friendly_overrides?: string[]` (Phases 2 + 3)

**Owner:** `src/sim/combat/operation_opportunities.ts` — added to `OperationOpportunityDef` type union; honored by `spawnCorpsOperationFromOpportunity` friendly-controller filter via override-bypass scope-restricted to `tier === 'T1'` AND `family === 'fifth_corps'`.

**Why:** APWB-controlled OSIDs (Cazin southern flank, Velika Kladuša approaches) are RBiH-painted in the jan1993 baseline (`data/source/calibration/painted_control_jan1993.json:632–635, 169–172`) but during the historical 1994 arc they represent enemy targets to a 5th Corps offensive against APWB armed formations. Modeling APWB as a fourth faction would have required a substrate-scale lift (SVK/APWB controller universe, painted-target rebaselines, combat-math doctrine tables, scenario family churn). The override flag is the minimal-surface fix: at the opportunity-spawn site only, for opportunities flagged T1+fifth_corps only, the friendly-controller filter is bypassed for the listed OSIDs.

**Consumed by:** Phase 2 (Tigar-Sloboda 94 — 4 overrides), Phase 3 (APWB Pressure 94 — 5 overrides, 1 of which intentionally overlaps with Tigar-Sloboda's `op:cazin:sturlic_2`).

**NOT consumed by:** Phase 4 T3 triad (T3 early-return skips spawn iteration entirely, so the override is moot), Phase 5 Grmeč 94 (all 6 target OSIDs RS-painted in baseline; standard offensive pattern).

### 4.2 T3 early-return in `applyOpportunityDecision` (Phase 4)

**Owner:** `src/sim/combat/operation_opportunities.ts:692–703` (Phase 1 substrate). When `def.tier === 'T3'`, approve writes a resolution row with `executed_op_aar_id: undefined` and `exit_class: 't3_authorized_no_offensive'`; `buildCorpsOperation` is not called. Decline path is identical to T1 decline.

**Why:** Una 94 / Breza 94 / Pauk 94/95 model historical defensive-crisis events (VRS / SVK / APWB attacks against the Bihać pocket) where 5th Corps' authorized response is "commit reserves to defend," not "launch a corps offensive." The existing reactive defense and sector morale chain already consumes corps reserves correctly when sectors come under pressure; the T3 substrate just signals "approve the defensive commit" without creating a parallel offensive lifecycle.

**Consumed by:** Phase 4 (all three T3 entries).

**NOT consumed by:** Phase 2 / Phase 3 / Phase 5 (T1 entries spawn `CorpsOperation` via `buildCorpsOperation` exactly as Sana 95 does).

**UI plumbing:** Phase 1 also widened `src/ui/map/data/types.ts` `exit_class` union to include `'t3_authorized_no_offensive'` and extended `OpportunityLedgerPanel.tsx` exhaustive `EXIT_LABEL` / `EXIT_CLASS` maps to render the new variant. These edits are non-functional in the sense that no behavior depends on them; they exist solely to keep the existing UI ledger consumer exhaustive against the widened type.

---

## 5. Single-Owner Verification

**Grep proofs against `src/sim/combat/triggered_operations.ts` (LANE C verification):**

```
$ rg -i 'tigar|sloboda|pecigrad|apwb|kladus|abdi|una_94|breza_94|pauk|spider|grme' \
       F:/A-War-Without-Victory/src/sim/combat/triggered_operations.ts
(no matches)
```

**`_TRIGGERED_OPS` post-LANE-B-migration retains exactly its 7 entries (verified by name-grep on the same file):**

```
$ rg -n 'name:\s*['\''"]Operation' F:/A-War-Without-Victory/src/sim/combat/triggered_operations.ts
128:        name: 'Operation Posavina Corridor',
164:        name: 'Operation Herzegovina Consolidation',
220:        name: 'Operation Kotor Varos',
250:        name: 'Operation Cerska-Kamenica',
344:        name: 'Operation Krivaja-95',
387:        name: 'Operation Stupčanica-95',
439:        name: 'Operation Mistral 2',
```

**`FIFTH_CORPS_OPPORTUNITIES` final state (verified by opportunity_id grep on the catalog):**

```
$ rg -n "opportunity_id:\s*['\"]" F:/A-War-Without-Victory/src/sim/combat/operation_opportunity_catalog_5th_corps.ts
249:    opportunity_id: 'sana_95',
439:    opportunity_id: 'tigar_sloboda_94',
690:    opportunity_id: 'apwb_pressure_94',
903:    opportunity_id: 'una_94',
997:    opportunity_id: 'breza_94',
1091:    opportunity_id: 'pauk_94_95',
1308:    opportunity_id: 'grmec_94',
```

**Conclusion:** Zero overlap between `_TRIGGERED_OPS` (7 calendar-triggered entries: 4 LANE B–era retained + 3 sensitive-history T4 candidates pending sign-off) and `FIFTH_CORPS_OPPORTUNITIES` (7 opportunity entries: Sana-95 MVP + 6 LANE C entries). The Sana migration completed in LANE B Phase 3 (catalog 8 → 7) and is not re-violated. None of the 5 new LANE C opportunity_ids appear in any name/comment/predicate inside `triggered_operations.ts`.

Per-phase grep proofs (recorded contemporaneously in working-on.md):

- Phase 2: `rg -i 'tigar|sloboda|pecigrad' triggered_operations.ts` → 0 matches.
- Phase 3: `rg -i 'apwb|pecigrad|kladus|abdi' triggered_operations.ts` → 0 matches.
- Phase 4: `rg -i 'una|breza|pauk|spider' triggered_operations.ts` → 0 matches.
- Phase 5: `rg -i 'grmec|grmeč' triggered_operations.ts` → 0 matches.

---

## 6. Sensitive-History Compliance

Phase 0 dispatched `/canon-compliance-reviewer` against the 4-arc Phase 0 dossier. Verdicts (carried forward as binding gates for the lane):

| Arc | Verdict | Notes |
|---|---|---|
| #1 Tigar-Sloboda 94 | **GREEN** | Pure-military framing ("APWB armed formations"); citation cleanly attached to BB2 pp.532–534, 541, 555. No civilian / refugee / displacement language required. |
| #2 APWB / VK Pressure 94 | **GREEN + AMBER prose guardrails** | Approved with explicit prose-hygiene constraint: opportunity description, citation prose, axis names, and predicate reasons must avoid `civilian / refugee / displaced / column / fled / flee / expelled / cleansing` lowercase tokens. Comment block uses neutral term "non-combatant outflow" with cross-reference to a guardrail test. The reviewer surfaced the displacement risk because the historical Velika Kladuša reduction triggered substantial APWB-loyalist civilian displacement; representing the military reduction without leaking civilian-cost prose into the opportunity surface is the line the lane must hold. |
| #3 Una/Breza/Pauk T3 triad | **GREEN T3** | Defensive-crisis framing (5th Corps absorbing VRS / SVK / APWB pressure) is canonical for the Bihać pocket arc. T3 early-return ensures no offensive lifecycle is spawned. |
| #4 Grmeč 94 | **AMBER scope-narrowed** | Approved with explicit scope limit: military exploitation only. The August 1995 Velika Kladuša civilian column remains Ring-2 narrative content (essay codex / dynamic newspaper), NOT an opportunity-surface event. Phase 5 commit message and citation prose stayed inside the 25 Oct 1994 → ~1 Nov 1994 high-water frame; the post-Oluja August 1995 events are explicitly outside the lane. |

**AMBER lowercase-includes scan result for APWB Pressure 94 (Phase 3 self-review, captured in working-on.md):** civilian / refugee / displaced / column / fled / flee / expelled / cleansing — **0 hits** across description, citations, axis names, predicate reasons. Comment block uses "non-combatant outflow" neutral term + cross-references the test guardrail. Verified again at Phase 5 close: same scan against the Grmeč 94 block — **0 hits** in description, citations, axes, predicate reasons.

**T4 boundary preserved:** No T4 sign-off chain (`/historian` + `/game-designer` + `/war-or-game` + user approval per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6) was required for this lane. Krivaja-95 / Stupčanica-95 / Goražde / Aug 1995 VK civilian column remain calendar-triggered or Ring-2 narrative-only and are explicitly OUT OF SCOPE (see §8).

---

## 7. Emergent (Non-Railroad) Dependencies Between Entries

LANE C deliberately avoids hardcoded `<x>_completed → <y>_eligible` predicate chains. Inter-opportunity dynamics emerge from three substrate axes only:

### 7.1 Tigar-Sloboda 94 → APWB Pressure 94 (Cazin southern flank brigade-pool serialization)

Tigar-Sloboda 94 (window w113–w122) and APWB Pressure 94 (window w113–w125) overlap on:

- **Shared `targets_friendly_overrides` OSID:** `op:cazin:sturlic_2` is listed in both entries. Tigar-Sloboda treats it as a southern axis objective; APWB Pressure treats it as the historical Pecigrad approach. Once Tigar-Sloboda fires and consumes Šturlić's brigade-presence axis, APWB Pressure's staging_access predicate must read the live state at evaluation time — if Šturlić is still RBiH-controlled and the brigade pool has bandwidth, APWB Pressure remains eligible; if brigades are committed elsewhere or the front has moved, APWB Pressure naturally becomes infeasible.
- **Overlapping brigade rosters:** Tigar-Sloboda lists 6 brigades; APWB Pressure lists 7 (overlap on multiple 50x-series brigades). Brigade-pool serialization is enforced live through `corps_readiness` (which reads available brigade fitness/cohesion) and `staging_access` (which reads pocket-survival anchors). If Tigar-Sloboda has just consumed 6 brigades on a fresh offensive, APWB Pressure's readiness predicate may compute below threshold for 1–3 turns until brigades recover.

This is a substrate-driven dependency: no Phase 2/3 predicate refers to "tigar_sloboda_94 was approved" or any other catalog entry by id. The behavior emerges from overlapping windows + shared OSID footprints + live-state predicates.

### 7.2 Grmeč 94 overextension → Pauk crisis (brigade-pool drain + window seam)

Grmeč 94 closes at w138; Pauk 94/95 opens at w135. The 4-turn overlap (w135–w138) is intentional: the historical Pauk siege was provoked by 5th Corps' Grmeč 94 advance into 2nd Krajina territory. The architectural mechanism:

- **Grmeč 94 brigade roster (6 of 9):** 501st/502nd spearhead + 503rd/505th/510th/511th depth. 504th, 506th, 517th intentionally excluded.
- **Pauk 94/95 brigade roster (full 9 reserves):** All 5th Corps brigades.
- If a player/bot approves Grmeč 94 at w133–w136, the 6 committed brigades are tied up on the breakout axis. When Pauk's window opens at w135 and the predicate engine evaluates `corps_readiness` for the T3 defensive commit, it reads a depleted reserve pool — only 504th/506th/517th plus whatever 50x-series brigades have not been bled out on the Grmeč front. The defensive crisis is harder to weather precisely because the offensive succeeded and pulled committed brigades away from the pocket interior.

Again, no hardcoded chain: no Phase 4 predicate references "grmec_94 fired"; no Phase 5 predicate references "pauk_94_95 will fire." The dependency is a structural property of overlapping windows + a shared 9-brigade pool + live-state readiness/pocket-survival predicates.

### 7.3 Sana 95 coexistence sanity (cross-check)

Grmeč 94 (w133–w138) does not overlap Sana 95 (w178–w200). Both T1 fifth_corps entries co-exist cleanly in the catalog without scheduling collision. Pauk 94/95 (w135–w145) closes well before Sana 95 opens. This is a passive sanity property of the windows the historian dossier produced; it is not enforced by any new code.

---

## 8. What Is NOT in Scope (Out of LANE C)

The following are explicitly OUT OF SCOPE for LANE C and remain backlog/gated:

1. **T4 sensitive-history opportunity entries:**
   - **Krivaja-95** — Srebrenica enclave operation. Calendar-triggered in `_TRIGGERED_OPS:344`. Pending `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 sign-off chain.
   - **Stupčanica-95** — Žepa enclave operation. Calendar-triggered in `_TRIGGERED_OPS:387`. Pending same sign-off chain.
   - **Goražde** — eastern enclave defensive crisis. Pending same sign-off chain.
   - **August 1995 Velika Kladuša civilian column** — explicitly excluded from the opportunity surface per Phase 0 canon-compliance-reviewer verdict #4. Stays Ring-2 narrative (essay codex / dynamic newspaper / event description), NOT a player-decision opportunity.

2. **SVK / APWB modeling as a fourth faction.** APWB pressure is expressed at the OSID-targeting level via `targets_friendly_overrides` only. A full fourth-faction model (controller universe, painted-target rebaselines, combat-math doctrine tables, scenario family churn, OOB) is a substrate-scale lift not warranted by the LANE C scope.

3. **Pressure-state combat-math axis.** The historical APWB / SVK / VRS pressure on the Bihać pocket is currently expressed via T3 defensive-crisis opportunities + reactive defense. A dedicated "pressure-state" combat math signal (defender-axis polarity, sustained-attack erosion, multi-front-pressure cohesion penalty) would let the engine differentiate single-axis VRS probes from Pauk-style multi-front sieges. Not in scope.

4. **UI prose for the AAR ledger consumption of `t3_authorized_no_offensive`.** The Phase 1 widening of `EXIT_LABEL` / `EXIT_CLASS` in `OpportunityLedgerPanel.tsx` ensures the type system is exhaustive, but rich UI prose for what a "T3 authorized, no offensive" resolution means to the player (compared to e.g. `decisive_success`, `did_not_launch`, `aborted`) is downstream-consumer work for a future packet.

5. **Sana coexistence stress test once both fire in 188w.** Grmeč 94 (w133–w138) and Sana 95 (w178–w200) can both fire in a single 188w run if their respective predicates align. No scenario run was performed in this lane. A future calibration-class lane should run 188w with the full LANE C catalog and verify (a) Grmeč 94 fires when its predicates align, (b) Pauk 94/95 fires under defensive crisis conditions in the w135–w145 seam, (c) Sana 95 still fires correctly at w178+ with the prerequisite chain intact, (d) no hash anomalies beyond the additive shape changes already documented in LANE B's MVP report.

6. **Defender-axis polarity in T3 opportunities.** The T3 early-return treats approve as "commit reserves to defend"; there is no explicit polarity signal that distinguishes axis-1 attack from axis-2 attack in a multi-axis defensive crisis. Pauk's three-axis historical reality (Grabež / Otoka / Buzim) is captured in the citation prose only, not in mechanism. Future work.

---

## 9. Verification Artifacts

**Test pack (final state after Phase 5):**

```
9 suites, 163/163 PASS:
  tests/operation_opportunities_substrate.test.ts                     32  (LANE B 17 + AAR-loop 4 + LANE C 11)
  tests/operation_opportunities_phase2_decisions.test.ts              11  (LANE B carry-over)
  tests/operation_opportunities_5th_corps_sana.test.ts                15  (LANE B carry-over)
  tests/operation_opportunities_tigar_sloboda_94.test.ts              18  (Phase 2)
  tests/operation_opportunities_apwb_pressure_94.test.ts              20  (Phase 3, includes 2 AMBER-prose guardrails)
  tests/operation_opportunities_una_94.test.ts                        15  (Phase 4)
  tests/operation_opportunities_breza_94.test.ts                      15  (Phase 4)
  tests/operation_opportunities_pauk_94_95.test.ts                    16  (Phase 4, +1 alliance_context pre/post-Storm gate)
  tests/operation_opportunities_grmec_94.test.ts                      21  (Phase 5, +6 catalog-identity / brigade-roster / prose-hygiene / OSID-leak)
                                                                     ----
                                                                     163
```

**`tsc --noEmit`:** CLEAN at every phase boundary (re-verified at Phase 5 commit).

**Single-owner grep proofs:** see §5.

**Diff-scope discipline:** Every phase commit's diff is bounded to (a) `src/sim/combat/operation_opportunities.ts` (Phase 1 only), (b) `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (Phases 2–5), (c) per-phase test file(s), (d) UI plumbing (`src/ui/map/data/types.ts` + `OpportunityLedgerPanel.tsx`) on Phase 1 only. NO substrate / IPC / pipeline / scenario / canon / OOB / painted-target edits across any LANE C phase.

**No scenario-scale 40w/188w rerun:** Justification per LANE B Phase 4 verification's recorded principle ("hash drift on additive shape changes is documented expected behavior, not stop-gate"). LANE C's 5 new entries add no new pipeline step, no new state-shape field, no engine math. The opportunity-evaluator walk simply iterates one larger catalog. The substrate primitives (`targets_friendly_overrides`, T3 early-return) are gated by tier+family checks that dial them in only for the new T1+fifth_corps entries / T3 entries respectively. Behavior in 40w is unchanged (no LANE C entry fires before w113); behavior in 188w would diverge only when LANE C predicates align with live state (a calibration-class question for a future packet, not a close-out blocker).

---

## 10. Follow-ups for Next Lane

Honest follow-ups inherited from LANE C close-out — none of these block the lane close, but each is a real next-packet candidate:

1. **SVK pressure modeling for the Bihać pocket.** The T3 triad's "alliance_context required pre-Storm" gate captures the Pauk-impossible-after-Oluja constraint, but there is no positive SVK pressure signal feeding combat math. A pressure-state axis (defender polarity, sustained-attack erosion, multi-front-pressure cohesion penalty) would let the engine differentiate single-axis VRS probes from multi-front APWB/SVK/VRS sieges. Owner candidate: `/operations-expert` + `/game-designer`.

2. **Defender-axis polarity in T3 opportunities.** Pauk 94/95's three-axis historical reality (Grabež / Otoka / Buzim) is captured only in citation prose. A T3 substrate extension that lets a defensive-crisis opportunity name its axes (and lets the reactive defense chain consume that axis structure for sector-morale weighting) would close the modeling gap. Smaller surface than (1).

3. **Sana coexistence stress test in 188w.** Run 188w with the full LANE C catalog + Sana 95; verify all 7 entries fire when their predicates align, no double-fires, no `seenOpportunityIds` regressions, no hash anomalies beyond LANE B's documented additive-shape baseline. Owner: `/scenario-creator-runner-tester`.

4. **AAR ledger UI prose for `t3_authorized_no_offensive`.** Phase 1 widened the exhaustive maps to satisfy the type system; a future packet should make the player-facing label and Records-tab description distinguish "T3 reserves committed to defend" from `did_not_launch` / `aborted` / `decisive_success` etc. Owner: `/ui-ux-developer` + `/narrative-designer`.

5. **Grmeč → Pauk overextension live evidence.** The architectural hook (Grmeč 94 commits 6 of 9 brigades; Pauk readiness reads depleted pool) is in place. A short audit packet could measure (in a 188w run) whether the overextension actually shows up in Pauk's `corps_readiness` predicate score for the w135–w138 overlap window. If it does, document as emergent-mechanic case study. If it doesn't, investigate why (predicate threshold tuning, reserve-recovery timing, etc.). Owner: `/operations-expert`.

---

## 11. Files Changed Summary (LANE C)

| Phase | Files modified | Files created | Net lines |
|---|---|---|---|
| 1 | `src/sim/combat/operation_opportunities.ts` (+68); `src/ui/map/data/types.ts` (+1); `src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx` (+3) | `tests/operation_opportunities_substrate.test.ts` extended (+338 cumulative; not file-creation but +11 cases) | +407 |
| 2 | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (+221) | `tests/operation_opportunities_tigar_sloboda_94.test.ts` (+439) | +657 |
| 3 | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (+260) | `tests/operation_opportunities_apwb_pressure_94.test.ts` (+529) | +787 |
| 4 | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (+383) | `tests/operation_opportunities_una_94.test.ts` (+332); `tests/operation_opportunities_breza_94.test.ts` (+329); `tests/operation_opportunities_pauk_94_95.test.ts` (+356) | +1397 |
| 5 | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (+237) | `tests/operation_opportunities_grmec_94.test.ts` (+515) | +750 |
| 6 | `docs/PROJECT_LEDGER.md` (append); `docs/PROJECT_LEDGER_KNOWLEDGE.md` (append); `.claude/napkin.md` (edit); `working-on.md` (gitignored update) | `docs/40_reports/implemented/20260501_LANE_C_FIFTH_CORPS_OPPORTUNITY_FAMILY.md` (this report) | docs only |

**Total LANE C source/test delta:** ~+3,998 lines across Phases 1–5. Catalog file alone: +1,101 lines (across the 4 content phases).

---

## 12. Determinism Statement

LANE C preserves engine determinism at every phase:

- No `Math.random` / `Date.now` / `localeCompare` introduced in any new file or any edit.
- All sorting via `strictCompare` (substrate evaluator already enforces this; LANE C added no new sort sites).
- Approval is the only mutation that touches `cmd.active_operations`, and it does so via `buildCorpsOperation` (the canonical factory) — except for T3 entries where the early-return skips the factory entirely and writes only a resolution row.
- Save shape backward-compatible: `targets_friendly_overrides` is optional on `OperationOpportunityDef` (catalog content, not state); the new `t3_authorized_no_offensive` exit_class is a new value of an existing union, not a new field.
- Replay safety: opportunity-resolution log preserves `(proposal_id, opportunity_id, response, response_turn, executed_op_aar_id?, exit_class)` for every decision, including T3 (where `executed_op_aar_id` stays `undefined`).

---

## 13. Hand-off

**Files changed:** ~12 src/test files across 5 commits (Phases 1–5) + 4 docs/process files in this Phase 6 close-out.

**Tests:** 11 new substrate cases (Phase 1) + 18 (Phase 2) + 20 (Phase 3) + 46 (Phase 4) + 21 (Phase 5) = **116 new test cases for LANE C**; final pack 163/163 across 9 suites.

**No scenario run hashes captured** — additive content only; no new pipeline step; no engine math. A future calibration-class lane should perform 188w stress test (see §10 follow-up #3).

**Remaining blockers:** none for this lane. Sensitive-history T4 work requires the §6 sign-off chain. SVK / pressure-state combat math is a substrate lift outside this lane's scope.

**Open follow-ups (not blockers):** see §10.

**Next recommended lane:** §10 #3 (Sana coexistence stress test in 188w) is the smallest-surface follow-up that would produce the highest-confidence calibration evidence; §10 #5 (Grmeč → Pauk overextension live evidence) is the most interesting from a design-truth perspective.

---

## 14. Stop Gates Hit

None. The lane progressed through all six phases without hitting any of the documented stop gates (sensitive-history boundary breach — guarded by Phase 0 canon-compliance-reviewer verdicts and per-phase prose-hygiene scans; determinism failure I cannot isolate — none introduced; active file-ownership conflict — co-active UI ledger lane was a downstream consumer, no conflict; severe invariant break — single-owner discipline preserved at every phase; canon-compliance reviewer flag — verdicts captured in §6).

Three minor on-the-fly adjustments worth recording:

1. **Phase 2 brigade IDs.** Prompt-suggested IDs (`*_bihac_mountain` / `*_cazin_mountain` / `*_buzim_motorized` / `*_first` names) did not match OOB; canonical IDs were verified at `data/source/order_of_battle/oob_brigades.json` lines 1099, 1117, 1134, 1152, 1185, 1218 and used per the "VERIFY EXACT IDs" directive.
2. **Phase 2 prereq mapping.** Prompt listed `pocket_survival REQUIRED + staging_access OPTIONAL` but those collide on the same architectural axis per Sana's pattern; pocket-survival absorbed into `staging_access REQUIRED`, `logistics` demoted from REQUIRED to OPTIONAL to satisfy `min_optional_axes:1`.
3. **Phase 3 OSID discovery.** Pecigrad and Trzac do NOT exist as operational OSIDs (absent from `data/derived/operational/operational_contact_graph.json` AND `canonical_to_operational_map.json`). Their geographic role is carried by `op:cazin:sturlic_2` (Šturlić — verified contact-graph adjacent to `op:velika_kladusa:vejinac_2`). The 5-OSID list shifted to canonical OSIDs while preserving the historical Pecigrad-approach intent.
4. **Phase 4 Pauk test count.** Pauk test count is 16 (not the prompt's projected ~13) — added an explicit `alliance_context` pre/post-Storm isolation case ("Pauk impossible after Oluja" historian gate) on top of the standard 13 because that constraint is the headline distinguishing feature of Pauk vs the other two T3 entries.
