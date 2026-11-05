# [096] Addendum to 095: replayable source receipts, corrected line references, qualified claim limits (Claude f75b0a11, read-only)

Scope: one bounded receipt correction; the 095 report and `095-defenders-result.md` are unchanged. No new investigation; no run/helper/test/observer/marker/commit/new worker.

## 1. Receipts (commands saved first; every command's numeric exit captured)
- `096-defenders-binding.{sh,command.txt,stdout.log,stderr.log,exit.txt}`: `git rev-parse` of the clean and HEAD commits, per-file clean/HEAD/working-tree blob IDs, `git status` for the four files. Script exit 0; **every inner command printed `EXIT:0`**; stderr empty.
- `096-defenders-source.{sh,command.txt,stdout.log,stderr.log,exit.txt}`: read-only range display **from the clean commit** (`git show <clean>:<file>` into the job temp dir, then `sed -n` with line numbers). Script exit 0; each of the five ranges printed `EXIT(git show):0` and `EXIT(sed|awk):0/0`; stderr empty; 887 lines of output. Ranges captured: `bot_brigade_eval_attack.ts` 340-440, `combat_predictor.ts` 226-560, `attack_resolution_osid.ts` 740-1108, `reason_code_debug.ts` 55-85 and 100-135. No cited range failed to read. `095-defenders-battlepower.*` (the battle_power payload and topic list) is reused, not re-extracted.

## 2. Binding (full IDs)
Clean commit `7b9c242a3d3942a8a64673457c4e75b545dab6e4`; HEAD at capture `c1fbb899adef0680778c9df038b37e427ee2bb8d`; `git status --short` for the four files is empty (working tree equals HEAD for them).
| file | clean blob | HEAD blob | working-tree blob |
|---|---|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | `7c7cb9085131b3e491e1a5f960ed896840f39af4` | same | same |
| `src/sim/combat/combat_predictor.ts` | `448501044cdf8cd7c439a6206fc6e4b95056fd68` | same | same |
| `src/sim/combat/attack_resolution_osid.ts` | `ee3aa988f2f521bd25d6fe307c3f514682357cba` | same | same |
| `src/sim/combat/reason_code_debug.ts` | `5bfed60012a88d9a91057ac9f472eaaec43d35b3` | `7ff5d4225fc89891f18ccb79097d3b628828e021` | `7ff5d4225fc89891f18ccb79097d3b628828e021` |
The first three files are identical at clean and HEAD; `reason_code_debug.ts` differs (HEAD has later topics), and the cited `battle_power` registration is read from the **clean** range: lines 63 (usage example), 78 (topic description), 106 (type union), 119 (`ALL_TOPICS`).

## 3. Line references checked against the saved clean ranges (corrections to 095's approximate numbers)
Predictor (`combat_predictor.ts`): fog-of-war docstring line 248; `collectDefenderFormationsAtTarget` 289; `attackerCount = 1 + additionalAttackers` 370; `reactiveResponse = Math.min(...)` 416; `intelFog = FOG_BASE + FOG_INTEL_SCALE * sectorConf` 424; `defenderPower = defenderFloor * fogMult` 436; enclave garrison 485; posture-default comment 494; `powerRatio` 508; `classifyOutcome` 509; morale downgrade 514. Eval attack: `predictCombatOutcome(` 365; `estimateConcentratedOutcome(` 416. Resolver (`attack_resolution_osid.ts`): casualty-distribution comment 762; anchor-garrison guard comment/loan limit 772-789; `findEmptySectorAdjacentDefenders` 798; `simultaneousAxes` 846-849; `reactiveResponse` 853; enclave garrison 955; collapse/post-Washington multipliers 969-970; last-stand x1.5 981; concentration bonus 1020; support multiplier 1030; `tempoMult` 1034; firepower-deficit 1038; intel friction applied 1077-1078; `powerRatio` 1086; `classifyOutcome` 1104. These replace 095's approximate `~` values where they differ (e.g. enclave garrison is 955, not ~944; `estimateConcentratedOutcome` is 416, not ~400).

## 4. Phase claims in 095 without a specific read sequence (marked UNPROVED)
- "casualties are then distributed by the same per-brigade weights, which is why several defender brigades carry the battle id": the resolver has the comment at line 762, but I did not read the caller that writes each defender's `brigade_history` engagement from those weights. Treat as an unproved explanation of the engagement records' multiplicity, not a proved link.
- Any statement that the resolver's order of defender-set construction versus later multipliers reflects an actual runtime phase at t188 beyond the line order inside this one function.
- The direction/sign/value of every resolver-only multiplier (not read) and which of them applied at t188.

## 5. Qualified claims (replacing 095's wording where stronger)
- **Both paths implement multi-defender models**, so a *fixed single-defender predictor design explanation is rejected*. This does **not** prove identical actual defender sets or cardinality, and does **not** exclude a one-versus-many runtime difference at the 188 battle (anchor eligibility/fallback and the resolver-only filters above can change the actual sets).
- **One attacker is the predictor call shape** (`additionalAttackers` is `undefined` at the call, line 365 region). The resolver's attacker count at the historical 188 boundary is **not** established by that call alone.
- **Shared helpers/base formulas plus differing filters and modifiers** are a finite source comparison, **not** whole-contract equivalence and **not** cause attribution.
- **Fog arithmetic is conditional feasibility only** (what fog value would bridge 1.296 to 0.93 if everything else were equal), not observed confidence and not a cause. The source docstring states estimate intent; no canon authority adjudication is made here.
- **Outcome-band consistency** (0.93 maps to `stalemate`) does **not** establish every resolver input or call, and does **not** resolve the unexplained 1.296 vs 0.93 gap or treat it as harmless variance.
- **`battle_power`** is a default-off reason-code topic whose payload adds `power_breakdown` to the **battle artifact**; no stdout-only, off-neutrality-when-on, or full-tuple guarantee follows. (Off-state: the spread helper contributes an empty object per the source comment; that is a statement about the off state only.) **Predictor receipt absence** is finite to the inspected evidence (the n39 artifacts and the four source files read), not a global statement.
- A new observer or a full 188 run is **not** inevitable and **not** granted; no plan requiring either is adopted; 095's "recommend stopping unless root wants the general question" stands without that implication.

## 6. Not claimed
Whole-contract equivalence, a runtime defender set or power input for the 188 battle, fog or any difference as the cause, defect or tuning, canon or historical adjudication, any link to original dirty 517, Southern Move, Jajce or Varošluk, or any acceptance change.
