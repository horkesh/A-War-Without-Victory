# 2026-04-10 v0.8-to-v0.9 A+++ System Scorecard Plan

## Purpose

This plan turns the current "how good is the game, really?" question into a durable prioritization artifact.

It has one job:

- grade the major systems honestly
- name the exact work that would move each system up to its next meaningful quality rung
- distinguish bounded hardening from realism work, content/runtime audit, and redesign-gated seams

This is a planning lens for the `v0.8-to-v0.9` band, not a new feature milestone.

## Scope and interpretation rules

The grades below are board-level judgments, not release marketing.

- They reflect the current repo truth across the mainline `2026-04-09` and `2026-04-10` hardening chain plus the surrounding verified product state.
- They are meant to help choose the next lane, not to declare the game "done."
- "Move up one rung" means the next meaningful promotion step on the current grading ladder. For example:
  - `B+ -> A-`
  - `A- -> A`
  - `B- -> B`
- If the exact next promotion is blocked by a missing canonical owner or packet contract, that is called out explicitly instead of disguised as ordinary hardening.

## Pyrrhic review normalization (2026-04-10)

The external full-system review in `C:/Users/User/.agent/diagrams/pyrrhic_full_review_20260410.html` is useful, but it must be normalized against current merged-main truth before it drives roadmap sequencing.

Use it as:

- a structural pressure test on this scorecard
- a source of cross-cutting concerns the first scorecard draft under-emphasized
- not as an unfiltered live board snapshot

Current normalization:

- `Probes flip territory` was a real category error, but it is no longer an open queue item on `main`; the no-flip guard landed on `2026-04-10`.
- `47% zero-eligible-attacker ops` is an important historical warning, but it must be re-measured from current merged-main scenario output before it is reused as a live KPI.
- `Hostile-majority Phase B pocket marches` remains a serious doctrine/planner concern, but it is still classified as realism/doctrine unless a narrower truth-owner seam is isolated.
- `Exhaustion = 0` remains a valid identity-level audit target and should be explicitly tested rather than assumed solved.
- `God files` remain active structural debt and should be treated as their own bounded maintainability program rather than as a side effect of unrelated gameplay lanes.

This plan therefore absorbs the review in two ways:

