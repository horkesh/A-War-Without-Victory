# Engine 2 — Brigade Lifecycle Design Memo

**Date:** 2026-05-23
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19` (post-Wave-30 revert)
**Author:** Engine researcher (read-only investigation)
**Status:** Decision memo — options scored, recommendation given. NO CODE EDITED.

Wave 30's narrow `cohesion-only` dissolution guard was reverted because it failed
to compose with Wave 28's Mistral-2 brigade substitution: the substitutes didn't
need rescuing, the originals (Kralj Petar, Kralj Tomislav, HV 7th Guards) did,
and rescuing the originals doesn't put them back in Mistral 2's catalog anyway.
That revert revealed the deeper problem the audit already documented but the
fix didn't address: brigade lifecycle is broken in TWO independent places.

This memo investigates the two layers in detail and scores five options.

---

## Part 1 — Why is the HRHB pool exhausted?

### The smoking-gun numbers

From `data/derived/latest_run_final_save.json` at t188 (audit Section e):

```
HRHB available across all of Bosnia: 217
HRHB committed (in living brigades):  65,907
HRHB exhausted (consumed by combat):  11,778

RBiH available: 77,249  (357× HRHB)
RS   available: 19,235  ( 89× HRHB)
HRHB available:    217
```

Every HRHB municipality except **zepce** has `available = 0`. zepce holds the
entire 217, which is exactly at the `RECONSTITUTION_MIN_POOL = 200` floor.

This is not a single-bug outcome. It is the product of three converging
pressures, all data/calibration driven:

### Pressure 1 — `FACTION_MOBILIZATION_SCALE['HRHB']` is starved late-war

`src/sim/combat/ongoing_mobilization.ts:70-74` — surge factor decline:

```
HRHB: 0.12   (FACTION_MOBILIZATION_SCALE)
```

Combined with `getMobilizationSurgeFactor` (lines 113-122):

```
HRHB surge:
  w1-12:   2.0
  w13-26:  1.6
  w27-52:  1.2
  w53-78:  0.3    ← drops 75% post-w52
  w79-104: 0.15   ← effectively flat
  w105+:   0.1
