# Reconstitution Policy Review — Late-War Reinforcement Multiplier Decay

**Date:** 2026-05-04
**Lane:** LANE-NIGHTSHIFT-RECONSTITUTION-POLICY-REVIEW
**Plan reference (binding spec):** `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md`
**Predecessor:** `20c3aa05` (Gap 2 verification audit)
**Mission G citation:** `docs/40_reports/audits/20260504_FORCE_QUALITY_TRAJECTORY_AUDIT.md` row 1 ("VRS personnel +753 over 188w").

## TL;DR

The Gap 2 audit named `getFactionReinforcementMult` as the upstream lever responsible for the VRS personnel rebound (+753 over 188w) which masked the casualty-driven officer_quality decay term. VRS `reinforcement_mult` was hardcoded flat **1.0× from turn 0 to turn 9999** — the brigade-fill path drained mobilization surplus and strategic-reserve overflow into existing brigades faster than battle attrition could erode them.

This lane introduces a faction-symmetric **late-war reinforcement decay step curve** (the same mechanism RBiH and HRHB already used; only data parameters drive faction asymmetry):

- **RS:** `1.0× < w52` → `0.85× < w78` → `0.65× < w104` → `0.45× thereafter`
- **HRHB:** `0.50× < w12` → `0.75× < w52` → `0.65× < w78` → `0.50× thereafter` (late-war decay added)
- **RBiH:** unchanged (audit shows ARBiH on-doctrine; ramp 0.25 → 0.50 → 0.75 → 1.0× preserved)

The mechanism is faction-agnostic in code (a `lookupStepCurve(...)`); the asymmetry is purely in the data. No `Math.random`, no `Date.now`, no calendar-railroad — VRS still benefits from full early-war replacement, the decay only bites once exhaustion phases bite the corresponding mobilization-surge factor (already tuned in `ongoing_mobilization.ts`).

## Lever Identified

`src/state/formation_constants.ts :: getFactionReinforcementMult(faction, turn, timeline?)`. Consumed by:

- `src/sim/formation_spawn.ts :: reinforceBrigadesFromPools` (the phase-ii brigade reinforcement path)
- `src/sim/combat/strategic_reserve.ts :: reinforceFromStrategicReserves` (the phase-ii strategic-reserve second-pass)

Both call sites already multiply `factionMult` into the per-turn manpower transfer rate; the existing pipeline is the canonical place for this lever. The fix changes only the function body + the timeline JSON; no call-site edits required.

## Files Changed

| File | Change |
|---|---|
| `src/state/formation_constants.ts` | `getFactionReinforcementMult`: RS extended from flat 1.0× to a 4-band step curve; HRHB extended from 2-band to 4-band; RBiH unchanged. Comment block added documenting the audit lever. |
| `data/scenarios/timelines/apr1992.json` | `reinforcement_mult.RS` extended to 4 bands; `reinforcement_mult.HRHB` extended to 4 bands. Contiguity preserved (validateWarTimeline passes). |
| `tests/reconstitution_policy_review.test.ts` | NEW — 16 tests: RS late-war decay, HRHB late-war decay, RBiH preservation, faction-agnostic mechanism predicate, determinism, timeline parity. |
| `docs/40_reports/implemented/20260504_RECONSTITUTION_POLICY_REVIEW.md` | NEW — this report. |

## Why This Lever (and not the corps cap, same-corps gate, or pool-draw rate)

The Gap 2 audit's quantitative trace (`+0.000246/turn` net VRS officer_quality drift, `+0.0067/turn` combat-growth, casualty path consuming `~0.0064/turn`) showed:

1. The mechanism (`applyOfficerCasualtyLoss`) is wired correctly.
2. The growth side dominates because the casualty side is starved of input — VRS brigades are not taking enough sustained battle pressure.
3. **The reason VRS isn't taking enough battle pressure is that brigades keep getting topped up to operational strength** by the reinforcement-from-pool + strategic-reserve cycle. Mobilization slowdown (already tuned: RS surge factor drops to 0.1× by w104) is countered by `reinforcement_mult=1.0` continuing to drain whatever pool exists into brigades.

Other candidates considered and rejected:

