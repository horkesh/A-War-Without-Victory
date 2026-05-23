# Engine 2 — Brigade Lifecycle Implementation Memo

**Date:** 2026-05-23
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19`
**Design reference:** `docs/40_reports/proposals/20260523_ENGINE_2_BRIGADE_LIFECYCLE_DESIGN.md`
**Status:** Implementation landed (uncommitted, awaiting orchestrator git ops). Typecheck PASS.

This memo records the implementation of **Option (a) — combined fix** from the
Engine-2 design memo. Two clauses ship in one wave across two files:

| Clause | File | Lines | Purpose |
|--------|------|-------|---------|
| 1 | `src/sim/combat/brigade_dissolution.ts` | 184–201 (insertion) | Cohesion-only dissolution prevention (Wave-30-redo) |
| 2 | `src/sim/combat/brigade_reconstitution.ts` | 79–105 (entry fields), 332–438 (Path C body) | Strategic-reserve reconstitution fallback (new Path C) |

---

## Clause 1 — Cohesion-only dissolution prevention

### Insertion point

`src/sim/combat/brigade_dissolution.ts`, immediately after the existing 2-of-3
(or 3-of-3 enclave) criteria gate at line 182 and before the dissolution block
that begins at the new line 201 (`const personnelToReserve = ...`).

### Before

```ts
        // LANE-NIGHTSHIFT-N4: morale-collapse override is the fourth, independent
        // dissolution path and bypasses the 2-of-3 (or 3-of-3 enclave) criteria.
        if (!moraleCollapseTrigger && criteriaCount < requiredCriteria) continue;

        // Dissolve
        const personnelToReserve = Math.floor(personnel * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE);
```

### After

```ts
        // LANE-NIGHTSHIFT-N4: morale-collapse override is the fourth, independent
        // dissolution path and bypasses the 2-of-3 (or 3-of-3 enclave) criteria.
        if (!moraleCollapseTrigger && criteriaCount < requiredCriteria) continue;

        // LANE-WAVE-30-REDO / ENGINE-2 Clause 1 (memo
        // docs/40_reports/proposals/20260523_ENGINE_2_BRIGADE_LIFECYCLE_DESIGN.md
        // §Part 4). Cohesion-only dissolution prevention: when the 2-of-3 (or
        // 3-of-3 enclave) gate is met but the failing criteria are ONLY
        // cohesion+morale (no morale-collapse override, no structural
        // personnel destruction), demote the brigade to readiness='degraded'
        // and continue — do NOT mark inactive/destroyed. Preserves the two
        // genuine destruction paths: (i) moraleCollapseTrigger (catastrophic
        // psychological breakdown after MORALE_OVERRIDE_TURNS sustained
        // collapse) and (ii) lowPersonnel (structural combat destruction).
        // Wave 30 ran this guard standalone; Engine-2 reintroduces it as the
        // first half of a combined fix whose second half (reserve-fallback
        // reconstitution in brigade_reconstitution.ts) closes the loop on
        // brigades that did dissolve under (i)/(ii).
        if (!moraleCollapseTrigger && !lowPersonnel) {
            f.readiness = 'degraded';
            continue;
        }

        // Dissolve
        const personnelToReserve = Math.floor(personnel * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE);
