# 2026-04-08 Operations System A+ Plan

## Goal
Raise the operations / execution / combat-causality system to the same `A+` standard now reached by sector/frontline/brigade-assignment truth.

## Why This System Is Next
- It is now the nearest major truth-owner seam after sectors.
- It spans multiple authorities: pre-planned ops, triggered ops, queued ops, active runtime ops, operation completion/AAR export, and scenario proof/reporting.
- Late brigade/location writers can still pressure op participants, anchors, and execution validity.
- The repo already contains recurring evidence of drift in operation diagnostics, proof expectations, and harness noise.

## Success Standard
The system is `A+` only when:
- active operations have truthful participants and truthful anchors
- queued operations inject only when prerequisites are actually satisfied
- triggered operations require explicit historical/mechanical prerequisites
- completed-operation proof reads the archival authority, not live runtime slots
- operation diagnostics, combat-causality, and AAR history tell one coherent story
- noop or reduced harness scenarios stay quiet unless a real invariant is broken

## Audit Sequence
1. Map all operation truth owners.
   - pre-planned definitions
   - triggered definitions
   - queued injection
   - active execution
   - completion/finalization
   - AAR export
   - scenario proof/reporting consumers
2. Identify every late writer that can mutate operation reality after an op is created.
   - elite loan deploy/recall
   - recruitment/mobilization
   - brigade movement/relocation
   - sector reconciliation
3. Build seam-specific truth tables.
   - participant truth
   - anchor truth
   - execution truth
   - completion/provenance truth
4. Convert each seam into deterministic regression tests before invasive fixes.

## Known Likely Fault Lines
- queued op sector anchoring when many participants are unassigned or loaned
- elite recall leaving ghost participants in active ops
- triggered ops firing on idle-state shortcuts rather than named prerequisite completion
- final AAR/proof consumers reading the wrong owner
- combat-causality and operation diagnostics drifting from the real execution record

## Implementation Order
1. operation authority audit report
2. invariant tests for participants / anchors / completion authority
3. runtime cleanup and finalization fixes
4. scenario and recovery verification
5. documentation / ledger propagation

## Phase 2: Execution-Quality Hardening
With participant truth, axis truth, and final reconciliation now in place, the remaining `A+` work shifts to operation quality at birth and during execution.

### Narrowed problem statement
- The fresh post-reconciliation runs are no longer dominated by stale operation truth
- The remaining invalid operation mass is concentrated in dead-on-arrival probes that recover with `no_logged_attempt`
- Diagnostics are already conservative enough to treat these as real failures, not harness artifacts

### Phase 2 goals
1. Prevent fake probe launches that cannot realistically attack or maneuver into a useful approach state
2. Make probe execution semantics match recon-by-force instead of full offensive commitment
3. Preserve legitimate maneuver/execution operations without reintroducing false-positive diagnostics

### Phase 2 implementation order
1. Add red tests for:
   - probe launch viability
   - probe threshold behavior
   - probe execution transition into immediate idle recovery
2. Tighten launch gates in commander / operation birth paths
3. Adjust probe attackability thresholds or equivalent execution rules
4. Rerun 40-week scenario, inspect invalid-operation summaries, and iterate until dead-on-arrival probes stop dominating the lane

## Verification Standard
- targeted unit/integration tests for each seam
- scenario proof contracts
- recovery gate
- at least one fresh scenario run with operation-heavy behavior inspected end to end

## Deliverables
- implemented report in `docs/40_reports/implemented/`
- `PROJECT_LEDGER` entry
- `PROJECT_LEDGER_KNOWLEDGE` additions
- code/test changes until the lane is judged `A+`

## Completion
Completed on 2026-04-08.

### Final implementation outcome
1. Operation truth was reconciled at end turn:
   - participants filtered to active brigades
   - axis rosters filtered to the same truth
   - sector anchors re-derived from live brigade locations plus final sector truth
   - empty execution ops demoted into explicit recovery
2. Probe launch was hardened to exact brigade-side feasibility:
   - launch now requires an immediately usable objective for the actual brigade
   - truce/Graz-blocked and below-threshold probe targets are rejected at birth
3. Politically blocked live operations now exit honestly:
   - execution-phase ops whose objectives are all politically blocked enter one-turn `political_blocked` recovery
   - those exits no longer contaminate combat-causality invalidation
4. Eligible-attacker diagnostics now read final post-trim attack truth instead of pre-trim approximations

### Final verification evidence
- targeted regression suite passed
- `npx tsc --noEmit` passed
- fresh 40-week run `n1377` produced:
  - final hash `54e1820f5728e841`
  - `invalid_operation_count: 0`
  - `recovery_without_logged_attempt_count: 0`
  - `zero_eligible_attacker_operation_count: 0`
- fresh rerun `n1378` produced the same final hash `54e1820f5728e841`
- `npm run recovery:check` passed

### Final judgment
The operations / execution / combat-causality lane reached `A+` under this plan's success standard.
