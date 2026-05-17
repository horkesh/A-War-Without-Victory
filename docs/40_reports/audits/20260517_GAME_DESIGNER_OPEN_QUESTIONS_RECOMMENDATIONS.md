# Game Designer — Open Questions Recommendations (D1–D7)

**Date:** 2026-05-17
**Author role:** Game Designer
**Scope:** Concrete picks (not options) for seven open design questions blocking v0.9.x implementation lanes. Each pick is grounded in shipped canon (Engine Invariants v0.9.0 > Phase Specs v0.9.0 > Systems Manual v0.9.0 > Rulebook v0.9.0 > Game Bible v0.9.0 > VICTORY_AND_PYRRHIC_SCORING.md > SENSITIVE_HISTORY_DESIGN_GATE.md) and the current shipped command-loop heartbeat (`20260502_DECISION_ROOM_*` reports).
**Status:** Recommendation. Authoritative until overridden by Game Designer or user sign-off.
**Cross-cutting dependency flag:** Picks D1 and D6 are partially gated on Historian Lane H1–H5 results — see "Historian dependency" line on each.

---

## D1 — Sarajevo Special-Casing (companion to Historian Lane H1)

**Recommendation:** **Branch A — canonize the existing constants in code, add header comments, and create `docs/10_canon/SARAJEVO_SPECIAL_CASING_v0_9_0.md`** as a Tier-2 canon doc owned by Game Designer + Historian + Gameplay Programmer.

**Sub-questions resolved:**
- **ID-set constants stay code-side under Branch A.** `SARAJEVO_CITY_CORE_MUN_IDS`, `SARAJEVO_MUN_IDS`, and the four-core/four-ring split in `src/state/enclave_integrity.ts` are canon-anchored municipality identifiers, not tuning knobs. The new canon doc cites them by symbol; the code is the binding.
- **The RBiH `+3.0` / RS `+2.0` exhaustion split is two knobs, not one.** They encode an explicit faction-asymmetric political reality (the besieged faction is exhausted faster than the besieger), and bundling them into a single multiplier would erase that asymmetry. The canon doc names them as a paired tuple `(SIEGE_EXHAUSTION_EXTRA_BESIEGED = 3.0, SIEGE_EXHAUSTION_EXTRA_BESIEGER = 2.0)` with `SIEGE_EXHAUSTION_EXTRA_NEUTRAL = 0`.

**Rationale.** Branch B (lift to scenario JSON) would re-open every Sarajevo number as a scenario-author optimization surface and invite contradictory tuning across `apr_1992`, `apr_1993`, and what-if scenarios. The Sarajevo siege is **historical canon for the primary campaign** — it is not parametric; it is the war's central political fact. Treating it as a scenario knob contradicts the Rulebook v0.9.0 framing that the war's structure is *given*, not authored per-scenario. Branch A preserves the Railroad Hunter Report's distinction between "forbidden rails" and "approved canon exceptions" (per `2026-05-17-sarajevo-special-case-canon-decision-plan.md` Task 5) by making the exception explicit and signed-off, not hidden.

