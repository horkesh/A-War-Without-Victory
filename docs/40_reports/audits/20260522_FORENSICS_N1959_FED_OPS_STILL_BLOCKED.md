# Forensics — n1959 Federation Operations Still Blocked

**Date:** 2026-05-22
**Author:** scenario-creator-runner-tester (read-only investigation)
**Run dirs:**
- n1959: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1959/`
- n1958: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1958/` (10-fix baseline)
**Branch under test:** `feature/arc-operations-calibration` (12 fixes total: Waves 3B-A.2, 3B-B, 3B-C, 3E + 8 earlier)

---

## TL;DR

The two newer fixes (Wave 3B-A.2 mistral floor 0.40→0.20 + Wave 3B-C vlasic Federation-aware staging) **did move the per-axis trace status** vs n1958 — `enemy_weakness` cleared on Mistral, `staging_access` cleared on Vlasic — but **a second required axis (`alliance_context` / "post-Washington Federation coordination below threshold") is still red on both ops, AND on kupres_cincar_94**. That axis is the operative blocker for the entire `_94`/`_95` federation cluster.

**Root cause (one sentence):** `state.military.alliance_locks` holds a `mode:"floor", value:0.80, expires_turn:10084` entry in both n1958 and n1959, but `state.political.war_alliance_rbih_hrhb` is still `0.1` at turn 188 — the lock floor is recorded but is **not being applied to the political WA scalar that operation predicates actually read**, so the `alliance_context` axis stays red and the four federation `_94/_95` ops never get political authorization.

---

## (a) Per-op blocker chain (n1959)

Trace source: `state.military.operation_opportunity_traces[]`. All entries are `event:"blocked"` unless noted.

### mistral_2_95 (14 trace rows, turns 175–188)

| Axis | Status n1959 | Status n1958 | Reason |
|---|---|---|---|
| political_authorization | **RED (required)** | RED | "Federation authorization below Mistral 2 threshold" |
| staging_access | **RED (required)** | RED | "Kupres/Cincar dependency anchors are not open for Mistral 2" |
| enemy_weakness | green | RED (required) | (cleared by Wave 3B-A.2 floor 0.40→0.20 — confirmed) |
| weather_season | green (red on t188 only) | optional | "late-autumn weather threatens Mistral 2 tempo" |

n1958 example: `failed_required_axes` had 3 entries (political_authorization, staging_access, enemy_weakness).
n1959 example: `failed_required_axes` has 2 entries (political_authorization, staging_access).

**Wave 3B-A.2 did its job on `enemy_weakness`. The op is still blocked because both `political_authorization` and `staging_access` remain red.**
- `staging_access` for Mistral 2 explicitly depends on Kupres/Cincar being open — which it never is (see kupres_cincar_94 below). This is a **transitive block via the Federation gate**.
- `political_authorization` "Federation authorization below Mistral 2 threshold" is a second, independent federation-WA gate that 0.10 doesn't clear.

### vlasic_ridge_95 (15 trace rows, turns 152–166; trace stops at 166)

| Axis | Status n1959 | Status n1958 | Reason |
|---|---|---|---|
| alliance_context | **RED (required)** | RED | "post-Washington Federation coordination below threshold" |
| staging_access | green | RED (required) | (cleared by Wave 3B-C Federation-aware staging — confirmed: "Travnik staging anchor no longer held by 3rd Corps" gone) |
| weather_season | green from t154+ | optional | early entries failed weather, later entries clear |

n1958 example t166: `failed_required_axes` = [staging_access, alliance_context] (2).
n1959 example t166: `failed_required_axes` = [alliance_context] (1).

**Wave 3B-C cleared the staging axis. The op is still blocked because `alliance_context` (post-WA Federation coordination) remains red.** Trace truncates at turn 166 (likely the window-closed point); from turn 167 onward there are no further trace rows for this op.

### kupres_cincar_94 (11 trace rows, turns 132–142)

| Axis | Status n1959 | Status n1958 | Reason |
|---|---|---|---|
| alliance_context | **RED (required)** | RED | "post-Washington Federation coordination below Kupres/Cincar threshold" |
| weather_season | green from t136+ | optional | "early-autumn mountain conditions still constrain Kupres/Cincar" |

Wave 3B-A.1 (staging trim) and Wave 3E (alliance_lock) — **neither dislodged the `alliance_context` failure.** Trace truncates at t142 (window close), so this op never re-evaluated post-fix. **This is the upstream blocker for Mistral 2's staging_access dependency.**

### sana_95 (2 trace rows)

- t175: `event:"eligible"`, `proposal_id:"OPP_175_sana_95"`, `optional_green_count:2/1`
- t175: `event:"approved"`, `executed_op_name:"Operation Sana"`

**Sana 95 launched.** Confirmed in `weekly_report.jsonl` "Operation Sana:t175" recurring weeks 175–187 (13 weeks of activity). Also confirmed: 5 weekly battle entries weeks 175–179 from 501st/502nd/505th Vitezka Mountain brigades on Sana axis. Wave 3B-B (defender weakness floor lowered) **worked for Sana 95**.

