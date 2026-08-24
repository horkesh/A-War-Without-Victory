# FINDING — Operation-launch and brigade-order prediction are terrain-blind

**Status:** **PANEL RULED 2026-08-24 — five seats, UNANIMOUS REFINED, no NO-GO and no clean GO.**
Not a unanimous GO, therefore **escalates to the owner.** Nothing implemented.

> ## PANEL RESULT
>
> | seat | verdict | binding condition |
> |---|---|---|
> | Operations | REFINED | site list wrong; causal story backwards in sign |
> | Engine / Systems | REFINED GO | fail-loud terrain loader must land FIRST, separately |
> | Calibration | REFINED | **GO to build, NO-GO to run** until floor reconciled + hypothesis struck |
> | War-or-Game | REFINED GO | plumbing yes; **model over-scaled ~10%** — separate lane |
> | Red Team | REFINED | **do not implement as written — six sites or a written argument** |
>
> ### ★ THE SITE COUNT CONVERGED UPWARD AT EVERY SEAT: 2 → 3 → 4 → 6
>
> This document proposed two. Each seat found more. **Final list, all verified:**
>
> | # | site | gates | found by |
> |---|---|---|---|
> | 1 | `war_phases.ts:1858` | opening-attack launch prediction | finding |
> | 2 | `bot_brigade_ai_osid.ts:709` | all bot brigade attack orders + target choice | finding |
> | 3 | `sector_offensive_launch_helpers.ts:912` | catastrophic-stall predicate — hardcodes `{}` **and** `EMPTY_REVERSE_MAP` | Operations, Red Team |
> | 4 | `sector_offensive_launch_helpers.ts:741-747` | fallback branch when `predictionContext` absent | Red Team |
> | 5 | `triggered_operations.ts:909` | triggered-op launch feasibility (Krivaja et al.) — terrain args omitted | Red Team |
> | 6 | `commander/emit.ts:1123` | probe-operation objective RANKING | Engine, Red Team |
>
> **Red Team's blocking point: the §4 parity argument applies with equal force to sites 3 and 4.
> Fix two of six and you build a NEW split-brain between the launch gate and the stall gate — same
> objective, same turn, same file.** Note site 3's sign OPPOSES sites 1/2 (see §3b).
>
> Plus a seventh, structural: **`buildSlopeByOsid` has exactly one call site — the resolver.** The
> prediction path has no slope analogue at all, so the planner cannot see mountain winter.
> **42.8% of OSIDs (305/712) sit above the mountain slope threshold.**
>
> ### ★ THE MODEL IS OVER-SCALED — VERIFIED, AND IT IS A SEPARATE LANE
>
> **`terrain_friction_index` is byte-identical to `slope_index` in 6,137 of 6,137 settlements
> (100.0%, zero differing).** So the composite has **three** real inputs, not four, and the ×1.4
> slope term and ×1.2 friction term **always co-fire** — steep ground is worth ×1.68. Slope is
> double-counted.
>
> | | median | p90 | max | >1.10 |
> |---|---|---|---|---|
> | as shipped | 1.291 | 1.608 | 1.966 | 68.0% |
> | duplicate removed | 1.172 | 1.353 | 1.638 | 62.9% |
>
> **+10.2% at the median purely from counting slope twice.** War-or-Game's ruling, adopted: **fix the
> plumbing FIRST at the scale as shipped; do NOT bundle the de-duplication** — it moves the opposite
> direction and bundling makes both unattributable. But record it now: if the plumbing run comes back
> badly negative, the double-count is the first thing to test, and de-duplicating *after* re-tuning
> means tuning twice.
>
> ### ★ THIS IS A FOUR-MONTH-OLD OPEN P1, NOT A NEW DISCOVERY
>
> `REAL_WAR_MASTER.md:297` (n1302, 2026-04-02): *"Predictor ignores defender artillery, terrain,
> entrenchment. **P1.**"* Artillery and entrenchment were closed by COMBAT-P14. **Terrain was never
> closed — and P14 was recorded as though parity now held.** A partial fix was written up as a whole
> one, and that is why this survived four months. Process signal, not just a code signal.
>
> ### Magnitude: the headline was wrong in BOTH directions
>
> - **Overstated for strong defenders.** Terrain enters `envProduct` under a soft cap. A well
>   dug-in defender on median ground gains **~11%**, not 29%. Combined predicted-power shift ~15-20%.
> - **Understated for weak ones, and understated overall.** `getToTerrainDefenseMult` steps 1.0 →
>   1.5 at median and 2.0 above 1.35 for **non-brigade** defenders — militia, small OGs, the bulk of
>   enclave and early-war defence. Combined delta ~**1.94×** at median, ~**2.96×** at p75.
>   And combat ground is terrain-*harder* than the map: objective OSIDs median **1.379**, 78.1% >1.10.
> - **⇒ §6 SURFACE.** The fix disproportionately strengthens exactly the defenders the enclave guard
>   is about. **Treat the enclave guard as a first-class tripwire.**
> - **Attacker armour is over-rated too** — the same empty cache feeds `tankTerrainFactor =
>   max(0.3, 2.0 − terrainMult)`, so the gate believes tanks work on Bjelašnica as on the Sava plain.
>   Tank-less ARBiH mountain brigades lose nothing from the fix — historically exact.
>
> ### Corrections to this document, all upheld
>
> 1. **§1's "simply not passed" is wrong for site 1.** `65f7228ca` wrote the populated and empty
>    caches **four lines apart in the same hunk**; the comment's full text reserves preparation's
>    cache as authoritative. Parity with the brigade-order path was chosen over accuracy, knowingly.
>    The blindness itself is undocumented and inherited from site 2, which was blind from birth
>    (`1c2bf2bab`) with no rationale anywhere.
> 2. **§3's causal hypothesis is refuted twice over** — see §3a. Calibration measured the actual
>    recovery reasons: of the 13 zero-attack ops, **5-6 recover with `defender_power_too_high`, which
>    comes from the preparation path that ALREADY USES REAL TERRAIN.** Those are not victims of
>    blindness at all. Only 3 are `zero_eligible_axis`.
> 3. **The desktop-divergence flag was wrong.** Engine, Operations and Red Team all traced it
>    independently: `advanceSectorOffensives` and `generateAllBotOrdersOsid` have only `war_phases.ts`
>    callers, shared by both engines — **desktop and headless cannot disagree about which attacks are
>    viable.** (War-or-Game read it the other way; the three traced-caller analyses carry it.) The
>    real divergence is **player vs bot**: the human is shown a terrain-aware assessment of an attack
>    the AI judged blind.
> 4. **No double-counting** — cleared on a full trace by both Engine and Red Team. The two caches feed
>    disjoint consumers (`estimateForceRatio` vs `predictCombatOutcome`). Terrain enters each once.
>    Note `evaluateCorpsOffensiveLaunch` — the only op-creation gate that accepts terrain — is
>    **dead in `src/`**, reachable only from tests; the live triggered-op gate omits terrain.
>
> ### Unrelated defects surfaced, each its own lane
>
> - **Permanent stall**: `resetAxisForExecution` is called only at the planning→execution transition,
>   so a **4-turn** catastrophic memory produces a **permanent** axis stall.
> - **Terrain loader**: module-level first-call-wins cache not keyed by path, cwd-relative default —
>   a packaged build could already be resolving combat terrain-blind. **Prerequisite, see §4a.**
> - **`estimateForceRatio` granularity**: applies ONE representative OSID's terrain (lowest sorted
>   objective string) to an entire multi-axis operation.
> - **Test coverage**: no test pins terrain into the production launch gate, and the existing
>   assertion labelled a terrain positive control is actually a *context* control.
>
> ### What the panel expects the run to do — pre-committed, so a red run reads as predicted
>
> Attacks launched **down**; `zero_eligible_axis` recoveries **up**; **more** zero-attack operations,
> not fewer; catastrophic stalls **up** at site 3 if it is included; RS losing more than RBiH early.
> **Matched most likely down by a single-digit amount. If matched goes UP materially, that must be
> explained before it is celebrated.**
>
> **Watch by theatre, not in aggregate.** Expect drops in Drina/Herzegovina/Sarajevo (mean composite
> 1.43-1.6). **A drop in Posavina/Krajina (0.97) means something else broke.** And guard the
> fall-1995 cascade: 55 OSIDs flip at t≥170 with 51/55 matched — the best-performing region of the
> run, on 1.408 mean ground. If it thins, the fix suppressed 1995 and must be reworked whatever the
> aggregate says.
>
> **The health gate cannot protect this**: `matched_osids_min` is **622** against a **639** floor —
> CI passes on a −17. A run that deletes the fall-1995 cascade can go green.