**Citation:** `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 1 (enclaves are mechanically modeled, Sarajevo named explicitly); `src/state/enclave_integrity.ts:15–30` (existing canon constants); `src/sim/combat/exhaustion.ts:83–91` (existing asymmetric exhaustion split); `Rulebook_v0_9_0.md` §1 (war structure as historical, not parametric).

**Historian dependency:** H1 watched-operation outcome lane does not block this decision; H1 covers Krivaja-95 / Stupcanica-95 / Cerska-Kamenica delivery visibility, which is a separate scope. If H1 surfaces a new Sarajevo-adjacent exception (e.g., a watched op inside the city), record it in the new canon doc and re-sign.

**Pick:** Branch A — canonize constants in code with header comments + new `docs/10_canon/SARAJEVO_SPECIAL_CASING_v0_9_0.md`; ID sets stay code-side; the `+3.0 / +2.0` split is two knobs.

---

## D2 — Logistics Priority Cap (plan #1)

**Recommendation:** **Tighten to `[0.5, 1.5]`** on the multiplier consumed by `getFormationSupplyMultiplier()` in `src/state/formation_fatigue.ts`.

**Why tighter, not the plan's `[0.25, 2.0]`:**

1. **No global multipliers (project memory).** Logistics Priority is the only player-facing supply lever in the canonical six-lever set (per the Player Command Model canon: corps stance, sector stance, ops planning, logistics priority, OPSEC, sector override). A 2.0× ceiling effectively doubles a single corps's supply effect and bumps it against the same range that *system-level* supply pressure produces (0.75× strained baseline; 1.0× adequate). At 2.0× the player lever overpowers the supply-pressure signal the engine is meant to surface.
2. **Calibration sensitivity.** Project memory notes 94% of RBiH OSIDs run "strained" baseline (0.75×). A 0.25× floor stacks multiplicatively with strained supply to produce ~0.19× effective commitment — a value the combat math was never calibrated against. A 2.0× ceiling stacks with adequate supply to 2.0×, far outside the calibration band that hit 93.2% area at n1289. `[0.5, 1.5]` keeps the lever inside the band the engine has already been tuned against (`getEdgeCapacityMultiplier` semantics).
3. **Player perception.** A lever that ranges 8× from end to end (0.25→2.0) reads as a brute-force optimization slider. A lever that ranges 3× (0.5→1.5) reads as a meaningful prioritization. Both are visible and decisive; only the second avoids the "trade your supply away to win one battle" optimization trap.
4. **The lever is per-edge, not per-corps.** Branch A of plan #1 keeps `state.military.logistics_priority[faction][edgeId]` as the canonical write target. A tighter cap reduces the temptation to weaponize the edge-level granularity into "starve corps X to feed corps Y" railroad behavior, which the Rulebook v0.9.0 §4 prohibits implicitly (control follows from emergent supply, not author fiat).

**Citation:** `Rulebook_v0_9_0.md` §1 / §4 (player levers as influence, not command); `src/state/formation_fatigue.ts:218–248` (existing consumer math); project memory "Calibration State (2026-04-01, 712 OSIDs)" baseline at n1289; project memory "Calibration % means nothing if mechanics are broken — never hesitate on a mechanically correct fix" (lever range is a mechanic, not a tuning knob).

**Pick:** Tighten to `[0.5, 1.5]`. Default `1.0`. Player perception: prioritized corps gets +50%, deprioritized gets -50%, neither breaks the combat-math calibration band.

---

## D3 — B3 Counter-Offer Mechanics (plan #4)

**Recommendations:**

- **Chain depth cap: 2.** The plan's proposed cap is correct. Per the existing bot-side architecture, `evaluateBotResponse()` in `src/sim/negotiation/bot_negotiation.ts:105–180` already produces a single counter via `generateCounterProposal()` — extending past one bot counter + one player counter-of-counter (depth 2) reproduces the historical negotiation pattern (Vance-Owen, Owen-Stoltenberg, Contact Group: one round of mutual counters, then accept-or-reject). Deeper chains are negotiation-as-puzzle, which Rulebook §1 ("not a puzzle with a predetermined solution") rejects.
- **`negotiation_capital` cost per delta-point: 0** (no per-point capital cost on counters). Capital is *spent on accepting the final proposal* via `computeProposalCostToFaction()` (`bot_negotiation.ts:64–89`). Layering an additional per-counter cost would create a "talking costs capital" optimization surface where the player learns to skip counters to preserve capital — that is the opposite of what the Decision Room command-loop heartbeat is meant to encourage. Counters are free; only ratification consumes capital.
- **One-counter-per-turn rule: ON.** Each turn the player may issue zero or one counter; the bot may issue zero or one counter in response. Multi-counter-per-turn breaks the existing turn pipeline contract (`war_phase_negotiation_steps.ts`) and creates within-turn race conditions on `state.military.negotiation` writes. One-per-turn keeps the lever inside the canonical pipeline and matches Rulebook §2.3 ("each turn = one week").
- **Cutileiro (Feb 1992, pre-war): EXCLUDE from the counter system.** Cutileiro is the pre-war event (March 1992, week 0); the engine has not entered the war phase yet, the negotiation pipeline does not run, and the Cutileiro arc is **narrative-only** in shipped data (`peace_plan_data.ts`). It fires as an event, not as a negotiation transaction. Including it would require a parallel pre-war negotiation surface, which is out of scope per `peace_phases.ts`. Cutileiro stays an event with accept/reject choices in `EventDecisionModal.tsx` — no counter, no chain.

**Citation:** `src/sim/negotiation/bot_negotiation.ts:105–270` (existing single-counter machinery to extend); `Rulebook_v0_9_0.md` §2.3 (turn = one week); `src/sim/turn_phases/peace_phases.ts` (Cutileiro fires in peace phase, before negotiation pipeline exists); `VICTORY_AND_PYRRHIC_SCORING.md` §6 Non-Goal #4 ("no difficulty multiplier") — chain depth is not a difficulty knob.

**Pick:** Chain depth cap **2** (one bot counter + one player counter-of-counter); per-delta `negotiation_capital` cost **0** (capital paid only on ratification); one-counter-per-turn rule **ON**; Cutileiro **EXCLUDED** (pre-war event, no counter chain).

---

## D4 — Paramilitary Phase 1 Severity Bands (plan #6)

**Recommendation:** **Three bands with proportional, non-linear capital penalties.**

| Band | Trigger (`paramilitary_deployment_count` delta this turn) | International Standing | Internal Cohesion | Patron Confidence |
|---|---|---|---|---|
| **Minor** | `1–3` | `-1` per deployment | `-0.5` per deployment | `0` |
| **Mid** | `4–9` | `-3` per deployment | `-1` per deployment | `-0.5` per deployment |
| **Severe** | `10+` | `-5` per deployment, +`-10` flat threshold bonus | `-2` per deployment | `-2` per deployment |

**Notes on the bands:**

- The plan's placeholder `1–3 / 4–9 / 10+` thresholds are correct. Mid-band threshold of `4` matches the historical pattern in which a faction that deploys 4+ paramilitary units in a single week has crossed from "tolerated irregular cleanup" into "systematic sweep campaign" (Bijeljina pattern, Foca pattern). Severe-band threshold of `10` matches the late-1992 / July 1995 spike where deployments saturate.
- **Penalties are per-deployment + a flat severe-band threshold bonus.** Linear per-deployment scaling alone would let a Severe-band turn (e.g., 12 deployments) compute as merely 12 × the Severe per-unit rate, producing a smooth gradient. The flat `-10` international-standing bonus at the Severe threshold creates a real cliff — crossing 10 deployments is qualitatively different, not merely 10× of one deployment. This honors `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 3 #5 ("no atrocity-efficiency metric"): the player cannot smooth out the consequence by deploying just-below-threshold.
- **Patron confidence enters only at Mid and Severe.** A patron tolerates a small amount of paramilitary activity (the historical reality of every patron in the BiH war); the relationship breaks only when the activity becomes campaign-scale.
- **`war_crimes_events` increment remains 1-per-capture**, as already implemented in `paramilitary_sweep.ts`. The severity band acts on `paramilitary_deployment_count` (deployments, an input), not on `war_crimes_events` (outcomes, an output) — keeping the player-authorized surface (`paramilitary_policy`) the only thing the player optimizes against.

