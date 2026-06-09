# Instrumented Full-Campaign Audit — 188w Start→Dayton (Player-Experience Lens)

**Date:** 2026-06-09
**Author role:** scenario-tester + game-designer (Pyrrhic Ops+GD track, task #70)
**Run:** `apr1992_definitive_188w` · 188 weeks · hash `d311eeac18492683` (byte-matches the current floor — clean baseline reproduction)
**Run dir:** `runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n2025/`
**Posture:** READ-ONLY diagnostic. No code/data/scenario/baseline changes.

---

## ⚠️ Caveat — this is a HEADLESS PROXY, not a felt playthrough

Nobody has played a human campaign. This run is bots in **`decision_mode: 'historical'`** (the calibration health-check path). Every one of the 69 fired decisions resolved via `applyAIDefaultResponse` (`decision_source: bot_ai_default` — i.e. the historical default, NOT the emergent political scorer, NOT options[0] re-derivation). So this audit finds **structural / firing / wiring gaps and cadence**, NOT *feel*. Where I say "a player would experience X," I mean it follows mechanically from what fired and when — not that a human reported it. In `emergent` mode some decisions would route through `pickPoliticalResponse` and could diverge; that path was not exercised here.

**Headline verdict:** The loop **holds structurally for the first ~138 weeks and then thins to near-silence through the climax.** The negative-sum spine is real and legible (1.28M displaced, exhaustion saturated, territory net-flat). The Dayton 5-D negotiation menu is **fully built and reachable** at t188 — but in the proxy it terminates as an *open, unresolved menu* with **no verdict, no closure, no game_over**. The mid-game (esp. the 20-week Srebrenica window, w140–160) is a **decision void** — the single most consequential period of the war passes with almost no player-facing decision. **A2 = closure gap. A3 = wiring gap (decisions don't set the codex/ghost flags). A4 = the loop reads as territorial-stasis-plus-paperwork unless onboarding reframes it.**

---

## Dimension 1 — Decision-event cadence

**Catalog:** 158 total events; **66 are decision events** (`requires_player_response: true`) — RBiH 28, RS 20, HRHB 18.
**Fired this run:** **69 decision resolutions logged** (`event_decision_log`), 171 distinct events fired overall (incl. consequence + flavor events).

### Density of fired decisions (10-turn bins)
```
t0-9    ######  (6)     1992 spine: strategic goals, ID, paramilitary policy, Graz
t10-19  ####    (4)     Drina, camps, London
t20-29  #       (1)     minority retention
t30-39  ###     (3)     Gornji Vakuf, VOPP, Vance-Owen
t40-49  #       (1)     Zagreb restrains Boban
t50-59  #####   (5)     VOPP acceptances, Srebrenica demil, assembly
t60-69  ##      (2)     territorial scope, O-S distancing
t70-79  ######## (8)    Owen-Stoltenberg cluster, APWB, camp exposure
t80-89  ###     (3)     reintegration, federation overture, autonomy
t90-99  ############### (15)  PEAK — addresses/visits/decorations + NATO + Washington run-up
t100-109 ###    (3)     Washington Agreement, restraint
t110-119 #####  (5)     Contact Group plan + responses
t120-129 ####   (4)     federation army integration, Bihać
t130-139 #      (1)     Carter ceasefire
═══════════════════════════════════════════════════════════
t140-159 (none in catalog windows; ZERO fired) ◄── THE VOID
═══════════════════════════════════════════════════════════
t160-169 #      (1)     UN hostage crisis
t170-179 #####  (5)     Karadžić-Mladić split, HV-HVO, late offensive, Holbrooke
t180-189 ##     (2)     Holbrooke ceasefire, US halts Federation advance
```

### Findings
- **THE MID-GAME VOID IS REAL.** **85 of 188 weeks (45%) fire ZERO events.** The worst contiguous stretch is **w140–160**: w140,141,142,143,145,146,147,149,150,151,152,153,154,157,158,160 all zero. This is precisely the **Srebrenica/Žepa fall window** — the climax of the historical war — and the player faces **no decision** through it.
- **The cadence is front-loaded and asymmetric.** The political loop is rich 1992→mid-1994 (t1–138). It then collapses: only **9 decisions across the final 50 weeks**, and **7 of those 9 are RS** (hostage crisis, Deliberate Force compliance, Holbrooke/Belgrade). RBiH gets 3 late decisions; HRHB gets 1 (HV-HVO command, t175). The endgame is an RS-compliance monologue.
- **Territorial stasis compounds the lull.** Control counts barely move w60→w160 (RBiH pinned at 254–257). A player gets a ~2-year plateau with no decisions and no map movement — the GD-warned "turns 40–150 void" is confirmed empirically.

---

## Dimension 2 — The authorship loop (promise → receipt; codex morphing A1c)

### Promise → receipt: WORKS at the consequence-event layer
- **23 of 135 consequence events fired** (`consequences.json`), and they chain causally from decisions:
  - RBiH `rbih_paramilitary_policy_1992 → always_deny` (t4) ⇒ `csq_paramilitary_authorization_refused` fired + `clean_record` flag set.
  - RBiH `rbih_state_identity → civic` (t3) ⇒ `csq_civic_identity_consolidation_1993`.
  - Observer/audit consequences fired: `csq_corridor_blocked_audit`, `csq_winter_held_audit`, `csq_force_quality_inversion`, `csq_political_unity_audit`, `csq_arms_embargo_compliance_audit`, `csq_international_tribunal_observation`, refugee strain/mobilization, truce streaks.
- So the **substrate is live** — choices leave a traceable consequence trail in `event_fire_counts`.

### Codex morphing (A1c): PARTIAL, and the marquee paths are dead
The dynamic codex (`src/sim/codex/dynamic_section_builder.ts`) has **20 ghost-entry predicates** but `buildDynamicSections()` returns `[]` (Phase 0 — no synthesized essay inserts at all). Of the 20 ghost predicates, evaluating the **actual final state** (RBiH player-faction, t188):
- **FIRE (≈4–6):** `corridor_blocked`, `winter_held`, plus the observer flags for `paramilitary_streak_refused`, `arms_embargo_full_compliance`, `political_unity_held` are all SET (`paramilitary_authorization_refused`, `clean_record`, `winter_held_through_turn`, `corridor_blocked_through_turn`, `arms_embargo_compliant_through_turn`, `political_unity_held_through_turn` = true).
- **DORMANT (the load-bearing narrative ones):** `enclave_defended`, `early_peace_accepted`, `alliance_held`, `patron_resisted`, `force_quality_inversion`, `negotiation_capital_exhausted`, `negotiation_capital_recovered`, all 4 Wave-3 entries.
- **CONCRETE WIRING BREAK (A3 punch-list):** `early_peace_accepted` is dormant **despite Vance-Owen being accepted at t39 and Owen-Stoltenberg at t70.** Cause: `vance_owen_plan_1993 → accept` sets `negotiation_capital` + `patron_pressure` effects but **never sets the `vance_owen_accepted` event_flag** that `predEarlyPeaceAccepted` reads. The decision layer and the codex layer are not bridged. Same dead bridge starves `predNegotiationCapitalExhausted` (which also keys on those flags). **"Authorship of the tragedy" is observable for paramilitary/corridor/winter discipline, but LATENT for the entire peace-plan and enclave arc** — the parts a player would most expect to "author."

---

## Dimension 3 — The Dayton endgame (A2)

**The 5-D negotiation IS built and IS reachable.** At t188 the run produced a fully-populated `pending_dayton` menu:
- **8 territorial packages + 6 institutional packages.**
- Real per-faction capital: **RBiH 76.8, HRHB 68.2, RS 35.8.**
- Patron override: **RS 78.7** (Belgrade forcing the table), RBiH 2.75, HRHB 5.0.
- The **6 strategic dimensions are richly differentiated and read as a Pyrrhic settlement**: RS `international_standing` = 0, `patron_confidence` collapsed 71→4, `territorial_legitimacy` 61→19 — militarily strong (`military_credibility` 99) but diplomatically bankrupt and patron-abandoned. RBiH `international_standing` 100, `negotiating_leverage` 100. This is exactly the "win the battles, lose the peace" texture the thesis wants.

**But the climax does not CLOSE in the proxy:**
- `dayton_result: false`, `verdict: false`, `faction_verdicts: false`, `meta.game_over: false`, `meta.outcome: undefined`.
- **Root cause is structural, not a bug to fix blindly:** `DAYTON_TRIGGER_WEEK = 188` and the run is 188 weeks, so the trigger fires on the *final* turn and only sets the menu. Resolution requires `resolveDaytonNegotiation(state, playerProposal)` — which needs a **player proposal**. The headless scenario runner **never calls it** (grep-confirmed: zero `resolveDayton`/`pending_dayton` references in `scenario_runner.ts`). The verdict/cost-ledger/cinematic surfaces are all **UI-only** (`VerdictScreen.tsx`, `CinematicVerdict.tsx`, `WarCostSummary.tsx`) — they compute on demand in the app, not in sim state.
- **So in the headless arc, the campaign "ends" by simply running out of turns with an open menu on the table.** It does NOT read as a Pyrrhic settlement *yet* — it reads as a **freeze-frame**: the negotiation is teed up and then the lights go out. The anticlimax risk is real **for anyone who reaches t188 without the UI resolving/closing it**, and there is no proxy-side proof the close-out path produces a coherent verdict.

---

## Dimension 4 — Rupture + the negative-sum spine

**Rupture FIRES and REGISTERS.**
- `negotiation.rupture_consequences = ["srebrenica_genocide_1995"]` is recorded. Preconditions all met in-run: `srebrenica_enclave_formed = true`, `op:srebrenica:srebrenica_2` controller = `RS`, turn ≥ 140. The genocide condemnation flag propagates to the verdict via `scoring.ts`. (Žepa OSID was undefined/uncontrolled; Goražde held RBiH — so the broader enclave model is partial, but Srebrenica itself ruptures correctly.)
- **GAP:** the rupture is a *silent state-flag flip*. There is **no decision event at the fall** — no RBiH "the column is breaking out / the enclave is falling, what do you do" moment, and it lands inside the w140–160 decision void (Dimension 1). Mechanically locked, narratively invisible from the player's chair at the moment it happens.

**The negative-sum thesis is strongly legible from the signals:**
- **Displacement: 0 → 1,279,684** across 106 municipalities, monotonic (911k by w20, 1.03M by w40, 1.28M by w188).
- **Exhaustion saturates: all three factions slam to the 10000 cap** (from 57/114/149). The war-cost keystone (`scoring.ts` war-cost floor, "hollow" cap at 0.78) would be maxed — i.e. any territory-driven grade gets capped down. The mechanism that pays off the thesis is wired.
- **Net control is ~flat:** RBiH 288→285, RS 327→321, HRHB 97→106. 186 settlements changed hands but the map nets near-zero. **1.28M people displaced to move the line by single digits = the negative-sum spine in one number.**
- A player tracking these signals would *feel* the negative-sum thesis — IF the UI surfaces displacement/exhaustion/war-cost prominently and continuously (not just at the verdict). The data is there; the question is whether the warroom keeps it in the player's face during the 2-year plateau.

---

## Dimension 5 — Onboarding gap (A4)

Where a first-time player misreads this as conquest / a 4X:
1. **The map barely moves for 2 years (w60–160) while territory nets flat.** A 4X-trained player will read the plateau as "I'm losing / stuck" and push for offensives — exactly the wrong instinct. The onboarding must teach **"holding the line and surviving IS the game; the scoreboard is exhaustion and displacement, not km²."**
2. **The president-not-general model is non-obvious.** Brigades never attack independently; the player approves CO proposals. A 4X player expects to push units. Tutorial must teach the **propose→approve loop** and that there is **no conquest win** (`war_termination.ts`: emergent ends only via settlement/timeout/collapse).
3. **The negative-sum scoreboard must be taught early.** Displacement (1.28M) and the war-cost grade *cap* are the real scoreboard. If the player never sees that taking territory can LOWER their grade (the `war_cost_index` "hollow" cap), they'll optimize for conquest and be blindsided at the verdict. Teach: **"atrocity and over-extension are costs that taint victory — they never reward."**
4. **The climax needs signposting.** The Dayton menu (8 territorial + 6 institutional packages, capital budget) drops at t188 after a long quiet endgame. Without onboarding, a player reaching it cold won't grasp that **this — spending negotiation capital across 5 dimensions — is the actual win/lose surface,** not the map.

---

## Prioritized scope list for A2 / A3 / A4

### A2 — Dayton-as-ending (the climax must CLOSE)
1. **Close the terminal loop.** Today the menu opens at t188 and nothing resolves it; `game_over` stays false. Decide and implement the terminal contract: resolve Dayton → write `dayton_result` → compute verdict (`computeFactionVerdict` + war-cost cap + `capOutcomeByPeaceDysfunction`) → set `game_over`/`outcome` → drive `VerdictScreen`/`CinematicVerdict`. **Top gap: there is no proof the close-out produces a coherent Pyrrhic verdict, because nothing exercises it end-to-end.**
2. **Trigger timing.** `DAYTON_TRIGGER_WEEK = 188` on a 188-week scenario fires on the last turn — there is no in-sim turn left to negotiate across. Move the trigger earlier (e.g. ~w180, post-Deliberate-Force/Holbrooke) so the negotiation has air, or make the final turn explicitly a negotiation turn the runner/UI honors.
3. **Headless terminal proxy.** Add a read-only headless resolution path (bot picks a default proposal) so future instrumented runs can VERIFY the verdict/cost-ledger/cinematic close-out without a human — otherwise A2 stays scoped blind.

### A3 — Codex coverage / morphing (wire the decisions that actually fire)
**These ~dozen are load-bearing — they FIRE and are narratively central, but the codex/ghost layer doesn't see them:**
1. **Bridge peace-plan acceptances to the codex flags.** `vance_owen_plan_1993 → accept` (fires t39) and `owen_stoltenberg_plan_1993 → accept` (t70) must SET `vance_owen_accepted` / `owen_stoltenberg_accepted` flags so `early_peace_accepted` + `negotiation_capital_exhausted` ghosts can ever fire. Currently a dead bridge.
2. **Wire `buildDynamicSections()`** — it returns `[]` (Phase 0). The richest codex morphing surface (dynamic essay inserts) is entirely unbuilt.
3. **Author the Srebrenica-fall codex/decision** keyed on the rupture (`srebrenica_genocide_1995`) so the genocide is not a silent flag — give the player the receipt at the moment it lands (the w140–160 void).
4. **Surface the ghosts that DO fire** (`corridor_blocked`, `winter_held`, `paramilitary_streak_refused`, `arms_embargo_full_compliance`, `political_unity_held`) — confirm they reach the VerdictScreen codex panel; these are the proven-live authorship receipts.
5. **The 23 consequence events that fired** (`event_fire_counts`) are the authoritative "what the player authored" list — A3 should ensure each has codex/Chronicle representation. Strongest causal chains to dramatize: paramilitary-deny→`csq_paramilitary_authorization_refused`, civic-ID→`csq_civic_identity_consolidation_1993`, refugee strain/mobilization, international-tribunal observation.

### A4 — Onboarding (teach Y because Z)
1. **Teach "this is negative-sum, not conquest"** because the map nets flat (RBiH 288→285) while 1.28M are displaced — the 4X instinct actively misreads the game.
2. **Teach the president/propose-approve model + no-conquest-win** because brigades never attack independently and `war_termination` has no territorial victory in emergent — a unit-pushing player will be confused for hours.
3. **Teach the war-cost-cap scoreboard early** because taking territory can LOWER the verdict grade (`war_cost_index` "hollow" cap) — and atrocity taints, never rewards. Without this, players optimize exactly the wrong axis.
4. **Signpost the Dayton climax** because the 5-D capital-spend menu at the end — not the map — is the real win/lose surface, and it arrives after a quiet 50-week endgame that gives no hint it's coming.

---

## Evidence appendix (file:line / artifact)
- Decision log (69 fires, all `bot_ai_default`): `final_save.json → military.event_decision_log`.
- Cadence/void: `weekly_report.jsonl` — 85/188 weeks zero `events_fired`; w140–160 contiguous void.
- Consequence firing (23/135): `final_save.json → military.event_fire_counts` ∩ `data/scenarios/events/consequences.json`.
- Codex morphing: `src/sim/codex/dynamic_section_builder.ts` (20 ghosts; `buildDynamicSections` returns `[]`; Wave-2/3 gate on un-landed `*_through_turn` observer lanes).
- Peace-plan flag break: `data/scenarios/events/war_1993.json → vance_owen_plan_1993.response_options[accept].sets_flags` (no `vance_owen_accepted`).
- Dayton trigger: `src/sim/negotiation/dayton_negotiation.ts:49,71` (`DAYTON_TRIGGER_WEEK=188`, `shouldInitiateDayton`); `src/sim/turn_phases/war_phase_negotiation_steps.ts:67-80` (sets `pending_dayton`, never resolves).
- Runner never resolves Dayton: `src/scenario/scenario_runner.ts` (no `resolveDayton`/`pending_dayton` refs).
- Rupture: `src/sim/negotiation/rupture_consequences.ts` + `final_save.json → military.negotiation.rupture_consequences = ["srebrenica_genocide_1995"]`.
- Negative-sum signals: `end_report.md` (displacement 0→1,279,684; exhaustion → 10000 cap; net control RBiH 319→285 / RS 289→321).
- War-cost verdict cap: `src/sim/negotiation/scoring.ts:59-117` (war-cost floor, "hollow" cap); `peace_dysfunction.ts → capOutcomeByPeaceDysfunction`.
- Endgame surfaces are UI-only: `src/ui/map/components/{VerdictScreen,verdict/CinematicVerdict,WarCostSummary}.tsx`.