### sana_95_follow_on (14 trace rows, turns 175–188)

| Axis | Status n1959 | Status n1958 | Reason |
|---|---|---|---|
| staging_access | **RED (required)** | RED | "Sanski/Kljuc interior axis has no live approach corridor" |

n1958 and n1959 trace rows are **identical** for the follow-on. Wave 3B-B did not address the follow-on's staging blocker. The follow-on requires an interior approach corridor that the still-degraded Sana 95 result did not establish (Sana's casualty ledger: ARBiH 1492/1063/552/1049 attacker casualties in successive weeks, mostly losing — see weekly_report.jsonl t175-178).

---

## (b) alliance_lock floor=0.80 present? — YES in state, NO in effect

`state.military.alliance_locks` in n1959:
```
[
  { "expires_turn": 10084, "mode": "floor", "value": 0.8 }
]
```
**Identical** to n1958. The lock object is well-formed and expires_turn=10084 vs current turn=188 means it is permanently active for this run.

**But:** the actual WA scalar at end-of-run is recorded as `0.1`:
```
"war_alliance_rbih_hrhb": 0.1
```
(`state.political.war_alliance_rbih_hrhb`, line offset 7455552 in n1959 final_save.json; identical value 0.1 in n1958.)

The lock exists but the floor is not being applied to the readable WA scalar that `alliance_context` / `political_authorization` predicates consume. The lock is data-present, behavior-absent.

---

## (c) One-sentence root cause for "12 fixes ≠ 10 fixes in counters"

The two new fixes cleared exactly the axes they targeted (`enemy_weakness` on Mistral, `staging_access` on Vlasic), but every Federation `_94/_95` op also has a **second required axis tied to the post-Washington WA scalar (`alliance_context` and/or `political_authorization`)** which is still red because `state.political.war_alliance_rbih_hrhb` remains at 0.1 in both runs — the `alliance_locks` floor=0.80 entry is recorded in state but is not being enforced on the readable WA value that those op predicates evaluate, so no fed op except Sana 95 launches, and territorial outputs are byte-identical to n1958.

---

## (d) Supporting numbers

- n1959 control_delta: HRHB −28, RBiH −49, RS +77 (total 143 flips; mun-flip distribution **byte-identical** to n1958 across all 60 flipping municipalities — diff=0).
- AAR list n1959: 26 ops total. Among the four Federation targets, **only "Operation Sana"** appears. No "Mistral", "Vlasic", "Kupres", or "Sana follow-on".
- WA value: 0.1 in both n1958 and n1959 at turn 188.
- alliance_lock floor=0.80 present in `state.military.alliance_locks` in both runs.
- Krajina region flips (prijedor 4, sanski_most 4, bos.krupa 3, bos.novi 3, kljuc 3, banja_luka 2, bihac 1, bos.petrovac 1, glamoc 1, mrkonjic_grad 1) — **identical** between n1958 and n1959. Net direction: RBiH/HRHB → RS dominant.

---

## Recommendations (conceptual, no code)

1. **alliance_locks enforcement audit (handoff: gameplay-programmer + canon-compliance-reviewer):** The lock array is recorded but the floor never lifts the political scalar. Either (a) the apply-step that writes WA from locks is missing or runs before locks are evaluated, or (b) op predicates read a different WA field than the lock targets. This is the single point that unblocks Wave 3B-A.2, 3B-C, and 3E in one stroke.
2. **`political_authorization` vs `alliance_context` axis split (handoff: operations-expert):** Mistral 2 has BOTH `political_authorization` and `alliance_context`-shaped failures. Confirm whether both axes derive from the same WA scalar, or whether `political_authorization` has an independent Federation-authorization threshold that needs its own floor.
3. **Mistral 2 staging cascade (operations-expert):** Even if alliance_context clears, Mistral 2's `staging_access` is **defined as "Kupres/Cincar dependency anchors are not open"**. That makes Mistral 2 transitively blocked behind kupres_cincar_94. If kupres_cincar_94's window already closed (last trace at t142, current turn 188), the dependency is structurally unsatisfiable for the rest of the run — Mistral 2 cannot launch in 188w even with a perfect WA fix unless Kupres/Cincar is re-windowed.
4. **sana_95_follow_on staging predicate (operations-expert):** "Sanski/Kljuc interior axis has no live approach corridor" — the predicate measures live-corridor not defender-weakness, so Wave 3B-B (defender floor) is by design not the right knob. The actual fix is either (a) loosen the live-corridor predicate, or (b) accept that Sana 95's costly attrition (>4000 ARBiH attacker casualties in 4 weeks) means the follow-on isn't viable as designed.

---

## Verification

- Memo size after write: see Bash `wc -c` post-write. Target ≥5 KB.
- All blocker claims cite specific JSON paths: `state.military.operation_opportunity_traces[].failed_required_axes[].axis`, `state.military.alliance_locks[].{mode,value,expires_turn}`, `state.political.war_alliance_rbih_hrhb`, `state.meta.turn`.
- No source files edited.
