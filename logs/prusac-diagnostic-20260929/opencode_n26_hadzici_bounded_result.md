# Bounded n26 Hadžići pursuit diagnosis

Date: 2026-09-30
Scope: retained n26 diagnosis plus cheap final-state reproduction. No scenario campaign, full suite, map refresh, or commit.

## Verdict

**No safe production correction is supported by the retained evidence.** No production source or test file was changed for this bounded task.

## Exact evidence

- Retained n26 (`runs/apr1992_definitive_188w__6deb5845c150c196__w188_n26`) ends with the Petrovac axis in `execution`, current objective `op:kljuc:hadzici`, index 7, four idle turns, and no movement-only turns. The retained comparison confirms Ključ and Sanski Most towns remained RS.
- The read-only route probe accepts both final-state routes:
  - 501st: `kolonic_2 -> jasenovac_2`
  - 510th: `dobro_selo_2 -> jasenovac_2`
  Jasenovac is HRHB-held and allied. `buildCorpsAllowedOsids` does not contain that destination, but `dijkstraFriendlyPath` explicitly exempts the destination from the allowed-set traversal guard (`src/sim/combat/osid_column_movement.ts:272-277`), so this is not a graph-block result.
- Cheap isolated order-generation reproduction: `logs/prusac-diagnostic-20260929/probe_orders_n26.out`.
  - `src/sim/combat/bot_brigade_eval_attack.ts:424-464` emits `march_to_approach` for both brigades to `op:bosanski_petrovac:jasenovac_2`.
  - `src/sim/combat/osid_column_movement.ts:628-655` accepts both orders and creates `in_transit` state with the expected two-node routes. Neither brigade receives a rejection receipt. The movement report starts seven unrelated columns; its ten rejections do not include the 501st or 510th.
- Evaluator precedence is therefore not blocking the final-state reproduction: `evaluateSectorAttack` is reached after the earlier evaluators (`src/sim/combat/bot_brigade_ai_osid.ts:611-625`), and both operation participants receive the march decision.
- The retained campaign does not preserve the needed per-turn `order_generation_details`, `column_rejections`, or movement-state receipts for t185–188. The final-state reproduction differs from the historical execution: it has the allied approach available and issues/accepts the march, while the retained final artifact shows the historical axis idle and no resulting transit. The available evidence does not identify whether the historical difference was a turn-state/phase ordering condition or another transient predicate. Assigning one would be speculation.

## Checks

| Command | Exit | Result |
|---|---:|---|
| `cmd /c npx tsx logs/prusac-diagnostic-20260929/probe_hadzici_route_n26.ts` | 0 | Both allied Jasenovac routes accepted by the read-only geometry/path probe. |
| `cmd /c npx tsx logs/prusac-diagnostic-20260929/probe_orders_n26.ts` | 0 | Both final-state march orders generated and accepted into transit; no matching rejection. Raw output retained in `probe_orders_n26.out`. |
| `git diff --check` | 0 | No whitespace errors; Git emitted only the existing CRLF/LF working-copy warning for `docs/PROJECT_LEDGER.md`. |

No focused regression test or typecheck was run: no production correction was made, and adding a test for the unproven historical failure would encode the wrong cause.

## Stopping point / next experiment

Do not tune a proxy or force a capture. The next safe experiment requires a retained or newly instrumented **bounded turn-window** reproduction (t184–188 only) that records, for each 501st/510th turn: active operation phase/objective, evaluator decision, pending column order, movement processor acceptance/rejection, and post-update axis counters. No 188-week rerun is justified by this receipt.

Protected controls, checkpoint matches, authored objectives/roster/timing, combat outcomes, and Farz P-A §6 were not changed.
