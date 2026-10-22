# 823 independent Pale upstream review

**Verdict:** approve the **writer phase**, with a provenance qualification. The retained 0 → 111 boundary plus exhaustive reached-path exclusions support turn-22 `ongoing-mobilization` as the actual positive writer class for `pale:RS`. They do not measure whether the credit came from the direct RS controller path, shared displaced-in credits, or both; they also do not measure gross credit before pool decay.

## Material findings

1. **WIA must be excluded explicitly across the whole interval.** The interval starts after turn-21 regular reinforcement and includes turn-21 `wia-trickleback`. Pale starts with `wounded_pending: 0`; militia combat is the sole pool-side producer; the canonical OSID battle report emits `defender_militia_pool_key`; the weekly writer forwards every such battle; and retained turns 1–22 contain zero `pale:RS` militia-defender rows. The OSID resolver clears attack orders before the compatibility resolver. Under that observed path, Pale pending remains zero and WIA returned zero. This makes the exclusive-phase deduction valid, provided the weekly canonical battle projection’s completeness is stated.

2. **The final 822 synthesis is not itself a 0/0 preserved-preflight output.** Attempt A is child/wrapper `0/0` and artifact-contract pass. Attempts B and C are each `1/126`, with retained assertion failures and no `result.json`. The frozen final synthesis hash is `ed23ebe66e4c2d0c8bccfe089275a29666f063469c016cd2dcd9950d3e48514f`, but it was written after those failed attempts and is outside a successful finalizer receipt. Preserve all three receipts and do not report the final synthesis as receipt 0/0.

3. **Actual class, not exact line.** Takeover contributes `floor(24 × 0.02) = 0`; the sole Pale OOB brigade is already active, closing mandatory-recruitment and reroute-deficit credits; `player_choice` excludes the early-war pool-population tail; the remaining reached writers are nonpositive. Therefore ongoing mobilization necessarily supplied positive manpower. Its direct/shared split, operands, gross amount, and subsequent decay remain unmeasured.

## Smallest next fix

If the owner later authorizes implementation, add a default-off stdout observer using the existing selector, limited to `pale:RS`, turns 21–22, and the surviving boundary chain: inherited regular close, WIA qualification, recruitment gates, ongoing-mobilization direct/shared operands and before/after, pool decay, reroute gate, spawn, and regular open. Do not instrument every pool or every repository writer. Write no GameState/save/file telemetry. Prove default-off neutrality and selector isolation before requesting one separately authorized preserved measurement; no new campaign is justified.

## Integrity

HEAD is `49bc34cad43929a5033819d9c51c88a9782552e8`. Protected pins and telemetry match: C `103894385 / 00d6d7e65832a45e4b8ddc34e077c228b9496ca8f1068a6b9633571b4bae5557`, D `1041 / ff120d4aab551ad703cac3b1dc260d71cab1464b9bf5a57dba76c86baf3346e3`. Review was read-only apart from these two requested log artifacts; no simulation, `runTurn`, replay, build, suite, campaign, source/test/data/docs, threshold, or Git mutation occurred.
