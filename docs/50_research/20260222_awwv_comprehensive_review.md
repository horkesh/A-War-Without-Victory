# A War Without Victory — Comprehensive Design Review & Gap Analysis

**Reviewer:** Claude (Project Knowledge Review)  
**Date:** 2026-02-22  
**Scope:** Full canon set v0.5.0, all planning documents, all proposals, implemented work  
**Focus:** Phase transitions, structural gaps, design suggestions, hidden risks

---

## PART I: PHASE TRANSITION GAPS

### 1. Phase 0 → Phase I: The Referendum Trigger Gap

**The problem:** Phase 0 ends and Phase I begins when the EC-coerced independence referendum occurs and `current_turn == referendum_turn + 4`. But the *player experience* of this transition is underspecified.

**What's missing:**
- **Player notification and agency.** The referendum is not a player button (by design), but the player receives no documented warning system. How many turns before the referendum does the player get signals? The Warroom has newspapers and situation reports — but there's no canon spec for *escalation indicators* that tell the player "war is 2–3 turns away, finalize your investments."
- **Capital spending deadline.** If the player still has unspent pre-war capital when the referendum fires, what happens? The spec says capital is non-renewable, but doesn't say whether unspent capital carries over into Phase I as *anything* (morale bonus? organizational reserve?) or is simply wasted. This is a significant player-facing gap — the player needs to know the consequence of hoarding.
- **JNA state at transition.** Phase I §3 expects `JNA_status` (transition_begun, withdrawal_progress, asset_transfer_RS) from Phase 0. But Phase 0 §7 (Hand-Off Data) doesn't list JNA status in its output contract. The JNA section in Phase 0 (§4.4) discusses JNA garrison mechanics, but the *hand-off* of JNA state to Phase I is not in the output contract. This is a data gap.
- **Non-war terminal outcome.** CANON.md mentions that if the referendum window expires, Phase 0 ends in a "non-war terminal outcome (BiH remains in Yugoslavia)." But there's no spec for what this looks like — no end screen, no scoring, no narrative. This is presumably very rare but it's an unspecified game-over state.

### 2. Phase I → Phase II: The Most Critical Transition

**The problem:** Phase II Spec §6/§15 defines transition as state-driven: JNA complete (withdrawal ≥ 0.95, asset transfer ≥ 0.9) AND opposing edges ≥ 25 for 4 consecutive turns. But this creates several edge cases.

**What's missing:**
- **The "stuck in Phase I" scenario.** If one faction (e.g., RBiH in a bad game) is so thoroughly crushed in Phase I that they never establish 25 opposing edges, the game never reaches Phase II. The design has no safety valve for this. You need either:
  - A time-based fallback ("if Phase I has lasted N turns without meeting transition criteria, transition anyway")
  - A player-facing explanation of why the transition hasn't happened
  - An alternate Phase I terminal state (faction elimination or surrender)
- **RBiH-HRHB alliance state at transition.** The alliance relationship [-1, +1] carries into Phase II, but Phase II has no documented mechanics for the alliance. The ceasefire and Washington Agreement preconditions are in Phase I §4.8, but they can fire *during* Phase II. Where exactly do these milestone checks execute in the Phase II pipeline? They're not in the Phase II turn pipeline steps listed in `PIPELINE_ENTRYPOINTS.md`.
- **Brigade spawn timing.** Phase I creates militia; Phase II needs brigades with `location_osid`. The OOB creates formations "at Phase I entry" per the OSID remap doc, but the transition moment itself — when do the remaining OOB brigades that form later (historically, many ARBiH brigades form June–September 1992) get spawned? Is there a "Phase II entry formation batch" analogous to Phase I entry?
- **Entrenchment initialization.** The new entrenchment mechanic (Attack Resolution Formula §2.6) counts `turns_on_osid`. At Phase I→II transition, all brigades have `entrenchment_turns = 0` because the mechanic is new to Phase II. But historically, by mid-1992 when Phase II would begin, many positions were already weeks-old fortified positions. The spec needs either:
  - A backfill: set initial `entrenchment_turns` based on how long the brigade's OSID was under faction control during Phase I
  - Or accept that the first few Phase II turns will have artificially weak defenses until entrenchment accumulates

### 3. Phase II Internal Transitions (Undocumented)

**The problem:** Phase II has no sub-phase transitions, but it needs them.

- **Ceasefire → Washington Agreement.** These precondition-driven milestones in §4.8 transform gameplay (alliance lock, enhanced equipment, joint operations). But there's no documented *pipeline step* in Phase II for evaluating these. The Phase I pipeline lists `phase-i-ceasefire-check` and `phase-i-washington-check`, but what happens when the game is already in Phase II and these conditions are first met? These checks must also run in Phase II.
- **Late-war capability shift.** By 1995 (roughly turn 150+), the ARBiH and HVO are qualitatively different forces than in 1992. Capability progression (System 10) handles this, but there's no documented mechanism for the *Operation Storm* equivalent — external Croatian military intervention that historically broke the VRS. The Washington Agreement spec enables "HV coordination" but doesn't specify what that mechanically does beyond a pressure bonus. This is arguably the most important late-war event and it's barely specified.

