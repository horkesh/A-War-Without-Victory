# R4 Phase 4 Dynamic Codex Convergence Checkpoint

**Date:** 2026-08-01
**Roadmap:** R4, Phase 4, Tasks 4.1-4.2
**Baseline parent:** `6c02edcaf950d7d52ebb05fb63b10b89f50d7442`
**Result:** source and fast gates complete; canonical baseline/canon acceptance blocked on the exclusive runtime lease

## Outcome

Dynamic Codex records can no longer rely on an unnamed condition. Every emitted section carries an exact state or receipt predicate, and calendar values are separated into context that cannot prove territorial, casualty, atrocity, or negotiation outcomes. The twenty ghost records are now a discriminated Campaign Codex contract: fourteen genuine `path_not_taken` records carry a distinct evaluated missed-condition predicate, five positive-state-only records are `divergence_context`, and the Srebrenica-sensitive record remains one `audit_context`. Context and audit records cannot carry a fabricated missed-condition field.

A single deterministic receipt projector now owns realized event-consequence identity and proof. It requires a canonical selected player, that player's exact decision, the exact response-tagged causal edge on the same turn, the fired-event id, and a recorded consequence firing at or after that decision. The stable receipt id, record id, five-operand predicate, and chronological ordering are projected without recomputation into Codex, Chronicle metadata, the Records receipt model, and the Cost Ledger.

## Receipt and predicate contract

`buildRealizedConsequenceReceipts(...)` is pure, defensive, and strict-sorted. It reads only persisted engine truth:

- `event_decision_log` proves the player made the named choice;
- `event_causality_log` proves the named response enabled the named consequence on that decision turn;
- `fired_event_ids` and `event_last_fired_turn` prove realization did not predate the decision.
- `meta.player_faction` binds all four projections to the selected canonical player and makes missing, null, or foreign ownership fail closed.

Calendar turns identify recorded rows and supply context only. A late campaign date without the response predicate does not unlock the corresponding Codex outcome. Dynamic response sections name their `event_decision_log` predicate; rupture receipts name the persisted rupture-consequence row; shared event receipts name their complete receipt predicate. Patron-defiance receipts likewise name their exact persisted supply-cut row.

The implementation adds no persisted state, schema field, simulation phase, event, decision, trigger, response, effect, or gameplay rule. Cost Ledger receives an optional read-only projection derived from existing state. Live Codex, Chronicle, Records, and aftermath copy resolves authored event/response localizations; where the schema has no localized `future_consequences` prose, BCS suppresses the English-only explanation and uses a localized event title or generic consequence label.

## Inventory-bounded content repair

The deterministic inventory identified seven safe essay residuals. Their existing bodies are unchanged; each now has a concise source note that names the cited record's limited role as chronology, actor, or bounded-context support and states that the essay is original synthesis. The same metadata is mirrored in `essay_index.json`.

The corrected files cover the Sarajevo and Visoko barracks, the 1994 Belgrade embargo, the 1992 Mostar liberation, the 1993 NATO air-strike threat, Operation Lukavac 93, and the 1995 UN hostage crisis. No source prose was copied. The inventory now reports zero safe source-note residuals. A static invariant also proves that only the Srebrenica cost-ledger essay carries a rupture predicate; no non-rupture essay had a stale rupture tag requiring source repair.

Atrocity remains consequence, never a presidential lever. No sensitive content, historical choice, or reward framing was added.

## TDD and fast verification

RED first produced the expected failures for absent dynamic claim predicates, absent ghost classification proof, and absent shared receipt metadata. Inventory RED then exposed null dynamic conditions, followed by the seven missing safe source notes. Committee RED probes subsequently caught three false-classification cases in the 35-test ghost contract, two foreign/legacy equipment-recovery leaks, one cross-surface receipt-order mismatch, and three BCS receipt leaks. The implementation and diagnostic correction made each contract green before the final matrix.

```powershell
npm.cmd run test:vitest -- tests/dynamic_codex_slice_v1.test.ts tests/ui/codex_panel_dynamic_mount.test.ts tests/ui/endgame_verdict_screen_mount.test.ts tests/ui/consequence_receipts.test.ts tests/codex_ghost_entries_wave_3_builder.test.ts tests/codex_sensitive_claim_inventory.test.ts tests/consequence_substrate_inventory_diagnostic.test.ts tests/consequence_consumers.test.ts tests/chronicle_entries.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/turn_aftermath_modal_i18n.test.ts tests/ui/ghost_entry_prose.test.ts tests/ui_i18n.test.ts tests/patron_defiance_receipt.test.ts --pool=forks --reporter=dot
# 14 files / 262 tests passed

npm.cmd run typecheck
# passed
```

The corrected live inventory reports `405` claims across `227` files, with `325` stop-gated rows. Ownership is `353` historian and `52` historian plus game-designer. Status is `52` blocked sensitive player choices, `86` documented claims, `28` source-floor cases, and `239` source-note cases in the broader R7 queue. Phase 4's narrowed invariants report zero dynamic claims without a state predicate and zero identified safe source-note residuals. The separate R7 Phase 0 audit's published `406` snapshot remains historical evidence and is not silently rewritten here.

`node --check tools/diagnostics/codex_sensitive_claim_inventory.cjs`, JSON parsing, deterministic static scanning, and `git diff --check` are part of the final source gate.

## Committee corrections

Pre-commit review found and fixed three classes of product bug rather than recording them as friction:

1. **Ownership leak:** missing, null, or foreign player-faction rows could pass through receipt/ghost presentation. Exact selected-player operands now fail closed across the shared projector and faction-specific recovery record.
2. **Proof drift:** Codex reconstructed partial predicates, and equipment recovery scanned a legacy/foreign alias. All receipts now carry the shared five-operand predicate; recovery reads only `equipment_quality_recovery_streak_active_<selected faction>`.
3. **Cross-surface inconsistency:** Codex could lexical-sort realized receipts differently from Chronicle, Records, and Cost Ledger. All five projections now preserve shared `fired_turn`, then receipt-id ordering.

The committee also corrected presentation/semantic friction: the live Codex projection had been orphaned or evaluated while closed; authored Markdown markers, duplicate/generic English headings, and untranslated receipt prose could reach the UI; and positive evidence had been mislabeled globally as a missed path. The live panel is mounted and closed-gated, Markdown becomes visible structured prose, localized titles are used without English leakage, and neutral Campaign Codex grouping exposes the discriminated record class. No false counterfactual condition is synthesized.

## Strict R7 routing

The inherited player-facing Srebrenica ghost presentation still derives sensitive counterfactual framing from historical-comparison divergence notes rather than the new builder metadata. That is a content/presentation decision owned by R7 and is not silently rewritten here. The broader `325` stop gates and `52` sensitive player-choice rows likewise remain in R7. Phase 4 changes only inventory-identified safe metadata and machine-checkable state/receipt ownership.

## Acceptance boundary and scope

R5 holds the exclusive runtime lane. Therefore `npm.cmd run canon:check`, `npm.cmd run test:baselines`, scenarios, Electron, packaging, and release checks were not run, and no baseline was refreshed. This is a reviewable source checkpoint, not Phase 4 canonical acceptance. Phase 5 and any Phase 4 acceptance claim remain blocked until the lease owner runs and independently reviews the canonical gates.

No save schema, simulation output, scenario source, package, Electron artifact, version, tag, installer, publication, release state, push, merge, or `docs/10_canon/FORAWWV.md` change occurred.
