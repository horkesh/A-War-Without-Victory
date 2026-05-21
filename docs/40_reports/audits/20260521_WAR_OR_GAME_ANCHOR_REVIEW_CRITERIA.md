# War-or-Game Anchor Review Criteria — Painted-Target Anchor Commissioning

**Author:** war-or-game (realism auditor)
**Date:** 2026-05-21
**Scope:** Review-criteria memo for anchors at Jan 1993 (w40), Apr 1994 (w104), Apr 1995 (w156), Oct 1995 (w184).
**Status:** Read-only. No code, scenario, anchor, or `FORAWWV.md` edits. Codex is touching `src/sim/combat/*` in parallel — this memo neither prescribes implementations nor patches them.

This document is a **filter**, not a draft. The three researcher tracks (`/historian`, `/balkan-battlegrounds-historical-extractor`, `/scenario-creator-runner-tester`) will propose anchors; every proposal must pass this filter before entering the painted-target table.

Authoritative reference: `docs/40_reports/REAL_WAR_MASTER.md`, especially "Historical/Doctrinal Blindspot Audit" (HIST-GAP-1..6) and Issues #37, #38, #39.

---

## Decision Rule — Three Categories for Every Proposed Anchor

1. **ACCEPT — Externally forced.** The historical outcome was driven by a decision *outside the sim's combat/operations/AI loop* (UNSC, NATO command, foreign-army intervention, genocide). The sim can never produce it organically and is not required to. We accept the anchor as a deterministic exogenous input; if the engine cannot produce it, that is a scenario-injection problem, not an emergent-mechanic problem.

2. **ACCEPT — Emergent and earnable.** The sim, with mechanics that already exist or are committed for the relevant version, can plausibly produce the outcome from initial conditions + force balance + bot AI. Anchor specifies what good emergence looks like.

3. **REJECT — Railroad without mechanic.** The outcome is contingent on a specific real-war mechanic the engine does not model. Anchor cannot be earned by emergent play. Accepting it forces one of: (a) hardcoded OSID flips, (b) `avoided_osids_by_faction`-style data overrides, (c) painted-target tuning that masks broken mechanics. **All three are banned.**

The boundary between (1) and (3) is whether the missing mechanism is *exogenous and modellable as an injected event* (UNSC vote, NATO airstrikes, HV crossing the border) versus *endogenous to the war and absent from the engine* (cleansing-not-combat, strangle-not-capture, comms asymmetry).

---

## Acceptable Anchor Patterns Per Epoch

### Jan 1993 (w40) — current calibration target

**ACCEPT — Externally forced.** None of the dominant 1992 outcomes were externally forced; the JNA dissolution and VRS blitz are sim-modellable.

**ACCEPT — Emergent and earnable** (the sim already produces these competently per n1289/n1853):

- **VRS territorial dominance band** — RS controls roughly 50–60% area-weighted by w40. Width: 5pp tolerance. RATIONALE: emerges from JNA-handover OOB asymmetry + first-half blitz. Currently 52.9% (n1240), 93.2% area-weighted at n1289. The sim earns this.
- **Posavina Corridor opens by mid-summer** — control points: Modriča w8–14, Odžak w10–16, Bosanski Brod w24–30. Band, not point. RATIONALE: post-n1002 fix (Op Corridor with 5-bde main axis) produces this emergently. Real cause: VRS mass + concentration, not a script.
- **Sarajevo siege ring stable** — SRK retains ring OSIDs around Sarajevo for all 40 turns; ARBiH retains the central city OSIDs. Two-faction-coexists pattern, not a flip.
- **Eastern enclaves formed by w40** — Srebrenica, Goražde, Žepa as RBiH islands inside RS territory. The *shape* of enclave-formation is emergent. Specific OSID-by-OSID composition can vary; require enclave-existence + RBiH control of named enclave-core OSID(s).
- **Bihać pocket holds** — RBiH controls the Bihać urban core OSIDs. ARBiH 5th Corps does in fact hold, in the sim.
- **HVO holds Herzegovina pre-Jackal-handover OSIDs** — Mostar (west), Stolac, Čapljina under HVO control by w40 (Operation Jackal completed mid-1992).
- **Total military casualties band** — 35–55k for 40 weeks (n1240: 44k, n1289 likely similar). Band, not point. Attrition-band anchors are healthier than point counts.

**ACCEPT — Bands, not points** (already plausible OSIDs whose exact controller varied historically week-to-week):

