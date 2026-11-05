# Change specification — Donji Vakuf early sequence (2026-09-17)

Recorded **before** any edit, per the packet. Format:
affected field/definition → old premise → supporting evidence → proposed configuration → expected direct effect.

The measured comparison is **n403 at `41a148bf9`: jan1993 701/712, eleven mismatches**. The January
minimum stays 700. The `jan1993` reference is **not touched** by this packet.

---

## 0. Mechanism inventory — what is actually wired

Established by `node tools/hooks/whowrites.mjs political_controllers` plus call-site checks, not by
inference. In the production turn pipeline, political control is written by:

| writer | wired? | usable here? |
|---|---|---|
| `attack_resolution_osid.ts` (battle) | **yes** | only through a `CorpsOperation`; the 1KK has ONE sequential pre-planned slot, occupied by Op Prijedor (w1–w5) then Op Corridor (w6–w18) then Op Jajce (w19–w29) — so no April–September 1992 Donji Vakuf operation can be scheduled without displacing the Corridor. That displacement is the recorded `n1145` regression (DV moved to queue position 2, stalled 23 turns, blocked Corridor, cascaded; reverted). |
| `sector_offensive.ts` | yes | same `CorpsOperation` constraint |
| `jna_phantom_brigades.ts` `capture_osids` | **yes** (`phantom-brigade-spawn` per-turn step honours `spawn_turn`) | writes `political_controllers[osid] = faction` **unconditionally**. Using it would (a) guarantee an outcome on a date, which this packet forbids, and (b) require inventing a formation to stand for a police takeover, which this packet also forbids. The only existing 1KK phantom (`jna_2nd_md_tg`) spawns at t0, i.e. 6 April — before the 17 April takeover. **Rejected.** |
| `paramilitary_sweep.ts` rear-pocket mode | yes | requires a fully-surrounded enemy pocket. `donji_vakuf_2` has 5 of 7 neighbours RS at t0, not 7 of 7. `torlakovac_2` only becomes surrounded after Jajce's `vinac_2` falls at t28, past `PARAMILITARY_FADE_WEEK = 20`. **Not applicable.** |
| `paramilitary_sweep.ts` **offensive** mode | **NO — dead** | `detectOffensiveParamilitaryTargets` has **no call site in `src/`** (only `tests/`). `SPATIAL_CONTEXT_DESIGN_SPEC.md` lists an `offensive-paramilitary-detect` pipeline step that does not exist in `war_phases.ts`. Adding `donji_vakuf` to `OFFENSIVE_PARA_MUNICIPALITY_SCOPE` would change nothing; wiring the step in would be a new mechanic with repo-wide blast radius (see `20260405_RASTOSNICA_DRINA_COUPLING_RESOLUTION.md`). **Out of scope.** |
| `early_war/control_flip.ts` | **NO — dead** | the `early-control-flip` pipeline step is stubbed: *"Canonical path: Peace phase no longer performs control flips"* — it writes an empty report and never calls `runControlFlip`. **Out of scope.** |
| `rear_pocket_consolidation.ts` | no | Systems Manual: retains its historical hook, "not in the production pipeline" |
| **`events/apply_effects.ts` `applyControlChange`** | **yes** | *"Flip OSID control to a faction. Used for barracks seizures, territorial events."* Emits a proper `ControlEvent` with `mechanism: 'event'`. Contingency lives in the event trigger. **This is the path used.** |

**Precedent for the chosen path** (all three existing `control_change` events carry a dated window plus a
substantive predicate — none is calendar-only):

- `battle_of_the_barracks_tuzla` — `turn_min 6 / turn_max 7`, `faction_controls_municipality RBiH tuzla 0.3` → flips `op:tuzla:simin_han_2`. A 1992 institutional/barracks seizure: the same class of event as the Donji Vakuf SJB takeover.
- `srebrenica_falls_1995` — flags + `territory_control`.
- `zepa_falls_1995` — `requires_events` + `territory_control`.

R6's completion criterion is that *calendar/weak-predicate events cannot manufacture control*. Every row
below carries a substantive control predicate, and rows 2 and 3 additionally require row 1 to have fired.

---

## 1. Stated limitation — the scalar aggregate cannot carry the town's own date

