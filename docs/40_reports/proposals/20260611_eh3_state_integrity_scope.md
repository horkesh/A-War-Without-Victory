# EH-3 — State-Integrity (brigade lifecycle) scope + build plan

**Status:** SCOPED 2026-06-11 (Formation/lifecycle + Historian investigators, convergent). Fix (a) = build now (low-risk); fix (b) = separate Central-Bosnia calibration lane. Engine-health pivot.

## Root cause (Formation/lifecycle investigator)

Two parallel formation state machines:
- `lifecycle_status`: `active|forming|disbanded|merged|destroyed|withdrawn|displaced` (`src/state/game_state.ts:1021`)
- `stranded_status`: `none|holding|reconnected|collapsed` (`src/state/game_state.ts:981`), driven by `src/sim/combat/stranded_brigade_lifecycle.ts`

**The leak:** when `stranded_status` reaches `collapsed`, the brigade is set `status='inactive'`, `lifecycle_status='destroyed'`, `personnel=0` (`stranded_brigade_lifecycle.ts:252-253`), but `stranded_status='collapsed'` is **never cleared** — Phase 2 (`:173-177`) just `continue`s. The record lingers as a ghost with a zombie `stranded_status` field through t188 (~5 ghosts measured at 188w, incl. canonical `hrhb_travnik_brigade`, collapsed t13).

**Why the record must NOT be tombstoned (Architect's cascade risk, confirmed):** reconstitution (`brigade_reconstitution.ts:286-287`) REQUIRES `status='inactive' && lifecycle_status='destroyed'` present in `formations[]` — it IS the re-entry path. `delete formations[fid]` would permanently break reconstitution. Only JNA phantoms are deleted (they have no reconstitution path).

**Blast radius:** all combat/op-pool/sector/supply/home-distance consumers already guard `status !== 'active'` → SAFE. Exposed-but-harmless iterators: `final_sector_truth_reconciliation.ts`, `compile_turn_summary.ts` (adds to `already_destroyed` set — correct). No combat-math consumer reads `stranded_status` on inactive formations.

## Historian (OOB/lifecycle lens)

- **Travnik HVO** = "Frankopan" + "Travnika" brigades (BB2 p.440-441): *routed not annihilated* by ARBiH 3rd Corps, 10 June 1993; survived **displaced** at the Vitez enclave perimeter. Engine destroying `hrhb_travnik_brigade` at **t1** is historically wrong (timing) and tombstone-wrong (should be **displaced**, not destroyed).
- **General principle:** routed brigades = displaced + degraded, retain identity. Tombstone only for the rare "essentially destroyed" case (Eugen Kvaternik/Bugojno → 55th Home Defense Regt, BB2 p.450). Manpower never vanishes.
- **Stranded:** most brigades were strongly **territorial** (Vitez brigade = "locally raised, territorial-based draftees", BB2 p.437) → **repatriating a normal brigade to its home sector is historically correct.** Exceptions that may legitimately sit far from home: displaced brigades (home occupied) + elite mobile reserves (17th Krajina, Vitezovi, 1st Bijeljina Panthers).
- **§6 HARD FLAG (applies to fix (b), repatriation):** enclave-trapped units must be SUPPRESSED from repatriation/export — 28th Div (Srebrenica), 81st Div (Goražde), 5th Corps (Bihać); and Drina encirclers (Zvornik garrison-pin, Bratunac/Milići, 2nd Romanija near Goražde). Lifecycle changes for any brigade inside a protected-enclave OSID must be suppressed.

## Fix (a) — zombie-field cleanup [BUILD NOW, low-risk, §6-inert]

Zero calibration impact: formations are already `inactive`/`personnel=0`; clearing metadata changes no combat math. Does NOT touch `formations[]` membership (reconstitution preserved). §6-inert: does not change which brigades die or move.

1. `src/sim/combat/stranded_brigade_lifecycle.ts` Phase 2 (`:173-177`): when `f.stranded_status === 'collapsed' && f.status === 'inactive'`, clear `f.stranded_status` + `f.stranded_since_turn` (one-turn write, then Phase-3 `status!=='active'` guard skips it forever).
2. `src/sim/combat/brigade_reconstitution.ts` (reactivation Paths A/B/C, ~`:405-421`, `:453-470`): on reactivation clear `stranded_status`, `stranded_since_turn`, `last_reachable_turn` — fixes the genuine latent bug where a reconstituted brigade re-enters the stranded lifecycle with stale `stranded_since_turn` and can mis-collapse.

**Validation:** tsc + vitest + 188w. Expect territory/control_delta byte-identical (territory-flat re-bless: only the stranded_status fields on inactive ghost records move the full-save hash). Determinism + §6 anchors intact.

## Fix (b) — sector-geometry / displacement [SEPARATE CALIBRATION LANE]

Real root cause of `hrhb_travnik` stranding at t1: `op:novi_travnik:rat_2` (its `home_osid`) is absent from all 14 `hvo_central_bosnia` sector `territory_osids` → BFS in `canReachCorpsSectorFront` can't reach → enters `holding`. Fix surface = sector-partition pipeline (`corps_front_sectors.ts`, `corps_sector_partition.ts`). **Calibration-impactful (Central Bosnia HRHB over-capture ceiling zone) — requires full 188w + scenario-tester + historian + §6 panel.** Also the historically-correct model is `displaced` (Frankopan/Travnika survived at Vitez), not destroyed-at-t1 — a deeper OOB+lifecycle redesign. Post-(a), owner/panel-gated.
