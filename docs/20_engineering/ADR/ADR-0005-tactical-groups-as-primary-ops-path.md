# ADR-0005: Tactical Groups as the Primary Ops Path

## Status
Proposed (2026-05-28)

## Context

### The structural gap

The sim's pre-planned operation pipeline assumes the entire brigade roster physically marches to the staging OSID before the 60% assembly gate releases the op into execution. Two cascading mechanisms break this assumption after the early-war window:

1. **Bot AI sector pinning.** From ~w4 onward the bot AI assigns brigades to defensive sector slots. Brigades in sectors receive op march orders (`movement_order_count > 0` confirmed in n152 diagnostics) but do not physically execute them — sector assignment overrides op march priority.
2. **`available_from` injection delay.** Pre-planned ops with late `available_from` values inject after sector pinning is locked, so every brigade in the participating list is already pinned. The op runs through `planning_duration`, accumulates `eligible_attacker_count = 0`, and aborts to recovery with `recovery_reason = "zero_eligible_axis"`.

Confirmed-failing late-war ops (2026-05-28 diagnostic round): **Operation Trnovo** (vrs_sarajevo_romanija, w30 inject), **Operation Pracha River** (vrs_drina, w41-45), **Operation Zvezda 94** (vrs_drina, w100-113). Each fires, each fails identically. The historical events these ops represent (Lukavac 93, Drina Corps Goražde axis, April 1994 Goražde offensive) never deliver in simulation.

The current 92.28% Jan 1993 calibration baseline (657/712, hash `3649b3861a87e6ea`) is partly an artifact of this stall: late-war territory does not change hands because brigades never march to fight.

### Canon already authorizes the fix

The Operational Group entity is fully canonical:

- **Rulebook v0.9.0 §5.7**: "With Corps authorization, an OG may temporarily pull battalion-equivalent manpower from brigades. Donor brigades retain their location_osid but suffer reduced strength. Detached manpower operates within the OG's OSID and operation scope; OGs dissolve per lifecycle rules and personnel return to donors."
- **Systems Manual v0.9.0 §6.3**: OG activation borrows personnel from donors (min 200 per donor, min 500 total). Per-turn cohesion drain. Dissolves at cohesion < 15 or max_duration. Returns personnel to donors at dissolution. Formation kind `'og'`.
- **Game Bible / Systems Manual §3.3**: "Operational Groups may be formed temporarily and dissolve automatically under cohesion loss or command degradation. This models ad-hoc wartime organization without allowing permanent force inflation."

The OG entity exists in canon but is not wired into the primary offensive ops path. Pre-planned ops currently bypass the OG mechanic entirely, demanding whole-brigade march instead.

### Historical precedent

Balkan Battlegrounds and ICTY case law document the anchor-plus-donor pattern as the dominant VRS practice:

- **TG Krivaja-95** (Srebrenica, July 1995): Bratunac LtBde was the resident/anchor formation; Zvornik Bde, Milici Bde, Vlasenica Bde, Skelani Indep Bn contributed **battalion-strength elements without redeploying their parent brigades from their own zones** (ICTY *Krstić* IT-98-33-A §§ 117-134; BB2 p.508-517).
- **TG Igman / Operation Lukavac 93** (June-August 1993): SRK's Ilijaš and Igman Brigades anchored; Drina Corps and MUP donor elements (BB1 p.371-377).
- **TG Drina, TG Foča, TG Višegrad**: standing groupings with anchor brigades and rotating donor detachments (BB1 p.193-195; BB2 p.302-305).

The historical record is unambiguous: **donor brigades did not relocate.** They detached battalion-sized elements while holding home positions. The proposed engine refactor matches recorded VRS doctrine and ICTY-documented fact.

## Decision

Promote the canonical Operational Group entity to the primary offensive ops path. Every pre-planned and triggered offensive operation forms an OG (called "Tactical Group" in operator-facing surfaces; OG in engine internals to match canon) consisting of:

