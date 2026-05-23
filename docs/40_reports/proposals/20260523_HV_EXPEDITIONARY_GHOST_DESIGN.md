# HV Expeditionary Brigades as Phantom Formations — 1995 Second Wave

**Date:** 2026-05-23
**Author:** synthesis pass
**Question:** Can we imitate the JNA ghost-brigade mechanic for HV expeditionary brigades post-Split Agreement (22 July 1995)?

**Short answer:** Yes — and the mechanic already exists. `src/sim/combat/jna_phantom_brigades.ts` defines a `'hv_phantom'` formation kind with full spawn + withdrawal lifecycle. We currently use it for 4 HV Op-Jackal brigades (June 1992). We can ship a second wave of ~8 HV brigades for Mistral 2 / Southern Move (Aug–Oct 1995) with minimal new code — mostly data + a turn-gated spawn step.

---

## 1. The existing phantom mechanism (what's already in the engine)

**File:** `src/sim/combat/jna_phantom_brigades.ts`

### Shape

```typescript
interface PhantomDef {
    id: FormationId;
    name: string;
    corps_id: FormationId;
    faction?: FactionId;         // defaults RS for JNA, override for HV
    location_osid: string;
    withdrawal_turn: number;
    tanks: number;
    artillery: number;
    apcs: number;
    capture_osids?: string[];    // ghost-flip OSIDs at spawn
    no_equipment_handoff?: boolean; // equipment returns to source (Croatia/Serbia)
    kind_tag?: FormationState['kind']; // 'jna_phantom' or 'hv_phantom'
}
```

### Lifecycle

1. **`spawnJnaPhantomBrigades(state)`** — called once at scenario start (`turn 0`). Spawns ALL defs in `ALL_PHANTOM_DEFS = [...JNA_PHANTOM_DEFS, ...HV_PHANTOM_DEFS]`. Sets `formation.kind = 'jna_phantom' | 'hv_phantom'`, `created_turn = 0`, `personnel = 2000`, full equipment loadout per def.
2. **`processJnaWithdrawals(state)`** — called each war-phase turn. For each phantom: if `state.meta.turn >= phantom.withdrawal_turn` (or HV-specific Graz-east-Herzegovina truce trigger fires), the phantom withdraws. Equipment either distributes to the parent corps (`no_equipment_handoff: false`) or returns to source (`true`).

### Current HV usage (June 1992 — Op Jackal)

Four brigades, all `kind: 'hv_phantom'`, faction `HRHB`, `withdrawal_turn: 24` (with dynamic Graz-east-Herzegovina early-withdrawal fallback), `no_equipment_handoff: true`:

| ID | Historical unit | Corps | Location |
|---|---|---|---|
| `hv_116th_brigade_tg` | HV 116th Brigade | `hvo_southeast_herzegovina` | `op:mostar:mostar_zapad_2` |
| `hv_4th_guards_tg` | HV 4th Guards Brigade | `hvo_southeast_herzegovina` | `op:capljina:capljina_2` |
| `hv_1st_guards_tg` | HV 1st Guards Brigade (Tigrovi) | `hvo_southeast_herzegovina` | `op:stolac:rotimlja_2` |
| `hv_113th_brigade_tg` | HV 113th Brigade (Šibenik) | `hvo_southeast_herzegovina` | `op:capljina:capljina_2` |

These four brigades:
- Spawn at scenario start (turn 0)
- Operate as line units of `hvo_southeast_herzegovina` corps for Op Jackal
- Withdraw at turn 24 (≈ late September 1992) OR earlier when Graz east Herzegovina truce activates
- Equipment returns to Croatia (no handoff to HVO)
- Personnel disappear (returned home)

This is exactly what we want for 1995 — historically accurate cross-border expeditionary deployment, modeled deterministically.

## 2. The parallel `hv_integration.ts` mechanism

**File:** `src/sim/combat/hv_integration.ts`

There's ALSO a separate mechanism for 4 HV brigades that spawn 6 weeks after the Washington Agreement (≈ turn 108). These are designated:
- `hv_4th_guards_split`
- `hv_7th_guards_varazdin`
- `hv_8th_guards_zagreb`
- `hv_9th_guards_karlovac`

