# ADR-0005: Tactical Groups as the Primary Ops Path

## Status
Accepted (2026-05-28) — initial proposal 2026-05-28; major sync after Pyrrhic specialist convening 2026-05-28.

## Companion ADR

**ADR-0006: Sectors as Standing Operational Groups** — naming-layer reconciliation establishing that the engine's `corps_front_sectors` ARE the canonical standing-OG implementation. ADR-0005 (this doc) handles **temporary** OGs / TGs for offensive operations; ADR-0006 handles the **standing** OGs that own defensive AORs. Read together for the complete operational-group picture.

## Revision history
- **r1 (2026-05-28, AM)** — initial proposal. 6 decisions ratified; 3 open questions.
- **r2 (2026-05-28, AM)** — Hard Invariants section added after lead constraint discussion (one-TG-per-brigade, cooldown, per-brigade casualty).
- **r3 (2026-05-28, PM)** — major sync. Pyrrhic specialists convened (Historian, Game Designer, Technical Architect, Ops Expert + Gameplay Programmer). All open questions resolved. Army HQ Operations added as a major new section. v2 sub-staging reordered per risk analysis. Status promoted to Accepted.
- **r3.1 (2026-05-28, PM)** — Companion ADR-0006 added after sector-removal investigation. No scope change to ADR-0005; standing OGs ratified as a separate concern handled by ADR-0006.
- **r3.2 (2026-05-29)** — Schema-version correction. r3's Technical Architect report cited `CURRENT_SCHEMA_VERSION = 33` (stale info). Actual current version per `src/state/game_state.ts:42` is **18**. All "v33→v34" references corrected to "v18→v19". No design change.

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

Balkan Battlegrounds and ICTY case law document the anchor-plus-donor pattern as the dominant pattern at both corps and Main Staff levels:

**Corps-level TGs (intra-corps donor pool):**
- **TG Krivaja-95** (Srebrenica, July 1995, ~3,000–4,500 men): Bratunac LtBde was the resident/anchor formation; Zvornik IB, Milici LIB, Vlasenica LIB, Skelani Indep Bn contributed **battalion-strength elements without redeploying their parent brigades from their own zones** (ICTY *Krstić* IT-98-33-T transcripts 27–30 June 2000, cited at BB1 p.406 n.274; BB2 pp.508-509, 514-517).
- **TG Drina, TG Foča, TG Višegrad**: standing groupings with anchor brigades and rotating donor detachments (BB1 pp.193-195; BB2 pp.302-305).

**Main Staff cross-corps ops:**
- **Lukavac 93 / TG Igman** (Jun-Aug 1993, ~4,000–6,000 men): Mladić personally led. Cross-corps donors from **at least four corps + Main Staff**: SRK (Ilidža Bde, Igman Bn), Herzegovina Corps (2nd Hrz LIB), Drina Corps (Cajnice axis), plus Main Staff units (1st Guards Mot Bde, 65th Protection Regiment, Special Bde "Panthers") (BB1 pp.220-221; BB2 pp.417-418).
- **Cerska 93** (VRS, Jan-Apr 1993): cross-corps + cross-army (VJ paratroopers + Serbian RDB + VJ armored bn attached to Drina Corps) (BB1 p.220).
- **ARBiH Vozuća / Bosna OG** (Jun + Nov 1994, ~10,000+): explicitly "directly conducted by BH Army HQ." Donors from 2nd Corps (5 brigades) + 3rd Corps (4 brigades) (BB2 pp.508-509).
- **Sana 95 / Maestral 95** (Sept 1995): Delić + ARBiH General Staff transferred most of 7th Corps to reinforce 5th Corps in western Bosnia (BB1 p.419).

The historical record is unambiguous: **donor brigades did not relocate.** They detached battalion-sized elements while holding home positions. Cross-corps donor flow was **the exception for corps-level ops, the norm for Main Staff ops.**

### Federation coordination (NOT donation)

Post-Washington Agreement (Mar 1994), RBiH and HRHB coordinated but did NOT mix personnel at battalion or below. Konjic 1994 (BB2 p.514): HVO 56th "Herceg Stjepan" Regiment "faced toward the Serbs... provided marginal assistance to the ARBiH, but was never fully trusted." Operation Maestral / Sana 95 (BB1 pp.416-419): HV/HVO operated as one composite (OG North) under HV Gotovina; ARBiH 5th and 7th Corps operated on flanks under their own command. Transit corridors granted, no battalion-level cross-faction lending documented in BB. **The Federation as canonical entity is a coordination overlay (shared maps, timing windows, transit rights), never a donation conduit.**

## Decision

