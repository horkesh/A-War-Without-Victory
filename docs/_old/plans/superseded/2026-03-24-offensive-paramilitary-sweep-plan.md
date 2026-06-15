# Offensive Paramilitary Sweep — Implementation Plan

**Date:** 2026-03-24
**Status:** PLAN
**Version slot:** v0.6.5 (calibration patch — sim-affecting, requires baseline re-freeze)
**Prerequisite:** None (independent of v0.7.x). Should execute BEFORE v0.7.0 flag wiring to establish a higher baseline.
**Estimated tasks:** 8
**Mandatory consultations:** /operations-expert, /war-or-game, /historian, /data-pipeline-engineer

---

## Context

The existing `paramilitary_sweep.ts` handles **rear pocket cleanup** — small 150-person units that capture isolated enemy OSIDs completely surrounded by friendly territory. This works correctly for its purpose (26 RS spawns in 40w).

But the historical April-June 1992 Drina valley ethnic cleansing was **offensive action**: Arkan's Tigers (Bijeljina, Zvornik), White Eagles (Višegrad, Foča), and local SDS-organized paramilitaries swept through Bosniak-majority municipalities ahead of or alongside VRS regulars. These were not rear-pocket cleanup — they were the spearhead.

**Current gap:** 13 OSIDs in the Drina region that RS should hold at w40 but RBiH retains. By municipality: Čajnice (3), Višegrad (4), Srebrenica (2), Goražde (1), Rogatica (1), Rudo (1), Zvornik (1). These are NOT surrounded by RS territory — the existing paramilitary system correctly ignores them.

**Estimated impact:** +2-3pp area-weighted (92.0% → ~94-95%). The single highest-ROI calibration change available.

---

## Design Decisions (Architect, with /war-or-game + /historian input)

1. **Extension, not new system.** Add an `offensive` mode to the existing `paramilitary_sweep.ts`. Reuse spawn/march/capture/dissolve/casualty infrastructure. Same deterministic hash for spawn probability.

2. **Target selection: adjacent hostile-majority OSIDs.** Unlike rear pocket mode (ALL neighbors friendly), offensive mode targets hostile-controlled OSIDs with AT LEAST ONE friendly neighbor. Additional filter: target OSID's initial ethnic majority matches the displaced group (Bosniak-majority OSIDs in RS-targeted Drina municipalities).

3. **Time-limited: w0-12 only.** The historical paramilitary sweep was concentrated April-August 1992. After that, paramilitaries were increasingly absorbed into regular VRS or disbanded. Use `OFFENSIVE_PARA_FADE_WEEK = 12` (vs `PARAMILITARY_FADE_WEEK = 20` for rear pocket mode).

4. **RS-primary.** Offensive paramilitaries are historically RS-dominant. HRHB had some (HOS in Herzegovina) but at much lower scale. RBiH had essentially none (Patriotska Liga integrated into ARBiH early). Faction rates: RS=0.50, HRHB=0.15, RBiH=0.0.

5. **Larger units.** Historical paramilitary groups were 500-1,500. Use `OFFENSIVE_PARA_UNIT_SIZE = 600` (vs 150 for rear pocket).

6. **Can fight through light defense.** Unlike rear pocket mode (retreats if defended), offensive mode can capture OSIDs defended by brigades with personnel ≤ 500 (light TO units, police). Against stronger defense, the paramilitary retreats with heavy casualties. This models the reality: paramilitaries overwhelmed lightly-defended villages but were stopped by organized resistance (Goražde, Srebrenica pocket).