### 4. Phase II → End State: The War Termination Gap

**This is the biggest gap in the entire design.**

- **No documented Phase III / end-game phase.** The negotiation system (System 7) and peace treaty mechanics (§15, §20) exist but there's no *phase specification* for war termination. When do negotiation windows actually open? The Systems Manual says "based on exhaustion, fragmentation, and international pressure" but gives no thresholds.
- **No victory conditions specification.** The Rulebook §15 says "no total victory" and mentions "faction-specific paths" but never defines them. What constitutes an acceptable outcome for RS? For RBiH? For HRHB? Without this, the player has no goal beyond "survive."
- **No scoring system.** Even if there's no "victory," games need feedback. How does the player know if they did well? Historical comparison? Territory percentage? Population preserved? Exhaustion level? This is completely absent.
- **No Dayton analogue.** The historical war ended with the Dayton Agreement. The game has treaty mechanics and Brčko requirements, but no specification for how external pressure forces everyone to the table. What if all three factions are exhausted but nobody proposes a treaty? Who initiates? The patron system constrains but doesn't seem to force negotiation.

---

## PART II: STRUCTURAL GAPS (What's Staring You in the Face)

### 5. The AoR / OSID / Front Assignment Triple Identity Crisis

You currently have **three overlapping spatial models** in various stages of adoption:

1. **AoR-based** (original): brigade_aor, front-active settlements, pressure/breach. Still in canon specs, pipeline code, and bot AI.
2. **OSID-based** (new): location_osid, ZoC, attack resolution. In the new design docs and partially implemented (OSID remap, HoI map).
3. **Front segment based** (newest): assignable_front_segments, brigade_front_assignment, theatres. In proposals, partially in state.

The canon documents have been *amended* to reference OSID/ZoC, but the underlying systems (pressure diffusion Phase 3A, AoR assignment System 8, brigade operations pipeline) still reference the AoR model. This is the single biggest source of potential bugs and design confusion.

**My recommendation:** Declare a clean break. The OSID/ZoC model is clearly the target. Write a single "OSID Migration Canon Amendment" that:
- Lists every AoR reference in canon and its OSID replacement
- Specifies which AoR pipeline steps are removed vs. translated
- Defines the transitional state (what still uses AoR until OSID is fully wired)

### 6. Supply System: Designed But Not Specified

Supply is referenced *everywhere* — in combat multipliers, exhaustion drivers, authority constraints, corridor mechanics — but there's no supply specification comparable to the attack resolution formula. The Systems Manual §14 discusses supply abstractly, and the pipeline has supply-resolution steps, but:

- How is supply *traced* through the OSID graph? 
- What are supply *sources* (production facilities? controlled urban centers? patron supply lines?)
- How does the Posavina corridor mechanic actually work in OSID terms?
- What happens when an enclave's supply is cut? (Enclave integrity, System 5, references supply but doesn't define the supply model it depends on)

This is arguably the most important unspecified system because everything else depends on it.

### 7. Recruitment is Half-Specified

Recruitment is documented in implementation reports (§2, §12-§14) but the *canon* specification is thin:
- Phase 0 creates "potential" for fast mobilization
- Phase I has militia emergence from organizational penetration
- Phase II has bot recruitment via `recruitment_engine.ts`

But: what are the recruitment *rules* for the player? Can the player recruit new brigades? From where? At what cost? How does the available manpower pool deplete? The Rulebook mentions recruitment depends on "authority, legitimacy, and exhaustion" (§9.1) but gives no mechanics.

### 8. The "What Does the Player Actually Do?" Gap

Reading the Rulebook, I can identify these player actions:
- Phase 0: Allocate pre-war capital to organizational investments
- Phase I: Very unclear — militia emerge automatically; what orders can the player give?
- Phase II: Set brigade posture, issue attack orders, manage corps stance/named operations

But the Rulebook doesn't have a "Player Actions per Phase" section. It doesn't tell the player what buttons they press, what decisions they make each turn, or what the turn-by-turn gameplay loop actually feels like. The design documents are *systems-first* (how mechanics work) rather than *experience-first* (what the player does).

This is critical for playtesting. You need a "Player's Turn Guide" section in the Rulebook that says: "Each turn, you will: 1) Review situation reports, 2) Adjust brigade postures, 3) Issue attack orders, 4) Manage corps operations, 5) End turn."

---

## PART III: COOL IDEAS AND SUGGESTIONS

### 9. The "Fog of Competence" — A Killer Feature

Your design has faction capability progression (System 10) where ARBiH starts weak and professionalizes. Consider making this *visible* to the player as a gameplay mechanic:

**Early-war orders should fail more.** In April 1992, an ARBiH "Attack" order to a newly formed brigade shouldn't resolve cleanly — the brigade might not even understand the order. Model this as a **command interpretation layer**: orders issued to low-experience formations have a chance (deterministic, based on experience + corps cohesion) of being downgraded. An "Attack" order to a raw brigade might resolve as "Probe" or even "Hold." This naturally models the organizational chaos of early 1992 while giving the player a tangible reason to care about experience and corps capability.

