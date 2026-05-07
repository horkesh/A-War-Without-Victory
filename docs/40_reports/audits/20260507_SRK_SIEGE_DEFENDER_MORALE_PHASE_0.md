# DDR — SRK Siege Defender Morale Phase 0

**Lane:** `LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-0`
**Date:** 2026-05-07
**Type:** Design-only DDR. No source-code or canon-doc edits.
**Predecessor:** `docs/40_reports/implemented/20260507_SRK_SIEGE_MORALE_AUDIT.md` (commit `aa115a99`) — Lane 3 STOP-AND-ASK on sub-issue #1.
**Trigger finding:** D3.3 triage `af2400764` — SRK morale (~64) + cohesion (~54) plateau across w10–w17 under sustained siege; Mladić + SRK Galić-persona both flagged.

---

## Overview

The SRK siege defender morale plateau is a real engine gap. Galić-era SRK defenders manning the Sarajevo perimeter from May 1992 through 1995 historically suffered cumulative morale erosion: prolonged static-line exposure to ARBiH 1st Corps counter-battery + sniper return fire, sustained personnel turnover from siege-bombardment attrition, exhaustion of mobilization pools in Pale/Sokolac/Trnovo/Novo Sarajevo, and the political wear of the West's eventual condemnation (Galić indicted 1999; Dragomir Milošević 1998). The current engine has no siege-defender morale-drain mechanism — `siege_attrition.ts` is personnel-only (`BASE_SIEGE_ATTRITION_RATE = 0.004` of personnel/turn, escalation cap 2.0×), and `morale_drift.ts` actually awards SRK defenders `+AFFINITY_DRIFT_UP = +2/turn` in own-population muns (Bosnian-Serb majority Pale/Sokolac/Trnovo/Novo Sarajevo), with no offsetting siege-specific drain. Net result: SRK morale floats at the high-affinity attractor (~60–70) regardless of how long the siege has run.

This Phase 0 DDR scopes the design space, identifies §6-adjacent surfaces that would be touched, and recommends a SHIP shape with explicit canon-amendment sign-off requirements. **No mechanism is being prescribed in this lane** — the deliverable is a decision-ready Q&A package the user can sign off on (or reject) before any code lane opens.

---

## Q1 — Mechanism design

**Options on the table:**

- **(a) New `siege_morale_drain.ts` module.** A siege-defender-specific morale attrition term that runs alongside `siege_attrition.ts` (personnel) in the same pipeline slot. Reads `state.military.siege_turn_counters` (already populated, faction-keyed). Applies a per-turn morale decrement to formations whose `location_osid` is keyed in the siege counters AND whose faction matches the besieged-faction key. Coefficient scales with siege duration (graduated thresholds — see Q2).

- **(b) Extend `morale_drift.ts`.** Add a conditional that suppresses or reverses `AFFINITY_DRIFT_UP` when the brigade's OSID appears in `siege_turn_counters[<faction>:<osid>]` and the counter exceeds a duration threshold. Smaller code surface; tighter coupling to existing morale code. Risk: muddies the affinity drift mechanic semantically (affinity is about ethnic geography, not siege fatigue).

- **(c) Per-OSID siege-attrition pressure feeds drain coefficient.** Read the existing `escalation` factor inside `siege_attrition.ts` (1.0 → 2.0× over `counter` turns) and emit a sibling morale-drain value to `morale_drift.ts` via a precomputed `siegePressureByFormation` map. Single source of truth for siege duration.

**Recommendation: (a) New module.**

