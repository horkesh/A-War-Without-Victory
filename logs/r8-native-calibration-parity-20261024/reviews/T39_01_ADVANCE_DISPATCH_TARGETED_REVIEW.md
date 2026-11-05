# Targeted review: Advance dispatch and fail-closed owner inventory

**Verdict: GO for the single bounded native t39-02 run.** The two blockers in `T39_01_SETTLEMENT_CORRECTION_REVIEW.md` are corrected. All earlier closed findings are reused; this verdict adds no t188 or broader acceptance claim.

## Frozen sources

- `tools/ui/paradox_local_qa.cjs`: `01b90af4d2501bfb131985ab1226044f3de434a7777b7cf460e66b133247ef55`
- `tests/paradox_local_qa_harness.test.ts`: `e0ff780ff37ba83b89cd28b7bfeb0c62b0c755a18b12eafff5df9152f40045b1`
- Correction receipt: `T39_01_ADVANCE_DISPATCH_CORRECTION_RECEIPT.json`, SHA-256 `9e517f63a81e4f526c70e7cb4cf1d780d2d9848846758fce1d00650bbab2c708`

## Verification

The held-confirmation path now resolves exactly one visible owner with `aria-labelledby="advance-turn-title"`, then exactly one visible and enabled button whose accessible name is one of the three anchored, source-owned variants: `Advance turn`, `Advance while holding present policy`, or `Advance with recorded decisions`. It has no toolbar fallback and waits for the actual turn transition.

The non-held path resolves exactly one visible and enabled `[data-testid="warroom-toolbar-advance"]` and only opens the confirmation. `playTurns` captures the settled archive and runs any checkpoint work before calling the dispatcher. A production-shaped hostile places the toolbar earlier in DOM order and proves that a held confirmation clicks only the modal action.

Owned-modal inventory reads now propagate both locator-count and visibility errors. They can no longer turn a detached frame or destroyed execution context into a false zero-owner result. The expected Advance confirmation remains intentionally outside that inventory because it is the pre-dispatch surface held while settlement is captured.

Independent targeted test selection passed: **3 passed, 83 skipped**, exit 0. The implementer evidence also records the complete focused suite at **86/86**, syntax exit 0, and nonincremental TypeScript exit 0.

## Run boundary

The reviewed `native-t39-02-config.json` and `T39_02_RUN_CONTRACT.json` retain one fresh-profile Historical RBiH packaged run, a 30-minute cap, and no automatic retry. Success still requires complete provisional and settled inventories for turns 1–39, exact accepted turn-39 map and score 707/712, n91/n92 protection, January anchors, save/resume and hydration proof, clean runtime evidence, and all reached provenance gates. Exact daily replay remains failed from turn 1 and must remain separately reported.