### 10. The "Prijedor Problem" — Ethnic Cleansing as Gameplay

This is your most sensitive design challenge, and I think the current displacement system handles it mechanically but not *experientially*. The displacement rates and routing are well-specified, but the player never *feels* the weight of what's happening.

**Suggestion: The "Consequence Ledger."** Each turn, present the player with a brief factual summary of displacement caused by their orders: "Your forces displaced 4,200 Bosniaks from Prijedor municipality. 840 are unaccounted for. ICRC has demanded access." This feeds into IVP and patron behavior mechanically, but it also serves the educational mission — the player cannot ignore what their strategic decisions produce.

This also creates a genuine dilemma: aggressive territorial seizure is *effective* but produces diplomatic costs and (in the long run) negotiation liabilities. The player who ethnically cleanses efficiently will control more territory but face worse peace terms.

### 11. Operation Storm / Late-War Intervention

The game desperately needs a specification for the Croatian military intervention of 1995. Historically, this was the decisive event that broke the VRS and forced Dayton. Your Washington Agreement spec enables "HV coordination" and a joint pressure bonus, but Operation Storm was qualitatively different — it was an external army conducting a full-scale offensive.

**Suggestion:** Model this as a **patron-triggered event**. When conditions are met (Washington Agreement active, RS territorial control above threat threshold, combined exhaustion high, IVP at peak), Croatia (as HRHB patron) commits military assets that function as an additional army-level formation with high capability entering from the western border. This is not player-controlled — it's a patron action. But it transforms the late-war dynamic and makes the end-game feel historically grounded.

### 12. The Srebrenica Event

You have enclave mechanics (System 5) and enclave integrity decay, but no specification for enclave *collapse events*. Srebrenica's fall in July 1995 was not just a territorial loss — it was a genocide that fundamentally changed the international community's willingness to intervene.

**Suggestion:** When enclave integrity drops below a critical threshold AND the defending faction cannot relieve it, trigger a **named event** with massive IVP and patron consequences. This should be one of the highest-impact events in the game — not just an enclave falling, but a trigger that potentially unlocks NATO intervention (air strikes that degrade VRS capabilities) and accelerates the diplomatic end-game.

The educational value here is enormous: the player (especially playing RS) faces the choice of pressing the enclave or accepting its existence as a liability. The game should make the consequences of enclave overrun unmistakably clear.

### 13. "Plot Twist" — The JNA Card

Your JNA mechanics are solid (withdrawal, asset transfer to RS), but consider this: **what if the player playing RBiH could attempt to negotiate JNA neutrality?**

Historically, some JNA officers were genuinely Yugoslav in orientation. An early-Phase-0 RBiH diplomatic action (spending pre-war capital) could attempt to influence specific JNA garrisons toward neutrality rather than automatic RS alignment. This wouldn't prevent the war, but it could change *which* heavy equipment goes where — maybe the Tuzla garrison stays neutral longer, or the Sarajevo JNA assets don't all go to VRS.

This adds an asymmetric Phase 0 action for RBiH (who otherwise has fewer organizational levers than RS) and is historically grounded in the actual negotiations that occurred.

### 14. "Plot Twist" — The Croatian Endgame Betrayal

Your RBiH-HRHB alliance mechanics model the breakdown beautifully (alliance strain, open war, ceasefire, Washington Agreement). But consider: **what if the Washington Agreement doesn't hold?**

In your current design, the Washington Agreement locks the alliance at 0.80. But historically, the Federation was fragile and Croatia's interests were not identical to HRHB's. A late-game **Federation stress test** — where extreme RS collapse creates a territory grab opportunity that tempts HRHB to defect from the federation — would be a fascinating "what if." The conditions: RS territorial control drops below a crisis threshold, HRHB exhaustion is low relative to RBiH, and patron pressure from Croatia encourages "securing Croatian interests" before the final peace.

This would only fire in games that diverge significantly from history (RS collapses faster), but it would be a memorable moment and historically plausible given Croatian territorial ambitions.

---

## PART IV: PRIORITIES AND RECOMMENDATIONS

### Critical (blocks meaningful playtesting):
1. **War termination / end-game specification** — without this, the game has no ending
2. **Supply system specification** — everything depends on this and it's handwaved
3. **Player action guide per phase** — without this, testers won't know what to do
4. **AoR/OSID model reconciliation** — the triple identity crisis will cause endless bugs

### Important (blocks historical accuracy):
5. **Phase I → Phase II transition edge cases** (stuck-in-phase-I, entrenchment initialization)
6. **Ceasefire/Washington Agreement in Phase II pipeline** — these must fire during Phase II
7. **Late-war intervention specification** (Operation Storm equivalent)
8. **Scoring/evaluation system** — players need feedback on performance

### Nice to Have (enriches experience):
9. **Consequence Ledger** (displacement narration)
10. **Enclave collapse events** (Srebrenica-type)
11. **JNA neutrality negotiation** (Phase 0 asymmetric action)
12. **Federation stress test** (late-game what-if)

---

*This review is based on the full canon v0.5.0 document set, all planning proposals, and implemented work consolidated through 2026-02-22. Specific section and document references are included throughout for traceability.*