7. **Paramilitaries ARE war crimes.** Every offensive paramilitary capture generates:
   - `war_crimes_events += 1` on the faction's negotiation capital → degrades `international_standing` dimension (-10 per event via `computeDimensionBaseValues`)
   - `civilian_casualties.killed` increment → feeds IVP composite score → increases `patron_pressure` override authority
   - Displacement events with `caused_by` faction → feeds displacement tracking, Chronicle entries
   - Cumulative effect: 10-15 paramilitary captures = 10-15 war crimes events = international_standing drops from 50 to ~0 = patron pressure override reaches maximum = Dayton negotiating capital tanks
   - The `drina_cleansing_occurred` flag fires when `war_crimes_above` threshold is crossed (existing condition type)
   - **This is the price of territory.** RS gains the Drina valley but hemorrhages international standing. By w40, RS has the land but is internationally toxic. By Dayton, the war crimes record destroys their negotiating position. This is historically accurate — RS "won" the Drina but lost at Dayton partly because of what they did to win it.
   - Use `OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE = 0.05` (vs 0.02 for rear pocket).

8. **Municipality scope restriction for BOT factions only.** Only Drina-region municipalities for bot RS: zvornik, bratunac, vlasenica, srebrenica, rogatica, višegrad, foča, čajnice, rudo, goražde. Bot HRHB: stolac, čapljina, prozor. This prevents bot behavior from being ahistorical. Player factions are NOT scope-restricted (see Player Agency section).

9. **One change per calibration run.** The offensive sweep is ONE change. Run 40w, compare, sign off. Do not bundle with any other change.

---

## Player Agency

**Core principle: the systems create the possibility space, the player explores it. All choices have consequences.**

### When the player IS the faction with paramilitaries (e.g., RS):

The existing `paramilitary_policy` field on GameState gives the player three options:
- `'always_allow'` — paramilitaries sweep freely. Territory gained, war crimes accumulated. International standing collapses. Patron pressure builds. Dayton position weakens. Historical path.
- `'always_deny'` — no paramilitaries. Territory stays contested. Drina valley remains a garrison drain. TO resistance forms. But international standing holds. Patron stays supportive. v0.9.0 consequence chain fires: "no cleansing → garrison drain + TO formation."
- `'ask'` (default) — each sweep request comes to the player as a decision. "Arkan's Tigers request permission to operate in Zvornik municipality. Allow? This will constitute a war crime." Per-OSID granularity. The player can approve Zvornik but deny Srebrenica. **Selective cleansing** — historically, this is exactly what some RS leaders advocated.

**No municipality scope restriction for the player.** If the player wants to deploy paramilitaries outside the Drina region, they can. The consequences follow: war crimes in Central Bosnia means HVO alliance collapses faster, Croat-Bosniak war starts earlier. War crimes in Sarajevo means NATO intervention clock accelerates. The system doesn't prevent — it responds.

### When the player IS the opposing faction (e.g., RBiH):

