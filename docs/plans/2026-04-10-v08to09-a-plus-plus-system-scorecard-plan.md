# 2026-04-10 v0.8-to-v0.9 A+++ System Scorecard Plan

## Purpose

This plan turns the current “how good is the game, really?” question into a durable prioritization artifact.

It has one job:

- grade the major systems honestly
- name the exact work that would move each system up to its next meaningful quality rung
- distinguish bounded hardening from realism work, content/runtime audit, and redesign-gated seams

This is a planning lens for the `v0.8-to-v0.9` band, not a new feature milestone.

## Scope and interpretation rules

The grades below are board-level judgments, not release marketing.

- They reflect the current repo truth across the mainline `2026-04-09` hardening chain plus the surrounding verified product state.
- They are meant to help choose the next lane, not to declare the game “done.”
- “Move up one rung” means the next meaningful promotion step on the current grading ladder. For example:
  - `B+ -> A-`
  - `A- -> A`
  - `B- -> B`
- If the exact next promotion is blocked by a missing canonical owner or packet contract, that is called out explicitly instead of disguised as ordinary hardening.

## Grade rubric

| Grade | Meaning |
|------|---------|
| `A++ / A+++` | Canonical owner is clear, residuals are minor, scenario/runtime proof exists, and docs/shells tell the same story |
| `A / A-` | Strong and trustworthy, but still has one or two bounded seams or incomplete proof surfaces |
| `B+ / B / B-` | Valuable and playable, but still mixes truth with drift, partial ownership, or under-proven product behavior |
| `C` | Structurally present but still too partial or fragile to trust broadly |
| `D` | Missing canonical owner/contract; work is blocked until that is chosen |

## System scorecard

| System | Current grade | Why it has that grade now | Next promotion target | Exact work to promote it | Proof required |
|------|------|------|------|------|------|
| Core simulation determinism + turn pipeline | `A-` | The war engine no longer feels brittle. Recent operation, sector, drift, and battle-ownership hardening made the substrate materially more truthful. | `A` | Finish remaining non-authoritative execution-entrypoint cleanup, then prove save/load/replay equivalence against canonical turn output rather than only live-run correctness. | Reproducible scenario reruns, replay/load equivalence checks, full verification bar |
| Sector / frontline / brigade-assignment truth | `A` | Shared-front routing, foreign-sector ownership, ghost-sector prune, drift-recall honesty, and cold-front anomaly consumption are now strong. | `A+` | Resolve the remaining ambiguous territorial residuals through a narrow content/runtime audit and either prove them stale or classify them as accepted live variance. | Before/after anomaly counts with unchanged scenario hash, plus explicit residual classification |
| Operation lifecycle / execution / combat causality | `A-` | Readiness, rosters, battle ownership, and false invalidation seams improved substantially. | `A` | Finish the operation launch-model hardening still deferred in roadmap language: sector-anchored, corps-authorized, reinforcement-bounded launch truth, then rerun long scenarios to prove invalid ops remain at zero under the stricter contract. | 40w/52w proof, causality metrics, zero invalid-operation residuals |
| Reserve system ownership + evidence | `A-` | Reserve ownership, severity, cause, provenance, and several driver-evidence seams are now unusually well-defined. | `A` | Run one bounded completion audit over remaining reserve drivers, preserving only packet-owned evidence and explicitly declaring the reserve explanation stack complete where no sharper truth exists. | Driver-by-driver audit report, UI contract matrix, targeted reserve tests, full suite |
| Command / review shell coherence | `A-` | Military review ownership is much cleaner, and Army HQ now feels like a real owner rather than a duplicate shell. | `A` | Unify the remaining interrupt-modal vs sustained-review-desk ownership seams across Army HQ, reserve handoff, and political review surfaces so every live review action has one canonical queue owner. | UI ownership matrix update, targeted shell tests, walkthrough proof of one queue per action family |
| Political leader / peace-plan / patron review systems | `B+` | Rich and meaningful, but not yet hardened with the same owner-truth rigor as sectors, operations, and reserves. | `A-` | Run a political review ownership and consequence-truth program: peace/dayton/patron review surfaces, decision provenance, and scenario proof that the same owner drives both the decision and the reporting surface. | Decision-flow audit, targeted tests, scenario proof for representative peace-plan / patron branches |
| Autonomy / proposal / review framework | `B+` | Structurally strong, but still feels one pass short of fully battle-proven product truth. | `A-` | Complete the replay/fallback/review contract with queue ownership proof, deterministic decision audit surfaces, and scenario/harness evidence that accepted, rejected, and blocked proposals replay honestly. | Replay/fallback audit, queue-truth tests, scenario/harness runs |
| Scenario harness / anomaly diagnostics / calibration surfaces | `B+` | Stronger than before, but still not completely through the residual board. Some anomaly families are now honest; others still need classification. | `A-` | Merge the verified cold-front density / brigade-never-fights truth lanes, then run a bounded residual audit to separate true detector drift from accepted content/runtime variance. | Anomaly deltas with unchanged hashes, consistency audit, recovery bar |
| Save/load / replay / adapter/read-model integrity | `B+` | Better than most projects at this stage, but still one of the biggest remaining quality multipliers. | `A-` | Execute the save/load/replay hardening plan end-to-end: migration fidelity, replay equivalence, adapter contract matrix, startup snapshot contract, and packaged-desktop continuity proof. | Migration matrix, replay equivalence runs, desktop/startup checks, full verification bar |
| Desktop runtime / packaging / shipped-platform contract | `B` | Packaged-runtime proof exists and is much stronger than before, but this is still below the simulation core in confidence. | `B+` | Promote packaged proof from “headless smoke with strong route coverage” to “shippable packaging contract”: CI-owned packaged probe, installer/artifact path truth, and explicit disposition for the remaining unsigned/store gaps. | Packaged probe in CI, artifact validation, release-check proof |
| Planner realism / salient-risk doctrine | `B-` | Not broken in an ownership sense, but still capable of overextension and low-wisdom operational choices. | `B+` | Run a doctrine program focused on salient-risk, one-brigade probe overreach, and target-selection wisdom, using scenario evidence rather than truth-surface patches. | Multi-run scenario evidence, doctrine metrics, accepted-variance notes |
| Stranded brigade lifecycle ownership | `D+` | This is the clearest remaining contract hole. The engine can now report strandedness honestly, but it still lacks a canonical lifecycle owner. | `C` | Choose one explicit lifecycle contract for same-faction ownerless unreachable brigades, then implement that owner end-to-end before attempting any richer behavior. | Contract decision first, then Podrinje-pair before/after proof with unchanged unrelated outcomes |
| Historical content / dynamic Codex / comparison layer | `B+` | Rich content base exists, but the reactive/dynamic comparison layer is still not at “signature feature” strength. | `A-` | Build the dynamic essay and endgame-comparison layer already planned for `v0.9.1`, focusing on divergence notes, ghost entries, and comparison glue rather than raw essay volume. | Feature-complete content proof, endgame comparison walkthrough, regression checks |

