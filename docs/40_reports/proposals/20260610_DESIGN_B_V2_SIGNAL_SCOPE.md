# Design B v2 — Un-saturated Late-War Exhaustion Signal SCOPE + Verification

**Date:** 2026-06-10
**Type:** READ-ONLY scope-and-VERIFY. No engine code, no flag flips, no canon edits produced in writing this. Every claim is file:line-cited and/or measured from run artifacts.
**Branch context:** `feat/exhaustion-drag-designB` (worktree `agent-aeba549bb770e7c5f`). v1 ramp code lives at commit `8cce5b8d5`; current HEAD (`7d23f86e3`) is docs-only and shows the legacy `/600` drag at `plan.ts:279`.
**Predecessor:** `20260610_DESIGN_B_FIRST_FIRE.md` (v1 came back **territory-INERT**: root causes (d) `war_exhaustion` saturates to its 10000 cap by ~w70 → ramp degenerates to a flat floor across the entire w70–188 over-advance window; and (a) the drag enters the launch score as a **positive additive term** `+0.15·capacity·drag`, so the 0.55 floor sat ABOVE legacy's 0.3 and *raised* willingness — sign-inverted).
**Status:** BUILD-READY. Recommended signal verified to vary late-war from existing run artifacts. Existing state SUFFICES — no new accumulator needed.

---

## 0. TL;DR

- **Recommended signal:** per-faction **cumulative military casualties** from `state.military.casualty_ledger` (`getFactionTotalCasualties`, `src/state/casualty_ledger.ts:107`), expressed as a **casualty-load ratio** against current fielded personnel (existing, persisted, deterministic). It is the un-saturated late-war accumulator the saturated `war_exhaustion` field cannot provide.
- **PROOF it varies late-war (w120→188, baseline 188w `acb538b04d79af3c__w188_n1`):** cumulative RS casualties go **63,911 → 141,203** (+77k across the late-war window); RBiH **68,780 → 104,726**; HRHB **14,690 → 22,542**. Final-save `casualty_ledger` totals: RBiH 307,217 / RS 191,101 / HRHB 41,472. **NOT flat, NOT saturated, monotonic.** By contrast `war_exhaustion` is pinned at level 100 for all three from ~w72, and its per-week **delta is 0.00** from w72 on.
- **Sign-corrected attach:** the term must be a **capacity multiplier that DROPS toward a floor as casualty-load rises** (more spent → lower `factionExhaustionDrag` → smaller additive `e` → lower launch score → fewer launches). v1's bug was a floor (0.55) above legacy's saturated 0.3; v2 drives the multiplier from a signal that keeps falling late-war and floors it BELOW the early-war value so it is a genuine net drag.
- **Existing state suffices:** `casualty_ledger` is already written by the live combat path and already in `final_save`. The denominator (current personnel) is on `state.military.formations`. **No new accumulator, no new per-turn ring buffer.** Est **~45–70 LOC** (reuse the entire v1 `AWWV_EXHAUSTION_DRAG_V2` scaffold).
- **§6:** SAFE — faction-scalar, intent-layer only, never enters `attack_resolution_osid.ts`; triggered §6 rupture ops (`triggered_operations.ts`) do not route through `selectWinningIntent` (grep: no `launch_opportunity`/`stage_operation`/`selectWinningIntent` reference in that file), so the drag is structurally incapable of suppressing Srebrenica/Žepa.

---

## 1. Candidate survey (STEP 1)

All candidates are per-faction state that could express "freshly/increasingly spent in the late war." Source = `src/state/game_state.ts`, the commander attach site (`plan.ts`/`briefing.ts`), and the 188w run artifacts.

| # | Candidate | Where computed/stored | Range / per-faction? | Late-war behavior |
|---|---|---|---|---|
| **S1** | **`war_exhaustion[fid]` LEVEL** (the v1 signal) | `state.political.war_exhaustion` (`game_state.ts:2897`); read at `briefing.ts:713`; `recoveredExhaustionLevel = raw/100` (`war_weariness_bands.ts:55`) | raw 0..10000 (level 0..100), per-faction | **SATURATED** — pinned at level 100 (raw 10000) for all 3 from ~w72→188. The whole over-advance window is flat. **REJECT (this is the v1 failure).** |
| **S2** | **`war_exhaustion` DELTA / rate-of-gain** (first-fire option 1a) | derivable from S1 across turns | raw/turn, per-faction | **DEAD late-war** — measured per-week delta is **0.00** from w72 on for all 3 (the level is at its cap, so its derivative is zero). **REJECT.** |
| **S3** | **Cumulative military casualties** (`casualty_ledger`) | `state.military.casualty_ledger` (`game_state.ts:2466`); helper `getFactionTotalCasualties` (`casualty_ledger.ts:107`); written by `attack_resolution_osid.ts:1055`, `battle_resolution.ts:1096`, `attack_morale_absorption.ts:157/172` | integer, monotonic, per-faction (killed+wounded+missing) | **VARIES — monotonic, never saturates.** RS 63.9k→141.2k across w120–188. **RECOMMEND (normalized — see S3').** |
| **S3'** | **Casualty-load ratio** = cumulative casualties ÷ current fielded personnel | numerator S3; denominator = Σ personnel over `state.military.formations[*].faction==fid` (`game_state.ts` formations map) | unbounded ratio, per-faction; bound it with a cap | **VARIES + bounded + sign-clean.** This is the recommended drive signal. RS late-war is *shrinking* (personnel 117.8k→73.2k) while casualties climb → ratio rises sharply = "spent". RBiH/HRHB grow (late mobilization) → lower ratio = less spent. |
| S4 | **Trailing-N-week casualty load** (acute bleed) | NOT persisted as a field; derivable only with a new per-turn ring buffer | per-faction | VARIES (RS trailing-12wk swings 4.1k–33.6k late-war) but **requires a NEW accumulator** (ring buffer of weekly casualties). Strong signal, bigger build. **SECONDARY** — use only if S3' proves too coarse. |
| S5 | **`avg_fatigue_pct` (Tier-0 formation fatigue)** | `briefing.avg_fatigue_pct` (`briefing.ts:822`, FATIGUE_MAX-normalized to 0..100); already a HARD-BLOCK gate at `plan.ts:308` | 0..100, per-corps (not faction) | **Already consumed** as `fatigueReadiness` (`plan.ts:285`) AND a hard block. It is per-corps, capped, and double-counting it as the faction drag is degenerate. The earlier "capped at 30" note refers to a per-brigade fatigue ceiling, not this %. **REJECT (already wired; per-corps not per-faction).** |
| S6 | **`supply_condition` / `supply_pressure`** (weekly faction record) | `weekly_report.factions[]` | 0..100, per-faction | `supply_pressure` **pinned at 100** for all factions all weeks (flat). `supply_condition` essentially flat and trends the WRONG way late-war (RS 97→98, HRHB 71→77, RBiH 81→85 = *improving*). **REJECT.** |
| S7 | **`strategic_reserves[fid]` (manpower pool)** | `state.military.strategic_reserves` (`game_state.ts:2364`) | int ≥0, per-faction | Depletes meaningfully (RS → **0** by w188; HRHB 103k, RBiH 330k) — a real "spent" tell for RS, but absent/empty early-war, fluctuating, and **0 for RS makes it useless as a denominator** (div-by-zero) and unreliable as a standalone drive. **REJECT as primary; do NOT use as the S3' denominator.** |
| S8 | **Recruitment shortfall / territory-loss-rate** | no single persisted faction-scalar; diffuse | — | No clean persisted faction-scalar surface; would need new derivation. **REJECT (diffuse).** |

---

## 2. THE LOAD-BEARING VERIFICATION (STEP 2)

**Source:** `…/a3-baseline/runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n1/` (`weekly_report.jsonl` for trajectory, `final_save.json` for ledger endpoint). This is the current-floor 188w baseline. Cumulative casualties were reconstructed per-faction from the per-battle `attacker_casualties`/`defender_casualties` in `weekly_report.battles[]`; the engine-persisted endpoint was cross-checked against `final_save.military.casualty_ledger`.

### 2.1 Does each candidate VARY across w120–188 for RS / HRHB / RBiH?

| Signal | w24 | w48 | w72 | w96 | w120 | w144 | w168 | w188 | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **war_exhaustion level — RS** | 49.5 | 97.5 | **100** | 100 | 100 | 100 | 100 | 100 | FLAT/SATURATED |
| **war_exhaustion level — HRHB** | 28.9 | 68.4 | **100** | 100 | 100 | 100 | 100 | 100 | FLAT/SATURATED |
| **war_exhaustion level — RBiH** | 35.7 | 63.6 | 90.0 | **100** | 100 | 100 | 100 | 100 | FLAT/SATURATED |
| **war_exhaustion DELTA/wk — RS** | 200 | 200 | **0.00** | 0 | 0 | 0 | 0 | 0 | DEAD late-war |
| **supply_pressure — all** | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | FLAT |
| **supply_condition — RS** | 97 | 97 | 97 | 97 | 97 | 97 | 98 | 98 | FLAT (+wrong dir) |
| **CUM casualties — RS** | 10,435 | 20,840 | 30,405 | 44,025 | **63,911** | 75,075 | 97,948 | **141,203** | **VARIES — monotonic** |
| **CUM casualties — RBiH** | 27,266 | 38,954 | 48,670 | 58,414 | **68,780** | 75,978 | 89,017 | **104,726** | **VARIES — monotonic** |
| **CUM casualties — HRHB** | 3,417 | 3,939 | 8,827 | 12,597 | **14,690** | 16,668 | 18,679 | **22,542** | **VARIES — monotonic** |

### 2.2 The discriminator (w120→188 — the late-war over-advance window the design targets)

| Faction | CUM casualties Δ(w120→188) | Personnel (init → final) | Casualty-load direction |
|---|---|---|---|
| **RS** | +77,292 (63.9k → 141.2k) | 117,750 → **73,179 (shrinking)** | **rising hard** — losses outrun mobilization → "spent" |
| RBiH | +35,946 (68.8k → 104.7k) | 48,680 → 214,362 (growing) | rising slowly — late mobilization offsets |
| HRHB | +7,852 (14.7k → 22.5k) | 31,800 → 69,834 (growing) | rising slowly |

**This is exactly the discrimination the design needs:** late-war, RS (the faction whose opportunistic over-advances we most want to thin) reads as genuinely spent — casualties climbing while fielded strength falls — whereas the saturated `war_exhaustion` reads them all as an identical, frozen "100." The casualty-load ratio is the signal that *moves* across w120–188 and *differentiates* the factions there.

### 2.3 Engine-persisted endpoint cross-check (`final_save.military.casualty_ledger`)

| faction | killed | wounded | missing | TOTAL | per_formation entries |
|---|---|---|---|---|---|
| RBiH | 57,732 | 218,176 | 31,309 | **307,217** | 130 |
| RS | 36,397 | 135,172 | 19,532 | **191,101** | 117 |
| HRHB | 8,492 | 29,940 | 3,040 | **41,472** | 40 |

`casualty_ledger` is **present and populated** in the persisted save. (Note: ledger total > battle-derived cumulative because the ledger also captures non-`battles[]` casualty paths — morale absorption, equipment-effect splits. Both are monotonic and late-war-varying; the ledger is the authoritative, already-persisted source the build should read.)

**Conclusion of STEP 2:** of every existing persisted per-faction signal, **only the casualty accumulator (S3/S3') varies across w120–188.** war_exhaustion (level AND delta), supply_pressure, supply_condition are all flat/saturated/wrong-direction. **Recommend S3'. Existing state suffices.**

---

## 3. The corrected drag design (STEP 3)

### 3.1 Attach point (UNCHANGED from v1) — but re-keyed off the casualty-load signal

`src/sim/combat/commander/plan.ts` `computeFactionExhaustionDrag(...)` → `factionExhaustionDrag` → `exhaustionPenalty = corpsExhaustionCapacity * factionExhaustionDrag` (`plan.ts:283`) → additive term `e = 0.15 * exhaustionPenalty` in **`stage_operation`** (`plan.ts:452`) and **`launch_opportunity`** (`plan.ts:476`) only. Offense-only, faction-scalar, never touches the defender, never writes a controller.

### 3.2 The drive signal + the sign-correct math

```
// inputs available at the attach point (briefing-supplied; see §3.4 for wiring):
//   cumCas      = getFactionTotalCasualties(state.military.casualty_ledger, fid)   // S3, casualty_ledger.ts:107
//   fielded     = Σ personnel over state.military.formations[*].faction == fid     // current strength
//   load        = cumCas / max(fielded, FIELDED_FLOOR)        // casualty-load ratio, FIELDED_FLOOR guards div-by-0
//
// constants (tune in the re-floor run):
const LOAD_RAMP_START = 1.0;    // below 1.0 casualties-per-fielded-soldier: early/mid war, no drag (multiplier 1.0)
const LOAD_RAMP_FULL  = 2.5;    // at/above this load: fully spent → floor
const DRAG_FLOOR_V2   = 0.20;   // BELOW legacy 0.3 → a genuine NET drag (v1's 0.55 was the bug)
//
// sign-correct: load rises → multiplier FALLS toward floor → additive e shrinks → launch score drops → fewer ops
factionExhaustionDrag =
    load <= LOAD_RAMP_START ? 1.0
  : load >= LOAD_RAMP_FULL  ? DRAG_FLOOR_V2
  : 1.0 - ((load - LOAD_RAMP_START) / (LOAD_RAMP_FULL - LOAD_RAMP_START)) * (1.0 - DRAG_FLOOR_V2)
```

**Why this is sign-correct (the v1 fix).** The term `e = 0.15·corpsExhaustionCapacity·factionExhaustionDrag` is **added** to the launch score (`plan.ts:452/476`). So willingness moves *with* `factionExhaustionDrag`. v1 floored at **0.55 > legacy 0.3**, which *raised* late-war willingness. v2 floors at **0.20 < 0.3**: as a faction's casualty-load climbs late-war, the multiplier falls *below* the early-war value, so the additive contribution genuinely shrinks → the corps is **less** willing to stage/launch. The named-but-inverted semantics are now honest: high exhaustion → low `factionExhaustionDrag` → real drag.

**Why the ratio (not raw cumulative).** Raw cumulative casualties grow unbounded and would over-penalize the faction that simply fought the longest. The ratio `cumCas/fielded` is the *depletion intensity*: it spikes precisely when a faction's losses outrun its ability to refill the line (RS late-war: 191k cumulative against a *shrinking* 73k fielded → load ≈ 2.6, deep in the ramp), and stays moderate when mobilization keeps pace (RBiH/HRHB still growing → lower load). This is the negative-sum "running on empty" texture, and it **does not saturate** — it keeps rising as long as the faction keeps bleeding faster than it recruits.

**Bounded floor `0.20`** (single primary tuning knob). Not zero — corps-exhaustion / fatigue / campaign-role hard blocks (`plan.ts:306–311`) remain the true paralysis guards; this term only *reorders intent competition at the margin* (it is one 15%-weighted term, applied after `corpsExhaustionCapacity` has had its say). 0.20 gives the late-war "fewer ops" bite room to work while leaving a spent faction able to defend and to launch when conditions are strong. **If RS over-thins (sacred western anchors regress), raise `DRAG_FLOOR_V2` toward 0.30 or `LOAD_RAMP_FULL` toward 3.0; if inert, lower the floor / drop `LOAD_RAMP_START` toward 0.75.** One knob per re-run.

**Faction-symmetric:** YES — identical constants, three factions. The differentiation is *in the signal* (RS's load is structurally higher late-war because it shrinks; RBiH/HRHB's is lower because they grow). No asymmetric constants needed.

**Deterministic:** pure function of two persisted integers (`casualty_ledger` totals, formation personnel). No RNG, no clock.

### 3.3 Default-off flag — REUSE the v1 `AWWV_EXHAUSTION_DRAG_V2` scaffold verbatim

From commit `8cce5b8d5` (already on this branch's history):
- `plan.ts`: `_enableExhaustionDragV2Override` + `getEnableExhaustionDragV2()` / `setEnableExhaustionDragV2()` / `resetEnableExhaustionDragV2()` (`plan.ts:104–115`), constants `EXHAUSTION_DRAG_V2_*` (`plan.ts:124–128`), and `computeFactionExhaustionDrag(...)` (`plan.ts:141`).
- `scenario_runner.ts:1949`: `if (process.env.AWWV_EXHAUSTION_DRAG_V2 === 'true') setEnableExhaustionDragV2(true);` (`scenario_runner.ts:102` import).

**Only the ON branch body changes:** swap the `recoveredExhaustionLevel(war_exhaustion)` ramp for the §3.2 casualty-load ramp. **The OFF branch stays the exact legacy `Math.max(0.3, 1 - raw/600)`** → flag-off byte-identical (the v1 first-fire already proved OFF == current floor `345e044b`). Keep `recoveredExhaustionLevel` import only if no longer used → drop it (it is the saturated signal we are abandoning).

### 3.4 The one new wiring (the only net-new surface vs v1)

`computeFactionExhaustionDrag` currently takes one scalar (`briefing.faction_war_exhaustion`). v2 needs **two new briefing-supplied scalars**: `faction_cumulative_casualties` and `faction_fielded_personnel` (or the precomputed `faction_casualty_load` ratio — preferred, keeps the math at the assembly site). Add the ratio to `CommanderBriefing` and compute it once in `briefing.ts` next to `factionWarExhaustion` (`briefing.ts:713`) using `getFactionTotalCasualties(state.military.casualty_ledger ?? {}, faction)` and a personnel sum over `state.military.formations`. Guard: if `casualty_ledger` is undefined (early turns before first battle) → load 0 → multiplier 1.0 (no drag), which is correct. **This is ~15 LOC and the only structural addition over the v1 scaffold.**

---

## 4. §6 verdict

**SAFE — identical to the v1 §6 verdict, mechanism unchanged.** The lever is faction-scalar, intent-layer-only; it never enters `attack_resolution_osid.ts`, never writes `political_controllers`, never touches a defender → **G1 untouched, G2 (`srebrenica_genocide_1995 ≥160`) independent.** The Srebrenica/Žepa-taking ops are **triggered operations** (`triggered_operations.ts`) injected outside commander intent competition — confirmed by grep: `triggered_operations.ts` contains **no** reference to `selectWinningIntent` / `launch_opportunity` / `stage_operation`, so the dragged term is never in their code path. Dragging RS's op-willingness to its 0.20 floor **cannot** suppress Krivaja-95 / Stupčanica-95. The v1 first-fire empirically confirmed Srebrenica + Žepa fall identically OFF==ON (`control_delta` byte-identical). The re-floor must re-confirm this as a regression backstop, but the mechanism makes it structurally exempt.

---

## 5. Build steps + expected floor direction

### Build steps (one change, ~45–70 LOC)
1. **Reuse the v1 scaffold** (`AWWV_EXHAUSTION_DRAG_V2` flag + `computeFactionExhaustionDrag` + scenario_runner env wiring from `8cce5b8d5`). If HEAD has reverted them, re-apply. `tsc --noEmit` clean.
2. **Add `faction_casualty_load` to `CommanderBriefing`** and compute it in `briefing.ts` (near `:713`) from `getFactionTotalCasualties(state.military.casualty_ledger, faction)` ÷ Σ-personnel(faction), guarded for an absent ledger → 0. (~15 LOC).
3. **Re-point the ON branch** of `computeFactionExhaustionDrag` to the §3.2 casualty-load ramp (`LOAD_RAMP_START 1.0`, `LOAD_RAMP_FULL 2.5`, `DRAG_FLOOR_V2 0.20`). Keep the OFF branch as the exact legacy `max(0.3, 1 - raw/600)`. (~10 LOC).
4. **Unit test** (`tests/commander/exhaustion_drag.test.ts`, extend v1's 28 cases): flag-OFF byte-identity vs legacy; flag-ON → 1.0 at load≤1.0, linear ramp, 0.20 floor at load≥2.5; div-by-0 guard; determinism. (~30 LOC).
5. **Smoke triad:** `tsc --noEmit` + `npm run test:vitest` + `npm run desktop:map:build`.
6. **Byte-identical OFF proof:** 40w `be76e56dd9d288c2` / 188w `5f57d17287b87dfb` (or v1's measured OFF `345e044b`) reproduce flag-OFF. STOP if not.
7. **188w ON/OFF diff** (the re-floor candidate). §6 G2 hard gate (Srebrenica/Žepa fall, rupture ≥160). 30/30 anchor check; **named watch = the Sana-follow-on / Ključ late-war `launch_opportunity` cluster** (most exposed to a launch-willingness drag).
8. **Re-floor + ledger** if anchors hold and territory holds/improves; one owner-signed run.

### Expected floor direction
**Floor-MOVING, late-war only (≥~w120 where RS load enters the ramp).** The drag now genuinely *lowers* RS/HRHB late-war launch willingness (sign-corrected), so the intended effect — **thinning late-war RS opportunistic over-advances toward history** (negative-sum) — can finally express. RS is the faction whose load crosses deepest into the ramp (≈2.6), so its marginal opportunistic grabs are the first thinned; RBiH/HRHB (still mobilizing, lower load) are nudged less. **Plausibly floor-neutral-to-POSITIVE** (the over-captures flagged in diagnostics are partly late-war opportunistic offensives). **Primary regression risk:** any sacred anchor won via a *marginal late-war bot `launch_opportunity`* (Sana follow-on / Ključ) could regress — bound via `DRAG_FLOOR_V2`/`LOAD_RAMP_FULL` and watch in the 188w diff. Pre-planned + triggered ops are SAFE (off the intent rail).

---

## FINAL

- **Recommended signal (one line):** per-faction **casualty-load ratio** = `getFactionTotalCasualties(state.military.casualty_ledger, fid)` (`src/state/casualty_ledger.ts:107`) ÷ current fielded personnel — drive `computeFactionExhaustionDrag` in `src/sim/combat/commander/plan.ts` off this instead of the saturated `war_exhaustion`.
- **PROOF it varies late-war (w120→188):** CUM casualties RS **63,911 → 141,203** (+77k), RBiH **68,780 → 104,726**, HRHB **14,690 → 22,542** — monotonic, un-saturated; final-save `casualty_ledger` totals RBiH 307,217 / RS 191,101 / HRHB 41,472; RS personnel *shrinks* 117,750 → 73,179 over the war → its load ≈ 2.6 sits deep in the ramp. (war_exhaustion level AND delta, supply_pressure, supply_condition are all flat/saturated across this window.)
- **Sign-corrected attach:** keep the existing additive term `e = 0.15·corpsExhaustionCapacity·factionExhaustionDrag` (`plan.ts:452/476`) but make `factionExhaustionDrag` **fall** from 1.0 toward floor **0.20** as load rises (1.0 at load≤1.0, 0.20 at load≥2.5) — floor **below** legacy 0.3 so it is a genuine net drag (v1's 0.55 floor *above* 0.3 was the sign bug).
- **Existing state suffices — NO new accumulator:** `casualty_ledger` is already written by the live combat path (`attack_resolution_osid.ts:1055`, `battle_resolution.ts:1096`) and already persisted in `final_save`; personnel is on `state.military.formations`. Only net-new surface = one `faction_casualty_load` briefing field (~15 LOC).
- **Est LOC:** ~45–70 (v1 flag scaffold reused; briefing wiring ~15 + ON-branch ramp ~10 + unit test ~30).