- Brčko, gradacac_2, boljanic_2 — these have been P0 churn anchors. Treat as **bands** ("either RS holds OR contested OR RS-leaning-decisive"), not absolute controllers. The real war saw these OSIDs change hands multiple times in 1992.

**REJECT — Railroad patterns for Jan 1993:**

- Any anchor demanding `political_controller == X` for an OSID that historically saw multiple controllers in 1992. Use band/range or contested-state.
- Any anchor pinning the 503rd's morale, the 1KK's casualty count, or any single-formation metric. The sim earns formation states emergently; pinning them invites OOB calibration hacks.

---

### Apr 1994 (w104) — Washington Agreement Era

**ACCEPT — Externally forced** (with injection caveats):

- **Washington Agreement signed by w101 (Mar 1994)** — flag `washington_agreement_signed` set. RATIONALE: this is a treaty event, not a battlefield outcome. The sim need not "earn" it; the scenario must inject it.
- **Goražde NATO ultimatum issued ~w103 (Apr 1994)** — flag `gorazde_ultimatum_2_1994` set; constrains VRS attacks on Goražde from this point forward. RATIONALE: NATO command decision external to sim AI.
- **Sarajevo TEZ in effect from w95 (Feb 1994)** — heavy weapons exclusion zone around Sarajevo, restricting both VRS shelling and ARBiH offensive ops in the SRK-1st Corps friction zone.

**ACCEPT — Emergent and earnable** (only with current mechanics; flag missing-mechanic dependencies):