1. by adding the still-live cross-cutting programs it surfaced
2. by explicitly marking which review claims are already closed or need re-benchmarking first

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
| Political leader / peace-plan / patron review systems | `A-` | **2026-04-14:** Dimension weights unified to single canonical source. DiplomacyOverview migrated to canonical 6 dimensions (dead code removed). Negotiation capital composite computed from real weights (was hardcoded 50). Exhaustion rescaled in situation_score. Negotiation pressure wired into RS peace plan acceptance floor. HRHB patron directive scoped per-corps. n1572: 93.6%, HRHB orders 2→6. Remaining: Dayton adapter side effect (redesign-gated), pressure floor for RBiH/HRHB. | `A` | Extend pressure floor to all factions. Move Dayton trigger out of adapter read path. | Per-faction pressure floor, Dayton pipeline step |
| Autonomy / proposal / review framework | `B+` | **2026-04-14:** Resolved proposal GC added (prior-turn proposals cleared each turn instead of accumulating). Three separate queues still exist (meta proposals, event decisions, per-corps responses). No unified decision inventory. Headless replay determinism unproven. | `A-` | Unify queue inventory accessor. Add autonomy round-trip proof. Add headless replay determinism test. | Replay/fallback audit, queue-truth tests, scenario/harness runs |
| Scenario harness / anomaly diagnostics / calibration surfaces | `B+` | Stronger than before, but still not completely through the residual board. Some anomaly families are now honest; others still need classification. | `A-` | Merge the verified cold-front density / brigade-never-fights truth lanes, then run a bounded residual audit to separate true detector drift from accepted content/runtime variance. | Anomaly deltas with unchanged hashes, consistency audit, recovery bar |
| Code maintainability / god-file decomposition | `B-` | **2026-04-14:** Decomposition program CLOSED. 7 tranches extracted from `attack_resolution_osid.ts`: 1809→907 lines (-49.9%). 8 new modules, 187 targeted tests. `war_phases.ts`, `sector_offensive.ts`, and `electron-main.cjs` remain oversized but are not blocking safe hardening at current velocity. | `B` | Further decomposition only if a genuinely bounded no-drift seam emerges. Do not reopen as active driver. | Same-hash proof for any future tranche |
| Game identity / exhaustion / negative-sum pressure | `B` | **2026-04-14:** Commander reads `faction_war_exhaustion` (n1568). `situation_score` exhaustion rescaled from dead 0-100 clamp to /6 normalization (n1571). Negotiation pressure now erodes RS territory floor gap by up to 15pp (n1572). **40w proof: n1572, 93.6%, 27/27, 6/6.** Remaining: negotiation pressure consequences for RBiH/HRHB (currently RS-only floor), exhaustion visibility in player-facing briefing. | `B+` | Extend pressure floor to RBiH/HRHB acceptance logic. Surface exhaustion drag in commander briefing UI. | Per-faction acceptance pressure, briefing UI |
| Save/load / replay / adapter/read-model integrity | `A-` | **2026-04-14:** Real-save round-trip proven (12 tests against 13MB production save). Idempotency byte-identity, adapter-after-deserialize contract (formation/settlement/sector/front-edge counts match raw vs round-tripped), and SHA-256 hash preservation all verified. Remaining for A: replay-from-save-point equivalence (no continue-from-save facility exists yet). | `A` | Build save-load-continue facility in scenario runner, prove hash equivalence on continued run. | Continue-from-save hash chain proof |
| Desktop runtime / packaging / shipped-platform contract | `B` | Packaged-runtime proof exists and is much stronger than before, but this is still below the simulation core in confidence. | `B+` | Promote packaged proof from "headless smoke with strong route coverage" to "shippable packaging contract": CI-owned packaged probe, installer/artifact path truth, and explicit disposition for the remaining unsigned/store gaps. | Packaged probe in CI, artifact validation, release-check proof |
| Planner realism / salient-risk doctrine | `B-` | Not broken in an ownership sense, but still capable of overextension and low-wisdom operational choices. | `B+` | Run a doctrine program focused on salient-risk, one-brigade probe overreach, and target-selection wisdom, using scenario evidence rather than truth-surface patches. | Multi-run scenario evidence, doctrine metrics, accepted-variance notes |
| Stranded brigade lifecycle ownership | `D+` | This is the clearest remaining contract hole. The engine can now report strandedness honestly, but it still lacks a canonical lifecycle owner. | `C` | Choose one explicit lifecycle contract for same-faction ownerless unreachable brigades, then implement that owner end-to-end before attempting any richer behavior. | Contract decision first, then Podrinje-pair before/after proof with unchanged unrelated outcomes |
| Historical content / dynamic Codex / comparison layer | `B+` | Rich content base exists, but the reactive/dynamic comparison layer is still not at "signature feature" strength. | `A-` | Build the dynamic essay and endgame-comparison layer already planned for `v0.9.1`, focusing on divergence notes, ghost entries, and comparison glue rather than raw essay volume. | Feature-complete content proof, endgame comparison walkthrough, regression checks |
| Production readiness / thin player-experience layer | `D+` | The project is much stronger as a simulation engine than as a first-session playable game. Onboarding, campaign framing, and the thinnest viable player loop still lag well behind the substrate. | `C-` | After the identity and core-truth P0s, build the thinnest viable player layer: onboarding, first-session guidance, campaign framing, and expectation-setting around delegation and command friction. | First-session walkthrough, UX acceptance checklist, no-regression verification |

## Ordered promotion queue

This is the recommended queue for the remaining `v0.8-to-v0.9` band.

### ~~1. Code maintainability / god-file decomposition~~ — CLOSED 2026-04-14

7 tranches complete. `attack_resolution_osid.ts` 1809→907 (-49.9%). Program canonically closed. Do not reopen unless a genuinely bounded no-drift seam emerges.

### ~~2. Exhaustion activation / negative-sum identity audit~~ — PARTIALLY SHIPPED 2026-04-14

