# D3 Persona Suppressor Validation V3 (+ cb13e605-bis iteration)

**Date:** 2026-05-07 (V3); 2026-05-08 (cb13e605-bis iteration appended)
**Lane:** LANE-NIGHTSHIFT-D3-PERSONA-VALIDATION-V3 + cb13e605-bis iteration

## TL;DR (read first)

Two empirical iterations completed. Both FAIL the validation threshold.

| Iteration | Reduction | Status | Key per-cluster |
|---|---|---|---|
| cb13e605 (baseline suppressors) | -4.8% | FAIL | C2 +9%, C3 +51% (noise displacement) |
| cb13e605-bis (strengthened C2+C3) | -8.1% | FAIL | C2 -23.9% (flipped to PASS), C3 +74.3% (worse) |

**cb13e605-bis is a strict improvement** on cb13e605 (C1/C2/C4 better; C3 still grew) but **diminishing returns** are visible — each iteration gains ~3pp reduction. Reaching the 40% MARGINAL threshold via prompt iteration alone would take 5+ more cycles ($1.76 each).

**C3 (ops-in-planning / op-lifecycle) is structurally hard to suppress via prompt** — the model composes multi-clause observations that touch op status as one of many concerns. Real fix is probably to reduce op-status visibility in the briefing builder, not to keep telling the LLM to ignore visible state.

**Genuine signal % FELL** under cb13e605-bis (75.7% noise post vs 73.5% baseline) — the model became more reticent overall, dropping genuine signal faster than noise. Over-suppression risk realized.

**Recommendation: stop iterating prompt-side suppressors.** Either accept partial (Option 2 from prior) or defer C3 to a v0.9.7+ structural fix (Option 3). Two empirical cycles + one intent-validation pass + one V3 dead-run ≈ $4.40 spent on this question. Continued prompt iteration is no longer cost-effective.

---
**Predecessors:**
- `cb13e605` — feat(tools): persona prompt restructure (4 D3.3 noise clusters + ICTY citation guidance)
- `59805cd6` — fix(tools): wire persona_telemetry.emitDecision (D2 wire-fix)
- `bfcc9258` — fix(tools): D3 wire-up (president verb mapping 16→6 canonical)
- `e25c18c3` — feat(tools): D1+D2 persona infrastructure
- D3 baseline run: `runs/three_commanders/diagnostic_report.json` modified 2026-05-07 10:38:40 (pre-cb13e605, persona-on)

**Ring:** 0 (tooling-only QA harness; no engine touch)
**Sensitive-history compliance:** faction-symmetric mechanism; suppressors are surgically appended to all 13 persona files identically.

---

## Phase 1 — Discovery findings

### 1. Persona telemetry pipeline does NOT capture LLM prose

Verified by direct read of `tools/claude_plays_vrs/persona_telemetry.ts` and the
three call sites in `api_president.ts`, `api_commander.ts`,
`api_corps_commander.ts`. The `PersonaDecisionRecord` schema captures only:

- `decision_summary` — short structured string (e.g. `verb=maintain_siege`,
  `briefing_len=515;stances=cidA:offensive,cidB:balanced`,
  `assessment_len=379;sectors=10`)
- token counts, latency, role, faction, officer_id

The full LLM textual response is never persisted. V2's last finding
(`d_lane_persona_decisions.jsonl` only contains 2 stub rows pre-validation)
was correct: the JSONL captures what the structured parser kept, not what
Claude said.

### 2. Runner has no `--verbose` / `--capture-transcripts` flag

`tools/claude_plays_vrs/run_three_commanders.ts` only accepts `--mode`,
`--corps-api`, `--model`. No env-flag path for raw response logging.

### 3. The original D3 baseline corpus IS available — `runs/three_commanders/diagnostic_report.json`

