# EH-1 Part B — Engine-Health CI Gate (scoping finding + design)

**Status:** BLOCKED-as-designed — the committed artifact is the wrong basis. Real fix = hook the existing `scenarios` CI job. 2026-06-11.

## The finding (why the naive gate can't work)

The QA design assumed a committed 188w `final_save` artifact that CI tracks, to assert engine-health thresholds against. **That artifact (`data/derived/latest_run_final_save.json`) is a 40-WEEK, PRE-EH-2 save:**
- `meta.turn = 40` (not 188). The engine-health defects the gate must catch are **late-war 188w phenomena**: 26 stranded brigades (only **1** at 40w — `hrhb_travnik_brigade`, the known destroyed-brigade-stranded bug, task #15), zero-eligible-axis ops (Trnovo fires ~t182), srebrenica rupture (t162). None of these surface at t40.
- K:W = **1:1.98** (stale, pre-EH-2). A K:W-band assertion `[2.5,4.5]` would FAIL on this artifact even though main is now 1:3.85 — the committed artifact wasn't regenerated after EH-2.

So asserting engine-health thresholds on this artifact is meaningless (wrong horizon + stale).

## The correct design (a follow-up, not a quick test)

The engine-health gate must run against a **188w** `final_save`. CI already runs the 188w in the **`scenarios` / Baseline Regression job** (`run_baseline_regression.ts` + the scenario CI). The gate should be a **post-run check wired into that job**: after the 188w run, assert:
- stranded brigades (>6 hops from home with live sector ownership) ≤ N (current 188w ~8–26 — measure on a fresh post-EH-2 188w)
- ops reaching `execution` with 0 eligible brigades = 0 (Trnovo class)
- ops with 0 attacks across lifecycle ≤ N
- K:W in [2.5, 4.5]
Thresholds at current reality, ratcheted down as EH-3 (state-integrity) lands. Tools to reuse: `tools/audit_campaign_proof.cjs` (stranded-status), `tools/validate_run_consistency.cjs`, `op_injection_validation` (zero-eligible).

**This is a CI-workflow change** (a step in the scenarios job + a check script), not a standalone vitest against a committed save. Scope it as such; do NOT commit a 5MB 188w save (repo bloat + re-bless churn on every casualty/territory change).

## Recommendation

Part A (the `.puppeteerrc.cjs` agent-death fix) is shipped — that was the urgent half. The Part-B gate is genuinely useful but is a CI-integration task, not a quick win. Given the engine-health priority, the higher-value next step is **EH-3 (the real state-integrity FIX** — repatriate stranded brigades + fix the destroyed-brigade→stranded lifecycle leak, starting with `hrhb_travnik_brigade`), measured manually on 188w (as EH-2 was), with this gate built as a fast-follow CI-hook to guard it.
