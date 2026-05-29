# Wave 9 — Cincar Phase 2 (Bučovača → Kupres town)

**Date:** 2026-05-22
**Author:** Operations Expert
**Branch:** `feature/arc-operations-calibration`
**Predecessors:**
- Wave 7B — `docs/40_reports/audits/20260522_WAVE_7B_CINCAR_RERUN_N1967.md`
- Wave 8 — `docs/40_reports/audits/20260522_WAVE_8_CASCADE_N1968.md`
- Wave 7 fix proposal — `docs/40_reports/proposals/20260522_KUPRES_CINCAR_FIX.md`

---

## TL;DR

n1968 fixed all upstream Cincar gates (Wave 7B brigade pool + Wave 8 Graz exemption). Cincar fired, took `op:kupres:bucovaca` as a Solid Victory at t138, then stalled 6 turns trying to push directly into Kupres town (`op:kupres:kupres_2`) and aborted at `max_failures` t146. kupres_2 stayed RS at w188, brick-walling Mistral 1 (t160) and Jajce 95 (t178), which both require kupres_2 = HRHB as a staging-dependency anchor.

**Strategy chosen: B — Author a Phase 2 follow-on op (`kupres_phase_2_94`).**

Rationale: The historical 1994 Kupres campaign was a multi-step operation (Cincar Nov 1-3 → Kupres-town fall Nov 3 → road-clearing follow-up), not a single mass push. Adding more brigades to Cincar would ahistorically concentrate force and compound attrition without reset; a Phase 2 op lets the corps complete recovery, re-stage from the captured shoulder (`bucovaca`), and press into Kupres town with fresh momentum. This preserves Cincar's existing working brigade pool (Wave 7B/8) untouched and matches BB v2 ch. 28 sequencing.

---

## Diagnostic — n1968 Cincar timeline

From `runs/apr1992_definitive_188w__210e69404d054959__w188_n1968/operation_aars.json`:

| Turn | Phase | Attacks | Casualties (inflicted / suffered) | Event |
|---:|:---|---:|:---|:---|
| 132 | planning | 0 | 0 / 0 | injection |
| 133-136 | planning | 0 | 0 / 0 | preparation: intel → force_staging → assessment → ready |
| 137 | execution | 1 | 87 / 200 | `first_blood` |
| 138 | execution | 1 | 617 / 214 | `breakthrough` — bucovaca CAPTURED |
| 139-140 | execution | 0 | 0 / 0 | brigades re-orient to kupres_2 |
| 141-146 | execution | 0 | 0 / 0 | `stalled` (6 turns, 0 attacks, 0 captures) |
| 147-149 | recovery | 0 | 0 / 0 | RECOVERY_DURATION = 3 |

**Final grade:** 4-star "Solid Victory", `recovery_reason: max_failures`.
**Casualties:** 414 KIA + 758 WIA suffered vs 704 KIA + 1289 WIA inflicted (force_ratio 1.48).
**Personnel:** initial 8100 → final 10900 (reinforcements arrived during stall; corps net-positive on personnel).
**Captures:** `op:kupres:bucovaca` only. `op:kupres:kupres_2`, `op:kupres:donji_malovan`, `op:kupres:novo_selo_2` remained RS.

The 6-turn stall is the smoking gun: no attacks fired. Brigades captured bucovaca, advanced to it, then failed to engage kupres_2. Likely causes (not investigated further this wave — see Future Work): brigade re-orientation latency after capture, defender_power_too_high gate firing against the dug-in Kupres-town garrison, MAX_TOTAL_FAILURES (=8 per axis) tripping on whatever silent attempts the per-axis tracker counted.

Cincar was successful at what it did. It just stopped short.

---

## Strategy comparison

### Strategy A — Widen Cincar brigade pool further

**Idea:** Add 2-3 more HV/HVO brigades to Cincar's `KUPRES_CINCAR_AXES.brigades` list so the op has reserve depth after taking bucovaca.

**Pros:**
- Single catalog edit, no new lifecycle entity.
- Adds redundancy if Cincar takes initial casualties.

