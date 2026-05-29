# Codex Sensitive-Claim Inventory Phase 0

**Date:** 2026-05-27  
**Status:** Phase 0 diagnostic implemented; prose/content changes remain gated.  
**Plan:** `docs/plans/2026-05-24-codex-sensitive-history-execution-plan.md`

## Summary

Phase 0 now has a deterministic inventory diagnostic for Codex, chronicle, notification, event, and consequence prose surfaces:

- Tool: `tools/diagnostics/codex_sensitive_claim_inventory.cjs`
- Test: `tests/codex_sensitive_claim_inventory.test.ts`
- Live command: `node tools\diagnostics\codex_sensitive_claim_inventory.cjs --json`

The diagnostic is read-only. It does not author prose, add citations, alter historical claims, expose output to player-facing UI, or change simulation behavior.

## Live Inventory Baseline

Live output on 2026-05-27:

| Metric | Count |
| --- | ---: |
| Files scanned | 176 |
| Claims found | 297 |
| Stop-gated claims | 245 |

Risk class counts:

| Risk class | Count |
| --- | ---: |
| `dynamic_state_candidate` | 7 |
| `safe_factual_correction` | 52 |
| `sensitive_history_gated` | 238 |

Source-status counts:

| Source status | Count |
| --- | ---: |
| `cited` | 190 |
| `source_floor_exception` | 28 |
| `uncited` | 79 |

Surface counts:

| Surface | Count |
| --- | ---: |
| `essay` | 121 |
| `event` | 87 |
| `event_consequence` | 48 |
| `ghost_entry` | 16 |
| `src_chronicle_read_model` | 13 |
| `src_codex_read_model` | 7 |
| `src_consequence_read_model` | 5 |

## Priority Queue From Specialist Inventory

The historian/canon inventory identified these next safe actions:

| Item | Risk class | Next safe action |
| --- | --- | --- |
| RS genocide / systematic-cleansing option surfaces | `sensitive_history_gated` | Decision packet; do not revise inline without user/canon review. |
| Press-visit detention-camp notification residuals | `sensitive_history_gated` | Keep blocked recipient text absent; packet for review only. |
| Srebrenica and Zepa event rows missing event-local source notes | `needs_source_note` | Add source notes only after review; do not expand prose. |
| Deliberate Force cinematic verbs | `safe_factual_correction` | Replace with bounded operational language in Phase 1 with source support. |
| Mistral 2 cinematic/overclaim wording | `safe_factual_correction` | Replace with neutral actor/place/date/control phrasing in Phase 1. |
| Federation offensive / US halt certainty claims | `dynamic_state_candidate` | Split fixed historical context from live-state outcome claims. |
| Bihac-collapse counterfactual formation-loss claim | `unsupported_remove` | Require live formation/capture predicate or remove/soften in a gated packet. |
| Drina counterfactual reward framing risk | `sensitive_history_gated` | Review for absence-of-atrocity-as-reward risk before prose or mechanics changes. |

## Determinism And Safety

- File traversal, JSON key traversal, term sets, rows, summary objects, and JSON output are sorted deterministically.
- Output contains no timestamps, run IDs, randomness, locale-dependent collation, or generated artifact paths.
- Stop gates are explicit strings: `none`, `historian`, `sensitive_history`, `mechanics`, or `canon`.
- Heuristic labels are diagnostic routing labels, not historical judgments.
- Sensitive-history findings are routed to review and never classified as safe simply because the wording already exists.

## Verification

- `npx.cmd vitest run tests\codex_sensitive_claim_inventory.test.ts tests\codex_source_quality.test.ts --reporter=dot` - PASS; 4/4 tests.
- `node --check tools\diagnostics\codex_sensitive_claim_inventory.cjs` - PASS.
- `node tools\diagnostics\codex_sensitive_claim_inventory.cjs --json` - PASS; parsed live baseline above.

## Next Phase

Phase 1 should start with safe factual corrections only:

1. Deliberate Force bounded operational wording. Closed by `docs/40_reports/implemented/20260527_CODEX_SAFE_FACTUAL_CORRECTIONS_PHASE1.md`.
2. Mistral 2 bounded operational wording. Closed by `docs/40_reports/implemented/20260527_CODEX_SAFE_FACTUAL_CORRECTIONS_PHASE1.md`.
3. Source-note packet preparation for Srebrenica/Zepa event rows.

Sensitive-history levers, counterfactual atrocity/prevention framing, and dynamic-state consequence claims remain gated.