The player sees paramilitary activity as events and map changes. They can:
- **Defend against it** — station brigades in threatened municipalities. Paramilitaries retreat from defended OSIDs (personnel > 500). An RBiH player who reinforces Zvornik early can prevent the cleansing.
- **Connect enclaves** — an RBiH player can launch operations to connect Srebrenica to Tuzla, Goražde to Sarajevo. The operation system supports this. The paramilitary sweep makes it HARDER (territory lost while you're organizing) but not impossible.
- **Trade territory for time** — let the paramilitaries take the Drina valley, consolidate forces in central Bosnia, and counter-attack later. The displacement refugees become a mobilization source.

### When the player IS HRHB:

The Graz Accords mean HRHB mostly watches the Drina sweep happen. But HOS paramilitaries in Herzegovina are the HRHB equivalent. Player can approve/deny HOS operations. HOS war crimes in Stolac/Čapljina degrade HRHB international standing and strain the RBiH alliance earlier.

### Consequence Chain Summary

```
Player allows paramilitaries
  → Territory captured (short-term gain)
  → war_crimes_events += N
  → international_standing drops (-10 per event)
  → patron_pressure increases (WAR_CRIMES_OVERRIDE_PER_EVENT)
  → IVP composite rises (civilian casualties)
  → drina_cleansing_occurred flag sets (if threshold crossed)
  → Downstream: camps_revealed event fires earlier
  → Downstream: London Conference chain accelerates
  → Downstream: Dayton negotiating capital tanks
  → Downstream: v0.9.0 consequence events fire (NATO intervention clock)

Player denies paramilitaries
  → Territory contested (short-term cost)
  → Garrison drain (brigades pinned in hostile-majority OSIDs)
  → TO resistance forms (v0.9.0 consequence: csq_drina_guerrilla_resistance)
  → International standing preserved
  → Patron stays supportive
  → Drina corridor remains vulnerable
  → BUT: no Srebrenica massacre chain → no Deliberate Force trigger
```

**The game doesn't judge. The game shows consequences.**

---

## Implementation

### Phase 1: Constants + Target Selection (1 task)

- [ ] **Task 1.1:** Add offensive paramilitary constants to `src/state/formation_constants.ts`
  ```typescript
  export const OFFENSIVE_PARA_UNIT_SIZE = 600;
  export const OFFENSIVE_PARA_FADE_WEEK = 12;
  export const OFFENSIVE_PARA_MARCH_TURNS = 1;
  export const OFFENSIVE_PARA_SPAWN_RATE: Record<string, number> = {
    RS: 0.50, HRHB: 0.15, RBiH: 0.0
  };
  export const OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE = 0.05;
  export const OFFENSIVE_PARA_LIGHT_DEFENSE_THRESHOLD = 500;
  export const OFFENSIVE_PARA_MUNICIPALITY_SCOPE: Record<string, string[]> = {
    RS: ['zvornik','bratunac','vlasenica','srebrenica','rogatica','visegrad','foca','cajnice','rudo','gorazde'],
    HRHB: ['stolac','capljina','prozor'],  // limited HOS scope
  };
  ```
  Acceptance: tsc clean, constants importable.

### Phase 2: Offensive Sweep Logic (2 tasks)

- [ ] **Task 2.1:** Add `detectOffensiveParamilitaryTargets()` to `paramilitary_sweep.ts`
  - Target selection: hostile-controlled OSID with ≥1 friendly adjacent neighbor
  - Municipality scope filter per `OFFENSIVE_PARA_MUNICIPALITY_SCOPE`
  - Ethnic majority filter: target OSID's pre-war ethnic majority ≠ attacking faction (Bosniak-majority for RS attacks)
  - Turn gate: `turn <= OFFENSIVE_PARA_FADE_WEEK`
  - Dedup against existing paramilitaries (same as rear pocket mode)
  - Spawn rate uses `OFFENSIVE_PARA_SPAWN_RATE` and same deterministic hash
  - Spawned units get `kind: 'paramilitary'`, `paramilitary_mode: 'offensive'`
  Acceptance: tsc clean, new function exported.

- [ ] **Task 2.2:** Extend `advanceParamilitaries()` to handle offensive mode
  - On ETA=0: check if target is defended by brigade with personnel > `OFFENSIVE_PARA_LIGHT_DEFENSE_THRESHOLD`
  - If lightly defended (≤ threshold): capture OSID, inflict casualties on defender, suffer own casualties, trigger displacement
  - If strongly defended (> threshold): heavy casualties, dissolve without capture
  - **WAR CRIMES WIRING (critical):** On every successful capture, increment `state.military.negotiation.capital[faction].war_crimes_events += 1`. The existing `advanceParamilitaries` records `civilian_casualties` but does NOT touch `war_crimes_events`. This must be added for BOTH rear pocket and offensive modes. This is the mechanism that makes paramilitaries cost international standing.
  - If undefended: capture (same as rear pocket mode)
  - Use `OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE` for displacement/war crimes calculation
  Acceptance: tsc clean, both modes work.

### Phase 3: Pipeline Integration (1 task)

- [ ] **Task 3.1:** Add `detect-offensive-paramilitary-targets` step to `war_phases.ts`
  - Insert after existing `detect-paramilitary-targets` step
  - Call `detectOffensiveParamilitaryTargets()` with same arguments
  - Merge reports
  Acceptance: tsc clean, step appears in pipeline, no regression in existing paramilitary behavior.

### Phase 4: Tests (2 tasks)

- [ ] **Task 4.1:** Unit tests for offensive paramilitary target selection
  - Test: selects hostile OSID with friendly neighbor in scope municipality
  - Test: ignores hostile OSID with NO friendly neighbor
  - Test: ignores OSID outside municipality scope
  - Test: ignores OSID after OFFENSIVE_PARA_FADE_WEEK
  - Test: respects spawn rate (deterministic hash)
  - Test: does not duplicate with rear pocket targets
  Acceptance: 6+ tests pass.

- [ ] **Task 4.2:** Unit tests for offensive capture resolution
  - Test: captures undefended OSID, triggers displacement
  - Test: captures lightly defended OSID (defender ≤ 500 pers), inflicts casualties
  - Test: retreats from strongly defended OSID (defender > 500 pers), suffers heavy casualties
  - Test: civilian casualties recorded at offensive rate (0.05)
  Acceptance: 4+ tests pass.

### Phase 5: Calibration (2 tasks)

- [ ] **Task 5.1:** Run 40w calibration scenario
  - `npm run sim:scenario:run:40w`
  - `node tools/compare_painted_vs_sim.cjs <run_dir>`
  - Record: area-weighted %, Drina region %, RS/RBiH/HRHB counts
  - Compare against baseline (92.0%, Drina ~61%)
  - Expected: +2-3pp overall, Drina +15-20pp
  Acceptance: area-weighted improves. Drina region improves. No other region regresses >1pp.

- [ ] **Task 5.2:** /war-or-game sign-off + baseline re-freeze
  - Invoke /war-or-game to review the calibration result
  - If approved: `node tools/freeze_baseline.cjs <run_dir>`
  - Update `tests/event_timing.test.ts` if event count changed
  - Run `npm run calibrate:40w` to verify new baseline passes
  Acceptance: /war-or-game APPROVED. `npm run calibrate:40w` ALL CHECKS PASSED.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Offensive paramilitaries capture too much (overshoot) | Medium | RS over-captures, other regions regress | Municipality scope restriction limits blast radius. Spawn rate tunable (start at 0.50, reduce if needed). |
| Light defense threshold too low (paramilitaries capture defended positions) | Low | Unrealistic captures | 500 pers threshold means only TOs/police are overwhelmed. Real brigades (1500+) are untouchable. |
| Offensive sweep interacts with JNA phantom captures | Low | Double-capture of same OSID | Dedup check: skip OSID if already faction-controlled. |
| Drina enclave formation disrupted (Srebrenica, Goražde) | Medium | Enclaves don't crystallize correctly | Municipality scope includes Srebrenica/Goražde but enclave resilience + garrison power should still hold core OSIDs. Monitor enclave integrity. |

---

## Interlocks

| System | Interlock |
|--------|-----------|
| **Calibration baseline** | MUST re-freeze after this change. Old baseline (92.0%, hash 442b...) becomes invalid. |
| **v0.7.0 flag wiring** | The `drina_cleansing_occurred` flag should fire MORE reliably with offensive paramilitaries in place. v0.7.0 benefits from this landing first. |
| **v0.9.0 consequence system** | Chain 1 ("No Drina Cleansing") depends on the cleansing being the DEFAULT path. Offensive paramilitaries make the default more historically accurate, which makes the ahistorical branch more meaningful. |
| **Event timing tests** | May shift event timing if paramilitaries trigger displacement events earlier. Check `tests/event_timing.test.ts` after calibration. |
| **Nightshift execution** | This is a STANDALONE task. Can run in parallel with v0.7.3 (canon audit) since they don't share files. Cannot run in parallel with v0.7.0 (both touch sim behavior). |

---

## Done Gate

- [ ] tsc clean
- [ ] vitest: all tests pass (existing + 10 new)
- [ ] 40w calibration: area-weighted > 93.5% (from 92.0%)
- [ ] Drina region: > 75% (from ~61%)
- [ ] No other region regresses > 1pp
- [ ] /war-or-game APPROVED
- [ ] Baseline re-frozen
- [ ] `npm run calibrate:40w` ALL CHECKS PASSED
- [ ] Smoke-test triad: tsc + vitest + desktop:map:build