```

### Semantics

The guard fires when **all three** of:

- `!moraleCollapseTrigger` — no N4 morale-collapse override active
- `!lowPersonnel` — personnel above the timeline-resolved threshold AND above
  the absolute floor
- The 2-of-3 (or 3-of-3 enclave) criteriaCount gate already passed
  (i.e. cohesion+morale combined trigger dissolution under the legacy rule)

When fired, the brigade:

- Has `readiness` set to `'degraded'`
- Skips the entire dissolution block (no equipment transfer, no
  `personnel = 0`, no `lifecycle_status = 'destroyed'`, no `destruction_turn`,
  no reserve payback)
- Re-enters the loop on the next turn — if cohesion/morale recover, it
  returns to normal operation; if they collapse further or personnel falls
  below threshold, dissolution fires on a subsequent turn

### Destruction paths preserved

| Path | Trigger | Behavior |
|------|---------|----------|
| Morale-collapse override (N4) | `moraleCollapseTrigger === true` | Dissolves regardless of personnel cap |
| Low-personnel (structural) | `lowPersonnel === true` (personnel below threshold OR absolute floor) | Dissolves under 2-of-3 (or 3-of-3 enclave) gate |
| Cohesion-only | Both `moraleCollapseTrigger` AND `lowPersonnel` false | **Demoted to `'degraded'` instead of dissolved (NEW)** |

The N4 override and personnel-cap gates above the guard still fire first when
applicable, so a 1400-man brigade with morale-collapse override active still
dissolves correctly.

---

## Clause 2 — Strategic-reserve reconstitution fallback (Path C)

### Insertion point

`src/sim/combat/brigade_reconstitution.ts`, inside `reconstituteBrigades()`:

1. **`ReconstitutionEntry` interface (lines 79–105):** added two optional
   fields (`via_reserve?: boolean`, `reserve_spawn_osid?: string`) for
   traceability — does NOT change the discriminant of `lifecycle_status` (the
   union in `game_state.ts:756` does not include
   `'reconstituted_from_reserve'`, and adding a value there would cascade
   into every consumer of `lifecycle_status`).

2. **Path A/B fall-through (lines 332–349):** the existing `if … else …`
   block was converted to a non-terminating fall-through: Path A runs when
   `homeOsidControlled && homePoolViable`; Path B runs when Path A fails and
   `findRefugeeMunicipality` returns a candidate; otherwise control falls
   through to Path C.

3. **Path C body (lines 351–438):** new block that draws from
   `state.military.strategic_reserves[faction]` when Path A and Path B both
   fail to deliver a viable `(locationOsid, pool >= RECONSTITUTION_MIN_POOL)`
   pair.

### Path C structure

```ts
// ENGINE-2 Clause 2 — Path C (faction strategic reserve fallback).
// Reference: docs/40_reports/proposals/20260523_ENGINE_2_BRIGADE_LIFECYCLE_DESIGN.md §Part 4.
//
// When BOTH Path A (home OSID pool) and Path B (refugee destination
// pool) fail to provide >= RECONSTITUTION_MIN_POOL manpower, draw from
// the faction-wide strategic reserve. Half of every dissolved
// brigade's personnel flows into state.military.strategic_reserves
// via brigade_dissolution.ts:188-193 — without this Path C the reserve
// is a sink with no exit door. Path C closes the loop and rescues
// already-dead brigades when municipal pools are demographically
// exhausted (HRHB at t188: every municipality available=0, reserve
// is the only remaining manpower source).
//
// Spawn placement: prefer home OSID if friendly-controlled, else the
// first sorted same-corps friendly OSID (deterministic via
// strictCompare). All faction-symmetric; mechanism reads the same
// strategic_reserves[faction] number regardless of faction id.
if (!locationOsid || !pool || pool.available < RECONSTITUTION_MIN_POOL) {
    const reserves = state.military.strategic_reserves ?? {};
    const reserveAvailable = reserves[faction] ?? 0;
    if (reserveAvailable < RECONSTITUTION_MIN_POOL) continue;

    const maxPersC = f.max_personnel ?? 2000;
    const targetPersonnelC = Math.floor(maxPersC * RECONSTITUTION_PERSONNEL_FRACTION);
    const reserveDraw = Math.min(targetPersonnelC, reserveAvailable);
    if (reserveDraw < RECONSTITUTION_MIN_POOL) continue;

    // Choose spawn OSID: home if friendly, else first sorted same-corps
    // friendly OSID. If the brigade's corps has zero friendly territory
    // and home is hostile, no spawn is possible — brigade stays
    // destroyed (historically accurate: a corps with no held ground
    // cannot reform a destroyed brigade).
    const homeFriendly = f.home_osid != null
        && state.political.political_controllers?.[f.home_osid] === faction;
    let spawnOsidC: string | undefined;
    if (homeFriendly && f.home_osid) {
        spawnOsidC = f.home_osid;
    } else {
        const territoryOsids = corpsTerritoryOsids(state, corpsId);
        const pc = state.political.political_controllers ?? {};
        const sameCorpsFriendly: string[] = [];
        for (const osid of territoryOsids) {
            if (pc[osid] === faction) sameCorpsFriendly.push(osid);
        }
        sameCorpsFriendly.sort(strictCompare);
        spawnOsidC = sameCorpsFriendly[0];
    }
    if (!spawnOsidC) continue;

    // Drain reserve (mutation), then reactivate the brigade.
    (state.military.strategic_reserves as Record<string, number>)[faction]
        = reserveAvailable - reserveDraw;

    f.status = 'active';
    f.lifecycle_status = undefined;
    f.personnel = reserveDraw;
    const reconHistC = ensureBrigadeHistory(f);
    if (reserveDraw > reconHistC.peak_personnel) reconHistC.peak_personnel = reserveDraw;

    f.cohesion = RECONSTITUTION_COHESION;
    // No refugee morale bonus on reserve path — these are cadre cadre
    // dispersed from the faction-wide reserve, not motivated refugees.
    f.morale = RECONSTITUTION_MORALE[faction];
    f.readiness = 'forming';
    f.location_osid = spawnOsidC;
    f.entrenchment_turns = 0;
    f.disrupted_turns = 0;
    f.defense_streak = 0;
    f.destruction_turn = undefined;
    f.officer_quality = Math.max(0.05, (f.officer_quality ?? 0.3) - RECONSTITUTION_OFFICER_QUALITY_PENALTY);

    reconByCorps.set(corpsId, corpsCount + 1);

    report.reconstituted_brigades.push({
        id: fid,
        name: f.name ?? fid,
        faction,
        corps_id: corpsId,
        home_mun: homeMun,
        personnel_spawned: reserveDraw,
        pool_drawn: reserveDraw,
        turns_since_destruction: destructionTurn != null ? turn - destructionTurn : 0,
        via_reserve: true,
        reserve_spawn_osid: spawnOsidC,
    });
    report.reconstituted_count++;
    continue;
}
```

### Traceability — note on `lifecycle_status`

The task description suggested setting
`lifecycle_status = 'reconstituted_from_reserve'` (or similar marker) for
traceability. We did NOT add that string to the
`FormationState.lifecycle_status` union because:

- The union is the source of truth used by 40+ consumers; adding a new value
  would force exhaustiveness checks across the codebase.
- Path A and Path B both set `lifecycle_status = undefined` after success;
  matching that gives reserve-reconstituted brigades a consistent on-state
  with the other paths.

Instead, traceability lives on the `ReconstitutionEntry` returned in the
report: `via_reserve: true` and `reserve_spawn_osid: <osid>`. This is the
same surface where `refugee_mun` already differentiates Path A from Path B,
so the pattern is consistent. Downstream consumers reading the report can
discriminate the three paths via `refugee_mun` (Path B) vs `via_reserve`
(Path C) vs both-undefined (Path A).

### Path ordering and ownership

| Path | Pool source | Spawn OSID | Morale | Entry flag |
|------|-------------|------------|--------|------------|
| A | `militia_pools[home_mun]` | First friendly OSID in home mun | `RECONSTITUTION_MORALE[faction]` | (none) |
| B | `militia_pools[refugee_mun]` (same-corps gated) | First same-corps friendly OSID in refugee mun | `RECONSTITUTION_MORALE[faction] + REFUGEE_MORALE_BONUS (5)` | `refugee_mun` |
| C (NEW) | `strategic_reserves[faction]` (mutated) | Home OSID if friendly, else first sorted same-corps friendly OSID | `RECONSTITUTION_MORALE[faction]` (no refugee bonus) | `via_reserve`, `reserve_spawn_osid` |

The corps-cap gate (`reconByCorps`, `RECONSTITUTION_MAX_PER_CORPS = 1`) is
checked once at the top of the loop and applies uniformly — a corps that has
already reconstituted via Path A this turn cannot also do so via Path C this
turn.

---

## How the two clauses compose

Clause 1 protects mid-strength brigades from cohesion-only dissolution: a
600-man brigade at cohesion 12 and morale 30 (criteriaCount = 2, cohesion +
morale low, personnel above threshold) is now demoted to `'degraded'` instead
of destroyed. It remains live, contributes to brigade-density combat ratios,
and recovers via the existing cohesion drift / morale recovery pipelines.

Clause 2 rescues already-dead brigades when their municipal recruitment basin
has been demographically exhausted. The HRHB t188 case from the audit shows
every HRHB municipality at `available = 0` except zepce at the threshold —
Path A and Path B both fail systemically. The faction reserve, which has
been receiving 50% of every dissolved HRHB brigade's personnel since the
start of the war (lines 188–193 of `brigade_dissolution.ts`), is the only
remaining manpower source. Path C drains it.

Together the two clauses form a complete lifecycle loop:

```
            ┌─────────────────────────────────────────┐
            │ Combat-effective brigade (status=active)│
            └────────────┬────────────────────────────┘
                         │
                         │ cohesion+morale collapse
                         ▼
            ┌─────────────────────────────────────────┐
            │ Clause 1: readiness='degraded',         │
            │ keep status=active                      │
            └────────────┬────────────────────────────┘
                         │
            recovery     │  further attrition
            ◄────────────┤────────────►
                         │  (personnel falls below threshold,
                         │   OR moraleCollapseTrigger fires)
                         ▼
            ┌─────────────────────────────────────────┐
            │ Dissolution: status='inactive',         │
            │ lifecycle_status='destroyed',           │
            │ 50% personnel → strategic_reserves      │
            └────────────┬────────────────────────────┘
                         │
                         │ RECONSTITUTION_DELAY_TURNS (5) elapse
                         ▼
            ┌─────────────────────────────────────────┐
            │ Path A: home pool >= 200?               │
            │ Path B: refugee pool >= 200?            │
            │ Clause 2 / Path C: reserve >= 200?      │
            │ status='active', readiness='forming'    │
            └─────────────────────────────────────────┘
