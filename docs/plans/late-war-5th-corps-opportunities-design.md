# Late-War 5th Corps Opportunity Family - Design Doc

**Date:** 2026-05-01
**Status:** Design proposal (no code in this doc)
**Authority:** Below canon and below the generic opportunity model. Inherits `docs/plans/late-war-operation-opportunity-system-design.md`, `docs/plans/2026-05-01-operation-opportunity-review-surface-design.md`, `docs/plans/2026-05-01-force-quality-operation-architecture-contract.md`, and `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.
**Source catalog:** `docs/research/2026-05-01-late-war-operation-opportunity-research.md`

---

## 0. Executive Thesis

The 5th Corps is a special case. It should not be modeled as a normal front-line ARBiH corps that simply receives a late-war competence bonus.

From the Washington Agreement period until Operation Storm / Oluja opens the wider Croatian-Bosnian theater in August 1995, 5th Corps is an isolated pocket force around Bihac. Its arc is:

1. **Isolation hardening.** The corps is cut off, politically pressured by the APWB, and under VRS/SVK/APWB pressure. It survives by cohesion, local leadership, deception, recon-sabotage, and captured equipment.
2. **Pocket crisis management.** Enemy offensives such as Una 94, Breza 94, and Pauk/Shield should be playable crises that can exhaust or break the pocket if prerequisites are mishandled.
3. **Overextension and resilience.** Grmec 94 should show that 5th Corps can strike hard before 1995, but that distance, supply, and VRS reserve response can still reverse gains.
4. **Unblocked exploitation.** Sana 95 should become possible only after pocket survival plus the wider western-theater rupture caused by Storm/Oluja and linked HV/HVO pressure. Once that happens, 5th Corps can go on a rapid operational rampage, but still through live staging, logistics, support, and enemy-reserve systems.

**TL;DR:** 5th Corps is the proof case for AWWV's late-war model: not rails, not a buff, but an isolated army-in-miniature that can survive, harden, and then explode outward when the strategic door opens.

---

## 1. Design Role

This is the first concrete family doc on top of the generic late-war opportunity system. It is deliberately chosen because it touches almost every mechanic we need for a Paradox-grade operational layer:

- APWB / Abdic politics and internal Bosniak conflict.
- Isolated pocket supply and reinforcement limits.
- Elite local commanders and recon-sabotage formations.
- Captured weapons and support thresholds.
- Failed VRS/SVK pressure operations that still matter.
- Offensive success with overextension risk.
- A strategic event, Storm/Oluja, that changes what the player can attempt without forcing the result.

This family should become the reference implementation for how AWWV handles historical operations as opportunities rather than scripted map-paint.

---

## 2. Historical Design Constraints

The following constraints come from the local BB research pass and should be treated as design anchors for implementation packets.

1. **Bihac pocket isolation is the default state.** 5th Corps cannot be treated like a corps with normal national rear-area logistics. It is surrounded and cut off until the Croatian-theater rupture in August 1995.
2. **APWB is not just flavor.** Abdic's forces, their legitimacy, and their relationship to VRS/SVK support are part of the corps's operating environment.
3. **5th Corps professionalization is local and experiential.** The corps improves because it survives constant pressure, develops trusted staff, uses deception, and captures weapons. It should not inherit a flat all-ARBiH 1995 attack bonus.
4. **Enemy failure is active content.** Breza and Pauk/Shield are not "nothing happened." They are high-pressure crises where VRS/SVK/APWB commit force, stress the pocket, and fail if 5th Corps handles the crisis.
5. **Sana is unlocked by the theater, not the calendar.** Sana 95 should require the pocket to survive and the wider western theater to open after Storm/Oluja and linked HV/HVO pressure.
6. **Fast exploitation is different from guaranteed conquest.** Sana can drive deep quickly, but the design must preserve narrow advance, overextension, VRS Prijedor/Sanski Most reserve response, and ceasefire/diplomacy constraints.

Key citation anchors:

- BB2 pp.532-535: APWB strength, Pecigrad / Velika Kladusa reduction, Tigar-Sloboda deception and captured weapons, Una 94 / Grabez pressure.
- BB2 pp.540-542: Breza 94 plan, axes, 5th Corps defense, recon-sabotage flanking, VRS failure assessment.
- BB2 pp.546-548, 555-556: Grmec 94 success, overextension, VRS reserve response, 5th Corps quality, Pauk/Shield context.
- BB1 pp.417, 419-420: Sana 95 mission, operational groups, rapid Petrovac/Kljuc/Krupa gains, Sanski Most / Prijedor reserve fight.

---

## 3. Family State Model

A future implementation should track a small set of family-specific state, not hard-code operation success.

| State | Meaning | Expected owner |
|---|---|---|
| `bihac_pocket_status` | Pocket intact, strained, breached, or collapsed. | Scenario / operations / supply |
| `apwb_pressure_state` | APWB active, degraded, temporarily defeated, restored with SVK/VRS support. | Political-event / operation family |
| `fifth_corps_pocket_quality` | Local hardening: staff confidence, recon-sabotage effectiveness, cohesion under siege. | Force-quality / commander system |
| `captured_support_pool` | Captured arms, artillery, armor, and ammunition available to support later ops. | Equipment / operation consequence |
| `enemy_pressure_memory` | Recent Una/Breza/Pauk pressure, casualties, fatigue, morale shock. | Operation AAR / crisis consequence |
| `storm_oluja_theater_open` | Wider Croatia/Krajina rupture has opened an outward exploitation path. | Strategic event / HV-HVO theater |
| `sana_exploitation_window` | The pocket is alive and the theater is open enough for a rapid outward offensive. | Opportunity prereq helper |

These should be deterministic derived or persisted fields, never ad hoc date checks buried inside combat resolution.

---

## 4. Opportunity Chain

### 4.1 Tigar-Sloboda 94

**Type:** T1 support/deception opportunity.

**Window:** July 1994.

**Design purpose:** Prove that an opportunity can improve capability without directly painting territory. Tigar-Sloboda should be a deception/intelligence action that can produce captured arms, APWB legitimacy damage, and 5th Corps confidence.

**Prerequisites:**

- `bihac_pocket_status` is intact or strained.
- APWB is active and receiving enough outside confidence/support to make the deception meaningful.
- 5th Corps has adequate commander confidence and recon-sabotage capability.

**Possible outcomes:**

- Success: increase `captured_support_pool`, reduce APWB cohesion/legitimacy, unlock stronger Pecigrad / Velika Kladusa proposal.
- Partial success: support gained but APWB not decisively shaken.
- Failure: APWB/VRS detect deception; pocket morale or intelligence confidence suffers.

**Source anchor:** BB2 pp.533-534.

### 4.2 Pecigrad / Velika Kladusa Reduction

**Type:** T1 territorial opportunity.

**Window:** June-August 1994.

**Design purpose:** Represent the first major APWB defeat without assuming a permanent end to APWB pressure.

**Prerequisites:**

- Bihac pocket intact.
- APWB front cohesion degraded by Tigar-Sloboda or sustained 5th Corps pressure.
- 5th Corps has enough available brigades after local defense commitments.

**Objectives to map later:** Pecigrad, Trzac / Sturlic, Velika Kladusa family.

**Possible outcomes:**

- Success: APWB temporarily defeated; Velika Kladusa changes control; some captured equipment and freed manpower enter the family state.
- Partial: Pecigrad falls but Velika Kladusa holds or APWB withdraws in order.
- Failure: APWB front holds; later Breza/Pauk pressure becomes more dangerous.

**Source anchor:** BB2 pp.532-535.

### 4.3 Una 94 / Grabez Pressure

**Type:** T3 defensive crisis.

**Window:** August-September 1994.

**Design purpose:** Failed enemy pressure that still drains resources and tests pocket readiness.

**Prerequisites:**

- VRS/SVK pressure available around Grabez / Una.
- Bihac pocket still intact.

**Player-facing decision:** Commit reserves to Grabez, conserve strength, or counter-pressure APWB/VRS weak spots.

**Possible outcomes:**

- Historical-like hold: enemy makes little progress, but 5th Corps loses readiness and supply.
- Local penetration: Grabez / Una pressure worsens later Breza risk.
- Overcommitment: the pocket holds but becomes vulnerable elsewhere.

**Source anchor:** BB2 p.534.

### 4.4 Breza 94

**Type:** T3 major defensive crisis / failed VRS-SVK offensive.

**Window:** September 1994.

**Design purpose:** The first mandatory proof that failed VRS operations are content, not no-ops. Breza should be dangerous enough that a poorly handled pocket can crack, while a capable 5th Corps can defeat stronger-looking forces.

**Prerequisites:**

- VRS/SVK force availability on Grabez, Buzim/Otoka, and Cazin axes.
- APWB recently defeated or displaced enough to motivate a restoration attempt.
- 5th Corps has vulnerable commitments or exposed pocket lines.

**Player-facing decision:** Allocate recon-sabotage reserves, defend Grabez, protect Buzim/Otoka, or accept risk to preserve offensive potential.

**Possible outcomes:**

- Historical-like failure: 5th Corps counterattacks/flanks; VRS/SVK offensive collapses; 5th Corps gains confidence.
- Partial VRS success: pocket loses ground, supply worsens, later Grmec opportunity delayed.
- Catastrophe: Cazin/Bihac line fractures; later Sana becomes impossible.

**Source anchor:** BB2 pp.540-542.

### 4.5 Grmec 94

**Type:** T1 breakout / exploitation opportunity with overextension risk.

**Window:** October-November 1994.

**Design purpose:** Show 5th Corps can already fight above its weight before 1995, but that success creates a new problem: a long, exposed salient and VRS reserve response.

**Prerequisites:**

- Breza survived or enemy pressure weakened.
- 5th Corps morale and local quality high.
- Supply not collapsed.
- VRS 2nd Krajina local reserve response brittle enough for surprise.

**Objectives to map later:** Grabez plateau/barracks, Ripac, Orasac, Kulen Vakuf, Bosanska Krupa pressure line.

**Possible outcomes:**

- Success with overextension: gains made, but `enemy_pressure_memory` and VRS reserve response create Pauk/Shield vulnerability.
- Limited success: local gains without deep salient.
- Failure: pocket spends strength and worsens winter crisis.

**Source anchor:** BB2 pp.546-548, 555.

### 4.6 Pauk / Shield 94

**Type:** T3 defensive crisis.

**Window:** November-December 1994.

**Design purpose:** Model the restored APWB/SVK/VRS pressure after Grmec, including the fact that survival is not passive. The pocket may lose Velika Kladusa but still preserve 5th Corps.

**Prerequisites:**

- APWB remnants available for restoration with SVK/VRS backing.
- Bihac pocket exposed, especially if Grmec overextended.
- VRS/SVK pressure available on multiple axes.

**Player-facing decision:** Defend Velika Kladusa, preserve Bihac city approaches, hold Grabez/Krupa, or trade space for corps survival.

**Possible outcomes:**

- Historical-like survival: Velika Kladusa may fall back to APWB/SVK pressure, but 5th Corps survives and consolidates.
- Degraded survival: pocket holds but `fifth_corps_pocket_quality` and supply are damaged.
- Collapse: 5th Corps loses the institutional base needed for Sana.

**Source anchor:** BB2 pp.550-556.

### 4.7 Sana 95

**Type:** T1 capstone exploitation offensive.

**Window:** September-October 1995.

**Design purpose:** The payoff. Sana should be the moment when a surviving isolated corps, now with experience, captured support, and an opened theater, can move at a pace that looked impossible in 1992-1994.

**Prerequisites:**

- `bihac_pocket_status` is intact or recently relieved.
- `storm_oluja_theater_open` is true.
- 5th Corps has sufficient `fifth_corps_pocket_quality`, support delivery, and staging readiness.
- HV/HVO western-theater pressure or equivalent counterfactual pressure has degraded VRS 2nd Krajina response.
- The player/bot authorizes exploitation and accepts overextension risk.

**Objectives to map later:** Bosanska Krupa, Bosanski Petrovac, Kljuc, Sanski Most, pressure toward Prijedor / Bosanski Novi as a risk corridor rather than guaranteed conquest.

**Possible outcomes:**

- Rapid exploitation: deep gains toward Petrovac/Kljuc/Krupa, then hard fighting around Sanski Most / Prijedor response.
- Narrow breakthrough: deep but thin advance that risks counterattack.
- Failure to launch: the corps survived but lacks support/staging or the theater never opened.
- Overreach: gains made, then VRS reserve response / ceasefire timing limits final control.

**Source anchor:** BB1 pp.417, 419-420.

---

## 5. Prerequisite Matrix

| Opportunity | Date window | Pocket intact | APWB state | 5th Corps quality | Captured/support pool | Enemy weakness | Theater open |
|---|---|---:|---:|---:|---:|---:|---:|
| Tigar-Sloboda 94 | Required | Required | Required | Required | Optional | Optional | No |
| Pecigrad / Velika Kladusa | Required | Required | Required | Required | Helpful | Helpful | No |
| Una 94 / Grabez pressure | Required | Required | Optional | Defender check | N/A | N/A | No |
| Breza 94 | Required | Required | Required | Defender check | Helpful | N/A | No |
| Grmec 94 | Required | Required | Optional | Required | Helpful | Required | No |
| Pauk / Shield 94 | Required | Required | Required/restored | Defender check | Helpful | N/A | No |
| Sana 95 | Required | Required/relieved | Optional | Required | Required | Required | Required |

The exact numeric thresholds belong in implementation packets after the force-quality audit lands. This doc defines the shape, not the constants.

---

## 6. Force-Quality Traits To Exercise

The 5th Corps family should be the first place these traits become visible in diagnostics and AAR:

- `operation_readiness`: grows through survival, staff confidence, and previous successful crises.
- `staging_reliability`: high inside familiar pocket terrain, but constrained by isolation and narrow exits.
- `axis_coordination`: improves through 1994-1995; still can degrade under overextension.
- `support_delivery`: depends on captured arms, ammunition, and later HV/HVO theater support; not a generic equipment multiplier.
- `failure_recovery`: 5th Corps should recover unusually well from partial failures if the pocket is intact.
- `reserve_response`: VRS/SVK response strong in Pauk/Shield, weaker but still dangerous around Sanski Most / Prijedor in 1995.
- `collapse_susceptibility`: APWB and VRS 2nd Krajina local defenses should be susceptible under the right conditions; 5th Corps should be susceptible if pocket logistics collapse.

This is where the user-stated full-war premise becomes concrete: ARBiH professionalization is not a universal attack bonus; in this family it is local competence under isolation, then rapid exploitation after relief.

---

## 7. Player / Bot Decisions

These opportunities should appear as Army HQ dossiers, not as map-local buttons. Each dossier should present:

- Why the opportunity exists.
- Which prerequisites are satisfied, strained, or missing.
- Pocket risk and relief/exploitation status.
- Expected staff recommendation.
- Map footprint with player-safe labels, not raw OSIDs.
- Five canonical actions: Approve, Delay, Redirect, Under-resource, Decline.

Bot posture should not force history. A cautious ARBiH bot might preserve the pocket and decline Grmec. An aggressive player might attempt Grmec early and suffer Pauk. A strong RS/SVK situation might make Breza actually dangerous. A collapsed 5th Corps should not receive Sana just because the date says September 1995.

---

## 8. Implementation Order

1. **P0 - OSID and family-state mapping.** Map Pecigrad, Velika Kladusa, Grabez, Buzim/Otoka, Kulen Vakuf, Bosanska Krupa, Bosanski Petrovac, Kljuc, Sanski Most, Prijedor/Bosanski Novi pressure corridors. No behavior change.
2. **P1 - Pocket/APWB state substrate.** Add deterministic family-state derivation for Bihac pocket status and APWB pressure. No combat tuning.
3. **P2 - Tigar-Sloboda and Pecigrad chain.** Implement support/deception and APWB reduction as the first live opportunity chain.
4. **P3 - Breza and Pauk defensive crises.** Implement pressure without guaranteed VRS success. This is the first major failed-operation test.
5. **P4 - Grmec and overextension.** Implement breakout plus counterpressure memory.
6. **P5 - Storm/Oluja theater flag and Sana gate.** Do not launch Sana until the wider theater opens and 5th Corps survived in usable form.
7. **P6 - AAR / diagnostics.** Persist family resolution rows so 104w/156w/183w reviews can see why each opportunity appeared, failed, or never became available.

Each implementation packet must include deterministic ordering proof, replay-safe proposal records, and tests that show date alone is insufficient.

---

## 9. Acceptance Evidence

A future implementation is not accepted just because the October 1995 paint match improves.

Required evidence:

- 104w / April 1994: the 5th Corps family should mostly be latent or in early APWB/pocket-prep state.
- 156w / April 1995: the engine should show whether the pocket survived Breza/Pauk/Grmec consequences and whether 5th Corps is poised, exhausted, or damaged.
- 183w / October 1995: Sana can occur only if the pocket survived and the theater opened; no naked calendar flip.
- Breza/Pauk can create pressure, losses, morale changes, and APWB restoration without automatically erasing Bihac.
- Grmec can make gains and still create overextension risk.
- Sana can fail, partially succeed, or exploit rapidly based on live state.
- UI uses named places and staff summaries, not raw OSIDs.
- AAR states whether each opportunity was approved, delayed, declined, under-resourced, blocked by prerequisites, or resolved in combat.

---

## 10. Open Mapping / Owner Tasks

- Exact OSID mapping for all named 5th Corps objectives and pressure corridors.
- APWB representation: faction, political-state modifier, auxiliary force, or operation-family pressure state.
- SVK / RDB / SDG participation: likely represented as event/auxiliary modifiers unless a later owner chooses a fuller force model.
- Storm/Oluja relationship: strategic event should open the theater and weaken Krajina/RS western posture, but it is not directly commanded by the BiH player.
- Sensitive political language around Abdic/APWB: historian + game-designer review before implementation text lands in UI.
- Force-quality audit dependency: do not invent constants until the current trajectory audit identifies which readiness traits are already wired and which are decorative.

---

## 11. Design Guardrails

- No date-only Sana.
- No generic "ARBiH 1995 +X attack" solution.
- No treating APWB as a cosmetic label.
- No automatic 5th Corps collapse under enemy pressure.
- No automatic 5th Corps success after Storm/Oluja.
- No conflating narrow deep exploitation with broad stable occupation.
- No using the October 1995 painted target as a hidden controller for opportunity outcomes.

The family succeeds architecturally when it can produce historical-like outcomes from live prerequisites, while still letting the player and bot create coherent counterfactuals.