These spawn as HRHB-faction formations and stay through the rest of the war. They're permanent integration brigades, not expeditionary.

This is the 4-brigade pool the scenario-creator-runner-tester flagged for expansion in the n2003 analysis.

**Architectural call: keep both mechanisms but make their roles distinct.**

| Mechanism | Role | Lifecycle | Used for |
|---|---|---|---|
| `hv_integration.ts` | Permanent HV integration with HVO | Spawn turn ~108 (post-Washington), persist through war | The 4 Guards brigades that ultimately became Federation regulars |
| `jna_phantom_brigades.ts` (HV phantoms) | Expeditionary deployments tied to specific operations | Turn-gated spawn + withdrawal | Op Jackal 1992 (existing) + Mistral 2 + Southern Move 1995 (proposed) |

## 3. Historical second wave (Aug–Oct 1995)

Source hierarchy: ICTY Gotovina IT-06-90 + ICTY Prlić IT-04-74 (HVO-HV joint criminal enterprise findings) + Balkan Battlegrounds Vol. II ch. 12–13.

### Split Agreement, 22 July 1995

Tuđman + Izetbegović + Zubak + Silajdžić signed. Explicit invitation for HV to deploy openly inside BiH. Legal scaffolding for what follows. From this date, HV brigades operate in BiH without disguise.

### Operation Mistral 2 (8–15 September 1995) OG composition

Per Gotovina trial judgment + Wikipedia "Operation Mistral 2":

**OG North** (main effort, ~11,000) — commanded by HV Maj Gen Ante Gotovina directly:
- HV 4th Guards Brigade (Split)
- HV 7th Guards Brigade (Varaždin)
- HV 1st Croatian Guards Brigade ("Tigrovi", Zagreb — also called 1st HGZ)
- HVO 1st, 2nd, 3rd Guards Brigades (already HRHB-native, NOT phantom)
- HV GS Recce-Sabotage Co
- HV Special Police

**OG South** (reserve/flank) — commanded by HV Brig Ante Kotromanović:
- HV 6th Home Guard Regiment (Split)
- HV 126th Home Guard Regiment (Sinj)
- HV 141st Reserve Infantry Brigade

**OG West** (Drvar axis) — commanded by HV Brig Mladen Fuzul:
- HV 7th Home Guard Regiment
- HV 15th Home Guard Regiment
- HV 134th Home Guard Regiment
- HV 112th Infantry Brigade
- HV 113th Infantry Brigade (different from the 1992 113th TG)

### Operation Southern Move (Južni Potez, 8–11 October 1995)

Per Wikipedia + Tanner ch.13:
- HV 4th Guards Brigade (central role) + reused OG North brigades
- HV/HVO 11,000–12,000 in two groups under Gotovina

### Operation Una (18–19 September 1995) — negative control

- HV 1st and 2nd Guards Brigades, Zagreb Corps (~1,500 troops)
- Failed in 48 hours
- Already captured by the existing E-B2 Una negative-control predicate in `sector_offensive.ts`

## 4. Proposed addition — 8 new HV expeditionary phantoms for 1995

### Design

Add 8 `hv_phantom` defs to `HV_PHANTOM_DEFS_1995` in `jna_phantom_brigades.ts`. Spawn turn-gated on the Split Agreement event (≈ turn 150). Withdraw at turn 188 (Dayton) or earlier per dynamic trigger (e.g. `holbrooke_ceasefire_demand_oct95` flag fires).