- **HRHB collapses to three central-Bosnia enclaves (Vitez pocket, Kiseljak pocket, Žepče pocket) by w104** — DEPENDS on Issue #37 (`hrhb_political_goal=croat_republic` flag-reader wiring). **Currently a REJECT until HRHB wiring lands**, because the sim's HVO never goes offensive against ARBiH, so it never gets shoved back to those three pockets. After Issue #37 is fixed, this becomes emergent.
- **Mostar east-west split holds** — HVO west, ARBiH east. Same dependency as above (Issue #37). REJECT until wired.
- **RS area share band** — broadly stable 50–60% range (slight loss vs Jan 1993 from incremental ARBiH/HVO gains in central Bosnia is plausible).
- **Bihać pocket still RBiH** — w104, before Operation Tigar / before the late-1994 Krajina pressure peak.

**REJECT — Railroad patterns for Apr 1994:**

- Any anchor on the *post*-Washington joint ARBiH-HVO operational geometry (e.g. "joint axis along Vrbas valley by w104"). The sim has no joint-operations mechanic (REAL_WAR_MASTER §1063 "no joint HVO-RBiH operations for Jajce"). Joint ops are a known design gap.
- Any anchor on specific Goražde combat outcomes (e.g. "Goražde holds with N defender casualties"). Without UNPROFOR + NATO ultimatum mechanically modeled, this is either externally injected (acceptable as forced) or hacked (rejected). Treat as forced flag, not as territorial outcome.
- "Cleansing-driven" demographic anchors for Banja Luka, Prijedor, etc. (HIST-GAP-6 — ethnic-cleansing mechanic absent).

---

### Apr 1995 (w156) — Pre-Storm / Pre-Deliberate Force

**ACCEPT — Externally forced:**

- **Bihać still partly contested** — Operation Tigar / Krajina pressure peaked late 1994; by Apr 1995 the pocket is in active stress. Acceptable as a *contested state*, not a controller flip. Specific OSID controllers within Bihać should be banded.
- **Srebrenica DMZ status active** — `srebrenica_demilitarized` flag must be set by ~April 1993 historically (Issue #38). Anchor: flag is set, enclave still exists at w156.
- **NATO RRF deployment in progress** — flag `rrf_deployed` accumulating; constrains VRS escalation.

**ACCEPT — Emergent and earnable** (with caveats):

- **Three HVO central-Bosnia pockets still besieged** — same Issue #37 dependency. REJECT until wired.
- **RS area share band** — 50–58% range. Slight decline from peak as ARBiH 5th Corps grinds in NW and ARBiH-HVO joint pressure (if wired) chews central Bosnia.

**REJECT — Railroad patterns for Apr 1995:**

- "ARBiH 5th Corps breakouts at Velika Kladuša / Cazin" — these depended on Fikret Abdić's APZB collapse (May 1995 Croatian-army-assisted), which is a politically-driven local civil war event. The sim has no Abdić / APZB / autonomous-province mechanic.
- "VRS forces being repositioned away from Krajina toward Posavina/Srebrenica axis" — depends on VRS reading external strategic threat from HV. The corps-CO briefing layer has no "neighbouring country building army on my border" input.
- Any anchor on per-brigade ammo levels for VRS in Krajina (HIST-GAP-4 — per-brigade ammo absent).

---

### Oct 1995 (w184) — Post-Storm / Post-Deliberate Force / Dayton

This is the most dangerous epoch for railroad anchors. **Most Oct 1995 territorial outcomes were driven by mechanics the engine does not model.**

**ACCEPT — Externally forced:**

- **Srebrenica falls by w170 (Jul 1995)** — flag `srebrenica_fell` set. RATIONALE: this was a deliberate VRS operation under Mladić; in the sim, it must be an injected event because (a) `srebrenica_demilitarized` upstream may not fire (Issue #38), (b) VRS bot has no "strangle-then-take" tempo (HIST-GAP-2). Treat as a forced injection, not an earned battle.
- **Žepa falls shortly after Srebrenica (Jul-Aug 1995)** — same logic, same injection treatment.
- **Operation Deliberate Force active w178–w182 (Aug–Sep 1995)** — flag `deliberate_force_active`. NATO command decision external to sim.
- **Dayton ceasefire active by w184 (Oct 5, 1995 ceasefire / Nov 21 initialing)** — flag `dayton_ceasefire`. Externally imposed.
- **Final post-Dayton area share targets** — RS 49%, Federation 51%. This is treaty-defined, not sim-earned. ACCEPT as the *target the sim is steered toward by external mechanisms*; if the sim arrives at this naturally that is fine, if the scenario must clamp it that is acceptable for the Dayton boundary specifically.

**REJECT — Railroad patterns for Oct 1995:**

- **"Drvar = RBiH/HVO by w188"** — this is the canonical example given in the task. Drvar's flip depended on **HV Operation Storm spillover** (Aug 1995, Croatian Army crossing the IEBL from Krajina into Bosanska Krajina) and **HV-HVO Maestral-2 axis** (Sep 1995). Neither is modeled. Accepting this anchor would force a hardcoded flip or perpetual failure. **REJECT** unless promoted to "externally forced" via an explicit Storm-spillover scripted event — and even then, the scripted event is honest about being an injection, not an earned outcome.
- **"Bosanski Petrovac, Sanski Most, Mrkonjić Grad = RBiH/HVO by w184"** — same HV-Storm-spillover + Maestral-2 dependency. REJECT.
- **"Ključ, Bosansko Grahovo, Glamoč, Drvar Mountain corridor under joint ARBiH-HVO control"** — joint operations mechanic absent (REAL_WAR_MASTER §1063). REJECT.
- **"RS Krajina capital (Banja Luka) under direct ground threat by w184"** — historically the threat was credible because of HV+ARBiH-5th+HVO convergence under NATO air cover. None of those three converging vectors is modeled. REJECT.
- **"ARBiH/HVO post-Sana-95 / Mistral / Una offensive sequence completed"** — these depended on a coordinated Croatia-Federation campaign. REJECT.
- **Any per-brigade or per-OSID Oct 1995 anchor whose realization in history required HV ground intervention or Deliberate Force** — list compiled with `/balkan-battlegrounds-historical-extractor` should be filtered against the HV-Storm-spillover criterion *before* the anchor list goes to scenario-creator-runner-tester.

**Band-acceptable for Oct 1995:**

- **RS area share post-Dayton: 47–52%** as a *target*, with the explicit understanding that the sim cannot arrive here through earned combat alone in the current engine. If a scripted Storm-spillover event is added (Phase 5 territory recompose), this band becomes the verification target.
- **Federation total area share: 48–53%.**
- **Number of post-Dayton enclaves/exclaves: 0 outside Brčko District** — Brčko's status was Annex II arbitration, externally decided.

---

## Engine Mechanics Gap Matrix

| Missing Mechanic | REAL_WAR_MASTER reference | Blocks anchor type | Epochs affected |
|---|---|---|---|
| **UNPROFOR as a mechanical entity** | HIST-GAP-1 (P0) | Enclave-supply anchors, "Goražde holds despite Y" anchors, demilitarization-status anchors | Apr 94, Apr 95, Oct 95 |
| **VRS strangle-not-capture doctrine** | HIST-GAP-2 (P0) | Any anchor requiring enclaves to *survive* repeated VRS attacks under positive force ratios (Goražde, Bihać, Žepa). Without `contain`-directive, bot will eventually capture them if it can. | Apr 94, Apr 95, Oct 95 |
| **Comms quality asymmetry** | HIST-GAP-3 (P0) | Operational-tempo anchors that rely on ARBiH under-coordination producing late or fragmented attacks | All epochs (gradual) |
| **Per-brigade ammunition scarcity** | HIST-GAP-4 (P0) | Casualty-band anchors at late dates; "operation aborts due to ammo" anchors; per-formation combat-effectiveness anchors | Apr 94, Apr 95, Oct 95 |
| **ARBiH 1993 reorganization step-change** | HIST-GAP-5 (P1) | Operational-tempo anchors that distinguish "TO-era ARBiH" from "corps-era ARBiH"; w0–w15 inhibition anchors | Jan 93 (already at w40, mostly safe); critical for any pre-w15 anchor |
| **Ethnic-cleansing-as-strategy** | HIST-GAP-6 (P1) | Demographic-flip anchors; "VRS holds municipality with X% displacement" anchors; pre-emptive-control anchors | Jan 93, all later epochs |
| **NATO Operation Deliberate Force** | Not in audit (assumed absent; verify via scenario event JSON) | Any Aug–Sep 1995 outcome anchor; VRS heavy-weapon-degradation anchors; bridge/comms strike anchors | Oct 95 |
| **HV Operation Storm spillover into Bosanska Krajina** | REAL_WAR_MASTER §1063 ("no HV cross-border reinforcement"); Issue #37 cluster | All NW-Bosnia territorial anchors w156→w184: Drvar, Bos. Grahovo, Glamoč, Bos. Petrovac, Sanski Most, Ključ, Mrkonjić Grad, Donji Vakuf flips | Oct 95 (dominantly); late Apr 95 marginally |
| **Joint ARBiH-HVO operations** | REAL_WAR_MASTER §1063, Issue #37 | Maestral-2, Sana-95, Mistral, Una; central-Bosnia post-Washington recovery shape | Apr 94, Apr 95, Oct 95 |
| **HRHB political-goal flag wiring (Croat-Bosniak war)** | Issue #37 (P1) | HRHB three-pocket-collapse anchor; Mostar split anchor; Vitez/Busovača/Žepče enclave anchors; ARBiH 3rd Corps territorial recovery anchors | Apr 94, Apr 95, Oct 95 |
| **Srebrenica demilitarization → fall chain** | Issue #38 (P1) | Srebrenica-fell anchor at w170; downstream Deliberate Force trigger; Chain 3 vs Chain 4 dynamics | Oct 95 |
| **Goražde NATO ultimatum (Apr 1994)** | Not explicitly in audit; likely absent — flag verification needed | "Goražde holds w103+" anchor as an externally-enforced outcome rather than emergent military victory | Apr 94 onward |
| **Faction exhaustion mechanic** | Issue #47 (P1) — exhaustion reads 0 always | All "war fatigue" anchors, political-collapse anchors, negotiation-pressure anchors | All long-run epochs (Apr 94 onward) |
| **Combat tempo in long runs** | Issue #39 (P1) — 0.41 battles/wk @ 188w | Total-casualty anchors at Apr 94+, op-count anchors at Apr 94+ | Apr 94, Apr 95, Oct 95 |

### Net effect by epoch

- **Jan 1993**: Engine is largely *adequate*. Anchor commissioning is mostly safe if researchers stick to bands, band-OSIDs at known volatile fronts, and reject pinpoint per-formation outcomes.
- **Apr 1994**: Heavy dependency on Issue #37 (HRHB wiring). Until that ships, ~half of the historical-correct anchors are unreachable. The other half (HVO three-pocket geometry, ARBiH 3rd Corps recovery) cannot be commissioned now.
- **Apr 1995**: Same as Apr 1994 plus APZB / Bihać late-1994 churn. Anchor coverage should be sparse.
- **Oct 1995**: Engine is **structurally inadequate**. The dominant Oct 1995 facts (Storm spillover, Maestral-2, Deliberate Force, Srebrenica fall, Dayton boundary) are all either missing or only present as flag-events with no ground-truth wiring. Anchor commissioning here is dangerous — most anchors will be railroads. Recommended posture: very narrow, mostly externally-forced flag-anchors plus broad area-share bands, no specific NW-Bosnia OSID flips.

---

## Calibration-Hack Traps to Refuse

Patterns to flag-and-reject in the three researcher deliverables. **A proposal that hits any of these gets bounced back, not merged.**

### Trap 1 — Painted-target OSIDs without an earning mechanism

**Pattern:** A proposed anchor pins a controller at an OSID where the only way the sim can produce that controller is to be told. Example: "drvar_2 = RBiH at w188."
**Refuse if:** the OSID lies in territory whose historical flip depended on HV Storm spillover, joint ARBiH-HVO ops, or NATO ground intervention.
**Refuse signal:** the previous baseline shows the OSID never flipping in *any* parameter sweep within the design envelope.

### Trap 2 — `avoided_osids_by_faction`-style overrides smuggled in as "data corrections"

**Pattern:** A scenario-creator-runner-tester proposal includes a list of OSIDs that "should not be attacked by faction X." This is **banned** (project canon — see CLAUDE.md "NEVER use `avoided_osids_by_faction`").
**Refuse if:** anchor-set has an accompanying "do-not-attack" OSID list, a faction-specific "skip target" list, or any per-OSID bot-suppression data structure.
**Substitute:** fix bot prioritization (corps directives, OOB stats), or accept the anchor failure as a known gap.

### Trap 3 — Painted-target controllers that contradict initial OSID seeding

**Pattern:** "OSID X = faction Y at w104" where initial OSID control at w0 from census/referendum mandates a different controller. Initial OSID assignment is sacrosanct (CLAUDE.md "NEVER override initial OSIDs").
**Refuse if:** the proposed anchor requires the *initial* OSID assignment to be edited so the anchor passes.
**Substitute:** fix the engine path or accept band/contested state.

### Trap 4 — Hardcoded brigade-to-OSID assignments

**Pattern:** "Brigade Z should be at OSID O at w156." Project canon bans hardcoded brigade-to-OSID assignments (CLAUDE.md / `feedback_emergent_not_railroads`).
**Refuse if:** anchor specifies brigade location at a point in time. Brigades are emergent products of corps AI + sector + operation. Anchor brigades at the corps level, not the OSID level.

### Trap 5 — Per-formation morale, exhaustion, or casualty pins

**Pattern:** "ARBiH 503rd has morale ≤ 40 at w156" or "VRS 1st Krajina has 800 cumulative casualties by w104."
**Refuse if:** the anchor binds a specific formation's state value. These values are highly downstream of bot AI, OOB seeding, and combat math, and pinning them invites OOB hacks.
**Substitute:** band-level faction-aggregate metrics (faction exhaustion bands once Issue #47 is fixed; faction casualty bands).

### Trap 6 — Anchors that pass only via `home_osid` recruitment artifacts

**Pattern:** Anchor depends on a brigade's home OSID being a specific value to keep that brigade locked. `home_osid` is a recruitment artifact, not a deployment lock (see life lessons).
**Refuse if:** anchor's earnability depends on tweaking home_osid assignments to keep formations from drifting.

### Trap 7 — Scripted event-based control flips disguised as "anchors"

**Pattern:** Researcher proposes "anchor: at w170, Srebrenica enclave OSIDs flip to RS." This is allowed *only* if the flip is delivered by an externally-forced injection event (the genocide was external to the sim's combat AI). It is **not allowed** if delivered by an artificial control_override.
**Acceptance test:** Is there a corresponding scripted event with a citation-backed historical trigger? If yes → forced injection, acceptable. If no → control_override hack, reject.

### Trap 8 — Cleansing outcomes anchored as territorial outcomes

**Pattern:** Anchor pins demographic-flip OSIDs as if they were military outcomes. HIST-GAP-6: ethnic cleansing is not modeled.
**Refuse if:** anchor's historical justification is "this town was cleansed" but the anchor is on military controller. The sim's military-only flip model cannot represent cleansing-first-then-defend, so the anchor either fails forever or requires a hack.

### Trap 9 — Anchors that quietly require UNPROFOR convoy modeling

**Pattern:** Anchor specifies enclave-supply state, civilian survival, or starvation pressure.
**Refuse if:** the anchor requires UNPROFOR convoy logistics. HIST-GAP-1: UNPROFOR is absent. The sim's enclave supply is pure-geographic. Anchor either rephrases as a flag-event ("Sarajevo airlift active") or is deferred.

### Trap 10 — Painted-targets at known-volatile fronts pinned to specific controllers

**Pattern:** "brcko = RS at w40" or "gradacac_2 = RS at w40" as point anchors. Calibration history (n1240→n1289) shows these OSIDs churn under perfectly-reasonable mechanic changes.
**Refuse if:** anchor is a point controller. Use band: "Brčko corridor: RS holds OR contested OR RS-leaning". Pinning point controllers at these OSIDs has been the source of most calibration thrash.

---

## Recommendations for the Three Researcher Tracks

These are filtering reminders, not new tasks.

### To `/historian` (Type 2 events, Type 3 enclaves)

- For each enclave anchor, label it as **forced-by-UN/NATO** or **emergent**. If forced, identify the historical external decision (UNSCR number, NATO ultimatum date) and frame the anchor as a flag-event, not a controller.
- Goražde Apr 1994 — flag-event, not battlefield outcome.
- Srebrenica Jul 1995 — flag-event injection, not earned battle (HIST-GAP-2 + Issue #38).

### To `/balkan-battlegrounds-historical-extractor` (Type 3 Krajina-collapse)

- Every Krajina-collapse OSID anchor for Aug–Oct 1995 must be tagged with its dependency: **HV-Storm-spillover**, **HV-HVO-Maestral-2**, **joint-ARBiH-HVO-Sana95**, or **Deliberate-Force-air**. The anchor list should make the dependency explicit so it can be filtered until the corresponding engine mechanic is delivered.
- Cite BB1/BB2 for the historical event but flag whether the engine can produce it. BB-citation does not equal sim-earnable.

### To `/scenario-creator-runner-tester` (Type 1 area bands, Type 5 attrition bands)

- Prefer bands over points everywhere. The calibration history at Jan 1993 shows that even with 93.2% area-weighted and 25/25 anchors, single OSIDs (brcko, gradacac_2) churn — point anchors are fragile to mechanic changes.
- Attrition bands: until Issue #47 (exhaustion=0) is fixed, do not propose exhaustion-based anchors. Use casualty-volume bands only.
- Casualty bands at long horizons (Apr 94+): expect the engine to under-produce casualties (Issue #39 — tempo collapse). Adjust band lower bounds accordingly, or flag that the band is conditional on Issue #39 being resolved.
- Do **not** propose `avoided_osids_by_faction`, control_override lists, or any data-override that fixes anchor pass-rate without fixing the underlying mechanic (Trap 2, Trap 7).

---

## Judgment Calls (Flagged)

These are points where I am making a war-or-game judgement rather than citing the audit:

- **JUDGMENT:** Treating Srebrenica fall as forced-injection (not emergent) — this is a hard call. The sim *could* produce a Srebrenica fall if `srebrenica_demilitarized` fires and `strangle-not-capture` is wired to release in mid-1995. Until both happen, force-inject. After both, re-evaluate.
- **JUDGMENT:** Recommending Brčko / gradacac_2 / boljanic_2 be banded rather than pointed. These have been the long-standing churn anchors. The historical record shows multiple controller changes at these OSIDs in 1992; point anchors are not historically faithful to begin with, separate from the calibration-fragility argument.
- **JUDGMENT:** Calling Oct 1995 "structurally inadequate" for emergent anchoring. This is a strong claim. Defending it: of the dominant Oct 1995 facts (Storm, Maestral-2, Deliberate Force, Srebrenica, Dayton), none is endogenous to the sim. The sim's Oct 1995 area share could land anywhere from 60% RS (no NW collapse) to ~49% RS (with full injection). That's a 10pp uncertainty band driven entirely by missing mechanics, not by player choice.
- **JUDGMENT:** Tagging "comms quality asymmetry" (HIST-GAP-3) as affecting all epochs gradually. It is most acute at Jan 1993 (ARBiH disorganization) and decreasingly important by Oct 1995 as ARBiH consolidates a comms backbone. Treating it as a uniform gap is conservative.
- **JUDGMENT:** Recommending that the Apr 1994 / Apr 1995 anchor sets be deliberately sparse until Issue #37 (HRHB wiring) ships. This is a sequencing recommendation, not a historical one. The historian and BB-extractor can document the *correct* anchors; the scenario-creator-runner-tester should accept that many of them must wait.

---

## Summary Filter

For every anchor a researcher proposes, ask:

1. Is the historical outcome **externally forced** (UN, NATO, foreign army, genocide)? → ACCEPT as flag-event injection.
2. Is the outcome **emergent under current mechanics** the sim already has? → ACCEPT as banded territorial/casualty target.
3. Does it require a **missing mechanic** from the Gap Matrix above? → REJECT until that mechanic ships, or **demote** to a band so loose it cannot fail.
4. Does it hit any of the **10 calibration-hack traps**? → REJECT unconditionally.

If none of (1) (2) (3) (4) clearly applies, escalate to Orchestrator with the specific ambiguity.
