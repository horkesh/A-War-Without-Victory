# Codex Safe Factual Corrections Phase 1

**Date:** 2026-05-27
**Status:** Implemented
**Plan:** `docs/plans/2026-05-24-codex-sensitive-history-execution-plan.md`

## Summary

Phase 1 has its first safe factual correction slice. The Deliberate Force and Mistral 2 event rows now use bounded operational language rather than cinematic or over-causal wording.

Changed runtime content:

- `data/scenarios/events/war_1995.json`
- `tests/codex_safe_factual_corrections.test.ts`

No event ids, triggers, effects, response ids, dimension shifts, bot policy, save schema, scenario setup, calibration parameters, or UI routing changed.

## Wording Changes

Deliberate Force:

- Replaced “devastates” / “shatters” wording with “damages” and “adds pressure.”
- Replaced “Holbrooke holds the pause button” with neutral US diplomacy phrasing.
- Replaced “absorbs the punishment” and “Absorb the strikes” with continued air-strike / reject-demand phrasing.
- Replaced direct “degrade VRS combat power” wording with “increasing pressure on VRS command and combat capability.”

Mistral 2:

- Replaced “Croatian war machine” with “HV/HVO forces advance.”
- Replaced “heart of VRS-held western Bosnia” with “VRS-held positions in western Bosnia.”
- Replaced “liberated” with “recaptured.”
- Replaced “disintegrating” and “sweep/collapsing” wording with “severe pressure,” “advance,” “substantial territory,” and “forcing VRS withdrawals.”

## Source And Gate Notes

This is a wording reduction only. The accepted reviewer guidance was to avoid adding or refining new casualty, sortie, square-kilometer, missile, date-range, or direct causality claims. Existing historical-source fields were left unchanged.

Sensitive-history constraints followed:

- no celebratory “liberated” framing;
- no triumphalist “war machine” phrasing;
- no new sensitive-history prose;
- no atrocity/prevention reward framing;
- no HV-as-fourth-faction model change.

## Diagnostic Delta

`node tools\diagnostics\codex_sensitive_claim_inventory.cjs --json` after this slice:

| Metric | Count |
| --- | ---: |
| Files scanned | 176 |
| Claims found | 296 |
| Stop-gated claims | 245 |

Risk counts:

| Risk class | Count |
| --- | ---: |
| `dynamic_state_candidate` | 7 |
| `safe_factual_correction` | 51 |
| `sensitive_history_gated` | 238 |

## Verification

- `npx.cmd vitest run tests\codex_safe_factual_corrections.test.ts tests\event_timeline_integrity.test.ts tests\sim\events\event_taxonomy_report.test.ts --reporter=dot` - PASS; 44/44 tests.
- `node --check tools\diagnostics\codex_sensitive_claim_inventory.cjs` - PASS.
- `node tools\diagnostics\codex_sensitive_claim_inventory.cjs --json` - PASS; parsed 176 files / 296 claims / 245 stop-gated.

## Next

Continue with source-note packets for the Srebrenica and Zepa event rows. Sensitive-history levers, counterfactual atrocity/prevention framing, and dynamic-state consequence claims remain gated.
