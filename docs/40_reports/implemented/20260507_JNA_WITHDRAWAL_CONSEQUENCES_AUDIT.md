# JNA WITHDRAWAL CONSEQUENCES AUDIT

**Lane**: LANE-NIGHTSHIFT-JNA-WITHDRAWAL-CONSEQUENCES-AUDIT
**Date**: 2026-05-07
**Ring**: Ring 1 (event-data tweak; mechanism unchanged — generic event-consequence handler)
**Sensitive history**: §6 NOT touched. `political_controllers` / paint anchors / OOB itself / operation triggers all untouched.

---

## Origin

Mladić Turn 8 commentary (D3.3 triage): *"JNA withdrawal (1992) event logged, but no visible impact on VRS supply, personnel, or doctrine. Historically, JNA withdrawal created acute officer shortage and supply disruption."* Multi-commander corroboration. Triangulates with prior known-gap on JNA dissolution.

---

## Phase 0 — Investigation

### Where the event lives

`data/scenarios/events/war_1992.json` lines 755-831:

```json
{
  "id": "jna_withdrawal_1992",
  "trigger": { "turn_min": 5, "turn_max": 5, "phase": "war" },
  "once": true,
  "effect": { "kind": "supply_delta", "faction": "RS", "delta": 20 },
  "effects": [
    { "kind": "morale_change", "faction": "RBiH", "delta": -5 },
    { "kind": "narrative", "text": "..." }
  ],
  "dimension_shifts": [
    { "faction": "RS", "dimension": "military_credibility", "delta": 15 }
  ],
  "sets_flags": { "jna_withdrawn": true }
}
```

### Engine consequence handler

`src/sim/events/apply_effects.ts` is the single, generic dispatcher for the `effect.kind` field. Supported kinds include `supply_delta`, `morale_change`, `recruitment_modifier`, `equipment_quality_modifier`, plus 12 others. **No new handler code is required** to add additional consequences to `jna_withdrawal_1992` — the data file is the only required change.

### What the event currently does (BEFORE)

1. RS **+20 supply** (reflects depot transfer).
2. RBiH **-5 morale** (reflects shock).
3. RS military_credibility **+15** (dimension shift).
4. Sets `jna_withdrawn=true` flag (used by drina/srebrenica/corridor cascade).

### What's missing per Mladić's triage

1. **VRS officer shortage** — historically, the JNA withdrawal of May 19, 1992 returned all non-Bosnian-Serb officers to Serbia (Ratko Mladić initially commanded the *2nd Military District*, which was supposed to *withdraw* with the JNA but had its personnel "Bosnian-ised" via insignia change). Mid-grade Bosnian Serb officers stayed; junior officers and many specialists (signals, logistics, air-defence) departed. *Net: pool depth and equipment-quality both took a hit, even with the depot transfer.*
2. **ARBiH supply boost from depot captures** — Tuzla 92nd Motorised Brigade depot, Visoko depot, partial Sarajevo (Marshal Tito barracks complex captured in mid-May 1992) — significant small-arms / mortar / ammunition transfer to ARBiH. The currently-fired barracks-seizure events DO grant equipment via `equipment_grant`, but the **systemic** supply push from the JNA-withdrawal moment itself does not flow to ARBiH.
3. **HRHB benefit** — JNA depot transfers via Croatia (the western/Herzegovina barracks chain) flowed equipment and supplies south.

### Sources

- ICTY *Karadžić* IT-95-5/18-T (JNA → VRS continuity finding).
- ICTY *Galić* IT-98-29-T (Mladić assumed VRS command May 12, 1992; formal JNA withdrawal May 19, 1992).
- *Balkan Battlegrounds* Vol. I Ch. 4-5 (JNA dissolution, depot transfers, officer-pool implications).
- Hoare, *How Bosnia Armed* (2004) — ARBiH mid-1992 equipment via barracks captures.
- Burg & Shoup, *The War in Bosnia-Herzegovina* (2000) — JNA → VRS and Croatian-supply chain.

---

## Mini-panel verdict

**(B) GENUINE-CONSEQUENCE-EXISTS-BUT-WEAK.** The event has a real effects block (RS +20 supply, RBiH -5 morale, RS +15 credibility, jna_withdrawn flag), so it is *not* (A). But it is materially under-weighted vs. history: only RS gets a supply bump, *no* faction takes the recruitment hit (officer shortage), *no* equipment-quality signal anywhere. ARBiH/HRHB depot-capture supply gain is unrepresented at the systemic level (it lives only inside per-barracks events). Expand within the existing schema using `recruitment_modifier`, `equipment_quality_modifier`, and additional `supply_delta` entries. No new handler code, no §6 surface, no engine change.

---

## Phase 1 — Fix

### Changes to `data/scenarios/events/war_1992.json` (jna_withdrawal_1992 only)

Append four entries to the `effects` array, all using existing kinds already wired in `apply_effects.ts`. All deltas are bounded, faction-symmetric in *form*, faction-asymmetric in *direction* (per OOB inheritance).

