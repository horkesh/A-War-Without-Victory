# Sensitive-History Status Diagnostic

**Date:** 2026-05-02
**Type:** Read-only diagnostics/tooling. No simulation mechanics, scenario data, OOB, painted targets, combat code, operation catalog content, or run artifacts changed.

## Summary

- Added `tools/diagnostics/sensitive_history_status.cjs`, a deterministic verifier for the Srebrenica/Žepa late-war P0.
- The tool reports canonical enclave controllers, narrative/rupture event state, watched late-war operation AARs, and watched Drina brigade status.
- Added unit/CLI regression coverage and captured the n1612 diagnostic report.

## Why

The enclave mega-lane closed partial: predictor honesty improved, but Srebrenica/Žepa still did not fall and the rupture did not fire. Future successor lanes need a single read-only proof surface that answers "did this run actually resolve the sensitive-history P0?" without manually spelunking `final_save.json`, `operation_aars.json`, and event state.

## Tool Contract

Command:

```bash
node tools/diagnostics/sensitive_history_status.cjs [--json] <run_dir> [<run_dir> ...]
```

The tool reads:

- `final_save.json` for political controllers, event state, rupture search, and formation state
- `operation_aars.json` when present, with `operation_history` as fallback
- `run_summary.json` for hash/turn metadata when present

It writes nothing.

## Reported Surfaces

| Surface | Purpose |
|---|---|
| Enclave Controllers | Counts RS/RBiH/missing control across canonical Srebrenica and Žepa OSID sets, including capital controller and all-RS verdict. |
| Events And Rupture | Shows `srebrenica_falls_1995`, `zepa_falls_1995`, and `srebrenica_genocide_1995`, including recursive rupture-path search. |
| Watched Operations | Summarizes Cerska-Kamenica, Krivaja-95, and Stupčanica-95 AARs: turn, outcome, recovery, attacks, captures, ratio, axes. |
| Watched Brigades | Reports core Drina brigade roster plus operation-participant brigades: status, personnel, cohesion, morale, corps, location. |

## n1612 Proof

Captured at `docs/40_reports/diagnostics/20260502_sensitive_history_status_n1612.md`.

Headline:

- Verdict: `OPEN_P0`
- Srebrenica: 1/11 RS, 10/11 RBiH; capital remains RBiH
- Žepa: 0/1 RS, 1/1 RBiH
- Narrative fall events fired, but `srebrenica_genocide_1995` did not
- Krivaja-95: 0 attacks, 0/5 captures, ratio 0.084
- Stupčanica-95: 0 attacks, 0/1 captures, ratio 0.282

## Files Changed

| File | Change |
|---|---|
| `tools/diagnostics/sensitive_history_status.cjs` | New read-only diagnostic with Markdown and JSON output. |
| `tests/sensitive_history_status_diagnostic.test.ts` | CLI and exported-helper regression coverage. |
| `docs/40_reports/diagnostics/20260502_sensitive_history_status_n1612.md` | Captured n1612 proof output. |

## Verification

- `npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts`
  - 2/2 pass
- `npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts tests/opportunity_campaign_proof_diagnostic.test.ts tests/opportunity_health_diagnostic.test.ts`
  - 5/5 pass
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - clean
- `node tools/diagnostics/sensitive_history_status.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n1612`
  - prints `OPEN_P0` with the n1612 surfaces above

## Determinism

No randomness, no timestamps, no writes. Object keys, OSID lists, watched operation names, watched events, watched brigades, operation matches, axes, and output rows all use deterministic sorting.

## Next Use

Run this tool after each Krivaja roster, Stupčanica defender-stack, brigade co-location, or Žepa surrender successor lane. The lane is not resolved unless this diagnostic reports enclave controllers and rupture state consistent with the successor lane's explicit acceptance criteria.