- **Exactly one anchor brigade**, physically committed: marches to staging, present at combat, holds captured territory.
- **Zero or more donor brigades**, each contributing a battalion-equivalent detachment without physically relocating. Donor `location_osid` is unchanged; donor sector defense continues with reduced effective strength.
- **Distance-falloff donation function**: a donor `BFS_hops` from staging contributes diminishing personnel and equipment.
- **Trickle-back on dissolution**: surviving lent personnel reintegrate into donor brigades; casualties are permanent losses to the donor.

Scope boundaries:
- Offensive operations only. Defensive sector mechanics unchanged.
- Behind feature flag `enable_tactical_groups`, default off until v2 is calibration-validated.
- Existing OG fields and lifecycle constants are reused; this ADR extends them, not replaces.
- No change to canon docs in v1. Systems Manual §6.3 may need a clarifying note in v2 that OGs are now the default offensive construct.

## Design

### Schema

Extend the canonical OG entity. Place under `state.military.tactical_groups: Record<TgId, TacticalGroup>` (top-level under military, matching the pattern used by `formations`, `brigade_history`, `casualty_ledger`).

```ts
export type TgId = string; // "tg:<corps_id>:<op_id>:<anchor_brigade_id>"
export type TgStatus = 'forming' | 'engaged' | 'recovering' | 'dissolved';

export interface TgDonorContribution {
  brigade_id: FormationId;
  distance_hops: number;            // BFS hops anchor→donor at TG formation; frozen
  personnel_lent: number;           // after falloff
  heavy_equipment_lent: { tanks: number; artillery: number; aa_systems: number };
  casualties_so_far: number;        // personnel killed; pro-rata bookkeeping
  equipment_losses_so_far: { tanks: number; artillery: number; aa_systems: number };
}

export interface TacticalGroup {
  id: TgId;
  corps_id: FormationId;
  op_id: string;
  anchor_brigade_id: FormationId;
  donor_contributions: TgDonorContribution[]; // sorted by brigade_id (strictCompare)
  location_osid: string;            // mirrors anchor.location_osid
  status: TgStatus;
  formed_on_turn: number;
  dissolved_on_turn?: number;
  cohesion: number;                 // canonical OG cohesion; drains per-turn per §6.3
}
```

Per-brigade donation accounting:

```ts
// Added to FormationState
personnel_lent_by_tg?: Record<TgId, number>;
equipment_lent_by_tg?: Record<TgId, { tanks: number; artillery: number; aa_systems: number }>;
```

A new pure helper `effectivePersonnel(brigade): number = brigade.personnel - sum(values(brigade.personnel_lent_by_tg))`. **All ~40+ existing consumers of `brigade.personnel`** (sector defense, supply, recruitment, morale, displacement) must switch to `effectivePersonnel`. This is the single largest silent-bug surface in the refactor and requires a lint rule plus an invariant test that walks all `.personnel` reads.

### Op lifecycle integration

Maps cleanly onto the existing 5-phase preparation in `operation_preparation.ts`:

| Phase | Today | With TG |
|-------|-------|---------|
| `intel_gathering` | commander surveys, sets briefing | **+ donor selection.** `selectDonors(op, anchor, state)` writes `op.donor_pool` with `{brigade_id, source_sector_id, distance_hops, donation_personnel, donation_equipment}` |
| `force_staging` | brigades march to staging; 60% assembly gate | **anchor march only.** Donor strength snapshot recorded but no physical decrement yet |
| `supply_check` | aggregate supply check | TG composite (anchor depot + donor depots weighted by hops) |
| `assessment` | commander go/no-go | unchanged |
| `ready` | transition to execution | **donor decrement fires here** — `donor.personnel_lent_by_tg[tg_id]` populated. Donors lose effective strength at this moment, not earlier. Avoids paying cost if op aborts in planning |

The 60% assembly gate (`areParticipantsReadyForExecution` in `sector_offensive.ts`) becomes:

```ts
anchorReady     = anchor.location_osid === axis.staging_osid
                  || isCommittedInTransitTo(anchor, axis.staging_osid)
donationReady   = sum(d.personnel_lent for d in pledged_donors) >= 0.6 * anchor.personnel
gate            = anchorReady && donationReady
```

Donors are "ready" instantly (no march). The donation threshold prevents lone-anchor suicide attacks.

