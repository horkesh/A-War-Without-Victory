# V4 retained-artifact diagnosis

Date: 2026-10-25

Status: the one reviewed v4 attempt failed. `faithful:false`; `interpretation_allowed:false`. No retry and no T18 causal attribution.

## Attempt and immutable boundaries

- Preserved wrapper: child exit 1, wrapper exit 1, no signal, no timeout, no spawn error, artifact contract pass. Wall interval: 17,125 ms.
- Entry snapshot remained 35,833 bytes, SHA-256 `d010a5462a3ea3d95913bfcda164acc8858f2c920e8e8d73a89ca426fa443743`.
- Retained result failed first at `save_w39.json`: 5,123,670 bytes versus required 5,105,717 bytes.
- `initial_save.json` is byte-exact to immutable n94 `save_w16.json`: 4,493,938 bytes, SHA-256 `22ef518bb1f894d0afb450643a21d4a628f8f5c1462a80ebda498f81ece943ca`.
- All 33 private runtime inputs remained at their launch-manifest hashes. Run metadata binds clean head `86b693a9423de6a2be13174c36f96ee6a8430801`, headless/collapse-off, resume index 16, and the expected 29-row horizon digest `ab133ecd5b64fd0e88964152f1dbf468893a0e6d68ded491166b3a5509d19da3`.

The detailed offline inventory and structural comparison is `v4-retained-offline-diagnosis.json` (1,392,903 bytes, SHA-256 `06ef25682d069be7af6736f2b302deabdf1488d4f6b32e53fc79a5c5fb6cb9c2`). Its read-only script is `diagnose-v4-retained.mjs` (8,887 bytes, SHA-256 `2ef33de68a0c1fcd1023ca123b08de76ac37e059a46f9c9ee3344730c37a9d40`). It made zero engine calls.

## The divergence is resume-specific

The uninterrupted current-gameplay control n97 was produced at clean commit `fd061e898ad3de942d62c016547a5e453ddd9422`. It is byte-identical to n94 at every retained boundary relevant here:

| Artifact | n97 bytes | n97 SHA-256 | n94 equality |
| --- | ---: | --- | --- |
| `save_w16.json` | 4,493,938 | `22ef518bb1f894d0afb450643a21d4a628f8f5c1462a80ebda498f81ece943ca` | exact |
| `save_w39.json` | 5,105,717 | `e51224ac22a839d4c1af35a0ea828afb79b62f0ed56559c3b47dcda45578eec5` | exact |
| `weekly_report.jsonl` | 33,185,387 | `08b8e8cc74f7945ac4066edbce6cddfce74c40180c6fa013a6cb6c9997637669` | exact |

The four later observer-only files at head `86b693a...` did not change runtime/data sources. This rules out the fd061 routing change and the retained n94 benchmark as explanations for v4's difference. The same current gameplay reaches exact n94 bytes uninterrupted; deserializing exact save 16 and continuing does not.

## Earliest observed difference

After removing only the four declared diagnostic paths, no weekly row is exact. Week 17 is the first difference, but its control counts and all three battle records/outcomes are exact. Its only seven structural differences describe one missing active operation diagnostic:

- n94/n97 has `probe_vrs_herzegovina_t17`, corps `vrs_herzegovina`, objective `op:gorazde:faocici_2`, participant `rs_foa_brigade`;
- resumed v4 lacks that operation, leaving 11 operation diagnostics instead of 12.

The gameplay branches at week 18. Control changes from n94/n97 `{HRHB:93,RBiH:264,RS:355}` to resumed `{HRHB:93,RBiH:262,RS:357}`. The n94 Tosici battle is `18:op:trnovo:tosici:arbih_109th_mountain:null`, victory; resumed v4 uses `rs_foa_brigade` and is repulsed. Donje Žešće likewise changes from defender `rs_ajnie_brigade`/victory to `rs_foa_brigade`/stalemate. Control counts differ in weeks 18-39. Declared-strip battle arrays differ in 19 weeks: 18-22, 24, and 26-38; weeks 17, 23, 25, and 39 have matching battle arrays only. Therefore neither control nor battle outcomes remain equivalent.