---

**Original status line:** MEASURED FINDING. Nothing implemented. Proposed as the next lane.
**Date:** 2026-08-24
**Origin:** Lane D of the 2026-08-23 four-lane diagnosis; owner accepted it as the next lane.

---

## 1. THE DEFECT, IN ONE CALL

`src/sim/turn_phases/war_phases.ts:1875`:

```ts
const prepEvents = advanceSectorOffensives(
    context.state,
    supplyByOsid,
    terrainMultByOsid,               // POPULATED  (built :1834 WITH terrainData)
    staticAdjacency,
    openingAttackPredictionContext,  // its terrainMultByOsid is EMPTY {} (built :1858 WITHOUT)
);
```

**Two terrain caches are passed into the same call — one real, one flat — and the launch-prediction
path reads the flat one.** `terrainData` is loaded at `:1828`, used at `:1834`, and still in scope
24 lines later when `:1858` omits it.

Same omission at `src/sim/combat/bot_brigade_ai_osid.ts:709`:

```ts
const terrainCache = buildTerrainCache(ctx.reverseMap);   // no terrainData
```

`buildTerrainMultByOsid` (`combat_math.ts:1840`) opens `if (!terrainData?.by_sid) return out;` —
an **empty object**. Consumers then read `terrainMultByOsid[osid] ?? 1.0`. So every defender is
evaluated at a flat 1.0.