`op:donji_vakuf:donji_vakuf_2` is a single scalar controller covering **six** settlements: Blagaj,
**Donji Vakuf**, Ponjavići, Rastičevo, Rudina, Vlađevići.

The 17 April 1992 finding is specific to the **town**. There is no settlement-level evidence placing
Blagaj, Ponjavići, Rastičevo, Rudina or Vlađevići under Serb control on that date. Firing the cell at
turn 2 would grant five settlements roughly four months of unsupported territory — which the packet
forbids and which the evidence does not carry.

**Resolution adopted:** the cell flips at the **opening of the documented municipality-wide window**, not
on the town's own date — `turn_min 5` (week of 5–11 May 1992), covering the 6 May general Serb
mobilisation and the 7 May flag-raising on the municipality building, and opening the "between May and
September 1992" period in which the Chamber found the 19th Infantry Brigade and Serb police took the
territory of Donji Vakuf. **The town's true 17 April date is therefore still not represented exactly; the
aggregate cannot represent it without over-granting.** This is a recorded residual, not a fix.

Cell splitting is outside this packet, so no operational-cell change is proposed.

---

## 2. The changes

### 2.1 `data/scenarios/events/war_1992.json` — three new rows (additive)

`war_1992.json` is already in `EVENT_FILES`; no loader change, no new mechanic, no new effect kind.

| # | affected definition | old premise | supporting evidence | proposed configuration | expected direct effect |
|---|---|---|---|---|---|
| 1 | new event `donji_vakuf_serb_takeover_1992` | the town's first takeover is the 4th objective of a post-Jajce sweep, resolved by combat at **t35 = 1992-12-07** | Stanišić & Župljanin TJ Vol I **¶238** ("The Serb SJB of Donji Vakuf was set up on 17 April 1992 and took control of the entire town the same day"); **¶239** (6 May general Serb mobilisation, 7 May flag on the municipality building); **¶242** ("Between May and September 1992, the 19th Infantry Brigade of the VRS and Serb police, fighting together, took control of the territory of Donji Vakuf"); Krajišnik TJ **¶438–439** (same findings, same underlying SJB record) | `turn_min 5`, `turn_max 25`, `phase: war`, `once: true`; condition `faction_controls_municipality RS donji_vakuf 0.5`; effect `control_change RS ["op:donji_vakuf:donji_vakuf_2"]`; `sets_flags.donji_vakuf_serb_sjb_control = true` | the town cell becomes RS in **early May 1992** instead of December 1992, through `mechanism: 'event'`, only if RS in fact holds half the municipality |
| 2 | new event `donji_vakuf_korenici_1992` | Korenići is the 5th objective of the same November sweep, taken by `rs_16th_krajina_motorized` at **t38 = 1992-12-28** after three strikes | Stanišić TJ **¶242**: "On 21 May 1992, 18 members of the Serb police in Donji Vakuf and 12 members of the Banja Luka CSB attacked the village of Korenići. Jovan Šatara … stated that '[t]here was no great resistance by Muslim extremists'." | `turn_min 7` (21 May 1992 falls in turn 7), `turn_max 25`, `requires_events: [donji_vakuf_serb_takeover_1992]`; condition `territory_control op:donji_vakuf:donji_vakuf_2 = RS`; effect `control_change RS ["op:donji_vakuf:korenici"]` | Korenići flips in **late May 1992**, after and only after the town, matching the documented causal order |
| 3 | new event `donji_vakuf_torlakovac_1992` | Torlakovac is the 1st objective of the same November sweep, taken at **t31 = 1992-11-09** | Stanišić TJ **¶242**: "On 3 June 1992, the village of Torlakovac was attacked by Serb police and the VRS; Jovan Šatara reported … that 'no serious resistance' was put up by the Muslim villagers who fled." Same cell also contains **Doganovci** (¶242, late summer 1992, armed Serb formation opened fire, houses burned, no armed resistance) and **Sokolina** (¶249, mosque set on fire June 1992) | `turn_min 9` (3 June 1992 falls in turn 9), `turn_max 25`, `requires_events: [donji_vakuf_serb_takeover_1992]`; condition `territory_control op:donji_vakuf:donji_vakuf_2 = RS`; effect `control_change RS ["op:donji_vakuf:torlakovac_2"]` | Torlakovac flips in **early June 1992** |