At week 39, the raw states have 9,322 leaf/membership differences. Largest groups are corps command (2,177), settlement displacement (1,830), formations (1,773), narrative queue (1,325), sector intel (465), and casualty ledger (165), followed by control, operations, and political/displacement accumulators. Representative differences include commander beliefs/directives, brigade histories and casualties, political controllers, and civilian displacement. This is accumulated gameplay divergence, not a serialization-size-only discrepancy.

## Finalization and diagnostic categories

The resumed selected `save_w39.json` and its `final_save.json` differ only in the expected final projection: 70 `corps_front_sectors` members and 289 `war_front_edges_osid` entries are absent in the selected checkpoint and populated in the final save (360 structural differences including the array length). Both are turn 39. That finalization difference does not explain comparison against n94: n94's selected `save_w39.json` has the same empty checkpoint projection and exact expected bytes.

Movement diagnostics are not stored in GameState and cannot explain the raw save difference. The observer source snapshots cloned scalar/array state and the retained movement packets report no before/after mutation for either selected formation in weeks 17 or 18. The original n94/n97 weekly rows already contain a different movement diagnostic selector (`hvo_1st_guard_abb`), so v4's unreached comparator would also reject its incorrect `original must be absent` assertion before weekly equality. That observer defect needs an offline correction if this comparator is reused; it does not waive the failed raw-state gate.

Unreached gates were: movement packet validation/retention, declared-strip weekly exact comparison, Tosici uniqueness/earliest battle, militia/null/power-path predicates, and `faithful:true`/`interpretation_allowed:true`. No conclusion from those gates is available.

## Source-backed causal seam

The save contract removes five transient military projections at `serializeGameState.ts:37-48`. Four have a rebuild before their plausible turn consumers: sectors/unresolved state by phases 36-42, `home_distance_cache` at phase 62, and militia immediately before attack resolution. `active_offensives_against_corps` is the material unresolved seam:

- serialization deletes it (`serializeGameState.ts:37-48`);
- bot corps operation creation runs at phase index 74 (`war_phases.ts:2446` and the retained movement phase manifest);
- probe target selection calls `predictCombatOutcome` (`commander/emit.ts:322-334`, `3073-3083`);
- defender power reads the cache with absent meaning zero (`combat_math.ts:1741-1754`);
- the production rebuild does not occur until phase index 95 (`war_phases.ts:2884-2959`).

An uninterrupted run therefore carries the turn-16 cache into turn-17 bot operation prediction, while a resumed run begins without it and rebuilds it only after operation creation. This is an invariant-violating rebuild-before-consumption ordering and is the smallest source-backed explanation for the first missing Foča probe. The retained artifacts prove the resume-specific divergence and the missing operation; they do not contain the live turn-16 cache, so they do not by themselves prove its exact numeric contribution to the probe rejection.

## Smallest next proof

Do not repeat the 23-turn replay. The cheapest meaningful proof is one focused in-memory equivalence test around exact save 16, using production phases and no copied formulas: compare one turn from the raw deserialized state with one turn after invoking the existing production `build-active-offensives-cache` named phase before `generate-bot-corps-orders`. Pass only if the prehydrated branch restores the exact n97 week-17 operation set, including `probe_vrs_herzegovina_t17`, while the raw branch reproduces v4's missing probe; also require exact week-17 control and battle rows in both branches and preserve all state diffs. Expected cost is under 5 seconds with a 15-second cap. Stop after one attempt. If the probe is not restored, reject this hypothesis and inspect the next removed transient by the same rebuild-before-consumption rule. No gameplay fix or longer replay is justified before that branch-level proof.