```typescript
const HV_PHANTOM_DEFS_1995: PhantomDef[] = [
    // OG North main effort (HV main expeditionary force for Mistral 2 + Southern Move)
    {
        id: 'hv_4th_guards_brigade_1995' as FormationId,
        name: 'HV 4th Guards Brigade (Split, OG North)',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,  // or assignment per axis
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,  // NEW field; gates spawn until Split Agreement window
        withdrawal_turn: 188,  // Dayton ceasefire
        tanks: 40, artillery: 30, apcs: 12,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_7th_guards_brigade_1995' as FormationId,
        name: 'HV 7th Guards Brigade (Varaždin, OG North)',
        corps_id: 'hvo_central_bosnia' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:tomislavgrad:tomislavgrad_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 30, artillery: 25, apcs: 10,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_1st_guards_brigade_1995' as FormationId,
        name: 'HV 1st Croatian Guards Brigade Tigrovi (Zagreb, OG North)',
        corps_id: 'hvo_central_bosnia' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 25, artillery: 25, apcs: 10,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    // OG South (flank pin + Southern Move main effort)
    {
        id: 'hv_126th_hgr_1995' as FormationId,
        name: 'HV 126th Home Guard Regiment (Sinj, OG South)',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 12, artillery: 15, apcs: 8,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_141st_reserve_brigade_1995' as FormationId,
        name: 'HV 141st Reserve Infantry Brigade (OG South)',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:tomislavgrad:tomislavgrad_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 8, artillery: 10, apcs: 6,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    // OG West (Drvar axis)
    {
        id: 'hv_7th_hgr_1995' as FormationId,
        name: 'HV 7th Home Guard Regiment (OG West)',
        corps_id: 'hvo_tomislavgrad' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 10, artillery: 10, apcs: 6,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_112th_infantry_1995' as FormationId,
        name: 'HV 112th Infantry Brigade (OG West)',
        corps_id: 'hvo_tomislavgrad' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 6, artillery: 8, apcs: 4,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_134th_hgr_1995' as FormationId,
        name: 'HV 134th Home Guard Regiment (OG West)',
        corps_id: 'hvo_tomislavgrad' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 5, artillery: 8, apcs: 4,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
];
```

8 expeditionary brigades, total ~136 tanks + ~131 artillery + ~60 APCs. This roughly matches the historical HV deployment scale per Wikipedia OOB tables.

### Engine changes required

The existing phantom mechanism needs **one small extension**: a `spawn_turn` field on `PhantomDef` that gates spawning. Currently `spawnJnaPhantomBrigades` is called once at turn 0 and spawns everything. We need it (or a new sibling function) to be called each war-phase turn and only spawn defs whose `spawn_turn` is ≤ current turn and which haven't yet been spawned.

Minimal change:

```typescript
// In spawnJnaPhantomBrigades — add turn-gate
export function spawnJnaPhantomBrigades(state: GameState): void {
    if (!state.military.formations) state.military.formations = {};
    const turn = state.meta?.turn ?? 0;

    for (const def of ALL_PHANTOM_DEFS) {
        if (state.military.formations[def.id]) continue; // already spawned

        // NEW: spawn-turn gate. Defs without spawn_turn default to turn 0 spawn.
        const spawnTurn = (def as PhantomDef & { spawn_turn?: number }).spawn_turn ?? 0;
        if (turn < spawnTurn) continue;

        // ...existing spawn logic
    }
}
```

Plus wire `spawnJnaPhantomBrigades` into the war_phases turn-start loop (currently it only runs at scenario init).

### Optional event gating

For tighter historical fidelity, gate spawning on the Split Agreement event flag:

```typescript
// In spawnJnaPhantomBrigades for 1995 defs only
const splitAgreementActive = state.military.event_flags?.split_agreement_active === true;
if (def.spawn_turn != null && def.spawn_turn >= 150 && !splitAgreementActive) continue;
```

This way, if the player as RBiH or HRHB makes some divergent decision that prevents Split Agreement from firing, the 1995 HV expeditionary force doesn't show up — historical conditionality preserved.

The Split Agreement event isn't currently authored in `data/scenarios/events/war_1995.json`; would need to be added with `sets_flags: { split_agreement_active: true }`.

### Dynamic withdrawal

Mirror the existing HV Op-Jackal pattern: withdraw on dynamic trigger OR fallback to turn 188.

```typescript
// In processJnaWithdrawals for 1995 HV phantoms
const isHv1995 = phantom.kind === 'hv_phantom' && (phantom.created_turn ?? 0) >= 150;
const holbrookeHaltActive = state.military.event_flags?.us_halts_federation_advance === true;
const hv1995ShouldWithdraw = isHv1995 && holbrookeHaltActive;
if (hv1995ShouldWithdraw || (phantom.withdrawal_turn != null && turn >= phantom.withdrawal_turn)) {
    // withdraw
}
```