### Distance falloff

Deterministic, BFS-hops based:

```
hops              = bfsDistance(donor.location_osid, axis.staging_osid, friendlyOsids)
if hops > MAX_OG_DONOR_DISTANCE (6): skip
donation_factor   = max(0.10, 1.0 - 0.15 * hops)
donation_cap      = 0.30 * donor.personnel
donation_pers     = floor(min(donor.personnel * donation_factor, donation_cap))
donation_equip    = floor(donor.equipment * donation_factor * 0.5)
```

Equipment falloff is intentionally harsher (×0.5) — heavy weapons rarely travel piecemeal. Required gates: `donor.cohesion >= COHESION_HEALTHY_THRESHOLD` and `donor.personnel - donation_pers >= MIN_ATTACK_PERSONNEL`.

Donor selection ordering: candidates sorted by `(distance_hops asc, brigade_id strictCompare asc)` before the falloff filter. Never sort by personnel — changes turn-to-turn introduce nondeterminism.

### Battle resolution

`bot_brigade_eval_attack.ts` treats anchor as the participant. Combat power is computed against a synthesized TG snapshot:

```
tg.personnel    = anchor.personnel + sum(donor.donation_personnel)
tg.equipment    = anchor.equipment + sum(donor.donation_equipment)
tg.cohesion     = personnel-weighted mean
tg.exhaustion   = anchor.exhaustion          // donors stay rested
```

**Concentration multiplier (`1 + N × 0.85`) does NOT apply to donors.** That multiplier reflects multiple physical brigades sharing frontage. Donors are not on the front. Other anchors converging on the same target still count for N. This intentionally keeps TG combat weaker than today's pile-on math — preserves combat caution and Pyrrhic identity.

Casualty distribution on a battle with `totalCasualties = C`:

```
anchor.personnel -= floor(C * 0.50)             // anchor floor: ≥50% non-negotiable
for each donor:
  share = donor.donation_personnel / sum(donations)
  donor.personnel -= floor(C * 0.50 * share)
```