**This is a bug, not a constraint.** The data is loaded, in scope, and simply not passed.

---

## 2. HOW MUCH IT MATTERS — MEASURED, NOT ASSUMED

Recomputed `terrainCompositeForSid` over `data/derived/terrain/settlements_terrain_scalars.json`
(6,137 settlements) aggregated to all **712 OSIDs** via `canonical_to_operational_map.json`:

| statistic | value |
|---|---|
| min | 0.900 |
| p10 | 0.954 |
| p25 | 1.048 |
| **median** | **1.292** |
| p75 | 1.482 |
| p90 | 1.608 |
| max | 1.966 |
| exactly 1.0 | **0.3%** |
| **> 1.10 (defender favoured)** | **68.0%** |
| < 0.95 (attacker favoured) | 9.6% |

**The typical defender gets a 29% terrain bonus that these two gates ignore entirely**, rising to
~97% on the worst ground. Only 0.3% of OSIDs are actually neutral, so the flat 1.0 is not a
harmless approximation anywhere — it is wrong on 99.7% of the map, and wrong in the
attacker's favour on 68% of it.

---

## 3. WHY THIS IS A PARITY BREAK, NOT JUST AN INACCURACY

The **resolver** uses the populated cache. `attack_resolution_osid.ts:756/824/849` all call
`rankDefendersByPower(..., terrainMultByOsid, ...)` with the real values.

So the engine:
1. **decides whether to launch** an operation against a defender at flat 1.0,
2. **decides which brigade attacks where** at flat 1.0,
3. then **resolves the battle** against the same defender at a median 1.292.