**Atrocity proportionality citation:** `SENSITIVE_HISTORY_DESIGN_GATE.md` §3 ("`paramilitary_policy` is the ONLY player-facing surface that authorizes war crimes… UI must not round numbers to make the decision look small"). Severity bands enforce *proportionality* — more deployments = more cost, with a cliff at the Severe threshold so the player cannot optimize to "just-below-Severe." `VICTORY_AND_PYRRHIC_SCORING.md` §6 Non-Goal #2 ("treat atrocity as tradeable capital") is preserved because the penalty is uniformly negative; there is no input combination that produces a *better* outcome via more paramilitary use.

**Pick:** Three bands at `1–3 / 4–9 / 10+`, per-deployment penalties as tabled, plus a flat `-10` international-standing cliff at the Severe threshold to prevent just-below-threshold optimization.

---

## D5 — War Termination Open Questions (plan #12)

**Q1 — `timeout_stalemate` at week 208: KEEP.** The `ENDGAME_AND_NEGOTIATION_DESIGN.md` directive to remove it predates `VICTORY_AND_PYRRHIC_SCORING.md` (current canon). The 208w backstop is what `war_termination.ts:80–88` actually does. Removing it would leave the engine with no terminal condition when scenarios run past Dayton with `war_ended_early` never set (regression tests assume *some* termination), and it would invent a player-quit obligation the UI does not yet support. **Spec-records-current-behavior** per `2026-05-17-war-termination-minimal-spec-plan.md` Task 3. The design-discussion removal proposal moves to the spec's `§8` open-questions register and is **deferred to a follow-on engine plan that bundles Q3 (player-quit terminal path)**.

