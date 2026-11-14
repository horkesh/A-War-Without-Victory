# Canon Propagation Needed

Mechanical changes that code made but canon did not yet describe. Apply with `/propagate-to-canon`.

## Triage of the 2026-03-28 backlog (done 2026-11-13)

The fourteen items opened on 2026-03-28 were each checked against `src/` and `docs/10_canon/`. None was already in canon. All fourteen are now written into `Systems_Manual_v0_9_0.md`, using current code values. Five of them no longer matched the original wording, so the text follows the code, not the old note:

| Old item | Where it landed | What changed from the 2026-03-28 note |
|---|---|---|
| 1 Supply filter | §14.5 supply-gating note | The per-brigade "strained → victory-only" gate and the pioneer rule no longer exist; only `critical` excludes a brigade. |
| 2 Sector counter-attacks | §6.8 counter-attack exception | Added the predicted-outcome floor (costly_victory). |
| 3 Planning cap, 4 probe lifecycle, 6 exhaustion gate, 9 launch feasibility, 10 weakened-operation abort | §6.4 main paragraph | Cap constant lives in `sector_offensive_axis_helpers.ts`. The "probe threshold 40" is not live (the constant is exported but only a test uses it). Feasibility is `evaluateLaunchFeasibility`, not `checkLaunchFeasibility`. |
| 5 Casualty ratio, 12 main/support, 13 co-located defenders | §7.4 "Power-ratio casualty scaling" | Exponent 0.33, clamp [0.6, 2.0]. |
| 7 Phase 1.5 | §6.3 classification text | Limited to the same corps, same friendly component, within 30 hops. |
| 8 SpatialContext | §2 "Shared spatial snapshot" | Extra politically-connected set; the "22 to 1 adjacency builds" figure could not be verified and is not stated. |
| 11 Emergency retreat | §6.9 retreat chain | The "largest component" step was removed; it is now home, fallback, friendly BFS (8 hops), corps HQ, same component. |
| 14 Friendly-only BFS | §6.3 "Friendly-only distance" | Depth cap 20. |

Two older statements were corrected in the same pass: the launch minimum is 2 brigades (not 3), and `MAX_PARTICIPATING_BRIGADES` is 20 (not 12). §7.6's attack-threshold "known issue" was replaced, because the default is now `costly_victory`.

## Still open

These are stale canon text found during the triage. They are not applied here.

- **Engine Invariants §14.5** (retreat destination classes and the "706th debt" known-nonconformance note) still describes the largest-component fallback, which the code has since changed. Engine Invariants is panel-gated: orchestrator to route.
- **Systems Manual §6.5 "Pioneer attacks" paragraph** describes a mechanic with no live code in `src/sim`. Needs a code-only check, then a rewrite or removal.
- **`context.md` (retreat chain, around line 119)** still has the old four-step chain.
- **`docs/10_canon/PLAYER_TURN_GUIDE.md`** pipeline-step references carry stale line numbers (the spatial-context steps are at `war_phases.ts` 1547 and 3219; `reevaluate-weakened-operations` is at 2047).
- **Stale code comments** (not canon): `bot_corps_directives.ts:205-209` says an 8-turn cooldown (it is 5); `attack_force_power.ts:124` says "reduced power" for support brigades (it is 1.0).