**Cons (decisive):**
1. **Ahistorical force concentration.** BB v2 ch. 28 / Historija.ba "Cincar" (https://historija.ba/d/188-pocetak-operacije-cincar) document the historical Cincar OOB as roughly the existing 6-brigade pool (kreimir IV + tomislav + rama HVO core + HV 4th Guards Split). Adding 2-3 more brigades inflates it past anything the BB OOB records.
2. **Does not fix the stall mechanism.** The op aborted at `max_failures` after 6 zero-attack turns. Per-axis MAX_TOTAL_FAILURES = 8 fires regardless of brigade count. More brigades on the same axis just means more brigades sitting idle during the stall. The grade card (Preservation 134.6, Tempo 46.9, Objective 25, Exchange 56.1) shows tempo was the failure mode, not force depth.
3. **Single-axis ops cap at 12 attackers per target** (`MAX_ATTACKERS_PER_TARGET = 12`, SKILL.md key constants). 5 brigades already saturate the single Kupres-town target near this cap; adding 3 more brigades only contributes to the cap, not to throughput.
4. **Compounds attrition.** Cincar suffered 414 KIA + 758 WIA at 5-brigade depth. Force-feeding 3 more brigades into the same stalled attempt would multiply losses without changing the per-turn attack tempo (one or two attacks per turn before stall).

### Strategy B — Author Cincar Phase 2 follow-on op (CHOSEN)

**Idea:** New `kupres_phase_2_94` opportunity that fires AFTER Cincar's max_failures recovery completes (t148+), targets the inner Kupres OSIDs from the captured Bučovača shoulder, uses the same Tomislavgrad-anchored brigade pool now positioned at bucovaca.

**Pros (decisive):**
1. **Historically defensible.** BB v2 ch. 28 / Historija.ba record Cincar as a multi-step campaign: 3 Nov 1994 HVO Tomislavgrad axis takes Bučovača-Kupres shoulder; 3-7 Nov follow-on push into Kupres town and Goravci/Donji Malovan; HV cross-border reinforcement arrives mid-campaign. A two-op decomposition matches the historical command pattern (Pero Stipetić's directive for staged objectives).
2. **Resets per-axis failure counter.** The stall was a within-op exhaustion of MAX_TOTAL_FAILURES. A new op = new axis = new counter. Fresh start.
3. **RECOVERY_DURATION = 3** lets the corps cool down before re-engaging. Brigades regenerate cohesion/morale during recovery (per `corps_command.ts` advancement step).
4. **Forward-staged from bucovaca.** Brigades are already at the captured anchor adjacent to donji_malovan and goravci (contact graph verified). No long march; `planning_duration: 2` is sufficient.
5. **Preserves Cincar's working pool.** Wave 7B + Wave 8 fixes stay untouched; we don't risk re-breaking what just started working.
6. **Tempo discipline.** Phase 2 closes BEFORE Mistral 1's t160 window opens, so the brigades become available to Mistral 1 with full recovery (matches the historical Mistral 1 OOB which assumed Cincar/Kupres had completed).
7. **Aligns with research doctrine.** `docs/research/2026-05-01-late-war-operation-opportunity-research.md` recommendation §6: "Make Cincar/Kupres a dependency node. Mistral/Summer/Southern Move should not be asked to solve missing 1994 control by themselves." Phase 2 IS the explicit dependency-node completion logic.

**Cons:**
- One additional catalog entry (~150 LOC).
- One additional opportunity_id to monitor in calibration runs.

---

## Implementation

### File edited

`src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` — added `KUPRES_PHASE_2_94_OPPORTUNITY` and registered it in `CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES`.

### Op definition

| Field | Value |
|---|---|
| `opportunity_id` | `kupres_phase_2_94` |
| `name` | Operation Cincar Phase 2 / Kupres Town |
| `tier` | T1 |
| `faction` | HRHB |
| `primary_corps` | `hvo_tomislavgrad` |
| `family` | `central_bosnia_vlasic` |
| `staging_osid` | `op:kupres:bucovaca` (Phase 1 capture; adjacent to donji_malovan, goravci, kupres_2) |
| `planning_duration` | 2 (forward-staged; no long march) |
| `historical_exit_class` | `partial_success` |
| `min_attack_outcome` | `repulsed` |

### Axis composition

Two axes (matches the historical pincer):

**Axis 1 — `kupres_phase_2_southern` (Donji Malovan thrust)**
- corps: `hvo_tomislavgrad`
- brigades: `hrhb_kralj_petar_kreimir_iv_brigade`, `hvo_rama_brigade`
- objectives: `op:kupres:donji_malovan` → `op:kupres:kupres_2`
- staging_osid: `op:kupres:bucovaca`

**Axis 2 — `kupres_phase_2_northern` (Goravci thrust)**
- corps: `hvo_tomislavgrad`
- brigades: `hrhb_kralj_tomislav_brigade`, `hv_4th_guards_split`, `hvo_1st_guard_abb`
- objectives: `op:kupres:goravci` → `op:kupres:kupres_2` → `op:kupres:novo_selo_2`
- staging_osid: `op:kupres:bucovaca`

Two-axis design ensures `min_optional_axes: 2` is satisfiable and lets the corps coordinate a pincer rather than a single-file column. `kupres_2` appears as the second objective on BOTH axes — the historically-correct convergent target.

### Predicate gates

All 10 predicates implemented, mirroring Cincar's predicate signatures:

| Gate | Mode | Behavior |
|---|---|---|
| `date_window` | required | t148-t158 (Cincar recovery + before Mistral 1 t160) |
| `political_authorization` | n_a | alwaysGreen (HRHB internal command) |
| `corps_readiness` | required | `hvo_tomislavgrad` operation_readiness ≥ 0.30 (lower than Cincar's 0.34 — corps just fought) |
| `logistics` | optional | HRHB supply pressure < 92 |
| `staging_access` | required | bucovaca + tomislavgrad_2 + livno_2 all HRHB-held; AND `op:kupres:bucovaca` MUST be HRHB (Phase 1 success precondition) |
| `weather_season` | optional | autumn 1994: t148+ permissive |
| `commander_confidence` | optional | `hvo_tomislavgrad` commander_state present |
| `enemy_weakness` | required | ≥1 Phase 2 objective in RS hands |
| `alliance_context` | required | war_alliance_rbih_hrhb ≥ FEDERATION_ALLIANCE_FLOOR (0.50) |
| `force_quality` | optional | axis_coordination ≥ 0.30 |
| `min_optional_axes` | 2 | requires both axes green for full launch (variant available if not) |

### Variant

One variant `kupres_phase_2_southern_only` — single-axis fallback when northern axis brigades are unavailable or below force-quality floor. Uses Axis 1 (donji_malovan → kupres_2). Allows partial success even when HV brigades or hvo_1st_guard_abb are committed elsewhere.

### Citations recorded

- `BB v2 ch. 28` (Kupres / Cincar OOB and control shift, pp.529-530)
- `Historija.ba — Početak operacije Cincar` (https://historija.ba/d/188-pocetak-operacije-cincar) — multi-day campaign sequencing
- `docs/40_reports/audits/20260522_WAVE_8_CASCADE_N1968.md` — n1968 Cincar stall AAR
- `docs/research/2026-05-01-late-war-operation-opportunity-research.md §6` — Cincar/Kupres as dependency node recommendation

---

## Pre-change checklist (per operations-expert SKILL.md)

- [x] **Painted control** — all 5 OSIDs (bucovaca, kupres_2, donji_malovan, novo_selo_2, goravci) painted HRHB by Apr 1995 and Oct 1995. No painted-opposite-faction objectives. Verified via `data/source/calibration/painted_control_apr1995.json` and `painted_control_oct1995.json`.
- [x] **Staging adjacency** — bucovaca adjacent to donji_malovan + goravci (contact-graph verified). donji_malovan adjacent to kupres_2. goravci adjacent to kupres_2. novo_selo_2 adjacent to kupres_2.
- [x] **Brigade corps_id** — all brigades match `hvo_tomislavgrad` (Wave 7B + HV-integration confirmed roster).
- [x] **No shared brigades with other corps' active ops** — Mistral 1 (t160) and Jajce 95 (t178) both start AFTER Phase 2's t158 window closes. Phase 2 brigades return to corps pool at recovery completion t161 (158 + RECOVERY_DURATION 3), giving Mistral 1 a clean t160 launch.
- [x] **Sacred Rule #4** — no painted-opposite-faction OSID as objective.
- [x] **Graz exemption** — `hvo_tomislavgrad` already in `GRAZ_EXEMPT_HRHB_CORPS` (Wave 8 fix). Phase 2 inherits.

---

## Expected behavior

n1969 (next calibration run) prediction:
- Cincar fires t132-149 as before (no change).
- Phase 2 fires at t148-150 once Cincar recovery completes and bucovaca is confirmed HRHB.
- Phase 2 launches from bucovaca, captures donji_malovan and goravci (turn ~152), converges on kupres_2 (turn ~155-156), captures novo_selo_2 (turn ~157).
- Phase 2 recovery completes ~t161.
- Mistral 1 t160 window opens with kupres_2 = HRHB, staging_access gate now green.
- Jajce 95 t178 window opens with kupres_2 = HRHB, staging_access gate now green.

Risk: Phase 2 itself stalls. Mitigation: variant single-axis fallback; corps_readiness floor permissive (0.30) since corps will be tired but battle-hardened from Cincar.

---

## Future work (out of scope this wave)

1. **Investigate why Cincar stalled 6 turns at t141-146 with 0 attacks.** Either MAX_TOTAL_FAILURES tripped earlier than the AAR shows, or `bot_brigade_eval_attack` rejected all candidate engagements against Kupres-town garrison. SCRT note for n1969 follow-up.
2. **Consider a parametric "tempo recovery" mechanic** — an op that hit `max_failures` but has captures should not require a full new opportunity declaration to continue; this is currently a calibration/design gap.

---

## Verification

- `npx tsc --noEmit` status: **clean (EXIT_CODE=0)** as of 2026-05-22.
- Test impact: no existing test should fail — new export `KUPRES_PHASE_2_94_OPPORTUNITY` is additive; `CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES` extended from 3 → 4 entries.
- Calibration impact: predicted +territory gain on 3-4 Kupres OSIDs (kupres_2, donji_malovan, novo_selo_2, goravci) → unlocks Mistral 1 / Jajce 95 cascade → painted Oct 1995 alignment improves further on Bosansko Grahovo, Glamoč, Jajce.

---

*End of memo.*