Commander now reads `faction_war_exhaustion` via `factionExhaustionDrag` multiplier. Remaining: 40w scenario proof, negotiation pressure → consequence wiring (needs design decision).

### ~~3. Save/load + replay + adapter integrity~~ — PARTIALLY SHIPPED 2026-04-14

Real-save round-trip byte-identity proven (9 tests). Remaining: adapter-after-deserialize contract test, save-load-continue hash chain.

### 4. Political review ownership + consequence truth

### 4. Political review ownership + consequence truth

Why fourth:

- the military review and reserve review stacks have improved faster than the political stack
- this is now one of the biggest product-coherence gaps

### 5. Autonomy replay / fallback / queue truth

Why fifth:

- autonomy is structurally impressive but still under-proven relative to the simulation core
- it needs the same "one owner, one queue, one replay truth" discipline already applied elsewhere

### 6. Residual harness/content-runtime audits

Why sixth:

- remaining anomaly families need honest classification
- some will still be bounded hardening
- some will turn out to be content/runtime variance and should be demoted cleanly

### 7. Planner/doctrine realism program

Why seventh:

- once the remaining owner-truth lanes are exhausted, doctrine becomes the biggest contributor to the game feeling less mature than its substrate
- this is important, but it should not displace stronger hardening work while those lanes still exist

### 8. Thin player-experience layer

Why eighth:

- the project's engine quality is now strong enough that the lack of onboarding/campaign framing is becoming its own blocker
- this should follow the highest-value truth and identity work, not precede it

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

## Structural maintainability program: god files — PARTIALLY CLOSED

**`attack_resolution_osid.ts` — CLOSED 2026-04-14.** 7 tranches, 1809→907 lines (-49.9%), 8 extracted modules, 187 targeted tests. Remaining inline logic is core orchestration — further extraction would require fake abstractions.

**Remaining targets (not active — reopen only if a genuinely bounded no-drift seam emerges):**

- `src/sim/turn_phases/war_phases.ts` — still oversized but not currently blocking safe hardening
- `src/sim/combat/sector_offensive.ts` — same assessment
- `src/desktop/electron-main.cjs` — same assessment

Program rules (if reopened): same as before — no hidden behavior changes, pure-helper extraction, same-hash proof, explicit ownership documentation.

## How to use this scorecard in the campaign

For every future hardening batch:

1. pick the highest-priority system whose promotion work is still bounded
2. choose one exact seam inside that system
3. harden it end-to-end
4. prove it with scenario/runtime evidence where relevant
5. update this scorecard only when the system has actually earned the new grade

If the top candidate is redesign-gated, demote it and rotate to the next system rather than stopping the whole campaign.

## Immediate recommended next program (updated 2026-04-14)

**Completed (this campaign session):**
1. ~~`god-file decomposition`~~ — CLOSED (7 tranches, resolver 1809→907)
2. ~~`exhaustion activation`~~ — PARTIALLY SHIPPED (commander reads faction exhaustion; negotiation pressure consequences still design-gated)
3. ~~`save/load + replay + adapter integrity`~~ — PARTIALLY SHIPPED (A- grade; continue-from-save facility still missing for full A)

**Remaining queue:**
4. `political review ownership + consequence truth` — dimension weights unified, DiplomacyOverview migrated. Next: Dayton pipeline step (redesign-gated)
5. `autonomy replay / fallback + queue truth` — proposal GC done. Next: queue unification (redesign-gated)
6. `residual harness/content-runtime audits` — anomaly report clean (0 critical, 1 warning). Classification tail.
7. `planner/doctrine realism` — design-gated
8. `thin player-experience layer` — after identity and core-truth work

**Design decisions needed before further progress:**
- What should negotiation pressure trigger? (exhaustion → consequences)
- What should feints do to the enemy? (feint zero-effect P2)
- Which HVO corps should patron directives constrain? (HRHB scope)
- What is the stranded brigade lifecycle contract? (inert/recovering/evacuated)

If the team wants the hardest remaining contract hole instead, do that deliberately:

1. choose the stranded-brigade lifecycle owner
2. implement it as its own explicit program
3. prove it on the Podrinje pair without hiding unrelated residuals