```

Clause 1 raises the "live" floor — fewer brigades dissolve. Clause 2 raises
the "dead" recovery floor — fewer brigades stay destroyed when reserve has
manpower. Both narrow surfaces; neither is a calibration knob — they are
mechanism additions.

### Composition with Wave 28 (Mistral 2 substitution)

Wave 28 added brigade substitutes for Mistral 2 (Kralj Petar, Kralj Tomislav,
HV 7th Guards → substitutes). The substitutes already carry the operation;
Clause 1 keeps them alive when their cohesion drops mid-op; Clause 2
reconstitutes the originals (when destroyed pre-substitution) so they are
available for **other** ops, sector defense, autonomous combat, and future-
wave op authoring. The two waves do not conflict.

---

## Edge cases

### 1. Faction with 0 strategic reserve

`reserves[faction] === 0` (or absent) → `reserveAvailable === 0 <
RECONSTITUTION_MIN_POOL` → `continue` (brigade stays destroyed). No code path
touches an undefined faction key.

### 2. Faction reserve below floor but above zero

Same as case 1: `reserveAvailable < 200` → `continue`. The floor matches the
municipal-pool floor used by Path A/B, so behavior is symmetric.

### 3. Home OSID not in canonical map (no `home_osid` field)

`f.home_osid` is undefined. `homeFriendly` evaluates to `false` (the `f.home_osid != null`
guard short-circuits). Path C falls through to the same-corps territory
search. If `corpsTerritoryOsids(state, corpsId)` is empty (corps has lost all
territory), `sameCorpsFriendly` is empty, `spawnOsidC` is undefined,
`continue` fires (brigade stays destroyed — historically accurate).

### 4. Home OSID hostile but corps holds other ground

`homeFriendly` is false. Same-corps territory search finds at least one
friendly OSID. `spawnOsidC` = first sorted (deterministic). Brigade spawns
in the corps's surviving territory at `'forming'` readiness, no refugee
morale bonus.

### 5. Corps with no territory at all

`corpsTerritoryOsids` returns empty set. `sameCorpsFriendly` is empty.
`continue` fires — same outcome as a brigade with no spawn point in Path B.
The brigade stays destroyed permanently unless its corps reclaims territory
in a later turn.

### 6. Reserve smaller than target personnel but ≥ floor

E.g. `reserveAvailable = 300`, `targetPersonnelC = 800`. `reserveDraw = min(800, 300) = 300`.
Since `300 >= 200`, the brigade spawns at 300 personnel (a small reconstitution).
The reserve is drained to 0.

### 7. Multiple brigades same corps same turn

The `reconByCorps` counter is incremented inside Path C just as in Path A/B.
A corps gets at most one reconstitution per turn, regardless of path. If
Path A succeeded for one brigade, Path C cannot fire for a sibling brigade
in the same corps the same turn.

### 8. `f.max_personnel` undefined

The fallback `f.max_personnel ?? 2000` matches the existing Path A/B logic
at line 338 of the pre-edit file.

### 9. Brigade is enclave brigade

Enclave brigades have a lower absolute floor (50 vs 150) and require 3-of-3
criteria for dissolution. Clause 1's `!lowPersonnel` check uses the same
`lowPersonnel` computed at line 176 of the dissolution file, which already
accounts for the enclave absolute floor. An enclave brigade that meets 3-of-3
with low cohesion+morale but above the personnel floor is demoted to
`'degraded'` — same as a non-enclave. Path C in reconstitution does not
discriminate enclave vs non-enclave; if an enclave brigade is destroyed and
its corps still holds territory, reserve-fallback applies.

### 10. Inactive brigade not yet eligible (within delay window)

The `turn - destructionTurn < RECONSTITUTION_DELAY_TURNS` guard at line 282
fires above Path A/B/C, so Path C never runs for a brigade still in the
5-turn cooldown.

### 11. Already-active brigade

The `f.status !== 'inactive'` guard at line 271 short-circuits before Path
A/B/C — Clause 2 does not touch live brigades. Strategic reserve is also
already consumed by `strategic_reserve.ts` for under-strength active
brigades; that path is unchanged. The two consumers of `strategic_reserves`
are now: (i) `strategic_reserve.ts` for under-strength active brigades, and
(ii) Path C for reconstitution of destroyed brigades. Both deterministic,
both faction-symmetric.

### 12. Determinism — sorted iteration

- Outer brigade loop: `formationIds.sort(strictCompare)` — unchanged.
- Same-corps friendly OSID picker: explicit `sameCorpsFriendly.sort(strictCompare)`
  before taking `[0]`.
- `corpsTerritoryOsids` returns a `Set<string>` whose iteration order is
  insertion order. The function is called once per brigade with the same
  corps; the resulting set is fully consumed into a sorted array before
  picking. No non-determinism leaks.
- Reserve mutation is a simple subtraction; no ordering hazards.

---

## Test plan

### 1. Smoke triad

- `npx tsc --noEmit` — **PASS (verified)**
- `npm run test:vitest` — full vitest suite (3513 tests); confirm no
  pre-existing test regresses.
- `npm run desktop:map:build` — Electron map build.

### 2. New vitest specs

**Spec A — `brigade_dissolution.degraded_guard.test.ts`:**
- Construct a brigade at personnel=600, cohesion=12, morale=8,
  morale_low_streak=0, MORALE_OVERRIDE_ENABLED unset.
- Run `dissolveCombatIneffectiveBrigades`.
- Assert: `status === 'active'`, `lifecycle_status` is NOT `'destroyed'`,
  `readiness === 'degraded'`, no entry in `report.dissolved_brigades`.

**Spec B — `brigade_dissolution.preserves_destruction_paths.test.ts`:**
- Same brigade but personnel=100 (below absolute floor) — assert still dissolved.
- Same brigade but morale_low_streak=10, MORALE_OVERRIDE_ENABLED='true',
  personnel=1500 — assert still dissolved (override path).

**Spec C — `brigade_reconstitution.path_c.test.ts`:**
- Construct destroyed brigade at t10, `destruction_turn=4` (delay elapsed),
  corps_id set, home_osid hostile, no refugee destination has pool ≥ 200.
- Set `state.military.strategic_reserves['HRHB'] = 800`.
- Set one same-corps friendly OSID (`op:livno:livno_2`).
- Run `reconstituteBrigades`.
- Assert: brigade `status === 'active'`, `personnel >= 200`,
  `location_osid === 'op:livno:livno_2'`,
  `state.military.strategic_reserves['HRHB'] < 800` (drained),
  report entry has `via_reserve: true`.

**Spec D — `brigade_reconstitution.path_c.no_territory.test.ts`:**
- Same setup but corps has no friendly territory.
- Assert: brigade stays destroyed, reserve untouched.

**Spec E — `brigade_reconstitution.path_c.reserve_empty.test.ts`:**
- Same setup, reserve=100 (below floor).
- Assert: brigade stays destroyed, reserve untouched.

### 3. Calibration

- Run `npm run sim:scenario:run:40w` — compare hash, anchors, benchmarks,
  battles against the n1992 baseline (`a2a51d4a9994a7f5`).
- Verify HRHB Kralj Petar / Kralj Tomislav / HV 7th Guards reconstitute via
  Path C between t170 and t188 (if their corps still holds territory).
- Watch for cascade: territory totals, sector counts, combat throughput.
- If reserve drain destabilizes calibration, the design memo proposes a
  per-turn cap (`RECONSTITUTION_MAX_RESERVE_DRAW_PER_FACTION_PER_TURN`)
  as a follow-on knob. Not shipped in this implementation.

### 4. Determinism check

- Run scenario twice with identical seed.
- Confirm `data/derived/latest_run_final_save.json` byte-identical and the
  reconstitution report entries match across runs.

---

## Files touched

- `src/sim/combat/brigade_dissolution.ts` — Clause 1 insertion (lines 184–201).
- `src/sim/combat/brigade_reconstitution.ts` — Clause 2 (interface fields
  79–105, Path A/B fall-through + Path C body 332–438).
- `docs/40_reports/proposals/20260523_ENGINE_2_LIFECYCLE_IMPL.md` — this memo.

No other files touched. Engine #1 implementer's work in `bot_brigade_eval_attack.ts`
is disjoint.

---

## Risk register

- **Calibration shift:** Path C will start draining HRHB strategic reserve,
  which was previously inert. The reserve currently holds 217 in the n1992
  baseline, so first-pass impact is bounded. If long-horizon runs (104w+)
  show drift, add the per-faction reserve draw cap from the design memo's
  §Risk Controls.
- **Cohesion-only demotion masking attrition:** Clause 1 keeps brigades
  alive that would have dissolved. The next-turn dissolution gate still
  fires once personnel falls below threshold or moraleCollapseTrigger
  arms, so genuinely-spent brigades still die — just one turn later than
  before. War_or_game realism audit recommended.
- **Cross-corps territory placement (Path C):** when home is hostile, Path C
  uses the SAME-CORPS territory gate via `corpsTerritoryOsids`. A brigade
  cannot spawn into another corps's territory. Symmetric with Path B.
- **Faction-symmetric mechanism:** Path C reads
  `state.military.strategic_reserves[faction]` for whichever faction the
  brigade belongs to. No faction-specific code. The audit-reported imbalance
  is data-driven (RBiH 77,249 / RS 19,235 / HRHB 217) and Path C draws from
  whatever is available.