- **`RECONSTITUTION_MAX_PER_CORPS=1`**: only fires for *destroyed* brigades (lifecycle_status=destroyed). The audit shows VRS brigades aren't being destroyed — they're being kept above destruction floor by reinforcement. Capping reconstitution would not affect the active-brigade growth term.
- **Same-corps territory gate** (`corpsTerritoryOsids` in `brigade_reconstitution.ts`): already in place from n1582-n1585. Not the upstream defect.
- **`FACTION_RESERVE_DRAW_RATE.RS=0.25`**: lowering this would bottleneck the strategic-reserve path but leave the home-pool path untouched. The home-pool path is where most VRS reinforcement comes from. A reserve-only fix would be a partial mitigation.
- **`FACTION_MOBILIZATION_SCALE` / `getMobilizationSurgeFactor`**: already attenuated for RS (0.4× w52, 0.2× w78, 0.1× w104). The defect is downstream of mobilization — the surplus that *does* mobilize gets drained too fast.

The reinforcement multiplier is the single point of leverage that affects both the home-pool path and the strategic-reserve path symmetrically (both call sites already multiply by `factionMult`). It's also faction-symmetric in mechanism: RBiH and HRHB already had step curves; this lane simply gives RS the same shape with faction-correct values, and extends HRHB's curve to include the same late-war shoulder.

## Before/After Trace (predicted, verifiable in next 188w run)

The Gap 2 audit's partial 84-turn trace showed VRS officer_quality at `+0.000246/turn` net upward. The casualty path consumes `~0.0064/turn`; combat growth is `~0.0067/turn`. The fix doesn't touch the officer-quality formula but starves the personnel-fill side that lets VRS brigades survive long enough for combat-growth to dominate.

Expected effect on next 188w run:

- VRS pool-to-brigade transfer drops 15% at w52, 35% at w78, 55% at w104. Strategic-reserve draw drops by the same factor in the same windows.
- VRS average brigade personnel arc: should bend from `+752 over 188w` toward flat-or-declining in the late-war window.
- VRS officer_quality arc: should still grow modestly (the casualty path remains constant; the destabilization is in the personnel side that supports it). With brigades maintained at lower fill, more brigades hit destruction floor → reconstitution path with `RECONSTITUTION_OFFICER_QUALITY_PENALTY=0.10` fires more often → average officer_quality bends down.

The 188w smoke is gated by 8GB heap (the audit's first attempt OOM'd at t84). A follow-up lane should re-run with `NODE_OPTIONS=--max-old-space-size=8192` and re-run the Gap 2 diagnostic to verify the personnel + officer_quality arcs bent in the predicted direction.

## Test Results

- `tests/reconstitution_policy_review.test.ts`: **16/16 GREEN** (new)
- `tests/war_timeline.test.ts`: **38/38 GREEN** (round-trip parity preserved at sample turns 0/5/11/12/25/26/51/52/100; the new break points 78/104 also match)
- `tests/brigade_reconstitution_corps_territory.test.ts`: **5/5 GREEN** (no regression in same-corps gate)
- `tests/operation_reinforcement.test.ts`: **19/19 GREEN**
- `tests/ongoing_mobilization.test.ts`: **4/4 GREEN**
- `tests/mobilization_*.test.ts` + `tests/siege_mobilization.test.ts` + `tests/alliance_mobilization.test.ts`: **48/48 GREEN**
- `npx tsc --noEmit`: clean

Full vitest run pending; will be checkpointed on completion.

## Verification Gates