## Ordered promotion queue

This is the recommended queue for the remaining `v0.8-to-v0.9` band.

### 1. Save/load + replay + adapter integrity

Why first:

- it raises the confidence ceiling for everything else
- it multiplies the value of later platform and scenario work
- it is still a bounded hardening lane rather than realism or content

### 2. Political review ownership + consequence truth

Why second:

- the military review and reserve review stacks have improved faster than the political stack
- this is now one of the biggest product-coherence gaps

### 3. Autonomy replay / fallback / queue truth

Why third:

- autonomy is structurally impressive but still under-proven relative to the simulation core
- it needs the same “one owner, one queue, one replay truth” discipline already applied elsewhere

### 4. Residual harness/content-runtime audits

Why fourth:

- remaining anomaly families need honest classification
- some will still be bounded hardening
- some will turn out to be content/runtime variance and should be demoted cleanly

### 5. Planner/doctrine realism program

Why fifth:

- once the remaining owner-truth lanes are exhausted, doctrine becomes the biggest contributor to the game feeling less mature than its substrate
- this is important, but it should not displace stronger hardening work while those lanes still exist

## Redesign-gated systems

These should not be treated as ordinary hardening unless their missing contract is chosen first.

### Stranded brigade lifecycle

Missing contract:

- canonical lifecycle owner for same-faction ownerless unreachable brigades

Do not start implementation here until the game explicitly chooses whether these brigades become:

- stranded/inert
- automatically recovering
- evacuated/reconstituted
- or something else

### Deeper packet-detail surfaces

If a UI/reporting lane needs sharper detail than the current canonical packet owns, do not fake it.

That applies especially to:

- exploitation detail beyond aggregate captured-objective count
- commander-escalation evidence beyond the packet-owned fields
- any political or review UI surface that wants deeper provenance than the engine currently serializes

## How to use this scorecard in the campaign

For every future hardening batch:

1. pick the highest-priority system whose promotion work is still bounded
2. choose one exact seam inside that system
3. harden it end-to-end
4. prove it with scenario/runtime evidence where relevant
5. update this scorecard only when the system has actually earned the new grade

If the top candidate is redesign-gated, demote it and rotate to the next system rather than stopping the whole campaign.

## Immediate recommended next program

If the team wants the highest-value quality program now, run this sequence:

1. `v0.8-to-v0.9 save/load + replay + adapter integrity`
2. `political review ownership + consequence truth`
3. `autonomy replay / fallback / queue truth`
4. `residual harness/content-runtime audits`
5. `planner/doctrine realism`

If the team wants the hardest remaining contract hole instead, do that deliberately:

1. choose the stranded-brigade lifecycle owner
2. implement it as its own explicit program
3. prove it on the Podrinje pair without hiding unrelated residuals
