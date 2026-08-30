# Planning Duration Budget Design

## Decision

Preserve operation ownership while restoring the authored meaning of
`planning_duration`: it is the time available for marching and preparation, not
a mandatory staff delay after an operation is already ready to execute.

Brigades remain unable to attack outside a `CorpsOperation`. Planning-phase
elite loans may continue to receive movement routing, but they do not enter the
operation combat roster until execution. A non-forced operation must spend at
least one planning turn and pass the existing participant-readiness,
political-control, force-ratio, objective-validity, and opening-attack gates.
Once those gates pass, readiness may end planning before `planning_duration`.
The duration remains the deterministic anti-paralysis budget after which the
existing timeout path attempts launch or records a named recovery reason.

## Scope

- Replace the scenario-birth-only launch credit with a general readiness-based
  transition after one planning turn.
- Retain the operation-only attack rule and execution-only combat-roster rule.
- Align the directly contradictory lifecycle prose and comments with the
  accepted budget contract.
- Add a regression test proving a later staged operation can launch before its
  budget expires while an unstaged operation cannot.
- Validate with focused/full tests, determinism/provenance gates, and one clean
  Node 22 188-week scenario run.
- Re-baseline the January threshold only after the new run passes the historical
  casualty and operation-provenance checks. Do not reconcile the baseline
  manifest.

## Falsifiers

Reject this change if the controlled run does not restore material battle and
attack-order throughput, remains outside 55,000-62,000 killed, reintroduces an
off-operation capture, or breaks the nine-cell enclave guard.

