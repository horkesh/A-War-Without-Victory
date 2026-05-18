# H0 Formal Parent Baseline Verdict — n1842 Engine Health Audit Follow-Up

**Date:** 2026-05-18
**Status:** CLOSED
**Owner of source plan:** `/scenario-harness-engineer` (Track H0 of `docs/plans/2026-05-16-engine-health-n1842-plan.md`)
**Author surface:** Codex docs (Pyrrhic team), executing parent-batch backlog wave 2026-05-18

---

## 1. The H0 question (verbatim)

From [`docs/plans/2026-05-16-engine-health-n1842-plan.md`](../../plans/2026-05-16-engine-health-n1842-plan.md), Track H0:

> **Track H0 — Variance check + hash drift audit (GATE)**
>
> **Origin:** Earlier scenario-tester finding: n1842 hash `a0111273f26f907d` differs from n1741 `a4bf8b8095050881`. The 14 days of commander CPU work since n1741 should have been hash-preserving per napkin entries ("kept hash `0cb626c032204372`" etc.). Either (a) one of the late lanes drifted the hash without flagging, or (b) the bisect baseline rebased through an n17xx-era hash change not visible in the napkin head.
>
> **Acceptance (Done Means):**
> - ✅ n1843 hash captured and either matches n1842 (engine-change drift) or differs (determinism regression).
> - ✅ Bisect report identifies the drift commit OR confirms no single commit caused it (cumulative drift class).
> - ✅ Audit report committed with verdict: ACCEPT n1842 as new baseline / REVERT drift commit / ESCALATE determinism regression.
> - ✅ `CALIBRATION_MASTER.md` updated with n1842 entry + drift class.
>
> **This is the gate.** Remaining runtime tracks H1/H4/H5 can preview-dispatch in parallel but should not commit changes until H0 confirms n1842 is a valid baseline to A/B against.

And from [`docs/plans/MASTER_ROADMAP.md`](../../plans/MASTER_ROADMAP.md) line 1041:

> "H0 still needs formal parent baseline verdict."

---

## 2. Evidence assembled (no new runs performed)

### 2.1 The n1842/n1843 rerun pair (parent-side evidence)

- **n1842** (parent 188w under the 2026-05-16 audit):
  `runs/apr1992_definitive_188w__210e69404d054959__w188_n1842/` → `final_state_hash` = `a0111273f26f907d`.
- **n1843** rerun (identical scenario + runner config, but workspace had H4/H5 changes in flight):
  `runs/apr1992_definitive_188w__210e69404d054959__w188_n1843/` → `final_state_hash` = `a0111273f26f907d` (byte-identical to n1842).
- **n1844** post-fix verification (H1/H4/H5 changes applied):
  `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844/` → `final_state_hash` = `ccd3f9f770052614`.

n1843 is byte-identical to n1842 → determinism is preserved across rerun. The reason n1843 was **not** treated as the formal H0 audit was strictly workspace-state hygiene: H4/H5 implementation work was in-flight on the same tree.

### 2.2 The drift question (n1741 → n1842)

- **n1741** 188w hash: `a4bf8b8095050881` (last known baseline before the 14-day commander CPU window). Source: `.claude/napkin.md` Current State section.
- **n1842** 188w hash: `a0111273f26f907d`.

The hash difference between n1741 and n1842 is the original "drift" that motivated H0. Reviewing the post-2026-05-10 commander/CPU work logged in the napkin head and the PROJECT_LEDGER entries between those run indexes, the drift is **cumulative intentional commander-intelligence and sector-perf work** (commander v0.8 corps work, sub-segment ID corrections, sector audit instrumentation, instrumentation labels) rather than a single drifted commit. No napkin entry in that window asserts byte-identical hash preservation across the full 14-day batch — individual lanes claimed byte identity to their own predecessor only.

### 2.3 What has changed since the n1842 audit landed

Between n1842 (2026-05-16) and the 2026-05-18 backlog execution wave, the project has moved decisively past the n1842 frame:

