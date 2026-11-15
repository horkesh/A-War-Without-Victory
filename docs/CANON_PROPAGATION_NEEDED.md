# Canon Propagation Needed

Mechanical changes that code made but canon did not yet describe. Apply with `/propagate-to-canon`.

## The 2026-03-28 backlog: done (2026-11-13 written, 2026-11-14 panel-reviewed)

The fourteen items opened on 2026-03-28 were each checked against `src/` and `docs/10_canon/`. None was already in canon. All fourteen are written into `Systems_Manual_v0_9_0.md` with current code values, and a four-seat panel then checked every sentence against the code and corrected twelve defects in the first draft. The panel record is [20261114_CANON_PROPAGATION_PANEL.md](40_reports/20261114_CANON_PROPAGATION_PANEL.md); gate `REPO-CANON-PROPAGATION` is closed on it.

| Old item | Where it landed | What the text now says, where it differs from the 2026-03-28 note |
|---|---|---|
| 1 Supply filter | §14.5 supply-gating note, supply multiplier bullets | Critical supply is excluded from a sector offensive's participant pool; strained is allowed at 0.75. The "victory-only" and pioneer rules no longer exist. Multiplier bullets now match the code (strained 0.75; critical 0.45 / 0.5). |
| 2 Sector counter-attacks | §6.8 counter-attack exception | Written as an implementation extension, not canon: it is wider than Engine Invariants §6.3, runs for a defensive-stance corps only, and its numbers are tuning values. |
| 3 Planning cap, 4 probe lifecycle, 6 exhaustion gate, 9 launch feasibility, 10 weakened-operation abort | §6.4 main paragraph | The cap and the exhaustion gate are scoped to the planners that apply them; the secondary-operation cooldown is defined but not wired; feasibility covers sector-offensive and triggered creation only. |
| 5 Casualty ratio, 12 main/support, 13 co-located defenders | §7.4 "Power-ratio casualty scaling" | Attacker ratio^-0.33, defender ratio^0.33, clamp [0.6, 2.0]; shares rounded independently. |
| 7 Phase 1.5 | §6.3 classification text | Same corps, same friendly component, within 30 hops; largest deficit wins, ties to the smaller sector id. |
| 8 SpatialContext | §2 "Shared spatial snapshot" | Reconcile recomputes the post-combat snapshot; frozen shallowly. |
| 11 Emergency retreat | §6.9 retreat chain, Engine Invariants §14.5 | The largest-component step is gone. The BFS examines one ring only (defect); a null result disperses the brigade, which conflicts with §6.2. |
| 14 Friendly-only BFS | §6.3 "Friendly-only distance" | Depth cap 20. |

Also corrected: launch minimum 2 brigades (not 3), enemy OSID minimum 1, supply readiness recorded not gating, `MAX_PARTICIPATING_BRIGADES` 20 (not 12), and §7.6's attack-threshold default `costly_victory`.

## Still open

- **Engine Invariants §6.3 versus the sector-wide counter-attack.** Amend §6.3 under the Invariants gate or remove the extension; whether a presidential stance hold suppresses it is not established.
- **Systems Manual §6.5 "Pioneer attacks" paragraph** describes a mechanic with no live code in `src/sim`. Needs a code-only check, then a rewrite or removal.
- **Engine Invariants §14.5a (breakthrough retreat)** was not found in `src/sim` by two panel seats; unverified.
- **Attack Resolution Formula Spec** still carries the old strained 0.7 / 0.8 and critical 0.4 multipliers.
- **`context.md` (retreat chain, around line 119)** still has the old four-step chain.
- **`docs/10_canon/PLAYER_TURN_GUIDE.md`** pipeline-step references carry stale line numbers (the spatial-context steps are at `war_phases.ts` 1547 and 3219; `reevaluate-weakened-operations` is at 2047).
- **Code comments** (not canon): `bot_corps_directives.ts:205-209` says an 8-turn cooldown (it is 5); `attack_force_power.ts:124` says "reduced power" for support brigades (it is 1.0); `bot_brigade_targeting.ts:31` says 12 (it is 20); a `sector_offensive.ts` comment says 2 enemy OSIDs (the gate is 1).
- **Code defects found by the panel** (each calibration-moving or its own lane; recorded in the panel record and the out-of-scope register): the emergency-retreat BFS frontier, dispersal of cut-off brigades, dead cooldown and probe-exhaustion constants, the exhaustion gate missing from sector-offensive, pre-planned and triggered creation.
