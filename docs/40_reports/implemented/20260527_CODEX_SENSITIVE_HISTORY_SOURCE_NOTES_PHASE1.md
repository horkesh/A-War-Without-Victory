# Codex Sensitive-History Source Notes Phase 1

**Date:** 2026-05-27
**Status:** Implemented

## Summary

Added provenance-only `source_note` fields to the core Srebrenica/Zepa event rows without changing narrative text, triggers, effects, response logic, bot policy, scenario setup, UI routing, save schema, or calibration behavior.

Rows covered:

- `srebrenica_enclave_forms_1992`
- `morillon_enters_srebrenica_1993`
- `srebrenica_shelling_1993`
- `un_resolution_819_srebrenica_1993`
- `srebrenica_demilitarization_1993`
- `srebrenica_falls_1995`
- `zepa_falls_1995`

The notes are deliberately bounded as source provenance. They do not add casualty figures, causal claims, prohibited player choices, or alternate-outcome prevention framing. Sensitive-history narrative changes and dynamic consequence rows remain gated.

## Diagnostic Delta

`codex_sensitive_claim_inventory` remains stable at 176 scanned files, 296 claims, and 245 stop-gated claims. Source status improved from 189 cited / 79 uncited after the prior slice to 196 cited / 72 uncited.

Risk counts remain:

- `dynamic_state_candidate`: 7
- `safe_factual_correction`: 51
- `sensitive_history_gated`: 238

## Verification

```powershell
npx.cmd vitest run tests\codex_sensitive_history_source_notes.test.ts tests\event_timeline_integrity.test.ts tests\codex_sensitive_claim_inventory.test.ts --reporter=dot
node tools\diagnostics\codex_sensitive_claim_inventory.cjs --json
```

Both checks passed locally during implementation.

## Remaining Gates

- No consequence rows in `data/scenarios/events/consequences.json` were changed.
- No Srebrenica/Zepa runtime narrative wording was changed.
- No source-note packet should be treated as approval for counterfactual prevention framing.
- Any future source-specific paragraph claim still needs direct historian/canon verification before runtime use.
