# Independent T3 routing delivery fixture review

## Verdict

**NO-GO for the frozen v1 entrypoint. Do not invoke the turn run yet.**

The plan, input hashes, source hash, canonical round-trip, real desktop `advanceTurn`, no-decision behavior, 60-second wrapper, one-attempt rule, artifact contract, and observation/pass separation are otherwise sound. The zero-turn precheck is authentic and passes with child/wrapper `0/0` and `turns_run: 0`.

## Blocking findings

1. **The script does not stop at the first delivery-contract failure.** Inside the turns 3–6 loop it stops for a pre-turn blocker, advance error, or turn-number mismatch, but it defers path, owner, stance, tick, location, rejection, and four-control validation until after all four advances. A turn-3 failure therefore still consumes turns 4–6, contrary to the plan's explicit first-failure stopping rule. Validate the expected turn-specific boundary immediately after each `advanceTurn` and call `stop` before another turn.

2. **A blocking player choice created by turn 6 is not detected.** The blocker query occurs only before each advance. That catches blockers produced at turns 3–5 on the next loop iteration, but there is no query after the turn-6 advance. Consequently `blockers_pass` can be true even when the final completed-turn boundary contains a newly generated unresolved choice, contradicting the question's “without a new player choice” and the plan's boundary claim. Query and record blockers immediately after every completed turn, including turn 6, and fail immediately if nonempty. The script must continue to submit no decisions.

As part of the same boundary check, assert that every completed state remains War, RBiH player, non-headless, autonomy 2, and historical decision mode. This makes the “normal real desktop turns 3–6” claim fail closed rather than relying only on the input state.

These are fixture-control corrections only. They require no gameplay-source change and no turn execution. Preserve this precheck as superseded evidence, update the frozen entrypoint/plan if needed, and run one fresh zero-turn precheck before requesting targeted verification.

## Confirmed scope

- Exact input is the repaired production turn-2 state SHA `33d14f1a1ec9de7b98231132b0006a2539487d8c56ffee68a1589e9b1dac1688`.
- Exact T3 source is pinned to `31de47a728a2382a23f4eb9a7f665f6c6f1fe5cbcef8d6da59d8221ec7d29c73`.
- The entrypoint invokes canonical deserialize/serialize, `listBlockingPlayerDecisions`, and real desktop `advanceTurn`; it invokes no decision resolver and writes no gameplay state directly.
- 182 delivery, blockers, and four controls are pass criteria. The 181/109 phase-37 receipts and location comparisons are observations only.
- There is no teleport write: the expected intermediate states retain Luke and decrement ordinary transit; only ordinary arrival may place the formation at Delijaš.
- No campaign, 707/712, qualification, source-adoption, or historical-mode relabel claim is made.

## Frozen bindings

- plan: `09e06e062a0d34d09a0c5b5aeb842dfd976359a2a0a5c562738b43d7ea992cfa`
- entrypoint: `4354e06792a3ac1abdb187742dc2161e558a94419df12dc3f34f5b6cddb271c7`
- precheck receipt: `ec329060a8e767e21ffccf057356e8a1fa3b4ea542d17fd39151043031067519`
- precheck dependencies: `2040d13723ee0283969941c2a7d41df3a50602db7ffdc47bfd4b87a87a68684c`
- precheck payload: `2d04655550ff9749bbe42be2fc32e46577c53b02a2755cbe31717d115c2cdeae`
- precheck result: `e81575fc3815e82e49eace7d962c125585b298b380990e83409dd95d575902c3`