Holbrooke halt (turn ~182) triggers early withdrawal, matching historical timing — HV pulled back after the 12 October ceasefire was negotiated. Otherwise fallback to Dayton at turn 188.

## 5. Sacred-rule compliance

| Rule | Compliant? | Notes |
|---|---|---|
| Canonical faction IDs only | ✅ | HV brigades spawn as HRHB faction with `kind: 'hv_phantom'` tag |
| No initial OSID overrides | ✅ | Phantom spawn doesn't flip OSIDs (no `capture_osids` for 1995 defs); only Op-Jackal phantoms flip on spawn, by historical design |
| No `avoided_osids_by_faction` | ✅ | None used |
| Determinism | ✅ | Sorted iteration via `strictCompare`; turn-gated spawn is deterministic |
| Ops-only attacks | ✅ | Phantom brigades flow through corps operation framework like any HRHB brigade |
| No 7th Corps simulation | ✅ | Phantoms attach to HVO corps, not ARBiH |

## 6. Expected calibration impact

n2003 has HRHB undershoot at -21 OSIDs (sim 86 vs painted 107). 8 HV expeditionary brigades attached to HVO corps during the September 1995 Mistral 2 window should let HVO push the historical Drvar / Šipovo / Jajce captures that the current `hv_integration.ts` 4-brigade pool can't sustain.

Projected outcome (heuristic, requires test):
- HRHB sim count: 86 → 95-105 (closer to painted 107)
- Match_ratio: 79.21% → 81-83%

This would put the 188w baseline above the n1999 81.18% score while being honest historical fidelity (no stuck pending events) — a real win, not a masking-bug win.

## 7. Sacred-rule note: the parallel `hv_integration.ts` 4-brigade pool

Don't delete the existing `hv_integration.ts` mechanism. Its 4 brigades (`hv_4th_guards_split`, `hv_7th_guards_varazdin`, `hv_8th_guards_zagreb`, `hv_9th_guards_karlovac`) model the permanent Federation Military Council integration that historically followed the Washington Agreement (March 1994 → spawn turn 108). They stay through the war and form the long-term HV-attached pool that the E-B2 Una negative-control predicate references.

The new 8 HV phantoms are *additional* short-window expeditionary brigades. The two pools coexist: ~12 HV brigades total in mid-Sept 1995, matching the historical Mistral 2 + Southern Move composition (4 Guards in OG North + 5 in OG South/West + the 4 Federation integration brigades).

## 8. Open questions

1. **`spawn_turn` schema addition** — is it OK to add `spawn_turn?: number` to `PhantomDef` (currently the interface doesn't have it)? Default 0 preserves all existing phantoms behaving exactly as before; new field only used by 1995 defs.

2. **Event flag conditionality** — should 1995 expeditionary spawn gate on `split_agreement_active` flag (requires authoring the event in `war_1995.json`)? Or just on the turn number? Turn-only is simpler and matches the existing JNA phantoms' contract.

3. **Equipment scale** — current proposed numbers (40 tanks for HV 4th Guards, etc.) are larger than the JNA phantoms (max 35 tanks for JNA 2nd MD). HV brigades in 1995 had genuinely heavier mechanized inventory. Defensible per BB2 ch.12 + Tanner ch.13, but worth a formation-expert pass before shipping.

4. **Corps assignment** — current proposal distributes across `hvo_southeast_herzegovina` / `hvo_central_bosnia` / `hvo_tomislavgrad`. Mistral 2 historically had its own HV operational groups; we don't have an HV main staff formation in OOB. Assigning to HVO corps is the canonical-faction-respecting approach but loses some command-structure fidelity. Acceptable for calibration; better fidelity would need an `hv_expeditionary_command` formation as `corps_asset` kind.

## 9. One-line take

The mechanic exists, it's already used for HV Op-Jackal 1992, and adding 8 more `hv_phantom` defs for Mistral 2 / Southern Move plus a tiny `spawn_turn` gate would close most of the remaining HRHB calibration gap honestly — without breaking sacred rules.

— End of design proposal —