Promote the canonical Operational Group entity to the primary offensive ops path. Every pre-planned and triggered offensive operation forms a **Tactical Group** (TG — operator-facing surfaces; internally synonymous with canon's OG) consisting of:

- **Exactly one anchor brigade**, physically committed: marches to staging, present at combat, holds captured territory.
- **Zero or more donor brigades**, each contributing a battalion-equivalent detachment without physically relocating. Donor `location_osid` is unchanged; donor sector defense continues with reduced effective strength.
- **Distance-falloff donation function**: a donor `BFS_hops` from staging contributes diminishing personnel and equipment.
- **Trickle-back on dissolution**: surviving lent personnel reintegrate into donor brigades; casualties are permanent losses to the donor.

A separate **Army HQ Operation** entity supports faction-wide, cross-corps offensives (Krivaja-95, Vozuća, Lukavac-93 pattern). Capped at most once per year per faction. See §Army HQ Operations.

Scope boundaries:
- Offensive operations only. Defensive sector mechanics unchanged.
- Behind feature flag `enable_tactical_groups`, default off until v2 calibration sweep is clean.
- **No HVO↔ARBiH cross-faction donations** at any version, even post-Washington. Federation handled as parallel-axis coordination only.
- Existing OG fields and lifecycle constants are reused; this ADR extends them, not replaces.
- No change to canon docs in v1. Systems Manual §6.3 may need a clarifying note in v2 that OGs are now the default offensive construct.

## Design

### Constants reference

All named magic numbers, in one place for tuning discipline:

| Constant | Value | Owner | Notes |
|---|---|---|---|
| `MAX_OG_DONOR_DISTANCE` | 6 (BFS hops) | distance falloff | Hard ceiling; donors beyond skip |
| `MAX_CONCURRENT_TGS_PER_FACTION` | **4** | game design | Per Game Designer; tune up only if v2 starves late-war ops |
| `MAX_TGS_PER_CORPS` | 2 | game design | Matches typical multi-axis op shape |
| `TG_DONOR_COOLDOWN_TURNS` | 6 | hard invariant #2 | Per brigade after TG dissolution |
| `TG_MAX_LIFECYCLE_TURNS` | 12 | canon §6.3 | Aligns with existing OG max_duration |
| `MIN_BRIGADE_PERSONNEL_AFTER_DONATION` | **scaled by kind** | game design | Motorized 1000, light infantry 600, militia 400 |
| `ARMY_HQ_OP_COOLDOWN_TURNS` | 52 | Army HQ ops | 1 year minimum spacing |
| `MAX_ARMY_HQ_OPS_PER_FACTION_PER_YEAR` | 2 | Army HQ ops | Historical ceiling per Historian |
| `ARMY_HQ_TG_CAP_REDUCTION` | 2 | Army HQ Pyrrhic cost | Reduces faction TG cap during Army HQ op + 4 turns |
| `ARMY_HQ_COHESION_BLEED_MULT` | 2.0× | Army HQ Pyrrhic cost | Multiplier on donor cohesion bleed for Army HQ donors |
| `COHESION_HEALTHY_THRESHOLD` | existing | donor eligibility | Already canonical; reuse |
| `MIN_ATTACK_PERSONNEL` | existing | donor eligibility | Already canonical; reuse |

### Schema

Extend the canonical OG entity. Place `tactical_groups` under `state.military` top-level (matches `formations`, `brigade_history`, `casualty_ledger` pattern).

```ts
export type TgId = string; // "tg:<corps_id>:<op_id>:<anchor_brigade_id>"
export type ArmyHqOpId = string; // "ahq:<faction_id>:<scenario_year>:<op_name>"
export type TgStatus = 'forming' | 'engaged' | 'recovering' | 'dissolved';

export interface TgDonorContribution {
  brigade_id: FormationId;
  source_corps_id: FormationId;     // tracks cross-corps lineage
  distance_hops: number;            // BFS hops anchor→donor at TG formation; frozen
  personnel_lent: number;           // after falloff
  heavy_equipment_lent: { tanks: number; artillery: number; aa_systems: number };
  casualties_so_far: number;        // per Hard Invariant #3
  equipment_losses_so_far: { tanks: number; artillery: number; aa_systems: number };
  cohesion_bleed_applied: number;   // per Pyrrhic cost section; locked 8 turns
}

export interface TacticalGroup {
  id: TgId;
  corps_id: FormationId;             // anchor's corps; ownership backref
  op_id: string;                     // CorpsOperation.id (or ArmyHqOpId for HQ ops)
  army_hq_op_id?: ArmyHqOpId;        // when set, this TG is part of an Army HQ op
  anchor_brigade_id: FormationId;
  donor_contributions: TgDonorContribution[]; // pre-sorted by brigade_id (strictCompare)
  location_osid: string;             // mirrors anchor.location_osid
  status: TgStatus;
  formed_on_turn: number;
  dissolved_on_turn?: number;
  cohesion: number;                  // canonical OG cohesion; drains per-turn per §6.3
}

export interface ArmyHqOperation {
  id: ArmyHqOpId;
  faction_id: FactionId;
  name: string;                      // historical name preferred: "Krivaja-95", "Vozuća 94"
  anchor_corps_id: FormationId;      // corps owning the anchor brigade
  donor_corps_ids: FormationId[];    // any same-faction corps with eligible brigades
  tg_id?: TgId;                      // active TG carrying out the op (set at TG formation)
  status: 'queued' | 'planning' | 'executing' | 'recovering' | 'completed';
  formed_on_turn: number;
  scenario_year: number;             // floor((started_turn - 1) / 52); for once-per-year gate
}
```

Per-brigade donation accounting (added to `FormationState`):

```ts
// Current donation state — cleared on TG dissolution
personnel_lent_by_tg?: Record<TgId, number>;
equipment_lent_by_tg?: Record<TgId, { tanks: number; artillery: number; aa_systems: number }>;

// Cooldown gate (Hard Invariant #2)
tg_cooldown_until_turn?: number;     // absolute turn count; donor candidate filter

// Anti-fire-hose (per-scenario donation cap)
tg_donations_this_scenario?: number; // increments at each donation; capped per design
```

Per-brigade historical participation log (separate from current state — lives in `brigade_history`):

```ts
interface TgParticipationRecord {
  tg_id: TgId;
  role: 'anchor' | 'donor';
  formed_turn: number;
  dissolved_turn: number;
  personnel_lent_peak: number;
  personnel_returned: number;
  casualties: number;
  army_hq_op_id?: ArmyHqOpId;
}

// In state.military.brigade_history[brigade_id]:
tg_participations: TgParticipationRecord[];           // rolling 26-turn window
archived_tg_participations?: TgParticipationRecord[]; // older history, lazy-loaded
```

Faction-level frequency tracking for Army HQ ops:

```ts
// In state.military:
army_hq_last_op_turn: Record<FactionId, number | undefined>;
army_hq_op_count_by_year: Record<FactionId, Record<number, number>>; // year → count
```

A new pure helper `effectivePersonnel(brigade): number = brigade.personnel - sum(values(brigade.personnel_lent_by_tg))`. **All ~40+ existing consumers of `brigade.personnel`** (sector defense, supply, recruitment, morale, displacement) must switch to `effectivePersonnel`. Enforcement is via build-time ESLint rule (see §Build-Time Enforcement) + an invariant test that walks all `.personnel` reads.

### Cross-corps donor permission (regular TGs)

**Rule: adjacent-corps allowed.** A corps `B` may donate to corps `A`'s TG iff there exists at least one OSID in `B`'s assigned front sectors that is BFS-adjacent to an OSID in `A`'s assigned front sectors.

- Implementation: pre-computed `corpsAdjacency: Record<corpsId, corpsId[]>` cached per turn in `state.military.corps_command_meta`; refreshed when sector boundaries change.
- Bot AI candidate pool for any TG = "own corps ∪ adjacent corps."
- Cross-faction donations stay forbidden (HVO↔ARBiH filter in `selectDonors`), regardless of alliance state.
- Historical fit: matches Krivaja-95 (single-corps), accommodates Lukavac-93's SRK↔Drina↔Herzegovina flow (all adjacent), excludes implausible Banja Luka→Drina Corps moves.

### Army HQ Operations

A faction-level command construct for cross-corps offensives. Models the documented historical pattern of Main Staff-led ops (VRS: Krivaja-95, Lukavac 93, Cerska 93; ARBiH: Vozuća 94, Sana 95).

**Eligibility gate:**
- `current_turn - army_hq_last_op_turn[faction] >= 52` AND
- `army_hq_op_count_by_year[faction][current_year] === 0` (year-boundary defense)
- Faction has at least one corps with cohesion ≥ healthy threshold
- Scenario-defined trigger condition (scripted events or open trigger logic)

**Donor pool:** ALL same-faction corps regardless of adjacency. Bypasses the regular adjacent-corps rule. Distance falloff still applies.

**Storage:** separate `state.military.army_hq_operations: Record<ArmyHqOpId, ArmyHqOperation>`, NOT in any `corps_command[id].active_operations`. The anchor brigade's `current_operation_id` still links to the op for brigade-AI objective resolution, but corps slot bookkeeping (`isSlot0AvailableForQueue`) is unaffected.

**Pipeline placement:** new war-phase step `inject-army-hq-operations` immediately after `inject-queued-operations` (war_phases.ts ~line 984). Iterates eligible Army HQ op defs in sorted id order; injects the first that fires the eligibility gate.

**Pyrrhic cost (compounds regular TG costs):**
1. **Faction TG cap reduction:** while an Army HQ op is `planning` or `executing`, `MAX_CONCURRENT_TGS_PER_FACTION` for that faction is reduced by `ARMY_HQ_TG_CAP_REDUCTION = 2`. Reduction persists for `4 turns` after Army HQ op enters `recovering`. Forces other ops to go quiet during the major effort.
2. **Doubled cohesion bleed:** all donor cohesion losses for an Army HQ op are multiplied by `ARMY_HQ_COHESION_BLEED_MULT = 2.0×`. A donor that would lose 11 cohesion for a regular TG loses ~22 for an Army HQ op (still locked 8 turns).

**Frequency cap:** `MAX_ARMY_HQ_OPS_PER_FACTION_PER_YEAR = 2`. Matches the Historian's record (peak years saw 2; average ~1.3). 52-week cooldown between ops prevents back-to-back.

**Lifecycle:** Army HQ op forms one TG (its anchor + donors); when TG dissolves, Army HQ op enters `recovering`; completes when all per-TG cleanup done. No multi-TG Army HQ ops in v3 (defer to future ADR if needed for ops like Lukavac-93's 4-corps composition).

### Op lifecycle integration (5-phase preparation)

Maps onto existing `operation_preparation.ts` phases:

| Phase | Today | With TG |
|-------|-------|---------|
| `intel_gathering` | commander surveys, sets briefing | **+ donor pool selection.** `selectDonors(op, anchor, state)` writes `op.donor_pool` |
| `force_staging` | brigades march to staging; 60% assembly gate | **anchor march only.** Donor strength snapshot recorded but no physical decrement yet |
| `supply_check` | aggregate supply check | TG composite (anchor depot + donor depots weighted by hops) |
| `assessment` | commander go/no-go | unchanged; now also gates on donor pool size |
| `ready` | transition to execution | **donor decrement fires here AND cohesion bleed locks in.** `donor.personnel_lent_by_tg[tg_id]` populated. Avoids paying cost if op aborts in planning |

The readiness gate (`areParticipantsReadyForExecution` in `sector_offensive.ts`, more precisely `axisHasExecutableOpeningAttack` in `sector_offensive_launch_helpers.ts`) becomes:

```ts
anchorReady     = anchor.location_osid === axis.staging_osid
                  || isCommittedInTransitTo(anchor, axis.staging_osid)
donationReady   = sum(d.personnel_lent for d in pledged_donors) >= 0.6 * anchor.personnel
gate            = anchorReady && donationReady
```

Donors are "ready" instantly (no march). The donation threshold prevents lone-anchor suicide attacks.

**Edge case — donor destroyed between `intel_gathering` and `ready`:** proceed minus that donor. No re-selection (would introduce nondeterminism dependent on which donor died and when). No cancel (would make late-prep ops brittle). The 60% donation gate at `assessment` re-evaluates after silent skip; if below 60%, op aborts naturally with `recovery_reason = "insufficient_force"`.

**Edge case — anchor destroyed between `intel_gathering` and `ready`:** op cancels immediately (anchor exclusivity, no fallback). `recovery_reason = "anchor_destroyed"`. All donor pool refs cleared. No cohesion bleed (never paid).

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

Equipment falloff is intentionally harsher (×0.5) — heavy weapons rarely travel piecemeal. Required gates: `donor.cohesion >= COHESION_HEALTHY_THRESHOLD` AND `donor.personnel - donation_pers >= MIN_BRIGADE_PERSONNEL_AFTER_DONATION` (scaled by brigade kind).

**Donor selection ordering:** candidates sorted by `(distance_hops asc, corps_id strictCompare asc, brigade_id strictCompare asc)` — distance primacy matches falloff intent; corps_id tiebreak biases donor portfolios toward fewer C2 nodes; brigade_id final tiebreak ensures determinism. Never sort by personnel (changes turn-to-turn).

### Battle resolution

`bot_brigade_eval_attack.ts` treats anchor as the participant. Combat power is computed against a synthesized TG snapshot:

```
tg.personnel    = anchor.personnel + sum(donor.donation_personnel)
tg.equipment    = anchor.equipment + sum(donor.donation_equipment)
tg.cohesion     = personnel-weighted mean
tg.exhaustion   = anchor.exhaustion          // donors stay rested
```

**Concentration multiplier (`1 + N × 0.85`) does NOT apply to donors.** That multiplier reflects multiple physical brigades sharing frontage. Donors are not on the front. Other anchors converging on the same target still count for N.

Casualty distribution on a battle with `totalCasualties = C`:

```
anchor.personnel -= floor(C * 0.50)             // anchor floor: ≥50% non-negotiable
for each donor:
  share = donor.donation_personnel / sum(donations)
  donor.personnel -= floor(C * 0.50 * share)
```

Integer pro-rata via largest-remainder method, ties broken by donor `brigade_id` strictCompare. Equipment losses identical split. Cohesion damage applies only to anchor (donors didn't witness collapse). Per-donor casualty tally recorded in `donor.casualties_so_far` for the brigade ledger.

**Casualties cannot exceed donated amount.** Hard invariant: `donor.casualties_so_far ≤ donor.personnel_lent`. If a battle would push beyond, cap at lent and silently dissolve that donor's contribution from the TG (donor exits the op, returns its survivors immediately, no further casualties charged).

### Trickle-back

On `execution → recovery` axis terminal:

- Survivors are already accounted for in `donor.personnel` (casualties debited live during battle). Trickle-back is bookkeeping:
  - `donor.personnel_lent_by_tg[tg_id]` cleared
  - `donor.equipment_lent_by_tg[tg_id]` cleared
  - `TgParticipationRecord` appended to `brigade_history[donor_id].tg_participations[]`
  - Event emitted: `tg_donor_returned { donor_id, lent, killed, returned }`
- **No second decrement.** Killed donor personnel are permanent losses, identical to any combat death.
- **Donor brigade destroyed mid-op:** lent personnel evaporate; `cleanupDissolvedLoans` already handles this for the existing partial loan system (`operation_reinforcement.ts`) — extend for TG donations.
- **Anchor destroyed mid-op:** TG dissolves immediately. Donors take their survivor returns (no further casualties charged). **Captured territory reverts to contested unless a non-TG friendly brigade is 1-hop adjacent.** Prevents zombie-TG territory holds.

### Pyrrhic cost (ratified)

Donor cohesion bleed, locked for 8 turns, applied at `ready` transition:

```
donor_cohesion_loss = donated_fraction × (1 + bfs_hops × 0.15) × 15
  × (army_hq_op_id ? ARMY_HQ_COHESION_BLEED_MULT : 1.0)
```

A brigade donating 40% to a regular op 5 hops away loses ~11 cohesion (locked 8 turns). The same donation to an Army HQ op loses ~22 cohesion (Army HQ multiplier). Distant donation becomes a real strategic cost. Prevents the fire-hose anti-pattern.

### Hard invariants

These rules are non-negotiable. Each is enforced by a runtime check at the relevant lifecycle hook AND an invariant test in `tg_invariants.test.ts`.

1. **One-TG-per-brigade exclusivity.** A brigade may be a donor (or anchor) on at most ONE active TG at any turn. Enforced at TG formation (`selectDonors`) — candidates are filtered to exclude any brigade with `personnel_lent_by_tg` non-empty or appearing as `anchor_brigade_id` in another active TG. Test assertion: `for every brigade, |keys(personnel_lent_by_tg)| ≤ 1`.

2. **Donor recovery cooldown.** After a TG dissolves, every brigade that participated (anchor + donors) is excluded from contributing to a new TG for `TG_DONOR_COOLDOWN_TURNS = 6` turns. Field: `tg_cooldown_until_turn`. Set at dissolution. Donor selection filters out brigades with `tg_cooldown_until_turn > current_turn`. Test assertion: no TG has a participant whose cooldown window overlaps formation turn.

3. **Per-brigade casualty calculation.** Casualties are computed per contributing brigade. Each `TgDonorContribution` tracks `casualties_so_far` independently. Anchor casualties recorded on anchor brigade directly. Battle entry carries `attacker_tg_id` + `attacker_brigades[]`; per-brigade detail flows to `tg_attributions[]` sidecar. Test assertions: (a) `sum(donor.casualties_so_far) + anchor.casualties == battle_casualties_total`; (b) every brigade history entry attributes to a specific battle; (c) no double-counting across `tg_attributions` rows.

4. **No nested TGs.** A TG cannot be a donor to another TG. Anchor cannot also be a donor of its own TG. Test assertion: invariant by construction (donor list is brigade ids only, never TG ids).

5. **Casualties capped at donated amount.** Per-donor casualties ≤ personnel_lent. Overflow triggers silent contribution dissolution (donor exits TG, survivors return).

6. **Anchor destruction → TG dissolution.** Anchor brigade falls below `MIN_ATTACK_PERSONNEL` or cohesion floor → TG status flips to `dissolved` immediately. Donors silently return their survivors. Held territory reverts to contested unless 1-hop-adjacent friendly non-TG brigade present.

7. **One Army HQ op per faction per year.** `MAX_ARMY_HQ_OPS_PER_FACTION_PER_YEAR = 2` ceiling, `ARMY_HQ_OP_COOLDOWN_TURNS = 52` cooldown. Both gates checked; both must pass.

8. **No anchor swap mid-op.** Once a TG is `forming` or `engaged`, its `anchor_brigade_id` is immutable. Anchor loss → TG dissolution (invariant 6), not anchor replacement.

9. **No same-composition TG reformation within cooldown.** Hash `(anchor_id + sorted_donor_ids)` checked at TG formation. Match against recently-dissolved TGs within cooldown window → block formation. Prevents "dissolve and reform same TG via different op_id" abuse.

10. **No HVO↔ARBiH cross-faction donations.** `selectDonors` faction filter is strict same-faction match, regardless of alliance state. Federation coordination handled via parallel axes only.

### Migration of existing pre-planned ops

Mechanical first-brigade-is-anchor rule applies, with **hand-review flags** for 4 ops where the rule produces wrong picks. The migration tool `tools/migrate_ops_to_tg.ts` emits a diff for operations-expert review; **does not auto-apply** (op definitions are canon-adjacent per session report `20260321_HERZEGOVINA_CALIBRATION_SESSION.md`).

**Auto-migration safe (anchor pick correct):** Op Brčko Corridor, Op Drina (zvornik_sweep + bratunac_vlasenica axes individually), Op Foca, Op Mistral 2, Op Trnovo (current state).

**Hand-review required:**

| Op / axis | Issue | Required action |
|---|---|---|
| Op Podrinje Sweep / `rogatica_sokolac` | First brigade `rs_1st_vlasenica` is wrong anchor (staging is Rogatica; brigade is sister-corps sector-defender) | Set anchor = `rs_5th_podrinje` or `rs_1st_podrinje`; vlasenica becomes donor candidate |
| Op Drina / `bratunac_vlasenica` AND Op Podrinje Sweep / `srebrenica_ring` | Both want `rs_1st_bratunac` as anchor → violates Hard Invariant #1 | Sequence the ops (queue ordering) or split anchor between them |
| Op Visegrad / `visegrad_seizure` | JNA phantoms as donors (3 listed) evaporate w6-w8 — donations vanish mid-op | Replace JNA phantom donors with VRS sister-sector candidates; or accept anchor-only (no donor pool) |
| Op Prsten / `ilijas_ring` | All three brigades are JNA phantoms — first-brigade rule picks phantom that evaporates | **Stay on legacy path until v2 validation complete** (per ADR original guidance: migrate Op Prsten last); requires VRS anchor backfill before TG migration |

**Triggered ops** (`triggered_operations.ts`, 7 ops) get the same TG treatment via shared `selectDonors` / `isAnchorReady` helpers. No separate pipeline. Krivaja-95 and Stupčanica-95 specifically REQUIRE donor mechanics — they're the canonical use case.

**Bot AI ops** (`bot_corps_operations.ts`): minimal change. Existing `buildEmergencyDefenseOperation` and `buildProbeOperation` already pick a single brigade — that brigade becomes anchor for free. Wrap result: `op.anchor_brigade_id = brigade.id; op.donor_candidates = selectDonors(op, brigade, state)`. Add `op_kind_donor_policy: 'full' | 'limited' | 'none'` — emergency ops use `limited` (max 2 donors, ×0.5 cohesion bleed mult), probes use `none` (low-commitment by design).

## Build-Time Enforcement

The `effectivePersonnel` cascade is the single largest silent-bug surface. Runtime invariant tests catch leaks AFTER they happen; we need build-time prevention.

**Custom ESLint rule:** `awwv/no-raw-brigade-personnel`, in a new package `eslint-plugin-awwv/`.

- Type-checked rule (uses `@typescript-eslint/utils` parserServices) — flags any `MemberExpression` matching `/\.personnel$/` where the object's TS type is `FormationState`.
- Allowlist via comment: `// eslint-disable-next-line awwv/no-raw-brigade-personnel -- writing personnel, not reading`. Disable requires a reason string (rule option `requireDisableReason: true`).
- CI gate: add `npm run lint:tg` to the smoke-test triad; fail build on any unwhitelisted hit.
- Secondary belt-and-braces: runtime invariant test walks all `.personnel` reads and asserts `effectivePersonnel` parity — catches if lint rule is ever bypassed.

Legitimate write sites (recruitment, casualty application, trickle-back) get the disable comment with a reason at the time the rule lands.

## Determinism Impact

- **Record iteration**: `tactical_groups`, `army_hq_operations`, `personnel_lent_by_tg` all serialized via `sortedKeysForRecord`. `donor_contributions` stored as pre-sorted array (skip per-read sort).
- **Casualty pro-rata rounding**: integer-only, largest-remainder method, deterministic tiebreak by donor `brigade_id` strictCompare. Documented in `combat_math.ts`.
- **Donor selection ordering**: `(distance_hops asc, corps_id strictCompare asc, brigade_id strictCompare asc)`. Never sort by personnel (changes turn-to-turn).
- **Distance hops**: computed once at TG formation, **frozen**. Recomputing each turn introduces graph-version drift risk.
- **Schema-stable, behavior-flagged.** v19 schema ships with ALL TG fields present and empty. While `enable_tactical_groups = false`, serializer omits empty Records from hash input via existing `omitEmpty` helper. **Goal: n156 baseline `3649b3861a87e6ea` survives byte-identical post-migration with flag off.** Gold-blocker gate before any TG behavior PR merges.
- **Sub-flag gating.** v2.0/v2.1/v2.2/v2.3 are *behavioral* sub-stages gated by sub-flags within v19 (`enable_tg_formation`, `enable_tg_combat_synthesis`, `enable_tg_cohesion_bleed`). Schema forward-compatible from day 1; behavior turns on incrementally. Pattern from v0.8 `enable_command_chain` rollout.

## Phased Rollout

Sub-stages reordered from naïve sequential to **risk-isolated** order per Ops Expert analysis. Calibration-neutral stages first; structurally-risky combat synthesis isolated to one sub-stage. Each sub-stage = one calibration run per sacred rule.

| Stage | Scope | Effort | Calibration impact |
|---|---|---|---|
| **v1** | Anchor-only readiness gate. `ENABLE_TACTICAL_GROUPS` flag added. `getAnchorBrigade(axis)` helper. When flag on, `axisHasExecutableOpeningAttack` iterates `[anchor]` only. Combat math unchanged. Anchor takes 100% casualties (identical to today's solo-brigade). | ~150 LOC | Flag off: byte-identical to n156. Flag on: smoke-test only; no production baseline. |
| **v2.0** | Donor pool selection + TG formation. `tactical_groups` Record populated. `army_hq_operations` scaffold (entity exists, no triggers wired). v18→v19 schema migration ships here (all fields, including v2.1-v2.3 fields). Casualty distribution stays at v1 behavior (100% anchor). | ~250 LOC + migration | Calibration-neutral (donors form but don't fight; flag-gated). n156 baseline preserved with sub-flags off. |
| **v2.1** | Casualty distribution math (`distributeCasualtiesAcrossTg`). Unit-tested against synthetic battles. Wired but DORMANT until v2.2 — there are no donor casualties yet (donors don't contribute to combat). | ~120 LOC | Calibration-neutral (additive math; dead code path until v2.2 lights it up). |
| **v2.2** | TG combat power synthesis. Donors contribute to `tg.personnel`/`tg.equipment`. Battles use TG snapshot. **Calibration baseline shifts here.** Distribution code from v2.1 lights up. 60% donation gate enforced. | ~200 LOC | **Highest cascade risk.** Late-war ops transition from "fires-and-fails" to "fires-and-fights." Full anchor/benchmark sweep required. Expect +3-8% capture before Pyrrhic dampener lands at v2.3. |
| **v2.3** | Cohesion bleed (`donor_cohesion_loss` formula). Cooldown enforcement (`TG_DONOR_COOLDOWN_TURNS`). Same-composition reformation block. Per-scenario donation cap. | ~150 LOC | Pyrrhic dampener. Tunable per-faction multiplier from day 1. |
| **v3.0** | Army HQ Operations wired (eligibility gates, pipeline step, frequency cap, Pyrrhic cost multipliers). Krivaja-95 / Vozuća-94 ops scripted. | ~250 LOC | New op type, capped frequency. Add to Sept 1995 calibration window separately. |

Sign-off gates per stage: anchors 27/27, benchmarks 6/6, count % within ±2pp of prior baseline (with calibration shifts at v2.2 and v3.0 acknowledged in advance — those re-floor the baseline, not preserve it).

## Decisions Ratified (this ADR)

1. **Anchor + donor pattern** matches canon §5.7 and historical VRS doctrine.
2. **No concentration multiplier on donors** — preserves Pyrrhic combat caution.
3. **Anchor casualty floor at 50%** — prevents distant-donor-shield exploits.
4. **Auto-mechanical migration** of existing pre-planned ops (first brigade = anchor, rest = donor candidates). 4 ops flagged for hand review.
5. **Pyrrhic constraint**: donor cohesion bleed `donated_fraction × (1 + hops × 0.15) × 15`, locked 8 turns. Army HQ ops multiply by 2.0×.
6. **Feature flag default off** until v2.2 calibration validation.
7. **Per-faction concurrent TG cap = 4** (tight; forces strategic prioritization).
8. **Per-corps concurrent TG cap = 2** (matches typical multi-axis op shape).
9. **MIN_BRIGADE_PERSONNEL_AFTER_DONATION scaled by brigade kind**: motorized 1000, light infantry 600, militia 400.
10. **v2 sub-stage order**: v2.0 (formation) → v2.1 (distribution math, dormant) → v2.2 (combat synthesis, calibration shift) → v2.3 (Pyrrhic dampener). Isolates calibration shift to one stage.
11. **Schema migration**: ONE v18→v19 bump at v2.0 with all fields. Behavior gated by sub-flags within v19.
12. **`effectivePersonnel` enforcement**: build-time ESLint rule + runtime invariant test (belt-and-braces).
13. **Cross-corps regular TGs**: adjacent-corps allowed (sector-adjacency BFS check). HVO↔ARBiH stays forbidden at all versions.
14. **Federation coordination**: parallel-axis only, no cross-faction donations even post-Washington.
15. **Army HQ Operations** as separate entity at `state.military.army_hq_operations`. 1/year minimum spacing, 2/year ceiling, separate pipeline step, doubled cohesion bleed + faction TG cap reduction.
16. **Anchor destruction → TG dissolution**; captured territory reverts to contested unless 1-hop-adjacent non-TG friendly present.
17. **Per-brigade history**: rolling 26-turn window in `brigade_history.tg_participations`; older flushed to `archived_tg_participations`.
18. **Engine naming**: "Tactical Group" for operator/UI surfaces; "OG" maintained in canon doc references. Internal types use `TacticalGroup` for clarity.

## Consequences

### Positive
- Resolves the late-war op stall (Trnovo, Pracha River, Zvezda 94, Sana, Mistral 2).
- Aligns engine with canon §5.7 (currently asserts OG mechanic the engine bypasses on primary ops path).
- Aligns engine with documented BiH-war historical practice (ICTY *Krstić*, BB1, BB2).
- Enables new strategic decisions: anchor selection, donor portfolio, distance-vs-quality tradeoffs, sector-stripping vs offensive-opportunity tension.
- Army HQ Operations model the historically-attested Main Staff offensives (Krivaja-95, Vozuća 94, Lukavac 93) that have no faithful representation today.
- Amplifies negative-sum identity — every op now bleeds 3-6 brigades, not 1. Reserve doctrine emerges organically as a player strategy.

### Negative / Risk
- **Calibration cascade risk** (highest): current baseline depends partly on the stall. v2.2 will shift the baseline; v2.3 must dampen, not over-dampen. Plan: parallel baselines (n156 v18-compat + new v19-with-TG-enabled) until v2.3 stabilizes.
- **Effective-personnel cascade** through ~40+ call sites. Mitigation: build-time ESLint rule + runtime invariant test.
- **Faction asymmetry**: VRS has more brigades per corps → more donor candidates → can spin more TGs. Caps mitigate but don't eliminate. May need per-faction cap tuning post-v2.2.
- **Schema migration** v18 → v19 — single big bump, schema-stable, behavior-flagged. Migration is one-way (no v19→v18 downgrade — personnel ledger has no v18 representation).
- **Per-brigade history growth**: bounded by rolling 26-turn window. Older entries flushed to lazy-loaded archive. Save size impact: ~1-2% growth over 188w campaign.
- **Bot AI vs player asymmetry**: bot picks donors automatically; player picks manually. Mitigation: smart defaults (auto-pick per BFS) with one-click override. UI work in post-engine PR.
- **Cognitive load on player**: every op gains a donor decision. Mitigation: defer to a "Decision Room" affordance with sensible defaults; high-stakes Army HQ ops get a dedicated briefing.

### Test Surface

New test files:
- `tg_invariants.test.ts` — 10 hard invariants (one per ratified rule).
- `tg_op_lifecycle.test.ts` — formation → engagement → dissolution; Op Trnovo specific.
- `tg_cooldown.test.ts` — cooldown gates work correctly across save/load.
- `tg_casualty_attribution.test.ts` — per-brigade ledger fidelity.
- `tg_determinism.test.ts` — donor selection sort order, casualty pro-rata, save round-trip.
- `army_hq_op.test.ts` — frequency cap, year-boundary defense, Pyrrhic cost multipliers.

Existing test surface needing review for `effectivePersonnel` migration:
- `sector_defense.test.ts`, `combat_math.test.ts`, `recruitment.test.ts`, `morale.test.ts`, `displacement.test.ts`.

## Canon References

- `docs/10_canon/Rulebook_v0_9_0.md` §5.7 "Operational Groups"
- `docs/10_canon/Systems_Manual_v0_9_0.md` §6.3 "Operational Groups (OSID model)", §3.3 "Formation types"
- `docs/10_canon/Game_Bible_v0_9_0.md` §3.3 (canon authority for ad-hoc OG formation without permanent force inflation)
- `docs/10_canon/Engine_Invariants_v0_9_0.md` (determinism, sorted iteration, single-OSID-per-formation — all preserved)

## Historical & Diagnostic References

- ICTY *Krstić* Trial Judgement (IT-98-33-A) §§ 117-134, transcripts 27-30 June 2000 — TG Krivaja-95 anchor+donor composition
- Balkan Battlegrounds Vol I pp. 178 (VRS shuttle pattern; ARBiH local-corps norm), 192-195 (HV/HVO Cagalj/Tiger), 220-222 (1993 VRS Main Staff offensives, Mladić personal command), 371-377 (Lukavac 93 cross-corps), 406 n.274 (Krivaja-95 ICTY cite), 416-419 (Maestral/Sana 95 joint planning), 535 (operations index)
- Balkan Battlegrounds Vol II pp. 302-305 (standing TGs), 417-418 (Lukavac 93 cross-corps + Mladić first-person), 508-509 (Vozuća "directly conducted by BH Army HQ"), 514 (Konjic 1994 HVO-ARBiH coordination only)
- `docs/40_reports/20260321_HERZEGOVINA_CALIBRATION_SESSION.md` — operations-expert authority and sacred rules
- Session diagnostics 2026-05-28: n152 weekly_report.jsonl (Op Zvezda 94 13-turn zero_eligible_axis abort), n154 brigade_temporal_log (sector-pinning evidence), n156 byte-identical hash (home_osid alone insufficient)
- Pyrrhic specialist convening 2026-05-28 (PM): Historian (BiH TG composition + Main Staff op frequency), Game Designer (caps, sub-staging, Army HQ Pyrrhic cost), Technical Architect (Army HQ entity placement, schema cadence, ESLint enforcement), Ops Expert + Gameplay Programmer (pipeline integration, migration hand-review cases, sub-stage risk order)

## Ledger Entry

Add to `docs/PROJECT_LEDGER.md`:
```
## [2026-05-28] ADR-0005 (r3): Tactical Groups + Army HQ Operations — Accepted
Promote canonical OG entity (Rulebook §5.7, Systems Manual §6.3) to primary offensive ops path. Anchor brigade physically commits; donor brigades contribute battalion-equivalent elements with distance falloff, no relocation. Pyrrhic cohesion bleed prevents fire-hose. NEW: Army HQ Operations entity for faction-wide cross-corps offensives (Krivaja-95, Vozuća 94 pattern), capped 2/year/faction with doubled cohesion cost. NO HVO↔ARBiH donations (Federation = coordination only). Phased rollout v1 → v2.0/2.1/2.2/2.3 → v3.0 behind `enable_tactical_groups` flag + sub-flags. Resolves late-war op stall (Trnovo, Pracha River, Zvezda 94). See ADR-0005.
```