**Q2 — Initiative cadence: WINDOW, not fire-once.** Each historical peace plan (`peace_plan_data.ts`) has a `trigger_week` *plus* an N-turn window during which the plan remains live. Recommendation: **6-turn window** per plan (matches the historical negotiation arcs — VOPP was alive from Jan to May 1993, ~18 weeks, but the *acute decision window* per plan was ~6 weeks before the next plan superseded it). After the window closes, the plan is dead and does not return at higher exhaustion. **Why not fire-once:** fire-once produces "the player misses the modal once and the plan is gone forever," which is hostile to the Decision Room command-loop heartbeat and contradicts the Pre-Advance Command Review modal's "you may have buried a decision" guard rail. **Why not return-at-higher-exhaustion:** that would let exhaustion become a player optimization lever ("delay until VOPP returns 30% cheaper"), which the Sensitive History Design Gate's Ring 3 #4 ("no body-count optimization surface") prohibits because exhaustion at this scale is downstream of casualties and atrocities.

**Q3 — Player-quit as fifth terminal path: ADD, but as `player_quit:{turn}` with no winner and "harsher than Dayton" verdict modifier per `ENDGAME_AND_NEGOTIATION_DESIGN.md` §1b.** The four existing paths (victory_condition / negotiated_peace / faction_collapse / turn_limit) do not cover the player walking away. `war_termination.ts` does not currently handle it; the Cinematic Verdict plan and Cinematic-Verdict UI work both assume this surface exists. Adding it as a fifth path costs ~20 lines in `war_termination.ts` and gives the player a graceful out that is mechanically distinct from "I let the timer run out" (turn_limit) and "my army collapsed" (faction_collapse). Both the verdict label (`player_quit`) and the Cost Ledger wording carry the framing in `ENDGAME_AND_NEGOTIATION_DESIGN.md` §1b ("The war continues without you."). **Constraint:** the harsher-than-Dayton penalty must enter through *grade-anchor failure* (e.g., automatic Grade-D floor unless all dimensions are A-band), not through a hidden score multiplier, to preserve `VICTORY_AND_PYRRHIC_SCORING.md` §6 Non-Goal #4 (no difficulty multiplier).

**Q4 — Scenario-defined `victory_conditions` vs faction-goal hierarchy: FACTION-GOAL HIERARCHY IS THE SENIOR SOURCE for the canonical campaign; scenario `victory_conditions` is senior only for training/what-if scenarios that explicitly declare it.** This is the rule already implicit in `VICTORY_AND_PYRRHIC_SCORING.md` §4.2 ("scenarios declaring `victory_conditions` are non-canonical — a training scenario, a what-if, or a bounded exercise") and §4.4 ("a faction that wins via scenario condition can still earn grade F"). The canonical `apr_1992` campaign has no `victory_conditions`; the faction-goal hierarchy (from the War Termination Spec Task 2 — RS independence → maximal autonomy; HRHB third entity → strengthened cantons; RBiH state-level institutions) is what `pyrrhic_score` weights against and what `classifyOutcome()` evaluates. **Pick:** faction-goal hierarchy is the senior source; `victory_conditions` is an explicit per-scenario opt-out for non-canonical scenarios only.