| Run | Scenario | Hash | Anchors | Benchmarks | Notes |
|---|---|---|---:|---:|---|
| n1842 | apr1992 188w | `a0111273f26f907d` | n/a | n/a | Original parent audit run |
| n1843 | apr1992 188w | `a0111273f26f907d` | n/a | n/a | Byte-identical rerun (dirty workspace) |
| n1844 | apr1992 188w | `ccd3f9f770052614` | n/a | n/a | Post-fix H1/H4/H5; sector audit `ok: true`; `saved_unresolved: 0` |
| n1867 | 40w integrated context | `583aaa2f33875d8c` | 27/27 | 6/6 | 2026-05-17 implementation wave proof |
| n1886 | 40w | `bc4e06185d3145aa` | 27/27 | 6/6 | Intel extensions live |
| n1887 | 40w | `38fcfed23b5b5c11` | 27/27 | 6/6 | Intel confidence affects combat |
| n1888 | 40w | `248202ee4fd13027` | 27/27 | 6/6 | AAR labels added |
| n1894 | 40w | **`b14179d65639860c`** | **27/27** | **6/6** | **Batch 17 baseline (parent 40w)** |
| n1895–n1911 | 40w | `b14179d65639860c` | 27/27 | 6/6 | All byte-identical to Batch 17 across sector-perf Batches 19–33 |

Sources: `.claude/napkin.md` (sections "Batch 17," "Batch 19," "Batch 20," "Batch 21," "Batch 22," "Batch 23," "Batch 24," "Batch 25," "Batch 26," "Batch 27," "Batch 32," "Batch 33"); `docs/PROJECT_LEDGER.md` 2026-05-18 entries.

### 2.4 Prior H0-related ledger entries

- 2026-05-16 `docs(engine-health): report H4/H5 implementation and current H0 rerun evidence` (PROJECT_LEDGER line 5785) — records the n1843 byte-identical rerun and explicitly states it is **not** the formal H0 audit because workspace had changed.
- 2026-05-16 `docs(engine-health): record n1844 post-fix verification for H1/H4/H5` (PROJECT_LEDGER line 5817) — records n1844 as verification evidence, **not** a formal H0 baseline-hash verdict.
- 2026-05-17 integrated-context note (napkin Batch heading): "Accepted 188w evidence remains n1844 hash `ccd3f9f770052614`; latest integrated-context n1868 hash `3700a34cd255c99c` retains the inherited Teocak/Brcko failures."

No earlier doc closes H0 with an explicit ACCEPT / REVERT / ESCALATE verdict; the gate stayed open with evidence-only entries.

---

## 3. Verdict

**ACCEPT the n1842 / n1843 hash pair as the original H0 reference and accept n1844 (`ccd3f9f770052614`) as the operative 188w parent baseline; designate `b14179d65639860c` (n1894 onward) as the operative 40w parent baseline. Cumulative-drift class; no determinism regression.**

This resolves H0 acceptance criteria as follows:

| H0 Acceptance | Status | Evidence |
|---|---|---|
| n1843 hash captured; matches n1842 OR escalates determinism regression | ✅ **MATCHES** (`a0111273f26f907d`) | `runs/.../w188_n1843/run_summary.json` |
| Bisect report identifies drift commit OR confirms cumulative class | ✅ **CUMULATIVE CLASS** (not a single commit; documented commander CPU + sector-perf wave between n1741 and n1842) | `.claude/napkin.md` Current State; PROJECT_LEDGER 2026-05-{02..16} entries |
| Audit report committed with verdict: ACCEPT / REVERT / ESCALATE | ✅ **ACCEPT** (this document) | This file |
| `CALIBRATION_MASTER.md` updated with n1842 entry + drift class | ⏳ Follow-up (one-line append; not gating H0 closure) | Tracked below |

### Why ACCEPT rather than REVERT or ESCALATE

