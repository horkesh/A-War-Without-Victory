# Independent review — bounded causal extraction — 2026-10-04

## Verdict

**GO for the bounded STOP-without-correction disposition and the retained chronology. NO-GO for causal attribution, for treating the writer inventory as exhaustive, or for integrating the proposed discriminators unchanged.**

The extraction correctly preserves the central result: no shared cause or failing pre-order predicate is proved. The n40 ordinary dispatcher receipt establishes only that the 737th was eligible in that ordinary pass, was first handled by `offensive`, and emitted `dig_in` with no attack or movement at completed turns 137–139. The later post-turn destinations are observations, not writer receipts. The retained n39 517th `march_to_approach` receipt supports current-source behavior only and does not establish the original dirty n37 cause. Barevo/Lupnica, Majdan, and Varošluk remain separate chronology problems.

## Findings requiring correction before integration

### 1. NO-GO — the writer inventory and next discriminator are too narrow

The table proposes a named observer around `final-distribute-brigades-to-front` as the smallest discriminator and describes a later front-distribution branch as the candidate writer (`continuation4_causal_20261004_table.md:7`). That is a useful candidate, but the inventory is not exhaustive over post-ordinary-pass movement mutation.

The production pipeline runs `recall-drifted-brigades` after `generate-bot-brigade-orders` (`src/sim/turn_phases/war_phases.ts:2650, 3577–3583`), and `recallDriftedBrigades` can write `moveOrders[fid]` (`war_phases.ts:4541`). It also runs `tick-elite-loans` later (`war_phases.ts:3646–3651`), whose order family writes through `issueEliteDeploymentOrder` (`src/sim/combat/army_reserve_system.ts:512–528`). Final reconciliation then runs `repair-active-elite-deployment-after-final-topology` before front distribution (`src/sim/turn_phases/war_phase_reconciliation_steps.ts:157–178`); that repair can issue another order (`army_reserve_system.ts:626–647`). The retained evidence does not show that the 737th entered any of these branches, but it also does not serialize enough actor state to exclude all of them.

The temporal field is additionally source-ambiguous: `brigade_temporal_emit.ts:182–190` reports `mv_destinations` from `brigade_movement_state` first and falls back to `brigade_movement_orders`; it does not report the selected source, order owner, or stance. Therefore `mv_state: null` plus `mv_destinations: [Udurlije]` is insufficient to call the destination an observed same-turn order write.

Required correction: label the inventory as a bounded candidate-family inventory. The next discriminator should record the named actor's movement state and movement order, including destination, status, stance, and owner, before and after each relevant post-ordinary-pass phase boundary. Only after the first mutation boundary is measured should a branch-specific final-distribution receipt be selected.

### 2. NO-GO — the n39 receipt does not contain a complete evaluator input tuple

The proposed check says a focused evaluator fixture can prove “the recorded n39 input tuple” selects Budimlić (`continuation4_causal_20261004_table.md:8`; summary JSON line 190). The retained receipt contains location, objective, controller, tactical-adjacency result, decision, and issued destination, but it does not serialize the full inputs consumed by the approach selector: the adjacency/reverse-map state, friendly-control map, computed approach candidate set, path ranking, or prior movement-order context. The source builds those values before `findNearestFriendlyOsidDestination` and writes the result at `src/sim/combat/bot_brigade_eval_attack.ts:478–504`.

Required correction: say that a future observer must first capture or bind the complete evaluator inputs. A fixture using reconstructed inputs can validate that constructed context, but it cannot prove that the retained n39 pre-order tuple was fully recorded and cannot retroactively bind dirty n37.

### 3. Wording correction — static predicates are not 737th eligibility evidence

The inventory labels three front-distribution families “static eligibility only for 737th” (`continuation4_causal_20261004_table.md:18–20`). The source establishes candidate predicates; the retained n40 data does not show that the 737th satisfied those predicates or executed those branches. The actual `eligibility: eligible` receipt applies to the ordinary dispatcher pass only.

Required correction: replace this wording with “static candidate predicates only; 737th eligibility and branch execution unmeasured.”

## Verified chronology and boundaries

- n40 completed turns 137–139: the 737th ordinary-pass receipts are `eligible` → `offensive`, with `dig_in` and null attack/column/movement outputs. The aligned temporal observations are completed 137/138/139 with raw loop indices 136/137/138 and destinations null/Udurlije/Udurlije. The exact later destination writer remains unmeasured.
- n39 terminal 517th: Lušci Palanka, Stari Majdan objective, `march_to_approach`, Budimlić Japra destination. This is not unique evidence for dirty n37.
- Mistral first execution is t178 in n25/n29 and t180 in n30/n37. Barevo and Lupnica are retained in n29 and lost in n30; exact launch/readiness and attack-omission predicates remain absent.
- Majdan is already lost in n29. The retained records separate n25's Majdan attack/capture, n29's Gerzovo objective path, and n30/n37's later planning without execution.
- Varošluk retains only a possible chain: the first recorded 737th route-state divergence is completed t138, while writer ownership and later operation admission remain unbound.
- No post-turn projection is promoted to pre-order proof, and no shared cause is established.

## Evidence integrity and governance

I independently recomputed the seven retained-input and seven production-source SHA-256 values recorded in `continuation4_causal_20261004_summary.json`; all 14 matched. The execution receipt distinguishes wrapper success from the OpenCode child exit 126/provider 429 and records no tool use or retry. The retained node syntax, local extraction, and artifact validation exits are 0. I did not rerun the extractor, strict consumer, scenario, campaign, suite, or provider.

The literal n40 provenance guards remain exit 1 and are not waived. No full-state neutrality is established. All late acceptance, Farz, protected-control, save, denominator, canon, full-suite, 188-week, adoption, and merge gates remain unchanged. This review is independent only for the new causal extraction; it does not independently re-review the earlier n40 comparator implementation.
