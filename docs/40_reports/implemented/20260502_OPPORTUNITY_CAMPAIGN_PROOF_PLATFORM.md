# Opportunity Campaign Proof Platform

**Date:** 2026-05-02
**Status:** IMPLEMENTED - read-only diagnostic tool, focused tests, n1605 proof artifact.
**Branch:** `codex/opportunity-proof-platform`
**Run Evidence:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1605`

## Summary

- Added a deterministic campaign-level proof matrix for operation opportunities. It fuses proposals, in-window ineligibility diagnostics, player/bot decisions, opportunity resolutions, linked AAR delivery, per-axis delivery predicates, and reachability warnings into one surface.
- Generated a baseline proof artifact for n1605 so future opportunity-family and combat-math lanes can compare against a known campaign truth instead of manually stitching together health, delivery, and final-save evidence.
- Kept the tool read-only: no scenario data, engine behavior, catalog entries, painted targets, or run artifacts are mutated.

## Why This Exists

The opportunity system now spans several owners:

- Catalog truth decides when an operation is possible.
- Presidential/AI decision logic accepts, delays, redirects, under-resources, or declines.
- `buildCorpsOperation` turns accepted T1 opportunities into real operations.
- The operation lifecycle and combat engine decide whether they stage, attack, capture, stall, or fail.
- AARs and Cost Ledger records summarize the outcome.

Before this tool, each owner had a useful diagnostic, but no single artifact answered the architect question: "Why did this opportunity not become history?" The proof matrix makes that answer explicit.

## Changes Made

### Campaign Proof Diagnostic

Added `tools/diagnostics/opportunity_campaign_proof.cjs`.

The script reads one or more run directories and emits markdown by default or JSON with `--json`:

```powershell
node tools\diagnostics\opportunity_campaign_proof.cjs <run_dir>
node tools\diagnostics\opportunity_campaign_proof.cjs --json <run_dir>
```

It reuses the existing read-only diagnostics instead of creating another source of truth:

- `tools/diagnostics/opportunity_health_audit.cjs` for proposal/resolution/AAR health.
- `tools/diagnostics/operation_delivery_audit.cjs` for per-operation and per-axis delivery classification.

The resulting matrix classifies each opportunity as:

- `surfaced_executed`
- `t3_authorized`
- `approved_unlinked`
- `resolved_no_execution`
- `surfaced_<status>`
- `blocked_in_window`
- `not_observed`

### Focused Test Coverage

Added `tests/opportunity_campaign_proof_diagnostic.test.ts`.

Coverage includes:

- A synthetic run with one executed opportunity and one blocked opportunity.
- Fusion of proposal, resolution, AAR, blocked-axis diagnostics, and reachability warning into a single markdown row.
- Deterministic blocker summarization: sorted turn window, sorted required-axis counts, sorted optional-axis counts.

### n1605 Baseline Artifact

Generated `docs/40_reports/diagnostics/20260502_opportunity_campaign_proof_n1605.md` from:

`runs/apr1992_definitive_188w__210e69404d054959__w188_n1605`

Key n1605 findings:

| Metric | Count |
|---|---:|
| Opportunities observed | 7 |
| Surfaced + executed | 4 |
| Blocked in-window | 3 |
| Reachability warnings | 1 |
| Broken AAR links | 0 |
| Unlinked approved | 0 |

Campaign classification:

| Opportunity | State | Evidence |
|---|---|---|
| `apwb_pressure_94` | `surfaced_executed` | t113, approved, decisive success, 5/5 objectives already friendly in AAR proof |
| `tigar_sloboda_94` | `surfaced_executed` | t113, approved, decisive success, 4/4 objectives already friendly in AAR proof |
| `una_94` | `blocked_in_window` | `alliance_context x3; logistics x3` |
| `breza_94` | `blocked_in_window` | `alliance_context x6; logistics x6` |
| `grmec_94` | `surfaced_executed` | t133, approved, failed, 2 attacks, 0/6 objectives, underdelivered |
| `pauk_94_95` | `blocked_in_window` | `alliance_context x11; logistics x11` |
| `sana_95` | `surfaced_executed` | t175, approved, failed, 4 attacks, 0/31 objectives, one no-contact-path axis and two underdelivered axes |

## Determinism

The diagnostic is deterministic by construction:

- No writes during script execution.
- No `Math.random`, timestamps, locale sorting, or wall-clock data.
- All derived opportunity ids, diagnostics, operations, axis lists, and blocker summaries use stable string sorting.
- JSON mode serializes the same derived structure that markdown mode prints.
- The script reads run output and repo-derived adjacency only; it does not read painted targets or mutate baselines.

## Verification

Fresh verification before commit:

| Check | Command | Result |
|---|---|---|
| Focused proof tests | `vitest run tests/opportunity_campaign_proof_diagnostic.test.ts` | 2/2 pass |
| Adjacent diagnostics pack | `vitest run tests/opportunity_campaign_proof_diagnostic.test.ts tests/opportunity_health_diagnostic.test.ts tests/operation_axis_unreachable_diagnostic.test.ts tests/operation_aar.test.ts` | 54/54 pass across 4 suites |
| Typecheck | `tsc --noEmit` | Clean after adding local worktree junction to root `src/ui/map/node_modules` |
| n1605 markdown output | `node tools/diagnostics/opportunity_campaign_proof.cjs <n1605>` | Emits expected 7-opportunity matrix with 4 surfaced/executed, 3 blocked, 1 reachability warning |
| n1605 JSON output | `node tools/diagnostics/opportunity_campaign_proof.cjs --json <n1605>` | JSON parses successfully; `runs=1 opportunities=7 reachability=1` |
| Whitespace | `git diff --check` | Clean; only LF-to-CRLF checkout warnings for existing markdown files |

## Files Changed

| File | Change |
|---|---|
| `tools/diagnostics/opportunity_campaign_proof.cjs` | New read-only campaign proof matrix script |
| `tests/opportunity_campaign_proof_diagnostic.test.ts` | New focused regression tests |
| `docs/40_reports/diagnostics/20260502_opportunity_campaign_proof_n1605.md` | New n1605 baseline proof artifact |
| `docs/40_reports/implemented/20260502_OPPORTUNITY_CAMPAIGN_PROOF_PLATFORM.md` | This implementation report |
| `docs/PROJECT_LEDGER.md` | Ledger entry |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Durable review rule |
| `.claude/napkin.md` | Current-state runbook update |

## Next Steps

1. Run this proof matrix after Claude's combat-math lane to compare n1605-style opportunity delivery before/after the predictor changes.
2. Run it again after the Codex 5th Corps reachability split branch merges, because `sana_95_follow_on` should change the Sanski/Kljuc no-contact-path evidence into a gated follow-on opportunity instead of a dead axis.
3. Promote the proof matrix as the first diagnostic for any new opportunity family: it should precede calibration debate and map-paint interpretation.