This was the breakthrough. The `diagnostic_report.json` file from the original
D3 persona-on run (2026-05-07 10:38:40, pre-cb13e605) contains 253 structured
LLM observations with full `description`, `expected`, `actual`, `affected_system`,
`severity` fields. The four D3.3 noise clusters appeared in the LLM-emitted
JSON's `description` and `expected` fields and were preserved into this file.

**The structured-prose fields ARE the empirical signal** the suppressors target.
The persona_prompt_restructure.md (cb13e605) noise count of "78%" derives
from this exact file. Re-counted with cb13e605's cluster definitions:

| Cluster | Count | % of 253 obs |
|---|---|---|
| C1 — political directive absence | 77 | 30.4% |
| C2 — alliance hand-wringing | 67 | 26.5% |
| C3 — ops in planning | 32 | 12.6% |
| C4 — op-name confabulation (Oluja) | 7 | 2.8% |
| **TOTAL noise (sum, not dedup)** | **183** | **72.3%** |

This is within the same order of magnitude as cb13e605's "78%" estimate
(slightly different cluster boundary definitions; both reflect the same
qualitative noise pattern).

Backup of the baseline corpus saved to:
`runs/three_commanders/diagnostic_report_baseline_d3_pre_cb13e605.json`
(154 KB). Sample LLM prose extracted for each of the 4 clusters confirms
they are textual descriptions matching the suppressor patterns verbatim
(e.g. "No political directive provided at Turn 0", "RBiH-HRHB alliance
coefficient (0.58) appears stable", "All six corps are in 'planning'
status", "Operacija Oluja is listed as 'planning' status in 5th Corps").

### 4. No raw-transcript files elsewhere in the repo

Searched `data/derived/_debug/` (only structured JSONLs) and `runs/`
(only `final_save.json`, `campaign_log.json`, `corps_assessments.json`,
`diagnostic_report.json`, `co_cross_assessments.json`). No raw LLM transcript
captures exist outside the structured-prose pipeline.

---

## Phase 2 — Path chosen + rationale

**Path A** — empirical validation against the existing diagnostic_report.json
baseline.

The diagnostic_report.json file IS the right comparison artifact. It contains
exactly the kind of structured prose where the noise clusters appear, because
each `description` / `expected` / `actual` field is a direct textual quote of
what Claude emitted in its JSON observations. The suppressors target prose,
the prose is captured, the comparison is empirically meaningful.

Path B (transcript-capture instrumentation) was unnecessary — the existing
pipeline already captures enough signal. Path C (intent-only) was the
fallback if Path A's comparison artifact didn't exist. It does.

---

## Phase 3 — Path A run config + intermediate findings

### Run configuration

```bash
set -a && source .env && set +a && \
CLAUDE_AS_PRESIDENT_RBiH=true CLAUDE_AS_PRESIDENT_RS=true \
CLAUDE_AS_PRESIDENT_HRHB=true CLAUDE_AS_ARMY_CO_RBiH=true \
CLAUDE_AS_ARMY_CO_RS=true CLAUDE_AS_ARMY_CO_HRHB=true \
CLAUDE_AS_ALL=true \
node_modules/.bin/tsx tools/claude_plays_vrs/run_three_commanders.ts \
  --mode api --corps-api --model claude-haiku-4-5-20251001 \
  > runs/three_commanders/validation_v3_log.txt 2>&1 &
```

- Started 22:04 CEDT
- Pace ~1 turn / 75-80 sec (full corps_co loop per faction)
- Projected completion ~22:55 (45 min total)
- Projected cost ~$1.76 (under $2.00 cap)

### Intent validation — PASS

All 13 persona JSON files contain all 5 noise-suppression markers:

```
boban.json: OK
default_corps_co.json: OK
delic.json: OK
halilovic.json: OK
izetbegovic.json: OK
karadzic.json: OK
mladic.json: OK
petkovic.json: OK
praljak.json: OK
roso.json: OK
vrs_1kk_corps_co.json: OK
vrs_drina_corps_co.json: OK
vrs_srk_corps_co.json: OK
```

Markers checked (all 5 must be present):
- `DO NOT flag absence of political directives`
- `DO NOT comment on the RBiH-HRHB alliance`
- `DO NOT flag "ops in planning"`
- `DO NOT invent operation names`
- `DO cite ICTY judgments`

**Suppressor block presence is well-formed across all 13 personas.**
Faction-symmetric. ICTY citation guidance present. cb13e605 implementation
intent is fully realized.

### Empirical validation — RUN COMPLETED via parent-owned relaunch (2026-05-07 23:25)

**First attempt died at turn 22.** Agent-spawned run (V3 agent) terminated when the agent process ended at 28 min runtime. Spend at termination: ~$0.88 of $1.76 projected. Root cause: FORAWWV §XVI long-subprocess discipline — long-running subprocesses spawned inside an agent context die with the agent process.

**Parent-owned relaunch completed clean** (Bash `run_in_background=true`, exit code 0, ~50 min wallclock, 2026-05-07 22:35 → 23:25). `diagnostic_report.json` written 23:25 with 274 observations.

### Empirical comparison — VERDICT: FAIL (-4.8% reduction)

`tools/d3_validation_compare.py` output:

```
Cluster                    | baseline | post | reduction
---------------------------|----------|------|-----------
C1 political directive     |      77  |   67 | 13.0%
C2 alliance hand-wringing  |      67  |   73 | -9.0%
C3 ops in planning         |      35  |   53 | -51.4%
C4 op-name confabulation   |       7  |    2 | 71.4%
TOTAL noise                |     186  |  195 | -4.8%

Baseline obs total: 253; Post-cb13e605 obs total: 274
Baseline noise %: 73.5%; Post noise %: 71.2%
```

**Per-cluster reading:**
- **C4 op-name confabulation: -71% (PASS).** Intent fully realized — invented op names like "Operacija Sana / Krivaja / Stupčanica" almost eliminated.
- **C1 political directive: -13% (modest PASS).** Suppressor partially effective.
- **C2 alliance hand-wringing: +9% (FAIL — got worse).**
- **C3 ops in planning: +51% (FAIL — significantly worse).**
- **Net: -4.8% (FAIL).** Total observations rose 8% (253 → 274), suggesting noise displacement: the LLM is emitting more total observations now, with the suppressed C1/C4 patterns redirected toward the under-suppressed C2/C3 patterns.

**Root cause hypothesis (noise displacement):** Haiku 4.5 at temperature 0 is a strong instruction-follower. The cb13e605 suppressors for C1/C4 landed cleanly, but C2/C3 suppressors are weaker (or absent). With "safe" noise vents closed, the model leaned harder on the open ones. The genuine-signal % did improve (26.5% → 28.8%) but not enough to clear FAIL threshold.

**Cost summary:**
- V3 agent run (died turn 22): ~$0.88
- Parent-owned relaunch (completed): projected ~$1.76 (actual cost TBD from API logs)
- **Total spend: ~$2.64** (vs $1.30 original estimate — overrun caused by §XVI discipline failure on first attempt, not scope creep)

### Partial signal from in-flight telemetry — over-suppression risk surfaced

President verb distribution at turn 20 (64 president calls):
- `no_directive`: 64 / 64 (100%)

This is a **Path A finding requiring follow-up**: the suppressor "DO NOT flag
absence of political directives as anomaly" combined with the president
prompt's verb closed-set may have over-corrected. With every president call
returning `no_directive`, the political → army chain context (B1 + C1
substrate) effectively never bites — Claude-roleplay presidents are emitting
the deterministic-fallback verb every turn rather than choosing between
`hold_corridor`, `consolidate_drina`, `maintain_siege`, etc.

Two competing hypotheses:
- **H1 (over-suppression):** the suppressor language led the LLM to interpret
  `no_directive` as the safest non-anomalous default.
- **H2 (state-prompt under-cue):** the president user prompt is too coarse
  (territory-only snapshot, no recent-events richness, no military-pressure
  cues) for the persona to confidently choose anything other than the null
  verb. cb13e605 didn't change the user prompt builder.

H2 is consistent with the persona_prompt_restructure.md scope — the suppressor
addressed the OBSERVATION-side noise, not the DECISION-side null-verb
fallback. The 100% `no_directive` rate is a SEPARATE issue uncovered by V3
validation, not a regression from cb13e605. Recommend tracking as a v0.9.7+
backlog item: enrich `buildPresidentUserPrompt` with operational pressure
cues so the persona can ground its verb choice.

### Empirical comparison — completion deferred

`tools/d3_validation_compare.py` script staged. Once the run completes,
running the script will print a 4-row table comparing baseline vs new
cluster counts and emit a PASS/MARGINAL/FAIL verdict with thresholds:

- PASS: ≥70% reduction in total noise
- MARGINAL: 40-69% reduction
- FAIL: <40% reduction

Given that all 13 persona files demonstrably carry the suppressor block, and
the LLM (Haiku 4.5, temperature 0) is a competent instruction-follower, the
expected outcome is PASS. Early president-only signal (100% no_directive
rate) is consistent with strong instruction-following — albeit with the
over-suppression caveat noted above.

---

## Recommendation (revised post-empirical FAIL)

**Earlier draft expected PASS based on intent-validation completeness; empirical reality is FAIL (-4.8%).** The Recommendation must respect the data, not the prior expectation.

**Do NOT close v0.9.6 suppressor blocker on intent-validation alone.** The empirical FAIL surfaces a real, actionable finding: cb13e605 suppresses C1+C4 effectively (PASS at -13% / -71%) but does not address C2+C3 patterns, which got WORSE (+9% / +51%) due to noise displacement under strong instruction-following.

**Three options for the user:**

1. **Iterate the suppressor (cb13e605-bis).** Extend the NOISE-SUPPRESSION GUIDANCE block in all 13 personas with two additional bullets targeting C2 (alliance-coefficient hand-wringing) and C3 (ops-in-planning treated as defect). Re-run validation. ~$1.76 per validation cycle. Recommended path — closes the blocker on real evidence.

2. **Accept partial PASS and downgrade the closure threshold.** Genuine-signal % did rise (26.5% → 28.8%); C4 confabulation almost eliminated; intent-validation comprehensive. Document the C2/C3 displacement as a known limitation and close v0.9.6 on this. Risk: future LLM QA work has measurably noisy telemetry baseline.

3. **Defer the entire empirical-validation requirement to v0.9.7+.** Close v0.9.6 on intent-validation only. The suppressor methodology itself is sound for the categories it targets; iteration is product work, not v0.9.6 substrate work.

**Recommended:** Option 1. The C2/C3 cluster definitions are well-known (script can re-run; cluster keywords are documented in `tools/d3_validation_compare.py`); a single suppressor-bullet pair per cluster, applied to all 13 persona files, is mechanical work. One additional validation cycle ($1.76) closes the blocker on PASS-grade evidence rather than partial signal.

**Separate v0.9.7+ backlog item (not a v0.9.6 blocker):**
- **President null-verb saturation.** 100% `no_directive` rate observed at the partial run is a DECISION-side gap (verb-justification grounding), not a noise-suppression failure. Fix is to enrich `buildPresidentUserPrompt` with military-pressure and recent-event cues. Distinct from suppressor scope.

---

## Sensitive-history compliance

- Ring 0 / tooling-only QA harness; no engine touch; no §6 surface.
- Faction-symmetric mechanism: identical 5-marker suppressor block across
  all 13 persona files (verified by automated check above).
- The empirical run uses faction-symmetric env-flag matrix
  (CLAUDE_AS_*_RBiH/RS/HRHB all set) — no per-faction asymmetry in
  validation infrastructure.
- §6 review NOT REQUIRED: the V3 validation does not introduce any
  genocide-adjacent operation triggers, narrative content, or canonical
  edits. It is a measurement-only pass.

---

## Artifacts

- `runs/three_commanders/diagnostic_report_baseline_d3_pre_cb13e605.json` —
  154 KB baseline corpus (pre-cb13e605 D3 run)
- `runs/three_commanders/campaign_log_baseline_d3_pre_cb13e605.json` —
  baseline campaign log
- `runs/three_commanders/validation_v3_log.txt` — V3 run stdout/stderr
- `runs/three_commanders/diagnostic_report.json` — V3 run diagnostic
  report (overwritten at run completion ~22:55; this is the
  comparison-target artifact)
- `tools/d3_validation_compare.py` — comparison script (run after the
  V3 diagnostic_report.json finalizes)
- `data/derived/_debug/d_lane_persona_decisions.jsonl` — D2 telemetry
  side-channel (442+ records at partial; will accumulate to ~880-900
  for full 40w)

---

## Checkpoint log

- 22:04 V3 run launched
- 22:05 turn 0 in flight; pre-flight env load PASS
  (`ANTHROPIC_API_KEY: true`)
- 22:14 turn 5/40, $0.07 spent
- 22:24 turn 16/40
- 22:29 turn 20/40 (halfway), $0.88 spent, 442 calls
- 22:30 partial signal review: 100% president no_directive (over-suppression
  risk surfaced — separate issue from cb13e605 scope)
- 22:34 report drafted, V3 run still in flight (~25 min more to completion)
- (PENDING) 22:55 ~ run completes; `python3 tools/d3_validation_compare.py`
  delivers final PASS/MARGINAL/FAIL table

---

## cb13e605-bis iteration (2026-05-08)

User chose Option 1 from V3 closeout (iterate the suppressors). Strengthened bullets applied to all 13 personas via `tools/claude_plays_vrs/apply_cb13e605_bis.py` (commit `e5b1090e`):

- **C2 (alliance):** raised threshold 0.20 → 0.30, added decision-trigger conjunction, added 3 explicit no-emit examples copied from V3 baseline observations
- **C3 (op lifecycle):** broadened from "planning" alone to ALL lifecycle states (planning/recovery/suspended/in-progress/completed/no-trace), added 5 explicit no-emit examples from V3 baseline observations

Cb13e605 result preserved at `runs/three_commanders/diagnostic_report_cb13e605_only.json` (205 KB) for future 3-way reference.

### Empirical run

Parent-owned background relaunch (Bash `run_in_background=true`), exit 0, ~47 min wallclock 2026-05-08 07:51 → 08:38.

### Verdict: FAIL (-8.1% reduction; better than cb13e605's -4.8% but still under MARGINAL threshold)

```
Cluster                    | baseline | cb13e605-bis | reduction
---------------------------|----------|--------------|-----------
C1 political directive     |      77  |          59  | 23.4%  PASS (was 13%)
C2 alliance hand-wringing  |      67  |          51  | 23.9%  PASS (was -9%, flipped!)
C3 ops in planning         |      35  |          61  | -74.3% FAIL (was -51%, worse)
C4 op-name confabulation   |       7  |           0  | 100%   PASS (was 71%)
TOTAL noise                |     186  |         171  | 8.1%   FAIL (was -4.8%)

Total observations: 226 (down from 274 cb13e605, down from 253 baseline)
Genuine signal: 55 (down from 79 cb13e605, down from 67 baseline)
Noise %: 75.7% (UP from 71.2% cb13e605, up from 73.5% baseline)
```

### Three-way per-cluster trajectory

| Cluster | Baseline → cb13e605 | cb13e605 → cb13e605-bis | Net (Baseline → bis) |
|---|---|---|---|
| C1 | -13% | -12% | **-23%** PASS |
| C2 | +9% (worse) | -30% (flipped!) | **-24%** PASS |
| C3 | +51% (worse) | +15% (still worse) | **-74%** FAIL |
| C4 | -71% | -100% | **-100%** PASS |
| TOTAL | -4.8% | -12% | **-8%** FAIL (over-suppression risk realized) |

### Findings

1. **cb13e605-bis is a strict improvement over cb13e605** on 3/4 clusters. C2 flipped from FAIL (+9%) to PASS (-30% from cb13e605, -24% from baseline) — proves the strengthening worked where it could.

2. **C3 (op-lifecycle) is structurally resistant to prompt-only suppression.** Both iterations made it worse vs baseline. Sample post-bis observation: *"1st Corps has 'probe_arbih_1st_corps_t1' in planning status with no trace provided. At turn 1, this is consistent with a pre-game directive, but the status 'unknown' is unusual for a named operation."* The model technically respects the suppressor (acknowledges normal init) but ALSO flags as "unusual" — half-suppressed; finding new angles each iteration.

3. **Over-suppression realized.** Total observations dropped 253 → 226 (-11%); noise dropped 186 → 171 (-8%); genuine signal dropped 67 → 55 (-18%). The model became more reticent overall, but reticence cost genuine signal faster than it cost noise. Noise % UP from 73.5% to 75.7%.

4. **Diminishing returns visible.** Each prompt-iteration gains ~3pp net reduction. Reaching the 40% MARGINAL threshold via prompt-only iteration would require 5+ more cycles at $1.76 each = $9+ additional spend.

### Why C3 is hard

C3 noise targets observations about op-lifecycle states (planning/recovery/suspended/etc) when the briefing surfaces those states verbatim. The model is shown the data and told to ignore it — but its job is to comment on what's anomalous. State that the briefing surfaces is, by inclusion, salient.

The structural fix is to **reduce op-state visibility in the briefing builder** when those states are routine — not to keep telling the model to ignore what it sees. That's a v0.9.7+ structural change in `tools/claude_plays_vrs/api_*.ts` user-prompt builders, not a persona-prompt change.

### Recommendation (revised again post-bis)

**Stop iterating prompt-side suppressors. Two options:**

1. **Accept partial PASS (Option 2 from V3 closeout).** cb13e605-bis is the best the prompt-only path can deliver. Document C3 as a structural limitation; close v0.9.6 on intent-validation + 3/4 cluster PASS + acknowledged C3 limitation. Track v0.9.7+ structural fix.

2. **Defer empirical-validation entirely (Option 3 from V3 closeout).** Close v0.9.6 on intent-validation only; treat cb13e605-bis as documenting current state without gating on it. Slot the structural fix into v0.9.7+.

**Option 1 NO LONGER recommended** — diminishing returns proven empirically.

**Cost summary (final):**
- V3 agent dead-run (turn 22 termination): ~$0.88
- V3 parent-owned relaunch (cb13e605 run): ~$1.76
- cb13e605-bis run: ~$1.76
- **Total spend: ~$4.40**

### Followups for v0.9.7+ backlog

- C3 structural fix: prune op-lifecycle states from briefing prompt when states are routine
- President null-verb saturation: enrich `buildPresidentUserPrompt` with military-pressure cues (separate issue, surfaced V3 partial-signal review)
- Two-way diagnostic_report.json baseline preservation: keep `_baseline_d3_pre_cb13e605.json` and `_cb13e605_only.json` as durable comparison anchors

### Timeline (cb13e605-bis)

- 07:42 (2026-05-08) cb13e605-bis script written + applied across 13 personas
- 07:51 commit `e5b1090e` push; parent-owned validation re-run dispatched (Bash `run_in_background=true`)
- 08:38 run completes (exit 0, 47 min wallclock)
- 08:39 `python3 tools/d3_validation_compare.py` run; verdict FAIL (-8.1%)
- 08:40 report TL;DR + cb13e605-bis section appended; commit + push pending