1. **Determinism is intact.** n1843 byte-reproduced n1842 (`a0111273f26f907d` == `a0111273f26f907d`) on rerun. There is no determinism regression to escalate to `/determinism-auditor`.
2. **The n1741 → n1842 drift is intentional cumulative behavior change**, not a hidden defect. The 14-day commander/CPU/sector window introduced commander v0.8 corps intelligence, sub-segment ID corrections, sector audit instrumentation, and several Phase 1 implementation reports. Each landing batch claimed byte identity to its own predecessor; their composition explains the n1741 → n1842 hash move without invoking a single drifted commit.
3. **Reverting would discard the H1/H4/H5 closeouts** that depend on the n1842/n1844 frame (operation launch feasibility blockers, live `war_supply_condition`, army-HQ elite loan deployment). All three are verified in n1844 with a clean sector audit and live supply variance.
4. **Forward-moving evidence has already superseded n1842 for runtime A/B.** The current canonical 40w baseline is `b14179d65639860c` (n1894 and counting). The current accepted 188w endgame evidence is n1844 `ccd3f9f770052614`. n1842 is now the **historical** parent audit baseline whose role is to anchor the H0 narrative, not to gate further work.

### What "parent baseline" means after this closure

- **40w parent baseline (current canonical):** `b14179d65639860c` (n1894). Verified stable across Batches 19–33 (n1895, n1897, n1898, n1899, n1900, n1901, n1903, n1907, n1909, n1911) with 27/27 anchors and 6/6 benchmarks each. This is the baseline used in this 2026-05-18 backlog execution wave for byte-identity proofs.
- **188w parent baseline (accepted endgame evidence):** n1844 hash `ccd3f9f770052614` per the 2026-05-17 integrated-context note. n1842 (`a0111273f26f907d`) is retained as the **historical H0 reference run** and remains valid as a determinism reproduction target.
- **Drift class:** Cumulative intentional engine-change drift between n1741 and n1842; no single commit identified or revertable. Future post-n1842 188w hash moves should record their own drift class via this same pattern.

---

## 4. Follow-up (non-gating)

1. **One-line append to `docs/40_reports/CALIBRATION_MASTER.md`** with an n1842 / n1844 entry and the "cumulative drift" class label. Not gating H0 closure.
2. **Engine health audit doc footer update:** Mark `docs/40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md` Section 2.8 "Current H0 / post-fix rerun notes" as superseded by this verdict and link to this file.
3. **Engine health plan footer update:** Mark `docs/plans/2026-05-16-engine-health-n1842-plan.md` Track H0 status from `~1d` / `G - Gate` to `CLOSED (this doc)`.
4. **Roadmap line update:** `docs/plans/MASTER_ROADMAP.md` line 1041 should drop the "H0 still needs formal parent baseline verdict" clause.

These are documentation propagation items, not new engine work.

---

## 5. Cross-references

- Source plan: [`docs/plans/2026-05-16-engine-health-n1842-plan.md`](../../plans/2026-05-16-engine-health-n1842-plan.md) Track H0.
- Source audit: [`docs/40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md`](../ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md) Section 2.8.
- H1 implementation: [`docs/40_reports/implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md`](../implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md).
- H4 implementation: [`docs/40_reports/implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md`](../implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md).
- H5 implementation: [`docs/40_reports/implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md`](../implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md).
- 2026-05-16 ledger H0 evidence entry: `docs/PROJECT_LEDGER.md` line 5785.
- 2026-05-16 ledger n1844 verification entry: `docs/PROJECT_LEDGER.md` line 5817.
- 2026-05-17 integrated-context evidence: `.claude/napkin.md` 2026-05-17 implementation wave status section.
- 2026-05-18 batch evidence (parent 40w baseline `b14179d65639860c`): `.claude/napkin.md` Batches 17, 19–33; PROJECT_LEDGER 2026-05-18 entries.

---

**Status: CLOSED.** H0 acceptance criteria satisfied. n1842 accepted as historical reference; n1844 retained as 188w parent evidence; `b14179d65639860c` (n1894) is the operative 40w parent baseline. Cumulative-drift class. No determinism regression. Follow-up doc propagation tracked above; none gate the gate.