Integer pro-rata via largest-remainder method, ties broken by donor brigade_id strictCompare. Equipment losses identical split. Cohesion damage applies only to anchor (donors didn't witness collapse).

### Trickle-back

On `execution → recovery` axis terminal:

- Survivors are already accounted for in `donor.personnel` (casualties debited live during battle). Trickle-back is a bookkeeping event only:
  - `donor.personnel_lent_by_tg[tg_id]` cleared
  - `donor.equipment_lent_by_tg[tg_id]` cleared
  - Event emitted: `tg_donor_returned { donor_id, lent, killed, returned }`
- **No second decrement.** Killed donor personnel are permanent losses, identical to any combat death.
- Donor brigade destroyed mid-op: lent personnel evaporate; `cleanupDissolvedLoans` already handles this for the existing partial loan system (`operation_reinforcement.ts`) — extend it for TG donations.

### Pyrrhic cost (the ratified constraint)

Donor cohesion bleed, locked for 8 turns, applied at donation moment (ready → execution transition):

```
donor_cohesion_loss = donated_fraction × (1 + bfs_hops × 0.15) × 15
```

A brigade donating 40% to an op 5 hops away loses ~11 cohesion locked for 8 turns. Distant donation becomes a real strategic cost. Prevents the fire-hose anti-pattern Game Designer flagged as the #1 Pyrrhic risk.

### Migration of existing pre-planned ops

Mechanical, not semantic:

- First brigade in legacy `brigades:` array → anchor
- Remaining brigades → `donor_candidates` (engine auto-augments via BFS from sister sectors, capped at `MAX_OG_DONOR_DISTANCE = 6`)
- Tool: `tools/migrate_ops_to_tg.ts` emits a diff for human review; **does not auto-apply** (op definitions are canon-adjacent and require operations-expert sign-off per session report `20260321_HERZEGOVINA_CALIBRATION_SESSION.md`)
- Op Prsten (the one that currently works) migrates last, after v1+v2 are stable on the broken ops

## Determinism Impact

- **Record iteration**: `tactical_groups` serialized via `sortedKeysForRecord`; `donor_contributions` stored as pre-sorted array (skip per-read sort)
- **Casualty pro-rata rounding**: integer-only, largest-remainder method, deterministic tiebreak by `brigade_id` strictCompare. Documented in `combat_math.ts`
- **Donor selection ordering**: `(distance_hops asc, brigade_id strictCompare asc)`. Never sort by personnel (changes turn-to-turn)
- **Distance hops**: computed once at TG formation, **frozen**. Recomputing each turn introduces graph-version drift risk
- **Map vs Record**: use Record (not Map) for `personnel_lent_by_tg` for serialization simplicity, consistent with existing schema patterns
- **Feature flag**: while `enable_tactical_groups = false`, schema fields exist but are unused. Hash byte-identity preserved against current n156 baseline (`3649b3861a87e6ea`)

## Phased Rollout

| Phase | Scope | Effort | Calibration discipline |
|-------|-------|--------|------------------------|
| **v1** | Anchor-only TG. Replace `areParticipantsReadyForExecution` with `isAnchorReady`. Anchor takes 100% casualties (identical to today's solo-brigade behavior). No donors yet. **Proves the architectural claim**: ops fire despite sector pinning. | ~150 LOC | Sign-off requires anchors 27/27, benchmarks 6/6, count % within ±2pp of n156 baseline |
| **v2** | Donor pool with fixed 25% donation (no falloff yet). Auto-discover via extended `operation_reinforcement.ts` BFS. TG power synthesis. 50/50 anchor/donor casualty split. Trickle-back as bookkeeping. Donation gate: TG total ≥ 60% × anchor personnel. | ~300 LOC | Highest cascade risk — donor selection touches sister-sector force economy. Full anchor & benchmark sweep required |
| **v3** | Distance falloff function. Equipment scaling (×0.5 of personnel factor). Pyrrhic cohesion bleed. Dissolution cleanup hooks. | ~150 LOC | Pure polish — can be deferred indefinitely if calibration is satisfactory at v2 |

Each phase ships behind `enable_tactical_groups`. Default flips on once v2 anchor/benchmark sweep is clean.

## Decisions Ratified (this ADR)

1. **Anchor + donor pattern** matches both canon §5.7 and historical VRS doctrine. Accepted.
2. **No concentration multiplier on donors** — combat math weaker than today's pile-on, preserving Pyrrhic caution. Accepted.
3. **Anchor casualty floor at 50%** — prevents distant-donor-shield exploits. Accepted.
4. **Auto-mechanical migration** of existing pre-planned ops (first brigade = anchor, rest = donor candidates). Diff emitted for human review; not auto-applied. Accepted.
5. **Pyrrhic constraint**: donor cohesion bleed `donated_fraction × (1 + hops × 0.15) × 15`, locked 8 turns. Accepted.
6. **Feature flag default off** until v2 calibration validation. Accepted.

## Open Questions

- **Canon naming**: canon uses "Operational Group" (OG); operator-facing surfaces in this ADR use "Tactical Group" (TG) per historical BiH usage. Should engine internals stay OG (canon-aligned) or adopt TG everywhere? **Recommendation**: engine internals = OG; UI/operator surfaces and op names = TG (matches historical record).
- **Defensive TGs**: historian noted TG Drina and TG Foča were standing defensive groupings. Out of scope for v1-v3 (offensive ops only). Track for future ADR.
- **TG attribution in `weekly_report.battles[]`**: schema proposal is one canonical battle entry with `attacker_tg_id?` + `attacker_brigades[]` (anchor first, donors sorted), plus sidecar `tg_attributions[]` for per-brigade detail. Calibration-stable (one battle per combat resolution, preserves "≥50 casualty = battle" heuristic). Final schema deferred to v2 implementation PR.

## Consequences

### Positive
- Resolves the late-war op stall affecting Trnovo, Pracha River, Zvezda 94 (and by extension Sana, Mistral 2 etc.)
- Aligns engine with canon §5.7 (which currently asserts an OG mechanic the engine does not fully implement on the primary ops path)
- Aligns engine with documented VRS historical practice (ICTY *Krstić*, BB1, BB2)
- Enables new strategic decisions: anchor selection, donor portfolio, distance-vs-quality tradeoffs, stripping-the-defensive-line vs offensive-opportunity tension
- Amplifies negative-sum identity — every op now bleeds 3-6 brigades, not 1

### Negative / Risk
- **Calibration cascade risk** (highest): current baseline depends partly on the stall. Initial v2 run may show +3-8% capture beyond Jan 1993 reference without ceilings. Mitigation: Pyrrhic cohesion bleed, donor gates (cohesion ≥ healthy, MIN_ATTACK_PERSONNEL guard), supply discipline preserved
- **Effective-personnel cascade** through ~40+ call sites — most pernicious silent-bug surface. Mitigation: lint rule + invariant test walking all `.personnel` reads
- **Schema migration** v33 → v34 — fixture rebuilds, golden hash re-floor on opt-in
- **Reintegration ambiguity** at edge cases (anchor destroyed mid-op, donor destroyed mid-op) requires explicit state machine documentation before v2

### Test Surface

New invariants test file `tg_invariants.test.ts` covering:
- `sum(personnel_lent_by_tg) ≤ brigade.personnel`
- Every `TgId` in `personnel_lent_by_tg` exists in `tactical_groups`
- `tactical_groups[id].donor_contributions` sorted by `brigade_id`
- Anchor brigade never appears in its own donor list
- `effectivePersonnel ≥ 0` for all brigades all turns
- On dissolve: `sum(casualties_so_far + reintegration_pending) == sum(personnel_lent)`

New integration test `tg_op_lifecycle.test.ts`:
- Op Trnovo fires at w69 with anchor = rs_trnovo_brigade, donors auto-discovered
- Eligible attacker count > 0 within `planning_duration` window
- Op transitions to execution; battle resolves; territory captured
- Recovery dissolves TG cleanly; donor personnel returned (less casualties)

Existing test surface that needs review for `effectivePersonnel` migration:
- `sector_defense.test.ts`
- `combat_math.test.ts`
- `recruitment.test.ts`
- `morale.test.ts`
- `displacement.test.ts`

## Canon References

- `docs/10_canon/Rulebook_v0_9_0.md` §5.7 "Operational Groups"
- `docs/10_canon/Systems_Manual_v0_9_0.md` §6.3 "Operational Groups (OSID model)"
- `docs/10_canon/Game_Bible_v0_9_0.md` §3.3 (canon authority for ad-hoc OG formation without permanent force inflation)
- `docs/10_canon/Engine_Invariants_v0_9_0.md` (determinism, sorted iteration, single-OSID-per-formation — all preserved)

## Historical & Diagnostic References

- ICTY *Krstić* Trial Judgement (IT-98-33-A) §§ 117-134 — TG Krivaja-95 anchor+donor composition
- Balkan Battlegrounds Vol I pp. 193-195, 371-377 — TG Igman / Lukavac 93; TG Drina, TG Višegrad
- Balkan Battlegrounds Vol II pp. 302-305, 508-517 — standing TGs; Srebrenica TG composition
- `docs/40_reports/20260321_HERZEGOVINA_CALIBRATION_SESSION.md` — operations-expert authority and sacred rules
- Session diagnostics 2026-05-28: n152 weekly_report.jsonl (Op Zvezda 94 13-turn zero_eligible_axis abort), n154 brigade_temporal_log (sector-pinning evidence), n156 byte-identical hash (home_osid alone insufficient)

## Ledger Entry

Add to `docs/PROJECT_LEDGER.md`:
```
## [2026-05-28] ADR-0005: Tactical Groups as primary ops path — Proposed
Promote canonical OG entity (Rulebook §5.7, Systems Manual §6.3) to primary offensive ops path. Anchor brigade physically commits; donor brigades contribute battalion-equivalent elements with distance falloff, no relocation. Pyrrhic cohesion bleed prevents fire-hose anti-pattern. Phased rollout v1/v2/v3 behind `enable_tactical_groups` flag. Resolves late-war op stall (Trnovo, Pracha River, Zvezda 94). See ADR-0005.
```