**Deliberately NOT included: `op:donji_vakuf:prusac_2`.** The only dated action is the **failed** attack of
17 August 1992 — Stanišić TJ ¶242: "Prusac village was attacked by 56 Serb policemen and a number of RS
soldiers, but **by nightfall, after hand-to-hand combat, the Serbs had to return to their original
positions**." Corroborated by Brđanin transcript 3 March 2003 pp. 15031–15034 and Exhibit **P1757** (RS MUP
Srbobran, 4 October 1993): "the operation was not successful because of poor command and preparation."
No Serb control of Prusac in 1992 is established. **No event grants it.**

`op:donji_vakuf:oborci_2` is also not included: its 1992 evidence is indirect (the Oborci elementary school
as a detention centre, Krajišnik ¶441 [C12.6]; the Šeherdžik mosque destroyed 9 August 1992, Stanišić
¶249) and does not date a control change. It stays an operation objective.

### 2.2 `src/sim/combat/pre_planned_operations.ts` — one objective removed

| affected definition | old premise | supporting evidence | proposed configuration | expected direct effect |
|---|---|---|---|---|
| `Operation Donji Vakuf`, axis `donji_vakuf_sweep`, objective list (`:1047-1056`) | the town is conquered as the 4th objective of a post-Jajce sweep | BB2 p.330 (the town was the **Serb springboard** for the Vrbas 92 southern axis), BB2 p.465 (Serb-held from early 1992), BB2 p.332 (the 1KK halted 18 November 1992), Stanišić ¶238 | remove `'op:donji_vakuf:donji_vakuf_2'` from the chain; keep the other five | the operation can no longer assert a November/December conquest of the town |

**Structurally safe, verified on the contact graph:** staging `op:sipovo:pribeljci_2` stays adjacent to the
first objective `torlakovac_2`; consecutive-objective adjacency was already not required by this operation
(`korenici → prusac_2` is non-adjacent today and routes through RS-held Jemanlići); and by w30 the removed
cell is RS-held, so brigade traversal through it is unaffected.

**Korenići and Torlakovac stay in the objective list deliberately.** If their events fire, the operation
auto-advances past them exactly as it already does past `babin_potok_2` (RS at t0) — no false capture
occurs. If the events do not fire, the operation still resolves them, so this change cannot strand a cell.
Only `donji_vakuf_2` loses its fallback, which is why event 1 must be verified to fire.

### 2.3 Comment correction (documentation only)

The operation's authored comment cites "BB1 p.498" for the roster. That page is **Appendix G, "Skeleton
Bosnian Serb Army Order of Battle, July 1995"** (printed folio 461) — a 1995 table standing in for a 1992
deployment. Replaced with the period-correct citations (BB2 p.330 for the 19th at Donji Vakuf in 1992;
BB2 p.277–279 for the June 1992–October 1995 table) and the corrected framing.

---

## 3. What is NOT changed

Initial control (the town was legally RBiH on 6 April 1992 — the takeover is 11 days later, so t0 = RBiH
is **correct and stays**); any checkpoint reference including `jan1993` for `prusac_2`; attack multipliers,
combat values, reservation policy, probe behaviour; the 1KK queue order and Op Jajce's timing; operational-cell
geometry; OOB; baseline pins; preservation tags; `main`; `gh-pages`; the viewer.

---

## 4. Source independence

Krajišnik ¶438–439 (fn 986 = P758.F), Stanišić ¶238 (fn 580–581 = P1799) and Brđanin Exhibit **P1757** all
trace to the **same** document: the SJB Srbobran letter to the Banja Luka CSB of **4 October 1993**. They
are one documentary source carried by three judicial vehicles and are **not** counted as three independent
corroborations. Stanišić ¶242's village-level dates rest on a different record (Jovan Šatara's reports to
the Banja Luka CSB, and Adjudicated Facts 1154/1155 with P1929). Balkan Battlegrounds is used only for
wider campaign context; its silence on these villages is not evidence of absence.

The municipality-wide summary ("took control of the territory of Donji Vakuf") is the SJB's **own report**
and is contradicted at village level, within the same paragraph, by the failed 17 August Prusac attack.
The village-specific finding is preferred over the municipality-wide summary wherever they conflict.