**Citation:** `VICTORY_AND_PYRRHIC_SCORING.md` §1 termination priority, §4.2 / §4.3 / §4.4 scenario contract; `src/sim/war_termination.ts:80–88` current 208w backstop; `ENDGAME_AND_NEGOTIATION_DESIGN.md` §1b player-termination framing; `SENSITIVE_HISTORY_DESIGN_GATE.md` Ring 3 #4 (no body-count optimization, blocks return-at-higher-exhaustion).

**Pick:** Q1 **KEEP** 208w `timeout_stalemate` (current code; backstop). Q2 **WINDOW**, 6 turns per plan (no return-at-higher-exhaustion). Q3 **ADD** player-quit as fifth terminal path (`player_quit:{turn}`, no winner, Grade-D floor in verdict). Q4 **Faction-goal hierarchy is senior** for canonical scenarios; `victory_conditions` is senior only for non-canonical training/what-if scenarios that opt in.

---

## D6 — Fatigue Owner Pick (plan #9)

**Recommendation: Owner C — Engagement gate (front vs reserve distinction) refinement.**

**Why C, ranked against the other four:**

- **A (Combat accumulation rate retune):** rejected. Combat fatigue (`FATIGUE_ATTACKER = 2`, `FATIGUE_DEFENDER = 1`) is the *primary* fatigue driver already (per `formation_fatigue.ts` header comment). Retuning it risks masking the n1289 combat math calibration (defensive fire P1, urban P2, graduated morale P3, forest P4). "No global multipliers" — combat accumulation IS the global multiplier in disguise.
- **B (Reserve recovery rate retune):** rejected. The simpler change (reserves recover faster than front) is already half-implicit in the recovery loop: front-assigned brigades take `+0.5/turn` frontline duty while reserves take `0`. Adding asymmetric recovery on top is double-counting the same asymmetry from the recovery side, and the implementation requires fragile branching on assignment kind in a hot loop.
- **C (Engagement gate refinement): PICK.** The current code blocks recovery if `wasEngaged === true` in the current turn. This is the *correct* lever to refine because the n292 audit finding ("~98% of formations at fatigue 0") is downstream of the recovery loop, not the accumulation loop. Reserve formations that were engaged once turns ago should recover normally; front formations recently engaged should not. Refining the engagement gate from "this turn" to "engaged in any of the last N turns" (recommend `N = 2`, matching `FATIGUE_RECOVERY_INTERVAL`) directly fixes the distribution without touching combat math. **It does not hide a combat bug** because the combat math (`FATIGUE_ATTACKER / FATIGUE_DEFENDER`) is unchanged; only the *recovery eligibility predicate* changes.
- **D (Exhaustion modulation coupling):** rejected. Coupling fatigue recovery to `war_exhaustion` creates a positive feedback loop where a tired nation gets more tired faster — that *masks* the underlying combat-math calibration by giving the engine an extra hidden knob.
- **E (Faction-asymmetric data):** rejected. The deferment audit (`20260515_FORCE_QUALITY_TRAJECTORY_FATIGUE_DEFERMENT.md`) explicitly flags faction-asymmetric front-duty rates as a *data* lever, not a code lever; this is reasonable but addresses a different problem (RBiH-vs-RS doctrinal asymmetry) than the n292 residue problem.

**No-global-multipliers compliance:** C does not introduce a multiplier. It refines a predicate (`wasEngaged` becomes "engaged within last 2 turns"). It does not hide a combat bug because the combat-output side (per-battle fatigue inflicted) is untouched.

**Historian dependency:** None. Fatigue is mechanical, not historical.

**Pick:** **Owner C — Engagement gate refinement.** Change recovery predicate from "engaged this turn" to "engaged within last `FATIGUE_RECOVERY_INTERVAL` turns" in `applyFatigueRecovery()`. Smallest surface; no global multiplier; cannot mask combat math.

---

## D7 — Player Turn Guide Structure (plan #13)

**Recommendation: SPLIT into First-Time Tutorial Cut + Reference Cut, single file, side-by-side sections.**

**Why split:**

