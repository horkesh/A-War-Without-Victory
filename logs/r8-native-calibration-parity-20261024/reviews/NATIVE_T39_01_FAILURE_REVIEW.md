# Native t39-01 retained-failure review

**Verdict: FAILED at turn 15 before any settled archive was captured. No t39 checkpoint claim is available.** The readiness guard correctly rejected an actual open Decision Room, and the retained run also exposes a separate archive-ordering defect that allowed turns 1–15 to advance without settlement capture.

## Failure boundary

- Wrapper/child exit: **1/1**; timeout: **false**.
- The last retained screenshot, `reserve-request-after-response`, visibly shows the Warroom Decision Room host still open after the reserve request was accepted.
- Canonical state is turn 15, with zero required blockers and the reserve receipt recorded. The open surface displays an optional halt-operation dossier. Closing this surface is part of reaching a clean observation boundary; weakening the guard to archive through it would be incorrect.
- The screenshot does **not** show an accidentally staged halt. The retained canonical autosave has no `pending_op_directive` or `pending_op_halt`. It records only the intended reserve acceptance and its 25-point authority debit. The elite-deploy UI reuses the generic “Directive staged for next turn” success copy; when the resolved reserve card disappears, the dossier selection falls to the halt-operation card. This is confusing presentation evidence, not a second gameplay input.
- The persistent footer also contains `REVIEW BEFORE ADVANCE 1` while `REQ 0`. That text is advisory and remains in the body independently of modal ownership. The current broad body-text regex can therefore reject a clean closed surface. Readiness must use exact visible owner identities, including the Decision Room host and actual required decision/aftermath modal owners, rather than advisory copy.

## Archive-ordering defect

The run retained exactly 15 provisional files, turns 1–15, and **zero settled files**. `playTurns` archives before its generic Advance click, but `handleCurrentSurface` can click the `ADVANCE TURN` modal and return through the handled branch. Those internal advances bypass `archiveSettledTurn`, so the defect predates the visible turn-15 Decision Room failure.

The correction must preserve this sequence:

1. Resolve actual required state blockers through their normal visible UI.
2. Close any resolved owned modal or Decision Room surface through its normal visible close control.
3. Hold every Advance action, including the Advance modal path.
4. Prove the canonical autosave stable and the exact owner inventory clear.
5. Capture one immutable settled archive for the current turn.
6. Only then click Advance.

The guard must continue to fail on a visible owned modal, nonzero blocker inventory, turn mismatch, or changing autosave. This is a harness repair only; it must not change decisions, gameplay, policy, simulation, or canonical state.

## Other retained categories

- Main-process JSONL: 586 contiguous records.
- Exactly one `FINAL_SEAL` for each turn 1–15, all `unresolved=0`.
- Console errors: 0; page errors: 0; unmatched network failures: 0.
- Six raw hillshade aborts were matched by six exact tile-abort signals.
- Main stderr is the expected debugger teardown pair only.
- Save/Records/Resume, hydration, t39 score/map, January anchors, protection rows, and all later acceptance gates are **UNREACHED** in this attempt.

## Provisional controller observation

The provisional turn-15 map contains all 712 controller entries but differs from accepted n94 turn 15 at eight OSIDs. This is diagnostic only because the archive is provisional:

- `op:brcko:bukvik_gornji_2`: accepted RBiH, native RS
- `op:cajnice:batotici`: accepted RS, native RBiH
- `op:foca:brusna_2`: accepted RS, native RBiH
- `op:gorazde:kolovarice`: accepted RS, native RBiH
- `op:kakanj:biljesevo`: accepted RBiH, native RS
- `op:kladanj:olovci_2`: accepted RBiH, native RS
- `op:srebrenica:obadi`: accepted RBiH, native RS
- `op:vlasenica:sebiocina`: accepted RBiH, native RS

The two known turn-1 paramilitary differences persist. The six additional differences neither prove nor disprove turn-39 convergence. Exact daily replay remains failed, and this failed run supplies no checkpoint acceptance evidence.