```

By t188 (≈w27, mid-war), HRHB is in the w27-52 band at 1.2× — but the
`FACTION_MOBILIZATION_SCALE` is already 0.12, the lowest of all three factions
(RBiH 0.09 is lower but RBiH has a vastly larger demographic base).

Multiplied through:
- `BASE_MOBILIZATION_RATE * factionScale * surge`
- `0.003 * 0.12 * 1.2 = 0.000432` per turn per eligible Croat
- Croat-eligible across all HRHB municipalities is ~250,000 total
- Theoretical max generation: ~108/turn faction-wide
- `MAX_MOBILIZATION_PER_MUN_PER_TURN = 300` (line 133) so per-mun cap rarely binds
- But `EXHAUSTION_HARD_CAP = 0.50` (line 163) kicks in at 50% of military-age males consumed

### Pressure 2 — exhaustion gate fires early for HRHB

`ongoing_mobilization.ts:284-291`:

```ts
const milAgeMales = Math.max(1, Math.floor(censusEligible * MILITARY_AGE_MALE_FRACTION));
const cumulative = (pool.available ?? 0) + (pool.committed ?? 0) + (pool.exhausted ?? 0);
const exhaustionRatio = cumulative / milAgeMales;
if (exhaustionRatio >= EXHAUSTION_HARD_CAP) {
    report.exhausted_municipalities += 1;
    continue;
}
const exhaustionMult = exhaustionRatio >= EXHAUSTION_THRESHOLD ? 0.5 : 1.0;
```

`MILITARY_AGE_MALE_FRACTION = 0.28` (line 150). For a 30,000-Croat municipality
like Mostar: `milAgeMales = 8400`. With `committed=9579, exhausted=1768`:

```
cumulative = 0 + 9579 + 1768 = 11,347
ratio = 11347 / 8400 = 1.35  ← well past EXHAUSTION_HARD_CAP (0.50)
```

Mostar is hard-capped. So is every major HRHB municipality at t188. The audit
shows committed alone exceeds the eligible population in livno (9,206 vs ~5,500
eligible males) and mostar (9,579 vs ~8,400 eligible males).

**This means cumulative HRHB combat throughput already EXCEEDED their realistic
manpower base.** It's not that mobilization slowed — it's that there is no
more demographic fuel.

### Pressure 3 — `reinforceBrigadesFromPools` greedy consumption

`src/sim/formation_spawn.ts:246-420`. Per-turn reinforcement rate (formation_constants.ts:254):

```
REINFORCEMENT_RATE = 400/turn (active brigade out of combat)
COMBAT_REINFORCEMENT_RATE = 200/turn (in combat)
```

Each of HRHB's 33 active brigades pulls 200-400/turn until at cap. With 33
brigades and ~108/turn faction-wide generation, **the brigades are absorbing
manpower faster than mobilization generates it**. Pool sits at 0 between turns;
mobilized manpower is immediately committed.

### Pressure 4 — `casualty_pool_exhaustion` returns 75% of kills to `exhausted`

`pool_population.ts:422-460`. Permanent battle losses (killed+missing) accrue
to `pool.exhausted` at 75%. This is realistic but means combat losses raise
the exhaustion ratio, accelerating the hard-cap trigger.

### Pool-exhaustion verdict

HRHB is **demographically out of fuel by t188**. This isn't an engine bug to
patch — it's the engine correctly modeling that the HVO mobilized ~40-50k Croats
out of an eligible ~250k male population, of which ~140k were realistically
mobilizable. The simulation has consumed all of them and then some via combat
attrition. Strategic reserve (`strategic_reserves[HRHB]`) holds half of every
dissolved brigade's personnel as a sink, but it is not currently consumed by
the reconstitution path — see Part 2.

**Files cited:**
- `src/sim/combat/ongoing_mobilization.ts:70-74` (faction scale)
- `src/sim/combat/ongoing_mobilization.ts:113-122` (HRHB surge curve)
- `src/sim/combat/ongoing_mobilization.ts:162-163` (exhaustion gates)
- `src/sim/combat/ongoing_mobilization.ts:284-291` (per-mun hard cap)
- `src/sim/early_war/pool_population.ts:422-460` (casualty → exhaustion)
- `src/sim/formation_spawn.ts:246-420` (greedy reinforcement)
- `src/state/formation_constants.ts:254` (REINFORCEMENT_RATE=400)

---

## Part 2 — Reconstitution gate requirements

`src/sim/combat/brigade_reconstitution.ts:256-385`. The full eligibility chain:

| # | Condition | Source | Notes |
|---|-----------|--------|-------|
| 1 | `f.status === 'inactive'` | line 271 | Excludes all live brigades |
| 2 | `f.lifecycle_status === 'destroyed'` | line 272 | Excludes `'merged'`, `'displaced'`, undefined |
| 3 | `f.kind === 'brigade' \|\| 'og'` | line 273 | Militia/paramilitary skipped |
| 4 | `f.destruction_turn != null` | lines 280-287 | No turn → permanently skipped |
| 5 | `turn - destruction_turn >= 5` | line 282 | `RECONSTITUTION_DELAY_TURNS` |
| 6 | `f.corps_id` set | line 292 | Must have a parent corps |
| 7 | Corps cap: `MAX_PER_CORPS = 1` per turn | line 296 | Throttle |
| 8a | **Path A (home OSID):** home OSID friendly-controlled AND home pool `available >= 200` | lines 311-320 | `RECONSTITUTION_MIN_POOL = 200` |
| 8b | **Path B (refugee):** displaced-arrivals aggregate has a same-corps friendly destination with pool `available >= 200` | lines 322-333 + `findRefugeeMunicipality` | Pool-gated again |
| 9 | After both paths: `min(maxPers × 0.40, pool.available) >= 200` | lines 338-341 | Spawn floor |

**On success** (lines 343-368):
- `status='active'`, `lifecycle_status=undefined`
- `personnel=poolDraw` (target 40% of max_personnel, capped by pool)
- `cohesion=30` (RECONSTITUTION_COHESION)
- `morale = RECONSTITUTION_MORALE[faction] + (isRefugee ? 5 : 0)` — HRHB baseline 50
- `readiness='forming'` — **this makes the brigade ineligible for reinforcement
  via `isEligibleForReinforcement` (formation_constants.ts:178)**
- `officer_quality -= 0.10`
- Draws `poolDraw` from the municipal pool

### Strategic reserve is NOT consulted

Reconstitution **never reads `state.military.strategic_reserves[faction]`**.
The faction reserve sits inert as far as reconstitution is concerned. Half of
every dissolved HRHB brigade's personnel goes INTO this reserve
(`brigade_dissolution.ts:185-193`) but no exit door exists for reconstitution.

Strategic reserve IS consumed by `strategic_reserve.ts` for under-strength
active brigades, but at faction-weighted draw rates (RBiH 0.15, RS 0.25,
HRHB 0.25) — and ONLY for already-active brigades. Inactive/destroyed brigades
are not even iterated.

**The bottleneck:** with HRHB municipal pools sitting at 0 for 23+ turns post-
destruction, both Path A (home pool empty) and Path B (no refugee destination
has pool ≥ 200) fail. The faction-wide strategic_reserves[HRHB] may hold
significant manpower (half of 8 dissolved brigades × ~150 each ≈ 600+, plus
prior dissolutions, plus overflow collection from pre-exhaustion pools), but
it is unreachable from this code path.

---

## Part 3 — Design options scored

| # | Option | Surface | Risk | Determinism risk | Cascade impact | Effectiveness for Mistral 2 |
|---|--------|---------|------|------------------|----------------|----------------------------|
| (a) | Wave-30-redo + strategic-reserve reconstitution fallback | ~25 LOC, 2 files | MEDIUM | Low (sorted iteration preserved) | Cross-cuts dissolution + reconstitution + tests | HIGH for future runs; MEDIUM for in-flight (only un-substituted dead brigades benefit) |
| (b) | Scenario-init HRHB strategic_reserves bump | 1 number in 1 file | LOW | Zero | None to engine | LOW — reconstitution path doesn't read strategic_reserves; bump does nothing unless (a)'s second clause is also shipped |
| (c) | Per-turn cohesion regen for `status=active` brigades at home OSID | ~10 LOC, 1 file | LOW | Low | Prevents *future* dissolutions; can't reactivate dead ones | LOW-MEDIUM — solves cohesion-30 active brigades but Mistral 2 brigades are already inactive |
| (d) | Promote 'inactive' → 'active' via existing recovery mechanisms (cohesion+personnel lift) | ~20 LOC, 1 file | HIGH | Medium — inverts the destruction → reconstitution contract | Breaks `lifecycle_status='destroyed'` semantics; many downstream consumers assume one-way | LOW — inactive brigades have personnel=0, never lift back via existing mechanisms (gated on status=active) |
| (e) | Time-capped inactive status (>20 turns → auto-recover) | ~5 LOC, 1 file | HIGH | Medium — bypasses the entire dissolution lifecycle | Realistic combat-exhaustion limit but masks the underlying pool starvation; risks reactivating brigades whose home territory is hostile, with no personnel source | LOW — same issue: needs personnel from somewhere, no upstream source |

### Detailed scoring

#### (a) Wave-30-redo + strategic-reserve fallback — combined fix
- **Files touched:** `brigade_dissolution.ts` (5 lines), `brigade_reconstitution.ts` (~15-20 lines).
- **First clause:** when `personnel >= DISSOLUTION_PERSONNEL_THRESHOLD (400)` and the only failed criteria are cohesion+morale (no `moraleCollapseTrigger`, no `lowPersonnel`), set `f.readiness='degraded'` and `continue` instead of dissolving. **Preserves all destruction paths** for genuine combat-ineffective brigades. Audit already located the exact insertion point: `brigade_dissolution.ts:182` after `if (!moraleCollapseTrigger && criteriaCount < requiredCriteria) continue;` and before the dissolution block at line 184.
- **Second clause:** in `reconstituteBrigades()` after the existing Path B refugee fallback fails, add Path C: draw from `state.military.strategic_reserves[faction]` when `pool.available < RECONSTITUTION_MIN_POOL` for both home and all refugee candidates. Cap the draw at the same `min(maxPers × 0.40, reserve_available)`. This rescues already-dead brigades when faction reserve has manpower.
- **Why both clauses:** clause-1 alone prevents future dissolutions but doesn't help in-flight Mistral 2 (the three originals are already dead at t165). Clause-2 alone rescues the dead but doesn't stop the bleed. Together they form a complete lifecycle loop: degrade → recover OR die → reconstitute from reserve when pool fails.
- **Composition with Wave 28 (Mistral 2 substitutes):** the substitutes already absorbed the mission, so clause-1's protection of them keeps them combat-effective. Clause-2 rescues the originals for use in *other* operations (sector defense, autonomous combat, future-wave op authoring). The two waves do not conflict — Wave 28 chose substitutes; this proposal keeps the originals available as a strategic backstop.
- **Determinism risk:** low. Both clauses iterate via existing `strictCompare`-sorted formation IDs. Strategic reserve is a single faction-keyed number, not a sorted collection.
- **Test surface:** medium. Need ~2 new vitest specs: (1) cohesion-12 brigade with personnel=600 becomes `readiness='degraded'`, not `status='inactive'`. (2) Brigade with `lifecycle_status='destroyed'` + 23 turns past destruction + zero municipal pool + non-zero `strategic_reserves[HRHB]` reconstitutes via Path C with `readiness='forming'` and `personnel=poolDraw`.
- **Calibration risk:** medium. Adding a reserve drain path will start consuming HRHB strategic reserve where it previously sat inert. Likely beneficial for cascade unblock but could shift force totals at long horizons.

#### (b) HRHB scenario-init strategic_reserves bump (data-only)
- **Files touched:** scenario JSON or `applyRsJnaInheritanceBonus`-style equivalent for HRHB.
- **Critical defect:** as documented above, `reconstituteBrigades()` does not consult `strategic_reserves`. Bumping the number is purely cosmetic until clause-2 of (a) ships.
- **If shipped after (a) clause-2:** becomes a one-knob calibration tool. Good complement, weak standalone.

#### (c) Per-turn cohesion regen for active brigades at home OSID
- **Files touched:** `cohesion_drift.ts` (~10 lines, one new branch).
- Already partially exists via `runCohesionDrift` with positive faction-keyed drift (RBiH +0.3 to +0.4 early war, HRHB +0.05 mid-war).
- The reason cohesion-30 brigades don't naturally lift is that HRHB ambient drift is already near-zero by mid-war. Boosting it for "at home OSID" specifically helps but doesn't address the root issue (dead brigades, not low-cohesion live brigades).
- **Side effect:** could mask the dissolution problem — brigades regen cohesion fast enough to survive but the underlying combat-attrition pattern (which dissolution is correctly modeling) is hidden.

#### (d) Inactive → active promotion via personnel + cohesion lift
- **Files touched:** new function in `formation_spawn.ts` or `brigade_reconstitution.ts` (~20 lines).
- **Fundamental contradiction:** inactive brigades have `personnel=0` (`brigade_dissolution.ts:242`). There is no mechanism to lift their personnel above zero EXCEPT reconstitution (which already handles this). Without a personnel source, there's nothing to promote.
- **Would require an upstream patch** (some mechanism to add personnel to inactive brigades) which is exactly what clause-2 of (a) does, but with less ceremony and more side effects.

#### (e) Time-capped inactive status (>20 turns auto-recover)
- **Files touched:** `brigade_reconstitution.ts` or a new pipeline step (~5 lines).
- **Same fundamental contradiction as (d):** personnel=0 brigades don't auto-recover. The clock-based gate doesn't conjure manpower.
- Could be reframed as "after 20 turns, retire the brigade permanently" but that's not what's being asked.

---

## Part 4 — Recommendation

### **Adopt Option (a): combined fix.** Ship both clauses in one wave.

**Clause 1 — cohesion-only dissolution prevention** at `brigade_dissolution.ts:182`:

```ts
// After the existing 2-of-3 guard, before the dissolution block:
if (!moraleCollapseTrigger
    && !lowPersonnel
    && personnel >= DISSOLUTION_PERSONNEL_THRESHOLD
    && (lowCohesion || lowMorale)) {
    f.readiness = 'degraded';
    continue;  // No dissolution, no destruction_turn, no inactive
}
```

**Clause 2 — strategic-reserve reconstitution fallback** in `reconstituteBrigades()`
between the existing Path B failure and the `continue` (after `findRefugeeMunicipality`
returns undefined):

```ts
// Path C: faction strategic reserve fallback.
// When both home pool AND all refugee destinations are pool-starved,
// the faction-wide strategic reserve (fed by dissolution payback) can
// reform the brigade. Spawn at home OSID if friendly, else first friendly OSID
// in any controlled territory.
const reserves = state.military.strategic_reserves ?? {};
const reserveAvailable = reserves[faction] ?? 0;
if (reserveAvailable >= RECONSTITUTION_MIN_POOL) {
    const targetPersonnel = Math.floor((f.max_personnel ?? 2000) * RECONSTITUTION_PERSONNEL_FRACTION);
    const reserveDraw = Math.min(targetPersonnel, reserveAvailable);
    if (reserveDraw >= RECONSTITUTION_MIN_POOL) {
        // Find spawn OSID — prefer home, fall back to any friendly OSID in corps territory
        const homeOk = f.home_osid
            && state.political.political_controllers?.[f.home_osid] === faction;
        const territoryOsids = corpsTerritoryOsids(state, corpsId);
        const spawnOsid = homeOk
            ? f.home_osid
            : [...territoryOsids].sort(strictCompare)[0];
        if (spawnOsid) {
            // Drain reserve, spawn at reserve-baseline morale (no refugee bonus)
            (state.military.strategic_reserves as Record<string, number>)[faction]
                = reserveAvailable - reserveDraw;
            f.status = 'active';
            f.lifecycle_status = undefined;
            f.personnel = reserveDraw;
            f.cohesion = RECONSTITUTION_COHESION;
            f.morale = RECONSTITUTION_MORALE[faction]; // no refugee bonus on reserve path
            f.readiness = 'forming';
            f.location_osid = spawnOsid;
            f.entrenchment_turns = 0;
            f.disrupted_turns = 0;
            f.defense_streak = 0;
            f.destruction_turn = undefined;
            f.officer_quality = Math.max(0.05, (f.officer_quality ?? 0.3) - RECONSTITUTION_OFFICER_QUALITY_PENALTY);
            reconByCorps.set(corpsId, corpsCount + 1);
            report.reconstituted_brigades.push({
                id: fid, name: f.name ?? fid, faction, corps_id: corpsId,
                home_mun: homeMun, personnel_spawned: reserveDraw,
                pool_drawn: reserveDraw,
                turns_since_destruction: turn - (destructionTurn ?? turn),
            });
            report.reconstituted_count++;
            continue;
        }
    }
}
continue; // existing
```

### Why this is the right call

1. **Composes with Wave 28.** Substitutes already carry Mistral 2; this proposal keeps the originals available as a backstop without conflicting.
2. **Fixes the actual two layers identified in the audit.** Clause 1 = "stop dissolving brigades that aren't actually destroyed". Clause 2 = "give already-dead brigades a recovery path when municipal pools are starved".
3. **Strategic reserve is already being fed.** Half of every dissolved brigade's personnel flows into `strategic_reserves[faction]`. Clause 2 closes the loop — previously a sink, now a source.
4. **Determinism preserved.** Both clauses use existing sorted iteration. Reserve is a single number per faction; spawn OSID picks first-alphabetical from a deterministically constructed set.
5. **Calibration-friendly.** Reserve draw rate isn't a new knob — it's gated by `RECONSTITUTION_MIN_POOL = 200` and `RECONSTITUTION_PERSONNEL_FRACTION = 0.40`, both already tunable.
6. **Faction-symmetric mechanism.** The reserve fallback applies to all three factions. Whichever faction's municipal pools starve first will benefit — currently HRHB, but RS in 1995-style attrition scenarios or RBiH in worst-case Sarajevo encirclement runs.
7. **Realistic narrative.** "Strategic-reserve cadre disperses to reform the destroyed unit at the home depot when local manpower has been consumed" matches how the HVO and ARBiH actually reformed mauled brigades — pulling on faction-wide replacement pools rather than the home municipality alone.
8. **Surface area is bounded.** ~25 LOC across 2 files. Audit-confirmed insertion points. 2 new test specs.

### What this does NOT solve

- **In-flight Wave 28 substitution.** The substitutes still own Mistral 2; this fix doesn't unwind that choice. If we want the originals back in Mistral 2's catalog, that's a separate Wave 28 revert/refinement decision.
- **HRHB demographic exhaustion at long horizons.** The fix gives dead brigades a second life by drawing from the reserve sink, but at 104w+ the reserve itself will run dry. That's correct historical behavior — HVO did run out of men.
- **Per-turn personnel recovery for `readiness='degraded'` brigades.** The audit notes `isEligibleForReinforcement` blocks degraded brigades from `reinforceBrigadesFromPools`. Cohesion drift still applies, so they recover via that path eventually. If we want faster recovery, that's an optional Phase 2 (relax the gate to allow degraded brigades to draw at half rate). Not blocking.

### Implementation order

1. Add clause 1 (dissolution guard, 5 lines).
2. Run baseline scenario — verify no regression in dissolution counts for genuinely-spent brigades, verify "degraded" brigades appear in the right spots.
3. Add clause 2 (reserve fallback, ~15 lines).
4. Run scenario — verify HRHB Kralj Petar / Kralj Tomislav / HV 7th Guards reconstitute via reserve path between t170 and t188.
5. Add vitest specs.
6. Compose with Mistral-2 re-host on substitutes (Wave 28 stays).
7. Calibration sign-off vs n1992 baseline (81.18% match_ratio).

### Risk controls

- **If reserve drain destabilizes calibration:** add a per-turn cap on reserve draws (`RECONSTITUTION_MAX_RESERVE_DRAW_PER_FACTION_PER_TURN = 400` or similar).
- **If clause 1 prevents too many dissolutions:** the personnel cap (`DISSOLUTION_PERSONNEL_CAP = 800`) and 2-of-3 criteria still gate everything. The new guard only fires when personnel ≥ 400 (mid-strength). Narrow surface.
- **If reconstitution-via-reserve produces brigades in wrong territory:** the `corpsTerritoryOsids` gate (already used by Path B) restricts spawn to the brigade's own corps territory. If empty, brigade stays destroyed — historically accurate.

---

## Part 5 — Composition with Wave 28 (the substitution question)

The audit asked: "if we re-host Mistral 2 on the substitutes (Wave 28 stays),
how does brigade lifecycle help?"

Answer: it helps in three indirect-but-real ways:

1. **Sector defense.** Kralj Petar Krešimir IV reconstituted at livno_2 plugs
   the gap left by its own dissolution. The substitutes are committed to
   Mistral 2's attack axes; the original being back at home OSID restores
   garrison weight, lowers attrition pressure on Mistral 2's flanks, and
   reduces the probability of Mistral 2 brigades being yanked off-mission
   to backstop defensive collapses.

2. **Autonomous combat / opportunistic engagement.** Live HRHB brigades at
   reduced cohesion still contribute to brigade-density combat ratios at OSIDs
   they occupy. Dead brigades contribute nothing. The cascade depends on
   sustained HRHB presence in central Bosnia — keeping originals alive
   (clause 1) or revivable (clause 2) raises the floor.

3. **Future-wave op authoring.** Subsequent op waves (Mistral 3, Jajce ring,
   any HRHB op authored after the current calibration window) need a deeper
   HRHB roster to draw from. Wave 28's substitution trick works for one op;
   it doesn't scale. Lifecycle fixes give the op-author durable HRHB capacity
   for the next 50+ turns of scenario time.

The substitutes solve "this op needs to launch this turn." Lifecycle solves
"the HVO needs to exist as a coherent force through the rest of the war."

Both are needed. Neither replaces the other.

---

## Decision

**Ship Option (a) — combined cohesion-only dissolution prevention + strategic-
reserve reconstitution fallback.** Two narrow clauses, ~25 LOC across 2 files,
audit-confirmed insertion points, faction-symmetric mechanism. Compose with
Wave 28 by leaving the substitutes on Mistral 2 and using lifecycle fixes for
durable HVO capacity post-cascade. Defer (b), (c), (d), (e) — they're partial
solutions, data-only patches that need engine support, or contradiction-laden
mechanics that don't have a personnel source.

Test plan: 2 new vitest specs (degraded-path and reserve-path), full 40w
calibration vs n1992 baseline, smoke triad after each clause individually
before composing.