That is a systematic optimism bias in exactly the two places that choose to attack, corrected only
after the choice is made. The repo documents prediction↔resolution parity as HOLDING
(COMBAT-P14: *"Predictor consumes defender artillery+entrenchment via shared
`computeDefenderPowerBreakdown`; prediction↔resolution parity holds"*). **On terrain it does not.**

### ⚠ 3a. THE CAUSAL HYPOTHESIS WAS BACKWARDS — REFUTED ON SIGN BY THE OPERATIONS SEAT

This finding originally proposed that terrain-blindness might explain the 13-of-42 zero-attack
operations, the seven `zero_eligible_axis` blockers and the Cerska catastrophic stall. **That is
directionally incoherent and is withdrawn.**

Blind terrain makes the defender *weaker*, so every prediction is **optimistic**, so gates clear
**more** easily. Terrain-blindness therefore produces **more** attacks, not fewer:

- **13/42 zero-attack ops — the launch gate cannot be the cause.** An op that fails the gate goes to
  `beginRecovery` and never enters execution. A zero-attack op therefore **passed** the gate and
  failed later, at the brigade-order stage. Fixing terrain will make zero-attack ops **more** common.
  The dominant real cause is the terrain-free adjacency gate `tacticallyAdjacentToObjective`
  (`bot_brigade_eval_attack.ts:299`).
- **Seven `zero_eligible_axis` — right code, wrong sign.** One of its two write paths
  (`gateAdjacent <= 0`, `:684`) is pure adjacency counting and terrain-free; the other is optimistic
  today. Fixing terrain will **increase** these, not explain the existing seven.
- **Cerska — half survives.** The axis stalled at flat 1.0, i.e. the ratio read catastrophic even
  optimistically, so blindness did not cause the stall. What survives is narrower and still worth
  testing: the attack that produced the 563:84 loss was *ordered* on an optimistic prediction, so
  accurate terrain might have declined that launch.

**Expected direction of the fix is therefore FEWER launches and MORE zero-attack executions** — the
opposite of what this document first suggested.

### 3b. A THIRD BLIND SITE — the proposed fix was incomplete

`shouldStallAxisForRecentCatastrophicObjective` (`sector_offensive_launch_helpers.ts:889`) calls
`predictAllAdjacentTargets(state, brigadeId, adjacency, EMPTY_REVERSE_MAP, {}, 'attack')` at `:908`.
**Verified: it takes no `predictionContext` parameter at all** and hardcodes both `{}` and
`EMPTY_REVERSE_MAP`, so it could not compute terrain even if handed the data.

**Its sign OPPOSES the launch gate** — accurate terrain there makes stalling *easier*, while at the
launch gate it makes launching *harder*. **Operations seat's recommendation, adopted: hold this site
back as a separate lane.** Moving it in the same change bundles two opposing effects and violates
one-change-per-run — the result would be unattributable.

### 3c. AN UNRELATED DEFECT FOUND WHILE TRACING — separate lane, do not let this fix absorb it

The Cerska stall's **permanence** has nothing to do with terrain. `axis.status = 'stalled'` is set at
`sector_offensive.ts:1587`; the loop skips non-executing axes (`:1574`); and `resetAxisForExecution`
is called **only** at the planning→execution transition (`:1536`). Nothing re-evaluates a stalled
axis during execution — so a **4-turn** catastrophic memory window
(`RECENT_CATASTROPHIC_OBJECTIVE_MEMORY_TURNS`) produces a **permanent** stall. That is its own bug
and deserves its own lane.

---

## 4. THE FIX SHAPE — FOUR BLIND SITES, NOT TWO

**This document originally named two sites. The panel found four.** All verified:

| # | site | what it decides | found by |
|---|---|---|---|
| 1 | `war_phases.ts:1858` | operation launch / plan invalidation / `zero_eligible_axis` | finding |
| 2 | `bot_brigade_ai_osid.ts:709` | brigade attack orders **and target choice** | finding |
| 3 | `sector_offensive_launch_helpers.ts:908` | catastrophic-loss axis stall — takes **no** prediction context, hardcodes `{}` AND `EMPTY_REVERSE_MAP` | Operations |
| 4 | `commander/emit.ts:1123` | **probe-operation objective RANKING** via `predictDirectEnemyTargets` (`:1163`) | Engine |

**Site 3's sign OPPOSES sites 1/2** — accurate terrain there makes stalling *easier* while at the
launch gate it makes launching *harder*. **Hold site 3 for a separate lane**; bundling opposing
effects violates one-change-per-run and makes the result unattributable.

**Minimum correct commit is sites 1, 2 and 4 together.** Ship only 1+2 and a fourth decision surface
stays blind, so "all decision paths agree" remains false.

**Engine seat's amendment, adopted as preferred:** three-to-four independent `buildTerrainCache`
calls are *what drifted apart in the first place*. Build the cache **once per turn** onto the shared
`getSpatialContextCache`, which these sites already read. That removes the bug class rather than
fixing four instances of it.

**On the coupling — verified, with a correction.** `git show 65f7228ca` shows that commit
**introduced** the blind cache at `:1858`, with its comment *"Must match `generateAllBotOrdersOsid`
exactly."* So the recorded rationale is **parity with the brigade-order path — deliberate mirroring
of a pre-existing defect — NOT a claim that terrain should be flat.** No rationale for flat terrain
exists anywhere. Fixing one site alone genuinely recreates the split-brain that commit closed, so
atomicity is correct.

### 4a. ⚠ PREREQUISITE — the terrain loader must fail LOUD first, as its own change

`src/map/terrain_scalars_node.ts` (23 lines, verified in full):

```ts
let cache: TerrainScalarsData | null = null;          // module-level
if (cache) return cache;                              // FIRST-CALL-WINS, not keyed by path
const absPath = resolve(filePath ?? DEFAULT_PATH);    // CWD-RELATIVE
```

All five `war_phases.ts` call sites (`1532, 1739, 1830, 2938, 2989`) pass **no path**;
`desktop_sim.ts` passes an explicit one. **Whichever runs first wins the cache, and every later
caller's path argument is ignored.** A cwd miss throws into the caller's
`catch { terrainData = { by_sid: {} } }` — flat terrain **including in the resolver at `:2938`**.

⇒ **A packaged Electron build with an arbitrary cwd could already be resolving combat terrain-blind,
with nothing reporting it.** And because `cache` is assigned only on success, it retries every turn:
failure is per-turn, not sticky, so a transient miss yields one turn unlike its neighbours,
untraceably.

**This is not introduced by the fix — but the fix makes it load-bearing on three more decision paths,
and a silent `{}` is indistinguishable from the current defect, which would make the fix
unverifiable.** Anchor the path to repo root, key the cache by resolved path, and make sim-path
callers **throw** rather than substitute `{by_sid:{}}`. Any surviving soft fallback must set a flag
the run summary surfaces.

*Positive control on that absence:* `tests/desktop_packaged_runtime_probe.test.ts:358,563` asserts
the terrain JSON is served over the packaged **route** — the map/UI path. **Nothing anywhere asserts
the node loader resolves its file.**

### 4b. Terrain is not the only prediction/resolution disagreement

`attack_resolution_osid.ts:550` builds `buildSlopeByOsid(reverseMap, terrainData)`. **The prediction
path has no slope analogue at all** — not empty, structurally absent. Fixing terrain does **not**
close slope. Logged here so it is not lost; out of scope for this lane.

| site | fix | cost |
|---|---|---|
| `war_phases.ts:1858` | pass the in-scope `terrainData` | one argument |
| `bot_brigade_ai_osid.ts:709` | terrain must arrive via `OsidBotContext` — the module never imports terrain, and `generateAllBotOrdersOsid` is **synchronous** so it cannot `await loadTerrainScalars()` itself | add a field to `OsidBotContext` (`bot_brigade_supply_ethnic.ts:33`), populate it at the caller, consume it in the callee |

The caller is favourable: `osidCtx` is built at `war_phases.ts:~2654` inside an **async** block that
already `await`s `loadSettlementEthnicityData()`, so it can await terrain the same way.

---

## 5. WHY THIS IS NOT A QUICK FIX

**This is the most calibration-moving change on the board.** It alters the defender power used by
every launch decision and every brigade attack order, on 99.7% of the map, in the defender's favour
68% of the time. Expect fewer attacks launched, different targets chosen, and a different war.

It therefore needs the full discipline:
- **188w only.** 40w/43w are false greens for a combat-behaviour change of this class.
- **One change per run** — both sites are one atomic change (§4), not two.
- **Pre-committed decision rule** before the run, not after.
- **Panel sign-off** — this is a combat-model change, not a data correction.
- Expect the engine-health gate's `matched_osids` and K:W band to move; **do not `--update` any threshold** to accommodate it.

**The honest framing for the panel: this is a correctness fix whose calibration effect is unknown
and probably negative at first.** The current floor was tuned against a terrain-blind launch gate,
so making it accurate will move numbers that were fitted to the inaccuracy. A drop is not evidence
the fix is wrong — but it must not be quietly absorbed either.

---

## 6. WHAT IS ESTABLISHED VS WHAT IS NOT

**Established (measured this session):** the two omissions; that `terrainData` is in scope and
loaded at one of them; that the resolver uses populated terrain; the full multiplier distribution
over all 712 OSIDs; that `generateAllBotOrdersOsid` is synchronous and its module never imports
terrain; that the caller is async and already awaits comparable data.

**NOT established:** the sign or size of the calibration effect on `matched_osids`.

**REFUTED — the desktop-divergence worry in this document's first draft was wrong**, and both the
Engine and Operations seats refuted it independently. `desktop_sim.ts` runs the **shared** `runTurn`
→ `war_phases` pipeline, so **desktop bots are equally blind**; `advanceSectorOffensives` has one
caller. The `desktop_sim.ts:722/802` terrain caches feed `computeOperationPrediction`, which is the
**player-facing ops modal** and has no `src/` callers outside desktop.

**The real asymmetry is different and arguably worse: PLAYER vs BOT.** The human is shown a
terrain-accurate force ratio and recommended action for an attack that the AI commander judged
terrain-blind. Same battle, two terrain models, depending on who is looking at it.

**Also REFUTED — the causal hypothesis (see §3a):** withdrawn as directionally incoherent.

### 6a. THE COVERAGE GAP THAT LET THIS SHIP — and a mislabelled control

`tests/sector_offensive_in_transit_predictor.test.ts` injects its own
`terrainMultByOsid = {'op:test:objective_a': 2.5}` at `:530`, so it is **insensitive to production
wiring**. Its `:575` assertion labelled *"positive control: stripping terrain context must change
this prediction"* is **mislabelled** — dropping `predictionContext` switches the entire code path
(contextual `predictCombatOutcome` vs `predictAllAdjacentTargets` with `EMPTY_REVERSE_MAP` and `{}`),
so it passes even if terrain alone is unchanged. **It is a context control, not a terrain control.**

⇒ **No test in the repo pins terrain into the production launch gate.** That is why this shipped, and
it means green CI proves nothing here. A required condition of any fix is a test asserting the
prediction context handed to `advanceSectorOffensives` is non-empty **and equal to the preparation
cache**.

### 6b. Expected test/baseline movement

Four pinned scenarios move (`apr1992_188w`, `apr1992_52w`, `baseline_ops_4w`, `noop_4w`), 8 artifacts
each; `final_state_hash` moves — unlike the painted repaint, this **is** a decision-path change.
Vitest `final_state_hash` assertions are self-relative and stay green.

**★ `noop_4w` must NOT move. If it does, the change leaked somewhere it should not reach — that is a
STOP signal, not a re-pin.**

Do not `--update` the health gate, and specifically **do not `--force`** (`engine_health_gate.cjs:23`),
which exists to LOWER the `matched_osids` floor. A drop is not evidence the fix is wrong; it is also
not permission to re-pin the floor.
