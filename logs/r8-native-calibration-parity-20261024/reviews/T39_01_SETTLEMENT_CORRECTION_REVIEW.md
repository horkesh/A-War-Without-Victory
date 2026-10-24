# Targeted review: t39-01 settlement correction

**Verdict: BLOCK for native t39-02.** The reserve closure and exact owner inventory direction are sound, but the corrected loop does not safely dispatch a held Advance confirmation and the inventory reader can convert query failures into a false zero-owner result.

## Reviewed frozen sources

- `tools/ui/paradox_local_qa.cjs`: `cce287ad720478d475267b012c482275a7790a10845ed40ce3c8765ea93166ad`
- `tests/paradox_local_qa_harness.test.ts`: `489e233f952cedb8b415d2e6b9365a3dcb4a114eaff5396bcc719e358a4d2c51`

The RED/GREEN receipt, 85/85 focused pass, syntax pass, and nonincremental typecheck pass are internally consistent. The reserve branch now proves the exact active `command:elite-deploy:${requestId}` dossier, scopes Issue to that dossier, verifies the exact new reserve receipt, clicks the exact Decision Room close control, and waits for the host to become hidden. The twice-sampled owner inventory also correctly avoids treating persistent `REVIEW BEFORE ADVANCE` footer text as modal ownership, and intentionally excludes the expected pre-dispatch Advance confirmation.

## Blocking findings

### 1. Held Advance confirmation is dispatched through an ambiguous frame-level matcher

`handleCurrentSurface(..., { allowAdvanceModal: false })` correctly returns `advance-turn-modal-held-for-checkpoint` without dispatching. After settlement, however, `playTurns` still calls the broad frame-level matcher:

`/warroom-toolbar-advance|^Advance$|Advance|Review Blockers|Review Before Advance|Review paramilitary/i`

`clickMatch` walks all matching buttons in DOM order and defines visibility using geometry and CSS. It does not test whether another modal occludes the button. `AdvanceTurnModal` is rendered globally while the underlying Warroom toolbar remains rendered, so the DOM-earlier toolbar Advance can be selected while the confirmation is open. Playwright may then reject the covered click; `clickMatch` returns false and the loop accumulates stagnant steps. The previous successful flow used the handler's narrower `Advance Turn` match inside the modal.

The loop must branch on the held action. After settlement it should scope the click to the exact Advance confirmation owner (for example the visible owner with `aria-labelledby="advance-turn-title"`), click its exact enabled `Advance Turn` action, and wait for the turn transition. When no confirmation is open, it should click only the exact toolbar owner to open it. A production-shaped hostile test must put the toolbar before the modal in DOM order and prove that only the modal action dispatches, downstream of settlement.

### 2. Owner-inventory collection fails open on query errors

`readOwnedModalInventory` currently maps locator-count failures to zero and per-node visibility failures to false. A detached frame or query failure can therefore be reported as a clean zero-owner inventory. This gate exists to prevent archiving through an unknown UI boundary, so query failures must propagate and stop the run. The reader should return zero only after a successful count and successful visibility checks.

## Scope after correction

No new t1 native run or broad harness review is needed. Targeted tests for exact modal dispatch ordering and fail-closed inventory collection, plus syntax/type checks, are sufficient before reconsidering the existing t39-02 contract. Daily n94 parity remains failed and all t39 outcome gates remain unreached.