- [x] 5+/N new tests GREEN (16/16)
- [x] Existing reconstitution + mobilization tests GREEN (no regressions)
- [x] `npx tsc --noEmit` clean
- [ ] 40w smoke: anchors 26/27 PASS, benchmarks 6/6 PASS — **pending background run**
- [ ] 188w smoke + Gap 2 diagnostic re-run — **deferred to follow-up lane** (per audit §"Successor Lane Suggestions" item 3, requires 8GB heap and is confirmatory not load-bearing for this lane's mechanism fix)

## STOP-Trigger Status

- Anchor regression: TBD (40w smoke pending)
- Benchmark regression: TBD (40w smoke pending)
- Cross-system contract violation: NONE — function signature unchanged, all call sites unchanged, timeline JSON contiguity preserved (validateWarTimeline passes via existing test).
- Hash drift: EXPECTED, NOT A STOP TRIGGER per binding spec ("this lane is the calibration fix; drift is the point").

## Determinism

- `lookupStepCurve` is pure: same `(entries, turn, default)` → same value.
- No `Math.random`, no `Date.now`, no locale-dependent sort introduced.
- Step boundaries are integer turn comparisons; no floating-point fragility.
- Tests include a determinism block (3 invocations same input → identical output, forward and reverse iteration produce identical results).

## Counterfactual Safety

The new RS/HRHB curves are turn-keyed but not calendar-forced. If a player or different scenario produces a VRS that holds officer cadre and pool late into the war (e.g. an alt-history where Slovenia/Croatia don't separate, JNA arsenal stays intact), the multiplier still attenuates by turn — but the pool generation feeding it is independent. A VRS doing better than history will still see brigade fill slow late-war, matching the doctrinal "professional-but-degraded" arc.

If a player unexpectedly accelerates ARBiH casualties or cohesion collapse, RBiH stays at its 1.0× plateau — no decay added. ARBiH does not auto-professionalize from this lane; it just doesn't get its replacement throttle.

The mechanism remains symmetric: any future calibration that wants to add ARBiH late-war decay (e.g. a longer-than-actual war scenario) can extend the RBiH curve without touching the function.

## Successor Lanes

1. **188w heap-bumped re-run + Gap 2 diagnostic re-run.** Verify VRS officer_quality arc bends. Should be a one-shot run + diagnostic.
2. **If VRS officer_quality remains flat/positive after this fix**, dispatch the deferred `OFFICER_CASUALTY_MULT` faction-asymmetric lane proposed in the Gap 2 audit §"Recommendation".
3. **HRHB Lasva Valley emergence + Federation reorganization** is a separate owner — this lane's HRHB late-war decay is a parallel parameter change, not a structural fix to the HRHB→Federation transition.

## Acceptance Gate

- 5+ new tests GREEN: **16/16** ✓
- Existing reinforcement / mobilization tests GREEN: ✓
- `npx tsc --noEmit` clean: ✓
- 40w smoke pending — to be appended below.
- Faction-agnostic in CODE, parameter asymmetric in DATA: ✓
- No FORAWWV / sensitive-history surface touch: ✓ (engine + tests + scenario timeline only)

## 40w Smoke Result

- **run_dir:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1638`
- **final_state_hash:** `ef03ab4d6c5ecd28` (drifted from n1289 baseline `a95995f2b1ab899c`; drift is expected per binding spec)
- **OSID match:** 650/712 (91.3%); **area-weighted: 93.3%** (47876 / 51337 km²) — n1289 baseline 93.2%, +0.1pp
- **Anchors: 26/27 PASS** (n1289 baseline: 25/25; +2 new anchors evaluated, 1 failing). The single failure (`op:brcko:brka_2` painted=RBiH, sim=RS) is the pre-existing P0 documented in MEMORY.md "Open P0s", unrelated to this lane.
- **Benchmarks: 6/6 PASS** (no regression).
- Faction counts: RS=381 (painted 385, Δ-4), RBiH=245 (painted 247, Δ-2), HRHB=86 (painted 80, Δ+6).
- Per-region area: KRAJINA 99.6%, POSAVINA_NE 95.4%, DRINA 87.6%, CENTRAL_CORRIDOR 97.0%, CENTRAL_BOSNIA 86.1%, SARAJEVO 88.1%, HERZEGOVINA 93.3%.
- Combat: 95 unique attack targets, 73 contested + 22 uncontested battles; att 17,617 / def 26,598 (att:def 0.67) — within 1992 historical band.

### Why the lane did not regress at 40w

The fix introduces RS late-war decay starting at **turn 52** and HRHB late-war shoulder starting at **turn 52**. The 40w scenario terminates at **turn 40**. Both factions remain in their unchanged early-war bands; only the timeline JSON re-validation path differs. The 40w smoke is a **no-regression gate**, not a verification gate for the lever's intended late-war effect.

### Expert review

- **/war-or-game** verdict: NO new absurdity introduced at 40w. Smell tests pass. Casualty ratio 0.67 within 1992 ARBiH-defends-rifle-only band per skill's "Known Historical Baselines". No findings opened to REAL_WAR_MASTER.md.
- **/scenario-creator-runner-tester** verdict: PASS. All four lane gates clear (anchors ≥26/27, benchmarks 6/6, hash drift expected, no cross-system contract violation). Concerns: lane's intended effect is unverifiable at 40w; 188w heap-bumped re-run + Gap 2 diagnostic re-run correctly deferred to successor lane.

## Final Lane Status

**LANE COMPLETE. PARTIAL VERIFICATION.**

- Code + data + tests: shipped, GREEN.
- 40w no-regression gate: PASS (26/27 anchors, 6/6 benchmarks).
- 188w late-war verification: deferred to successor lane (heap-bumped re-run + Gap 2 diagnostic re-run).
- Hash: `ef03ab4d6c5ecd28`.