- **One dense table fails both audiences.** First-time players need narrative scaffolding ("on your first turn, your job is to read the Decision Room Command Loop's Urgent lane and decide which of the four blockers to address"); experienced players need a one-page step-name → consumer-step lookup. Forcing one table into both roles produces a table that is too dense for tutorial and too narrative for reference.
- **Single file, side-by-side sections.** Per plan #13's "Markdown only" architecture, splitting into two files would create cross-file drift (sections fall out of sync). Inside one file, the tutorial cut occupies §1–§5 and the reference cut occupies §6–§10. The Task 1 phase inventory table lives in the reference cut; the Task 2 per-phase player surface lives in the tutorial cut (because that is where "what the player sees" lives, anchored in shipped Decision Room surfaces).
- **Faction sections (Task 4) appear in the tutorial cut.** "Playing RBiH / RS / HRHB" is a tutorial concept — the experienced player has already absorbed the asymmetry.

**Section split:**

| Cut | Sections | Audience |
|---|---|---|
| Tutorial | §1 What a Turn Is, §2 Reading the Decision Room, §3 The Six Tactical Levers, §4 Playing RBiH / RS / HRHB, §5 What Happens If You Do Nothing | First-time players |
| Reference | §6 Phase Inventory (Task 1), §7 Step-Name → Consumer Step Lookup, §8 Lever → Pipeline Step Map (Task 3 reference form), §9 Glossary, §10 Cross-References to canon | Returning players, design reviewers |

**BCS terminology footnotes: DEFER to localization plan.** Inline BCS (Bosnian/Croatian/Serbian) glosses for terms like *municipality / opština*, *brigade / brigada*, *operation / operacija* would mid-paragraph the tutorial cut for every player. The BCS localization plan (`2026-05-17-bcs-localization-plan.md`) is the canonical home for term-by-term mapping. The Turn Guide cites the localization plan in §10 and includes a single inline note: "Throughout this guide, English terms are used. The BCS Localization plan ships per-term equivalents." Exception: place names (Sarajevo, Brčko, Sarajevsko-Romanijski Korpus) appear in their canonical form (Latin BCS with diacritics) because the engine's faction/OSID/formation IDs already use them.

**Citation:** `2026-05-17-player-turn-guide-plan.md` (architecture is documentation-first, single canon-adjacent doc); `Rulebook_v0_9_0.md` §1–§4 (canon language patterns to align with); existing Decision Room shipped surfaces (`20260502_DECISION_ROOM_*.md`) which the tutorial cut must reference verbatim.

**Pick:** **Split, single file, side-by-side.** Tutorial cut §1–§5, reference cut §6–§10. BCS terminology **DEFERRED** to localization plan; only place-name diacritics retained inline.

---

## Cross-cutting dependency summary

| Pick | Depends on Historian H1–H5? | Notes |
|---|---|---|
| D1 (Sarajevo) | Soft dependency on H1 only if H1 surfaces a new Sarajevo-adjacent watched op | Pick stands; record any new Sarajevo exception in the new canon doc and re-sign |
| D2 (Logistics Priority cap) | No | Mechanical lever |
| D3 (B3 counter mechanics) | No | Negotiation pipeline |
| D4 (Paramilitary severity bands) | No | Sensitive-history gate already binding |
| D5 Q1–Q4 (War termination) | Q4 references the faction-goal hierarchy from `WAR_TERMINATION_SPEC.md` Task 2, which is itself Historian-advised — but the *senior-source rule* (Q4 pick) does not change with H1–H5 results | Pick stands |
| D6 (Fatigue owner) | No | Mechanical |
| D7 (Player Turn Guide) | No | Documentation |

---

## Sign-off block

| Role | Status | Date |
|---|---|---|
| Game Designer | Recommended (this document) | 2026-05-17 |
| Historian | Pending review (H1 lane in flight) | — |
| Technical Architect | Pending review | — |
| User | Pending sign-off | — |

This document is a recommendation. It becomes binding only after Game Designer + Historian + Technical Architect + user sign-off per the sign-off structures in `VICTORY_AND_PYRRHIC_SCORING.md` §8 and `SENSITIVE_HISTORY_DESIGN_GATE.md` §6.