| kind | faction | params | rationale |
|---|---|---|---|
| `recruitment_modifier` | RS | `pool_multiplier=0.92, duration_turns=20` | Officer shortage: junior officers + specialists departed with JNA. -8% pool for ~5 months. (Hoare; ICTY Karadžić.) |
| `equipment_quality_modifier` | RS | `multiplier=0.96, duration_turns=15` | Mixed-quality depot inheritance: heavy weapons gained, but maintenance/spares-chain disrupted. -4% effective quality for ~4 months. (BB Vol I Ch. 4-5.) |
| `supply_delta` | RBiH | `delta=8` | Tuzla 92nd Motorised + Visoko + partial Sarajevo barracks transfers (systemic ARBiH gain, on top of per-barracks events). (Hoare; Burg & Shoup.) |
| `supply_delta` | HRHB | `delta=5` | Western/Herzegovina barracks transfers via Croatia chain. (Burg & Shoup; ICTY Prlić IT-04-74-T.) |

### Magnitudes — calibration discipline

Deltas are *small*, on purpose. The event already drops a +20 supply boost to RS and a -5 morale hit to RBiH; the new entries fill in the missing dimensions without overpowering the existing balance. All durations sit within or below the duration ranges already used in `consequences.json` for similar event-shape patterns (15-30 turns).

### Hash drift

40w hash WILL drift. `jna_withdrawal_1992` fires at w5, well within the 40w window. New `recruitment_modifier`, `equipment_quality_modifier`, and `supply_delta` entries materially affect mobilization-rate calls, the equipment-quality multiplier (combat-math gate `if (eqMult !== 1.0)`), and per-faction `general_supply_reserve`. Expected, accepted.

---

## Phase 2 — Tests

`tests/jna_withdrawal_consequences.test.ts` (≥4):

- **T1**: jna_withdrawal_1992 event has non-empty `effects` block in JSON.
- **T2**: each new effect entry uses a `kind` whose handler is registered in `apply_effects.ts` (schema match).
- **T3**: per-faction inheritance pattern — RS gets the personnel/equipment hit (its OOB inherited the JNA), RBiH+HRHB get the supply boost (their depot captures); engine treatment is identical (same handler), data direction is asymmetric.
- **T4**: deterministic — re-loading the JSON twice yields identical structures (no Date.now / random in load path).

---

## Verification commands (parent runs)

- `npx vitest run tests/jna_withdrawal_consequences.test.ts tests/event_effects.test.ts tests/event_timeline_integrity.test.ts`
- `npx tsc --noEmit`
- 40w smoke: `npm run sim:scenario:run:40w` — hash WILL drift (expected). RS pool drop should be visible w0-w8.
- 188w A/B: `npm run sim:scenario:run:default` (frozen baseline @ pre-commit) vs. post-commit. Binding thresholds: RS pool delta visible w5-w25; ARBiH `general_supply_reserve` step at w5.

---

## Compliance

- Ring 1 / event-data tweak; mechanism (generic event-consequence handler) unchanged.
- §6 surface: jna_withdrawal precedes the §6 atrocity arc; affects barracks pacing + early-war RS readiness, but does not write `political_controllers`, paint OSIDs, or alter any operation trigger / floor.
- Faction-symmetric mechanism (one handler dispatch per kind); faction-asymmetric *data* via per-faction OOB inheritance.
- A1-A5 / B1+B2 / C1+C2 / D1+D2 frozen surfaces untouched.
- DO NOT touch: engine event-consequence handlers (none touched), `political_controllers` (untouched), paint anchors (untouched), OOB itself (untouched), operation triggers (untouched), `event_loader.ts` (untouched).

---

## Checkpoints

- 2026-05-07 T+0: Phase 0 investigation complete. Event located at war_1992.json:755. Engine handler at apply_effects.ts dispatches by kind (no new handler code needed). Verdict: (B) GENUINE-CONSEQUENCE-EXISTS-BUT-WEAK.
- 2026-05-07 T+0: Working note created. Proceeding to Phase 1 fix in war_1992.json + Phase 2 test file.
- 2026-05-07 T+1: Phase 1 complete. war_1992.json edited — appended 4 new effect entries (RS recruitment_modifier, RS equipment_quality_modifier, RBiH +8 supply_delta, HRHB +5 supply_delta) inside the existing `effects` array of jna_withdrawal_1992. No other event touched. Proceeding to Phase 2 test authoring.
- 2026-05-07 T+2: Phase 2 complete. tests/jna_withdrawal_consequences.test.ts authored with 4 tests (T1: non-empty consequences; T2: schema-handler match; T3: per-faction inheritance; T4: deterministic re-load). All 4 tests PASS (`npx vitest run tests/jna_withdrawal_consequences.test.ts` → 4 passed in 527ms). `npx tsc --noEmit` clean. Proceeding to broader event-test sweep + commit.
- 2026-05-07 T+3: Regression sweep clean. event_effects.test.ts (9), event_timeline_integrity.test.ts (17), early_war_jna_transition.test.ts (6), event_conditions.test.ts (13) — 45/45 PASS. No regression to event substrate. Proceeding to commit.
- 2026-05-07 T+4: Commit attribution split. War_1992.json hunk landed in `ec837dca` (parallel-agent JAJCE_CASCADE_MORALE_AUDIT lane swept it up via concurrent staging — parallel-staging hazard, see life-lessons commit-discipline). Test + report landed cleanly in `ecae99da` (this lane). Both commits are on `main`. Engineering content intact. Net: data fix + tests + report all present, attribution non-ideal but acceptable.

## Commits

- **`ec837dca`** — `data/scenarios/events/war_1992.json` JNA hunk (swept into parallel JAJCE lane).
- **`ecae99da`** — `tests/jna_withdrawal_consequences.test.ts` + `docs/40_reports/implemented/20260507_JNA_WITHDRAWAL_CONSEQUENCES_AUDIT.md` (this lane).