Rationale: Faction-symmetric by construction (mechanism reads `siege_turn_counters` which is faction-keyed); discoverable as a dedicated file (matches `siege_attrition.ts` naming convention); zero coupling to the affinity mechanic (which is correct for own-population areas regardless of siege state); independent test surface; clear extension point for a future "exhaustion-of-pool" feedback term. Pipeline slot: immediately after `applySiegeBombardmentAttrition()` in `war_phases.ts`, before `runMoraleDrift()` (so the drift step's `recent_battle_outcome` clear and final morale clamp apply correctly).

---

## Q2 — Coefficient calibration

**ICTY canon (Galić IT-98-29-T, Dragomir Milošević IT-98-29/1):** SRK manning suffered cumulative wear over the 1992–1995 envelope — but the wear was **non-linear**. The first ~6 months of the siege (May 1992 → late 1992) were morale-positive for SRK (RS strategic momentum, JNA inheritance, "winning everywhere"). Wear became visible in 1993 (corridor fights, ARBiH counter-offensive at Igman, sniping campaign drawing UN attention). Hard erosion is from late 1994 onward (Galić's relief by Dragomir Milošević in August 1994 was itself a manifestation; international airpower threat after London Conference; corridor strangulation of Pale supply during 1995). This is consistent with BB2's account of VRS late-war manning crises across all three corps.

**Proposed graduated coefficient (default, subject to mini-panel calibration):**

| Siege counter (turns) | Per-turn morale drain | Cumulative effect |
|----------------------:|----------------------:|------------------:|
| 0 – 13 (≤ ~3 months)  | 0.0                   | None — early-siege "winning" period |
| 14 – 26 (3 – 6 mo)    | -0.5                  | ~6 morale over 13 turns; offsets +2 affinity drift |
| 27 – 52 (6 – 12 mo)   | -1.0                  | ~26 morale over 26 turns |
| 53 – 104 (12 – 24 mo) | -1.5                  | ~78 morale over 52 turns (capped by floor) |
| 105+ (> 24 mo)        | -2.0                  | Late-war exhaustion — Dragomir Milošević era |

**Floor:** Drain stops at `morale = 25` to avoid cascading collapse interaction with the v0.7.0 §6.2.4 morale-collapse override (`MORALE_OVERRIDE_THRESHOLD = 15`, `MORALE_OVERRIDE_RESET = 20`). A siege-drain mechanic that pushes morale into the 8-turn dissolution streak band would risk wholesale SRK dissolution at w52+ — ahistorical and §6-adjacent.

**Faction-symmetric:** Same thresholds and same floor for any faction in `siege_turn_counters`. The ARBiH side of the same siege (1st Corps brigades inside the ring) is ALSO besieged for the same duration; the mechanism would apply to them too, offset by the existential-floor (`RBIH_EXISTENTIAL_FLOOR = 25`) which would clamp them at floor immediately. This is faithful to the historical record (ARBiH 1st Corps morale was structurally pinned by no-surrender-option dynamics, not by absence of fatigue).

**Sources:**
- ICTY Galić IT-98-29-T trial judgement, paras describing SRK manning patterns 1992–1994.
- ICTY Dragomir Milošević IT-98-29/1 trial judgement, paras on 1994–1995 SRK relief command and operational degradation.
- Balkan Battlegrounds 2 (BB2) chapter on VRS late-war manning and corps cohesion, especially Drina + Sarajevo-Romanija.
- AWWV `tools/claude_plays_vrs/personas/vrs_srk_corps_co.json` Galić-persona telemetry corroborating plateau detection.

---

## Q3 — §6 surface impact

This change touches §6-adjacent surfaces. Per Engine Invariants v0.9.0 §6, any morale change that interacts with combat resolution, dissolution, or operation eligibility is on a §6-relevant surface.

| Surface | Touched? | Impact assessment |
|---|---|---|
| **§6.2.4 Morale-collapse override** (`MORALE_OVERRIDE_THRESHOLD = 15`, 8-turn streak → dissolution) | Indirectly | Drain floor at morale 25 prevents direct interaction. BUT if a brigade is already drained by other sources (combat repulse, supply CRITICAL, exhaustion penalty) the siege drain accelerates entry into the 15–20 hysteresis band. Mitigation: floor; faction-symmetric. Verification: unit test pinning that a SRK brigade with `siege_turn_counters[vrs:osid] = 200` and no other drain stays at morale ≥ 25. |
| **Sarajevo siege turn boundaries** (`triggered_operations.ts` Krivaja-95 / Stupčanica-95 / Sarajevo siege A1-A5/B1+B2/C1+C2/D1+D2 frozen surfaces) | No (read-only) | Mechanism does not consume siege-turn boundaries; reads `siege_turn_counters`. Boundary calculation lives in unrelated triggered-ops code. Risk: side-effect on operation eligibility if SRK brigades in the besieging ring drop below an operation's morale gate. Verification: 188w A/B that the four enclave-fall sequencing windows still fire. |
| **Galić-era anchor expectations** | Possibly | Sarajevo-area OSIDs are not in the 25-anchor 40w set per CALIBRATION_MASTER. 188w extension may add Sarajevo anchors; if so, they need re-calibration after this lane. |
| **`brigade_dissolution.ts` 2-of-3 criteria** (`morale ≤ 15`) | Indirectly | Drain floor at 25 prevents direct interaction. SRK siege brigades remain above the morale criterion absent other drains. |
| **`runMoraleDrift` exhaustion / battle outcome / habituation pipeline** | Sequential | Siege drain runs before drift; drift's existing clamps (`min(0, max(100, ...))`, faction floor, existential floor, `resolveMoraleDriftMaxPerTurn` cap) apply unchanged. |
| **Mladić MORS / SRK Galić-persona telemetry feed** | Yes (downstream) | Mechanism removes the plateau the personas flagged. Persona telemetry will need a re-baseline once the mechanism ships. |
| **Cold front invariant (§6.4)** | No | Sarajevo perimeter is not under Graz Accords; siege drain is orthogonal. |

**Verdict:** §6-adjacent. Canon amendment required (see Q4). Frozen surfaces (Krivaja-95 / Stupčanica-95 sequencing) are read-only-related, not edited.

---

## Q4 — Canon amendment language

**Engine Invariants v0.9.0 §6 — proposed new subsection §6.6:**

> **§6.6 Siege Defender Morale Drain (LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE, anticipated):** Formations of a faction `F` whose `location_osid` is keyed in `state.military.siege_turn_counters[F:osid]` with counter `c > 0` receive a per-turn morale decrement scaled to siege duration. Mechanism is faction-symmetric: applies to any faction with an active siege counter, including own-population areas (the affinity drift `+2` is intentionally not suppressed; the siege drain offsets it after a duration threshold). The drain has a hard floor at morale `25` and never directly reduces morale below the §6.2.4 override threshold (`15`). Constants: graduated by counter `c` per Systems Manual §6 schedule; floor `SIEGE_DRAIN_MORALE_FLOOR = 25`. The drain runs in the war phase pipeline immediately after `applySiegeBombardmentAttrition` and before `runMoraleDrift`. Citations: ICTY Galić IT-98-29-T (SRK 1992–1994); ICTY Dragomir Milošević IT-98-29/1 (1994–1995); BB2 chapter on VRS late-war manning.

**Systems Manual v0.9.0 §6 — proposed addition under "Morale" subsection:**

> **Siege defender morale drain.** A new mechanism (`siege_morale_drain.ts`) applies a graduated morale decrement to defenders whose OSID appears in `siege_turn_counters`. Schedule: `0–13 turns: 0.0`, `14–26: -0.5`, `27–52: -1.0`, `53–104: -1.5`, `105+: -2.0` per turn. Floor: morale = 25. Faction-symmetric. Models cumulative siege manning fatigue documented in ICTY Galić and Dragomir Milošević judgements and BB2; the early "winning period" (turns 0–13) is morale-neutral, with erosion deepening through 1993, 1994, and 1995. Affinity drift (`+2/turn` in own-population areas) is preserved; the siege drain offsets it after the duration threshold. Implementation gate: behind environment flag `SIEGE_MORALE_DRAIN_ENABLED` (default `false`) for shadow-flag rollout; with the flag off, drain is computed and reported (diagnostic-only) but not applied.

**Sign-off requirements:** Both Engine Invariants v0.9.0 §6 and Systems Manual v0.9.0 §6 are §6-protected canon documents; user sign-off is required before any code-lane edits or canon-doc edits. This DDR is the sign-off package.

---

## Q5 — Calibration risk band + 188w A/B requirements

**Likely affected anchors / benchmarks (188w):**
- Sarajevo-area OSIDs (if added to 188w anchor set): potential drift from SRK reduced operational tempo as morale degrades.
- RS late-war territorial benchmarks (w104, w156, w188): possible 1–3% area drift downward as SRK becomes less aggressive on counterattack response.
- RBiH `preserve_survival_corridors` benchmark: possible 1–2% improvement (SRK less effective on cutoff ops).
- RS 188w "no-VRS-collapse" benchmark: at risk if drain coefficient is too steep — must verify SRK does not drift into mass-dissolution.
- HRHB benchmarks: zero impact (no HRHB OSIDs in `siege_turn_counters` in any 1992–1995 scenario).

**40w impact:** Minimal — siege duration in 40w window stays in the 0–13 turn "winning period" band where drain is 0.0. Anchors (25/25) and benchmarks (6/6) should hold byte-identical with `SIEGE_MORALE_DRAIN_ENABLED = false` (shadow flag). Even with flag on, drain coefficient = 0 for all OSIDs in the 40w window.

**188w mini-panel binding thresholds:**
- **Anchors:** ≤ 1 regression vs `aa115a99` baseline.
- **Benchmarks:** 5/6 PASS minimum.
- **SRK morale at w20:** measured; should remain in 50–70 band (unchanged from baseline).
- **SRK morale at w104:** measured; expected drift to 35–50 band (mechanism working).
- **SRK morale at w156–w188:** measured; expected drift to 25–35 band (floor engaged).
- **SRK dissolution count w0–w188:** ≤ baseline + 2 brigades (avoids cascade).
- **Sarajevo siege turn boundaries:** Krivaja-95 / Stupčanica-95 / siege A1–A5 / B1+B2 / C1+C2 / D1+D2 windows fire byte-identical or within ±1 turn.
- **40w hash:** byte-identical with flag off (shadow flag verification).

**Risk band:** **MEDIUM.** The mechanism is faction-symmetric, has a floor that prevents §6.2.4 cascade, and ships behind a shadow flag. The §6 surface impact is read-only-related, not direct. The only real risk is calibration drift in the 188w late-war window — addressed by the binding thresholds.

---

## Q6 — SHIP shape

**Recommendation: SPLIT into two lanes.**

- **Phase 1 — Mechanism (`LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-1`):** Add `siege_morale_drain.ts` with the schedule from Q2, gated behind `SIEGE_MORALE_DRAIN_ENABLED` (default `false`). Wire into `war_phases.ts` after `applySiegeBombardmentAttrition`, before `runMoraleDrift`. Add canon amendments per Q4. Add unit tests: faction symmetry, floor at 25, schedule thresholds, shadow-flag-off byte-identity. Smoke: 40w byte-identical with flag off; 40w hash drift with flag on (drain = 0 in 40w window, so should still be byte-identical — this is the smoke contract). Lane budget: ~2 fix-touched files + 1 test file + canon edits.
- **Phase 2 — Calibration (`LANE-NIGHTSHIFT-SRK-SIEGE-DEFENDER-MORALE-PHASE-2`):** 188w A/B with flag on. Tune coefficient schedule against binding thresholds in Q5. Mini-panel sign-off on coefficient adjustments. Document final calibration in `CALIBRATION_MASTER.md` and `BOSNIAN_WAR_MASTER.md` (or equivalent). If 188w drift is too aggressive, adjust schedule down by ~25% and re-run.

**Why split:** Phase 1 is mechanism-only and 40w-clean — can ship in a single nightshift lane. Phase 2 is calibration work that requires 188w A/B (multi-hour run pair) and human-eyeball assessment of late-war anchor drift. Bundling them risks 40w regression masking 188w calibration anomalies.

---

## Sensitive-history compliance

- **Faction-symmetric mechanism:** Mechanism reads `siege_turn_counters`, which is faction-keyed; same coefficient schedule applies regardless of which faction is besieged. ARBiH 1st Corps brigades besieged in Sarajevo are subject to the same drain as VRS SRK brigades besieged in Goražde or Žepa or Srebrenica.
- **Faction-asymmetric data:** Which OSIDs end up in `siege_turn_counters` is canonical-data-driven (siege detection logic in `siege_detection.ts`). The mechanism does not name SRK or RS — the data does.
- **Existing faction floors preserved:** `RBIH_EXISTENTIAL_FLOOR = 25` and `FACTION_HOME_MORALE_FLOOR` continue to clamp morale at floor; siege drain stops at `25` and does not bypass them.
- **§6 sign-off required:** Both Engine Invariants v0.9.0 §6 and Systems Manual v0.9.0 §6 are §6-protected canon documents. User sign-off on the Q4 amendment language is mandatory before Phase 1 lane opens.

---

## Go/no-go recommendation

**Verdict: GO-WITH-CANON-AMENDMENT** (split into Phase 1 + Phase 2).

**Risk band: MEDIUM.**

**Conditions for GO:**
1. User signs off on Q4 canon amendment language (Engine Invariants v0.9.0 §6.6 + Systems Manual v0.9.0 §6 morale subsection).
2. User confirms SHIP shape is split (Phase 1 mechanism + Phase 2 calibration), not bundled.
3. User confirms shadow-flag rollout (`SIEGE_MORALE_DRAIN_ENABLED = false` default in Phase 1) is acceptable.
4. User confirms 188w A/B binding thresholds (Q5).

If any of these are NO, escalate to **GO-WITH-FULL-PANEL** (mini-panel deliberation with operations-expert + canon-compliance-reviewer + war-or-game + historian).

---

## Open questions for user

1. **Coefficient schedule sign-off.** Is the graduated schedule in Q2 (`0/–0.5/–1.0/–1.5/–2.0` keyed on 14/27/53/105 turn thresholds) calibrated for AWWV's expected 188w pace, or should the thresholds be tighter (e.g. `8/16/32/64`)? Historian + war-or-game input would help — but user intent is needed first on whether the "early-winning-period" (turns 0–13 at drain = 0) is the right modelling choice or whether SRK should start drain immediately at a smaller coefficient.

2. **Floor at 25 vs lower.** Is `SIEGE_DRAIN_MORALE_FLOOR = 25` the right floor, or should the mechanism be allowed to push morale lower to interact with the §6.2.4 dissolution override? A lower floor (e.g. 18) would let exceptionally-long sieges (Sarajevo at w156+) trigger SRK dissolutions — historically defensible (ICTY descriptions of late-war SRK manning crises) but cascade-risky. A higher floor (e.g. 35) would prevent any §6.2.4 interaction but also bound the mechanism to "morale erosion" rather than "manning collapse".

3. **Shadow-flag default.** Phase 1 ships with `SIEGE_MORALE_DRAIN_ENABLED = false` (40w-byte-identical guaranteed). Should Phase 2 calibration close with the flag still off (mechanism documented but inert pending future enable) or flipped to `true` after 188w A/B passes binding thresholds? The N4 morale-collapse override precedent (still default-off as of 2026-05-03) argues for keeping the flag off until a bundled "v0.9.x morale model enable" decision.

---

**Lane status:** DDR DELIVERED. Awaiting user sign-off on Q1–Q6 + open questions before any Phase 1 code or canon work opens.
