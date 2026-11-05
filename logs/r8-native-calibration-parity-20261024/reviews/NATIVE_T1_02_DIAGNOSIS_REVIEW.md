# Native RBiH turn-1 attempt 02 diagnosis review

Date: 2026-10-24  
Verdict: **DIAGNOSIS PASS; another native launch is BLOCKED on an unresolved product/canon contract**

The consolidated diagnosis correctly identifies the first authoritative failure. The packaged normal-player route produced the exact accepted n94 initial controller map, then diverged at turn 1 by exactly two RBiH paramilitary captures. The other twelve ordered control events match n94. This is an actual simulation outcome difference, not a comparator, capture, hydration, or presentation defect.

## Root cause and contract conflict

`detectParamilitaryTargets` derives ownership from `meta.player_faction`. For RBiH and RS it suppresses the player faction while the authored paramilitary-policy event is enabled but unresolved (`src/sim/combat/paramilitary_sweep.ts:83-101, 413-449`). The packaged RBiH t1 state satisfies that condition, so it creates no player requests and there is no visible pre-Advance choice. The existing modal cannot establish a standing policy without requests because both standing-policy controls are disabled when `requests.length === 0` (`src/ui/map/components/ParamilitaryReviewModal.tsx:305-365`).

Even without that suppression, the current normal IPC boundary cannot reproduce n94's same-turn captures: detection and `paramilitary-advance` execute within one engine turn, while `resolve-paramilitary-requests` is available only after Advance returns. The resolver spawns the accepted formation and saves state but does not resume the already-completed advance phase (`src/desktop/electron-main.cjs:3497-3550`). A post-Advance harness action would therefore shift the capture to a later turn.

The accepted n94 t1 history contains two bot RBiH paramilitary captures, at `op:brcko:bukvik_gornji_2` and `op:srebrenica:obadi`. But the authored RBiH policy event says the historical default is `always_deny`, describes `always_allow` as counterfactual, and does not become eligible until turns 3-9. The governing sensitive-history gate says `paramilitary_policy` is the only player-facing authorization surface and defaults to `ask`; it requires explicit, unsanitized disclosure of civilian and war-crime consequences (`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md:128-143`).

Consequently, a harness-only `matched-policy` flag, a hidden start payload, a direct state write, automatic bot behavior for the player faction, or an injected control event would violate the agreed real-game route and/or the sensitive-history authorization boundary. Adding a visible pre-Advance authorization could technically make the t1 engine path match, but it would be a new material player decision that temporarily selects a counterhistorical policy before the later authored historical refusal. That is not a routine QA input and cannot be represented as an unchanged historical-mode contract without an explicit canon/game-design ruling.

The issue is not unique to the RBiH seat. N94 t1 also contains two RS paramilitary captures. An RS normal-player campaign is expected to encounter the same unresolved-policy suppression. HRHB has no entry in `PLAYER_PARAMILITARY_POLICY_EVENT`, but its default player policy is still `ask`; any n94 turn with an HRHB bot paramilitary capture will require a same-turn visible decision/resume boundary or will diverge. Each faction therefore needs its own earliest bot-paramilitary-action audit before its long lane.

## Independent harness findings

Three proposed harness corrections are valid and separable from the controller failure:

1. The save/load guard may allow exactly `military.home_distance_cache` removal and `military.sector_combat_ratings` recomputation. Both are declared transient and canonical persistence remained byte-identical. The raw 214-leaf delta, canonical-byte equality, and exact independently hydrated post-load projection must remain recorded and enforced.
2. Failure-path tile attribution should invoke the same fail-closed identity/range/timing classifier as the success path. Raw request failures and matched observer signals must remain present in evidence. A classifier result may explain those two aborts; it must not erase them or generalize all `ERR_ABORTED` requests as benign.
3. Completed-turn archives must be captured at one defined settled boundary after all required post-turn decisions are resolved and immediately before the next Advance, with the terminal turn drained before its final archive. A hostile test must prove that a same-turn post-Advance receipt changes the canonical autosave and that the archive contains the settled version. This correction makes evidence truthful but cannot move a late player action back into the already-completed engine phase.

These fixes should receive focused RED/GREEN coverage and can proceed without another native run. They do not establish controller parity.

## Smallest next scope and launch gate

Before another packaged turn-1 attempt, obtain the required canon/game-design decision for one of these acceptance definitions:

- Preserve the normal historical-player contract. Then exact n94 controller parity is impossible under the current accepted n94 policy and the equality claim must change; no implementation should disguise that result.
- Require exact n94 outcomes. Then design an explicit, visible, consequence-complete pre-Advance authorization or a resumable mid-turn decision boundary. The decision and transcript must be canonical, must use the owned paramilitary-policy/resolver surface, and must state that the early authorization reproduces bot calibration behavior even though RBiH's later authored historical response is refusal. The relevant canon panel must approve the timing and wording before implementation.

Only after that decision should production behavior be changed. The next native launch also requires focused proof of the chosen policy boundary, settled archive timing, exact hydration allowlist, failure-path tile attribution, package-content binding, historical mode persistence, and t0 parity. Pass criteria for the replacement t1 remain exact n94 t0 and t1 controller maps and ordered control events, complete visible-choice transcript, successful real Save -> Records -> Resume, and zero unexplained runtime categories. Turn 39 and all full lanes remain **UNREACHED**.

The known native audio abort remains a separate strict R8 failure and is neither closed nor reclassified by this review.
