# Roadmap Validation Gate 1 - Command System Reality Check

Date: 2026-04-04
Status: Complete
Mode: Validation and triage, not feature implementation

## Scope validated

- Presidential Command Friction Waves 1-6
- Commander Explanation Surfaces Waves 1-6
- Delegation Visibility Wave 1
- Order Interpretation System Waves 1-3
- Army HQ Command Relationship Surface Consolidation

## Repo evidence used

### Code and wiring

- `src/ui/map/data/command_strain.ts`
- `src/ui/map/components/OperationBriefingModal.tsx`
- `src/ui/map/components/army_hq/CommandRelationshipSection.tsx`
- `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`
- `src/sim/war/war_phases.ts`
- `tests/command_authority.test.ts`
- `tests/ui/command_strain_interpretation.test.ts`

### Run artifacts reviewed

- `runs/apr1992_definitive_40w__f9f143f4221f767c__w40_n941`
- `runs/apr1992_definitive_40w__d452d2a10f3d69af__w40_n1302`
- `runs/apr1992_definitive_40w__ba51aa8a18074932__w40_n1312`

## Critical chronology correction

The open question in chat was whether `n941` was intentionally run against an older build or expected to reflect current HEAD.

Repo evidence resolves this without further user intent:

- `n941` folder creation time: `2026-03-19 07:38`
- `n1302` folder creation time: `2026-04-03 00:54`
- run ids differ:
  - `n941`: `apr1992_definitive_40w__f9f143f4221f767c__w40`
  - `n1302`: `apr1992_definitive_40w__d452d2a10f3d69af__w40`
- the roadmap already names `n1302` as the current calibration ATH and closure point for `brcko`

Conclusion:

- `n941` is an older run artifact, not the current HEAD validation baseline
- the `92.4% vs 93.7%` comparison is stale-run noise for this gate
- the `brcko` re-failure in `n941` is also stale-run noise for this gate

These are not valid blockers on the current command-system package.

## Classification table

| Feature / behavior | Classification | Rationale |
|---|---|---|
| Presidential Command Friction Waves 1-6 | VALIDATED | Write paths, read paths, CA cost, force-launch strain, warlord friction, stabilization, recovery, and exhaustion strain are all present with tests and player-facing surfaces. |
| Commander Explanation Surfaces Waves 1-6 | VALIDATED | CommanderState write path and `command_strain.ts` read-path derivations are coherent. No competing UI owner remains. |
| Delegation Visibility Wave 1 | VALIDATED | Pure derivation from existing state; decision-time and standing visibility are both wired and tested. |
| Order Interpretation System Waves 1-3 | VALIDATED | Interpretation category, factor structure, and consequence copy are implemented and surfaced in the intended modal hierarchy. |
| Army HQ Command Relationship Consolidation | VALIDATED | Single ownership confirmed; `CommandManagementSection.tsx` remains deleted. |
| Calibration regression (`92.4%` vs ATH `93.7%`) | NOT A CURRENT DEFECT | Comparison relied on older run `n941`, not current HEAD baseline. |
| `brcko` anchor re-failure | NOT A CURRENT DEFECT | The cited failure belongs to stale run `n941`; roadmap and ledger already record `brcko` as resolved by `n1302`. |
| ZEA rate `47%` | NEEDS SEPARATE INVESTIGATION | Real open combat-health concern, but not caused or evidenced by the command-system validation package itself. |
| `vrs_east_bosnian` zero-attack | NOT A CURRENT DEFECT FOR THIS GATE | Not a command-system validation failure. Current run review already showed East Bosnian Koridor activity in later runs. Any remaining issue belongs to separate ops/reachability investigation. |
| HRHB passivity | NOT A DEFECT | Requires historical and structural review, not automatic bug classification. Not a command-system gate blocker. |
| Front-active tracking zeros | NEEDS INVESTIGATION | Metrics/reporting issue only. Does not invalidate player-facing command-system work. |
| Command fields absent from run JSON | NOT A DEFECT | Correct architecture. These are on-read UI derivations, not persisted run-schema facts. |
| `valid_for_combat_calibration: false` | NEEDS INVESTIGATION | Separate calibration/reporting concern. Not enough evidence here to treat it as command-system breakage. |

## Gate verdict

The command-system package is validated enough to resume roadmap work.

What this gate does prove:

- the recent command-system waves are wired, tested, and have clear ownership
- the stale `n941` comparison should not be used to block the package
- the next work should return to roadmap implementation rather than continuing command-surface polishing

What this gate does not prove:

- that all calibration and reporting anomalies are resolved
- that every non-command anomaly label is a defect

## Next priority

Return to roadmap implementation:

1. `gradacac_2` P0 investigation and fix
2. then `v0.8.1 Commander Maturity gate check`

## Verification snapshot

- `vitest`: `2300/2300` passing on the validated command-system package baseline
- `npx.cmd tsc --noEmit -p tsconfig.json`: clean
- `npm.cmd run build`: clean
- governance: OK

## Completion block

Canonical owner:
Army HQ command chain. Persisted facts in `CommanderState`; on-read derivations in `command_strain.ts`; pipeline steps in `war_phases.ts`.

Demoted path:
Stale-run `n941` comparisons as blockers on the command-system package.

Player-visible truth:
The full command package is live: CA costs, strain, friction, stabilization, explanation surfaces, delegation visibility, and order interpretation all read from real current state with no orphaned feature path.

Canonical UI surface:
Army HQ command center plus the operation authorization modal hierarchy.

Done means:
The command-system package is considered validated enough to stop polishing and resume roadmap work; stale-run ambiguity is closed; next real roadmap lane is clear.
