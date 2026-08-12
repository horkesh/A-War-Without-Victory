# Sarajevo-Romanija-Drina corridor mismatch triage — 2026-08-11

**Trigger:** User inspected a settlement-level turn-188 map (run `apr1992_definitive_188w__9e902ad68783fbe7__w188_n201`, matched 639/744, anchors 31/31) and flagged Goražde as visually too large, ARBiH cut-off islands near Srebrenica, and an RS cut-off island near Donji Vakuf.

**Method:** Cross-referenced engine `political_controllers` (turn 188, Nov 1995) against `data/source/calibration/painted_control_oct1995.json` (`by_settlement_id`) — the project's settlement-level ground truth, more granular than the 31 tracked sacred anchors. All mismatches below are new; none are on the tracked anchor list.

## Cluster 1 — Goražde enclave shape (5 mismatches, same municipality)

| osid | engine | painted (correct) |
|---|---|---|
| `op:gorazde:glamoc` | RS | RBiH |
| `op:gorazde:kamen` | RS | RBiH |
| `op:gorazde:podkozara_donja_2` | RBiH | RS |
| `op:gorazde:slatina_2` | RBiH | RS |
| `op:gorazde:ustipraca_2` | RBiH | RS |

`ustipraca_2` (Ustiprača) is the real chokepoint on the Goražde–Foča road; VRS held it the whole war, which is *why* Goražde was landlocked/airlift-dependent rather than land-linked. Engine gross count (14 RBiH/3 RS) is close to painted (13 RBiH/4 RS) but the *specific* settlements are swapped — the enclave's shape is wrong even though its size looks superficially right.

## Cluster 2 — Wider Sarajevo-Romanija-Drina belt (13 more mismatches, 5 municipalities)

Checked all municipalities adjacent to Goražde: Foča, Čajniče, Rogatica, Višegrad (clean), Kalinovik, Trnovo, Pale.

| osid | engine | painted (correct) |
|---|---|---|
| `op:foca:brusna_2` | RBiH | RS |
| `op:foca:mazlina` | RBiH | RS |
| `op:cajnice:batotici` | RBiH | RS |
| `op:cajnice:miljeno_2` | RBiH | RS |
| `op:cajnice:todorovici` | RBiH | RS |
| `op:rogatica:brcigovo` | RBiH | RS |
| `op:kalinovik:golubici_2` | RS | RBiH |
| `op:trnovo:delijas` | RBiH | RS |
| `op:trnovo:gornja_presjenica` | RS | RBiH |
| `op:trnovo:kijevo_2` | RBiH | RS |
| `op:trnovo:trnovo` | RBiH | RS |
| `op:pale:podgrab` | RBiH | RS |
| `op:pale:praca` | RBiH | RS |

Municipality totals at turn 188 (engine): Goražde 14 RBiH/17, Foča 2 RBiH/14, Čajniče 3 RBiH/5, Rogatica 1 RBiH/8, Kalinovik 0 RBiH/7, Trnovo 4 RBiH/6, Pale 2 RBiH/8.

**User's hypothesis (stated directly):** this may form a contiguous ARBiH wedge severing RS's Sarajevo-Romanija bloc (Pale — RS's real wartime capital) from its Podrinje/Herzegovina bloc (Foča → Trebinje). Pale and most of Čajniče/Foča have essentially no documented ARBiH presence at any point in the war — this reads as a genuine corridor-integrity breach, not a shape nuance. Trnovo is the one municipality where ARBiH *did* hold ground at points historically (Trnovo/Igman/Bjelašnica fighting), so `op:trnovo:trnovo` needs individual historian scrutiny rather than bulk-fixing with the rest.

**scenario-creator-runner-tester verdict:** RS contiguity through Pale-Rogatica-Čajniče-Foča was never broken historically — Pale held as VRS's capital the entire war, Foča/Čajniče secured by VRS in spring 1992 and held to Dayton. Flagged for Historian sign-off before any fix is scoped, given the scale (18 settlements, 6 municipalities).

## Cluster 3 — Srebrenica/Bratunac ARBiH holdouts that should have fallen (post 11 July 1995)

| osid | engine | painted (correct) |
|---|---|---|
| `op:srebrenica:osmace_2` | RBiH | RS |
| `op:bratunac:pobudje_2` | RBiH | RS |

ICTY (Krstić/Blagojević) record is unambiguous: VRS achieved complete territorial and population control of the Srebrenica enclave by 18 July 1995. No historical basis for either holdout.

## Cluster 4 — Donji Vakuf RS holdout that should have fallen (Sept 1995)

| osid | engine | painted (correct) |
|---|---|---|
| `op:donji_vakuf:oborci_2` | RS | RBiH |

Donji Vakuf town fell 8–15 September 1995 (ARBiH 7th Corps on the HV/HVO Operation Mistral 2 flank). Mirror-image of Cluster 3 — a holdout that should have gone with the rest of the municipality.

## Deep dive: Trnovo corridor (root-caused)

User correction (2026-08-11): "Trnovo was held by RBiH until July 1993 when VRS launched an offensive that took it and severed Goražde from main RBiH territory." Confirmed via WebSearch: **Operation Lukavac '93** — ARBiH militias briefly occupied Trnovo and cut RS's own Herzegovina↔rest-of-RS link; VRS retook Trnovo 10–11 July 1993, restoring RS contiguity and, as the flip side of the same event, converting Goražde into a land-isolated, airlift-dependent enclave for the rest of the war.

**The engine already models this correctly by design** — `src/sim/combat/pre_planned_operations.ts:408-462`, "Operation Trnovo", VRS Sarajevo-Romanija Corps (SRK), explicit code comment citing Lukavac '93 (BB2 p.289), `available_from: 69` (~August 1993, matches), two axes (`rs_trnovo_brigade` → kijevo_2/delijas; `rs_1st_romanija_infantry` → trnovo town), queued to inject immediately after Operation Prsten completes (comment: "Prsten completes ~w9-10; Trnovo injects immediately after").

**What actually happened in run n201 (`operation_aars.json`):**
- Operation Prsten completed at **turn 5** (fast).
- Operation Trnovo did not inject until **turn 141** — a ~136-turn (2.6-year) scheduling delay past its intended ~w9-10 injection.
- When it finally injected, it never fired a single attack: `trnovo_east` axis (`rs_trnovo_brigade`) — `launch_blocker: "zero_eligible_axis"`, `total_attacks: 0`; `trnovo_town` axis (`rs_1st_romanija_infantry`) — `total_attacks: 0`. Ran for its full 19-turn window (t141→t160), `outcome: "failure"`, `verdict: "No Assault Attempted"`, `objectives_captured: []`.
- `brigade_temporal_log.jsonl` shows why: at injection (t141) `rs_trnovo_brigade` was already marginal (morale 58, cohesion 45, officer_quality 0.15) and both **morale and cohesion decay continuously while the op sits in `current_op_phase: "planning"`** (morale −2/turn: 58→56→54→52→50 over 5 sampled turns; cohesion ~−0.8/turn) — the op appears to never transition out of "planning" into an actual attack phase, so the brigade's fighting eligibility erodes to nothing before any assault is attempted.

**Correction (2026-08-11, user-flagged):** an earlier draft of this investigation mis-stated the intended firing date as "~week 9-10" by quoting a STALE comment (`triggered_operations.ts:1222`, "Trnovo (available_from:6) injects immediately after"). The actual, live field value in `pre_planned_operations.ts:439` is `available_from: 69` — correctly commented there as "historical Lukavac 93 = August 1993 (~w69)". The design intent is right (matches the user's July 1993 date closely); line 1222's comment is dead prose from an earlier version and should be fixed/removed as part of any real cleanup. See `docs/knowledge/HISTORICAL_OPERATIONS_CATALOGUE.md` for the full stale-comment note.

**This is not a fresh bug — it's the already-diagnosed EH-4 `dead_ops` finding, PARKED since 2026-06-11.** `docs/40_reports/proposals/20260611_eh4_dead_ops_diagnosis.md` already flagged "Trnovo t184 `op_empty`" as one of 32 dead-op instances in the June 188w baseline: at that time it fired even later (t184, vs t69 designed) and failed because `rs_trnovo_brigade` was missing and `rs_1st_romanija_infantry` inactive by then ("a stale trigger firing into a state where the force no longer exists"). That report explicitly scoped a fix ("FIX C — Trnovo-class roster-existence predicate"), rated it **riskiest**, and **parked it pending panel + §6 sign-off**, deferred post-D2, because Trnovo-class ops are floor-load-bearing and op-lifecycle changes have previously cost −39 matched_osids (EH-3).

**What this session adds beyond the June diagnosis:** in run n201, the failure signature is different from the June baseline — it injects earlier (t141, not t184) and fails differently (`zero_eligible_axis`/0 attacks with both brigades *present*, not missing/inactive). Same chronic lateness, different specific failure mode each time it's measured:
1. **Corps-queue injection delay** — the SRK queue comment ("Prsten completes ~w9-10; Trnovo injects immediately after") describes intent; actual injection didn't happen until t141 in this run (t184 in June's), ~70-115 turns after `available_from:69` was satisfied. Root cause of the delay itself (not just its failure mode) still not isolated — leading hypothesis is `hasNonCapturingObjectiveOverlap`/slot-0 occupancy (`pre_planned_operations.ts:911-918, 1122, 1152`) blocking the queue for a long but eventually-resolving reason; ruled out: player-authorization gating (`historical_operation_authorization.ts:61` — not_required, since RS isn't `player_faction` in this harness run).
2. **Stuck-in-planning phase eligibility decay** — once injected (t141), `rs_trnovo_brigade` sat in `current_op_phase: "planning"` for its full 19-turn window while morale (58→50) and cohesion (45→41) bled out continuously, never reaching an attack.
3. The prior TG-donor-exclusion mitigation (`triggered_operations.ts` ~line 1374-1376, added because an earlier smoke run showed the brigade "consumed/gone before injection") is still in place and did keep the brigade present this time (unlike June's t184 failure) — but presence alone wasn't enough; it arrived too degraded to fight.

**Disposition:** per this project's own EH-4 report and the Sacred Rules (one-change-per-188w-run, panel+§6 sign-off for op-lifecycle changes near enclave/§6 theaters), this is not a same-turn fix — it needs the Pyrrhic panel convened (Historian + scenario-tester/calibration + Engine + Red-team) before any code change, consistent with how EH-4 was already scoped in June. Not fixed this session; escalated with sharper evidence than the June diagnosis had.

## Pyrrhic panel convened 2026-08-11 — ROOT CAUSE FULLY CONFIRMED, THREE independent structural bugs

Four specialists (Historian, scenario-creator-runner-tester, operations-expert, gap-finder) ran in parallel; synthesized here by the integrator.

**Q1 root cause — CONFIRMED (operations-expert, HIGH confidence).** `rs_trnovo_brigade` does not exist at scenario init (`initial_save.json`: absent). It's a mandatory-mobilization OOB unit (`data/source/oob_brigades.json:3038`, `available_from:6`, `home_mun:"trnovo"`) that must spawn from its home municipality's manpower pool. Trnovo is majority-Bosniak with a tiny RS pool (`available:39` at init, vs `MIN_MANDATORY_SPAWN:100`), and the shared mobilization budget (`RS_MANDATORY_MOBILIZATION_PER_TURN:120/turn`, split across ALL pending mandatory RS brigades project-wide, `recruitment_turn.ts:257-290`) starves it until it finally crosses threshold ~turn 140. Every turn from t69 (`available_from` satisfied) to t140, `injectQueuedOperation` silently retries and fails on `participants_below_attack_floor` (only 1 of 2 required brigades exists) — no diagnostic trace, which is why this took a live trace to find. The op's own design comment ("both brigades home gornja_presjenica → eligible at injection, no march needed") is factually wrong for this brigade. Ruled out (confirmed dead ends): slot-0 occupancy, `hasNonCapturingObjectiveOverlap`, player-authorization gating.

**Q2 root cause — CONFIRMED (operations-expert, HIGH confidence), TWO separate axis failures, neither is a player-only execute predicate (gap-finder's conditional railroad flag is RESOLVED — not a railroad):**
- **East axis (`trnovo_east`) is structurally broken by design**, independent of brigade quality: its first objective `kijevo_2` is RS-painted-friendly (an un-attackable "waypoint" the design assumed would just strip away), and once skipped, the real target `delijas` is NOT adjacent to the staging OSID `gornja_presjenica` (confirmed against the op's own adjacency notes). There is no reachable enemy target — guaranteed `zero_eligible_axis` every time, regardless of when the brigade arrives.
- **Town axis (`trnovo_town`) is sound on paper** (staging IS adjacent to the real objective `trnovo` town) but its brigade, `rs_1st_romanija_infantry`, has physically drifted to `op:pale:gornje_pale` by the time the op runs (front-spreading/sector reassignment over 140 turns of war) — not at its assumed staging position, so it can't attack either.
- The 18-turn "planning" stall before abort is the preparation state machine (`operation_preparation.ts`) cycling and re-postponing because force-staging never reaches its 0.6 assembly threshold (1 of 2 brigades present) — not a special planning-phase penalty.
- The morale/cohesion death spiral (58→8, 45→15) is **ordinary ambient drift** (`morale_drift.ts`/`cohesion_drift.ts`) applying to any isolated, victoryless brigade — not a planning-specific decay mechanism. `rs_trnovo_brigade` is abandoned at staging after the op aborts and **dissolves at turn 174 having fought zero battles** (`destroyed_brigades.json`).

**Historian constraint (bright line, MUST hold for any fix):** the 3-objective capture (trnovo, delijas, kijevo_2) is historically sound (BB2 pp.391-392, Mladić memoir BB2 pp.398-399) and even *incomplete* — the real Lukavac '93 also took a Sabići/Dejčići village cluster and opened the Jabuka-Grebak/Osanica corridor to Goražde, which could be added for extra fidelity if matching OSIDs exist. But Lukavac '93 was two-phase: Phase 2 (VRS push onto the Igman/Bjelašnica massif toward Sarajevo) was **reverted** under NATO pressure by 15 August 1993, and the NW Igman/Bjelašnica plateau (Veliko Polje/Malo Polje/Olympic ski-jump area) stayed ARBiH to Dayton. **A fix must never flip any Igman/Bjelašnica-massif OSID or become a municipality-wide sweep.** Pale's `praca`/`podgrab` are confirmed correctly excluded (separate, earlier-1992 mechanism, unrelated to this op).

**Gap-finder verdict:** the injection delay is emergent (fires at a *different* turn in every measured baseline — t184 in June, t141 in August — a hardcoded gate would fire at a fixed turn). Not a railroad. Recommends proceeding to fix; explicit constraint: **the remedy must be emergent-restoring (make the op able to fire correctly), never a hardcoded force-flip of the 3 osids** — that would itself become the railroad this project's Sacred Rules forbid.

**Scenario-tester gate for any fix (unconditional, all required for GO):** fresh clean 188w baseline off branch head immediately before change; one-change-per-run (the 3 bugs below may be bundled ONLY if each is validated with a full non-net `anchor_checks` diff, not count deltas); all 31/31 anchors held; §6 intact; 40w structural fingerprint byte-flat (op must not leak into early-war); full 188-week trajectory diff for collateral flips in Foča/Kalinovik/Pale/Rogatica; automatic NO-GO if any Igman/Bjelašnica OSID flips to RS.

**Open tension flagged by the integrator, not yet resolved by the panel:** per Cluster 2 above, `op:trnovo:gornja_presjenica` — the op's own `staging_osid`, currently RS in the engine — is itself one of the 4 "RS-in-engine-but-painted-RBiH" mismatches (painted truth says it should be RBiH). If that's right, the op's foundational assumption ("stage safely from RS-held gornja_presjenica, no march needed") may itself be historically inverted, which would compound with operations-expert's east-axis finding rather than being independent of it. This lines up with the Historian's note that the historical main effort came from the south (Kalinovik/Herzegovina Corps) with SRK running only a supporting attack from the north — the northern staging premise may be the weaker half of the design to begin with. Needs a dedicated check (adjacency + painted-control re-verification for gornja_presjenica specifically) before finalizing the east-axis fix, since restaging from a osid that itself shouldn't be RS-safe would just move the bug rather than fix it.

**Integrator's synthesis — THREE independent, separately-fixable structural bugs, not one:**
1. Mobilization-pool starvation delaying `rs_trnovo_brigade` spawn to ~t140 (systemic — touches shared RS mobilization economy, highest cascade risk).
2. East-axis objective/staging design flaw — drop the `kijevo_2` friendly waypoint, restage from an RS-controlled OSID actually adjacent to `delijas` (surgical — touches only this op's definition, lowest risk).
3. Town-axis brigade-position mismatch — `rs_1st_romanija_infantry` not at assumed staging; needs investigation into whether its drift to `gornje_pale` is itself legitimate/emergent or a separate bug, then either pin its deployment or add an approach leg (moderate risk, scoped to one brigade's behavior).

**Recommended fix order (risk-ascending, one-change-per-188w each):** (2) east-axis restructure → (3) town-axis position reconciliation → (1) mobilization economy, last and only if 2+3 don't already close enough of the gap to justify the broader cascade risk. Not yet implemented — this is the panel's scoping output, pending a decision on whether to proceed to implementation this session.

**Effect on Goražde enclave shape:** because Operation Trnovo never captures `trnovo:trnovo`, `trnovo:delijas`, `trnovo:kijevo_2`, RBiH retains a paper-thin but *contiguous* claim along the corridor these bugs leave open, which is what reads as "Goražde enclave reaching toward the Serbian border and cutting RS in two" — not a Goražde-municipality sizing issue at all, but a missing corridor-severing operation one municipality further north.

## Other Goražde-cluster items NOT yet root-caused (separate from Trnovo)

- `op:gorazde:podkozara_donja_2`: started RS (init, matches painted, also used as `staging_osid` for "Operation Zvezda 94"), flipped to RBiH during the run with **zero logged battles** — a non-combat flip mechanism, undiagnosed. Worth checking whether this also stranded Zvezda 94 (which stages from this osid).
- `op:gorazde:glamoc`, `op:gorazde:kamen`: RS since turn 0, painted RBiH, **no operation in the catalog targets them at all** (not found in any objectives list). Either the census-level init_control for these two specific hamlets is wrong, or a currently-missing RBiH-side operation should be capturing/holding them. Not yet distinguished.
- `op:gorazde:slatina_2`, `op:gorazde:ustipraca_2`: RBiH since turn 0 (painted RS). `ustipraca_2` is listed as an objective of "Operation Pracha River" (available_from 41) alongside `rogatica:brcigovo`; the AAR/battle log shows Pracha River fought for `brcigovo` three times (w43-45) and lost every time (`DEF WON` — RBiH held), which likely stalled the op before it ever reached `ustipraca_2` (0 battles logged there) — same op, sequential-objective-blocking pattern, distinct from Trnovo's failure mode.
- Foça (`brusna_2`, `mazlina`), Čajniče (all 3), Pale (`podgrab`, `praca`): all RBiH since turn 0, zero battles ever, painted RS. **Confirmed 2026-08-11**: `op:foca:brusna_2` and `op:foca:mazlina` appear in ZERO objective lists anywhere in `src/` (repo-wide grep) — genuinely orphaned, not a case of an existing op with an incomplete list. "Operation Foca" itself ran to completion in run n201 (t8-t16, `outcome: "partial"`, 3-star, `recovery_reason: "max_failures"`) but its only Goražde-adjacent objective is `op:gorazde:kolovarice`, which it attacked once and failed to capture — and that failure is actually the CORRECT outcome (kolovarice ends RBiH, matching painted truth; likewise its `patkovina`/`prevrac` objectives end RS, also correct). **Operation Foca's "partial" grade does not correspond to any calibration mismatch** — it is not the source of the brusna_2/mazlina/Čajniče/Pale gaps. Those remain unexplained: no operation anywhere claims them.

## Status

23 total settlement-level mismatches found, all previously invisible to the 31-anchor tracked list. **Trnovo corridor cluster (3 osids) is now root-caused to two specific engine bugs** (queue-injection delay + stuck-in-planning eligibility decay) in `Operation Trnovo`/SRK. Remaining ~20 mismatches (Goražde's other 4, Foça, Čajniče, Rogatica, Pale, Srebrenica/Bratunac holdouts, Donji Vakuf holdout) are triaged into likely bug classes but not individually root-caused. Nothing fixed yet — awaiting direction on fix order (one-change-per-run).

## CORRECTION 2026-08-12 — panel bugs (2) and (3) REFUTED by the run artifacts; operative blocker is elsewhere

Re-derived from run n201's own artifacts + source before implementing the panel's recommended fix order. Two of the panel's three bugs do not survive contact with the evidence.

**Panel bug (2) — "east axis structurally broken: kijevo_2 is a friendly waypoint that strips, leaving non-adjacent delijas" — REFUTED.** The AAR records `trnovo_east.objectives_targeted = [op:trnovo:kijevo_2, op:trnovo:delijas]` with `kijevo_2` still at index 0. It was never stripped, because it is not friendly: engine live control of `op:trnovo:kijevo_2` is **RBiH at init and RBiH at turn 188**. The panel read *painted* control (RS) as if it were live control. `kijevo_2` is an enemy-held OSID directly adjacent to the staging OSID (`operational_contact_graph.json`: gornja_presjenica adj kijevo_2 = true), i.e. a perfectly valid first objective. The axis's objective chain is sound; nothing about it guarantees `zero_eligible_axis`.

Painted control is also snapshot-dependent, which is what trapped the panel — the four snapshots disagree because the ground genuinely changed hands in July 1993 (Lukavac 93):

| osid | jan1993 | apr1994 | apr1995 | oct1995 | engine init | engine t188 |
|---|---|---|---|---|---|---|
| kijevo_2 | RS | RS | RS | RS | RBiH | RBiH |
| delijas | RBiH | RS | RS | RS | RBiH | RBiH |
| trnovo | RBiH | RS | RS | RS | RBiH | RBiH |
| gornja_presjenica | RS | RS | RBiH | RBiH | RS | RS |

**Panel bug (3) — "town-axis brigade drifted to gornje_pale and was not at staging" — REFUTED as stated.** `brigade_temporal_log.jsonl` shows `rs_1st_romanija_infantry` at `op:pale:gornje_pale` for t135-t144, then **arriving at `op:trnovo:gornja_presjenica` at t145** and remaining there through t156+. It was at its correct staging OSID, adjacent to its objective (`trnovo` town), for 12+ turns of the 19-turn window, and still never attacked. Drift was real but self-correcting; it is not the reason the axis failed.

**Panel bug (1) — mobilization starvation — STANDS.** `rs_trnovo_brigade` (OOB `available_from:6`, `initial_personnel:500`, `initial_officer_quality:0.15`, home `gornja_presjenica`) first appears in the temporal log at t140, which is why the op injected at t141 rather than at its `available_from:69`. Unchanged from the panel's finding.

**`zero_eligible_axis` is an ATTACKER-side blocker, not an objective-chain blocker.** `sector_offensive_launch_helpers.ts:908-918` emits it when `axisHasExecutableOpeningAttack` returns false, which requires a brigade that is active, `personnel >= MIN_ATTACK_PERSONNEL` (=500, `formation_constants.ts:82`), undisrupted, **physically adjacent to the objective**, and predicting an outcome at or above threshold. Staging-adjacency failures are the *separate* `no_approach_osid` blocker (line 858-862). `rs_trnovo_brigade` sat AT staging (adjacent to kijevo_2) with exactly 500 personnel — it cleared position and floor, so the only remaining failing term is the **predicted outcome**: a 500-man mountain brigade at officer_quality 0.15, morale 58->8, cohesion 45->32 cannot predict better than catastrophic against the RBiH defender.

**The operative blocker (new finding, supersedes panel bug 2 as the fix target): `evaluateOpeningAttackReadiness` conflates "still marching" with "present but too weak."** At `sector_offensive_launch_helpers.ts:1013-1028`:

```ts
if (result.blocker === 'zero_eligible_axis') anyApproaching = true;
...
if (anyExecutable && !anyApproaching) return { executable: true };
```

The comment states the intent — "true when any non-terminal axis has brigades mid-march ... hold until all axes are adjacent." But `zero_eligible_axis` does not mean mid-march. It covers both (a) brigades still en route, where waiting is correct, and (b) brigades already present and simply too weak to clear the prediction threshold, where waiting is futile **and actively harmful**, because ambient morale/cohesion drift degrades them monotonically while they wait. Operation Trnovo is case (b): the op held in `planning` for all 19 turns and aborted with `total_attacks: 0` while both brigades stood at the staging OSID losing ~2 morale/turn.

Consistent with this, `trnovo_town` carries **no `launch_blocker` at all** in the AAR while `trnovo_east` carries `zero_eligible_axis`, and the op-level `recovery_reason` is `zero_eligible_axis` — which `rankOpeningAttackBlocker` (line 837) returns whenever ANY axis reports it. Reading: the stronger town axis (2200 men, at staging from t145, adjacent to Trnovo town) was held hostage by its weak sibling and never allowed to execute.

**Confidence:** the refutations of bugs (2) and (3) are CONFIRMED — they rest on directly recorded artifact values, not inference. The "town axis was executable and was held hostage" reading is PLAUSIBLE, not confirmed: `launch_blocker` is set on failure and never cleared, so its absence is strong but indirect evidence, and it does not explain why no blocker was recorded for t141-144 when that brigade was at `gornje_pale` and demonstrably not adjacent to `trnovo`. **Decisive test before any fix:** instrument one 188w run to log per-axis `classifyAxisOpeningAttack` results per turn for this op, and confirm `trnovo_town` returns `executable: true` from t145 onward.

**Risk class and gate.** This is an op-lifecycle change in `evaluateOpeningAttackReadiness`, a shared multi-axis code path used by every pre-planned, triggered, and opportunity operation in the game — categorically the EH-3/EH-4 high-risk class, NOT the "surgical, lowest-risk" class the panel assigned to its (now-refuted) east-axis restructure. `docs/life_lessons/calibration.md:350` is the governing precedent: EH-3 fix(a) passed **30/30 anchors and every §6 invariant** and was still a **−39 floor regression** (658->619), entirely in non-anchor western-Krajina OSIDs. Anchors-pass is therefore not sufficient evidence for this class of change. The scenario-tester gate already recorded above stands unchanged and is now more binding, not less: fresh clean 188w baseline off branch head; one change per run; full non-net `anchor_checks` diff; 40w structural fingerprint byte-flat; full 188-week trajectory diff for collateral flips; automatic NO-GO on any Igman/Bjelašnica flip to RS. Add one gate item specific to this finding: because the change would let *every* multi-axis op in the game launch in situations where it previously stalled, the trajectory diff must be repo-wide across all operations, not scoped to the Sarajevo-Romanija-Drina theatre.

**Note on floor provenance:** `docs/40_reports/CALIBRATION_MASTER.md` still records the floor as `matched_osids 634, anchors 30/31`. The 2026-08-11 ledger entries move it to **639, anchors 31/31** (Brčko firepower-deficit −4 then Mistral 2 duplicate-objective +9) and explicitly say to update CALIBRATION_MASTER; that update was never made. CALIBRATION_MASTER is stale — reconcile it before it is used as a baseline reference for this lane.

## INSTRUMENTATION RUN 2026-08-12 (n205) — deadlock CONFIRMED; the PLAUSIBLE reading is now CONFIRMED

The correction above marked one claim PLAUSIBLE rather than CONFIRMED: that `trnovo_town` was
executable and was held hostage by its sibling axis. That claim is now **confirmed by direct
measurement**, using the decisive test the correction itself specified.

**Probe.** `src/sim/combat/axis_readiness_debug.ts` + two call sites in
`evaluateOpeningAttackReadiness` (`sector_offensive_launch_helpers.ts`). Observation-only: reads
state, emits to stdout, no wall-clock/RNG, inert unless `AWWV_DEBUG_AXIS_READINESS` is set. Logs
per-axis `executable`/`blocker` with each assigned brigade's location, personnel, morale and
cohesion, plus an operation-level line carrying `held_by_approaching` — true when at least one axis
WAS executable and the operation was refused execution anyway.

**Probe proven inert (determinism check).** HEAD's code state equals n202, so an observation-only
probe must reproduce n202 exactly. Run **n205** returned `final_state_hash`
**`c657ad81f4d94cc0`**, `matched_osids` **639/712**, anchors **31/31** — byte-identical to n202 on
all three. The trace is therefore a faithful record of the unmodified engine, not of a perturbed one.

**Result — every traced evaluation shows the deadlock, with no exceptions:**

| turn | axis | objective | executable | blocker | brigade (all at staging `trnovo:gornja_presjenica`, all ADJ to objective) |
|---|---|---|---|---|---|
| t156 | trnovo_east | kijevo_2 | **false** | `zero_eligible_axis` | `rs_trnovo_brigade` p=500 m=30 c=33 |
| t156 | trnovo_town | trnovo | **true** | — | `rs_1st_romanija_infantry` p=2200 m=21 c=53 |
| t157 | trnovo_east | kijevo_2 | **false** | `zero_eligible_axis` | `rs_trnovo_brigade` p=500 m=25 c=32 |
| t157 | trnovo_town | trnovo | **true** | — | `rs_1st_romanija_infantry` p=2200 m=17 c=53 |
| t158 | trnovo_east | kijevo_2 | **false** | `zero_eligible_axis` | `rs_trnovo_brigade` p=500 m=23 c=31 |
| t158 | trnovo_town | trnovo | **true** | — | `rs_1st_romanija_infantry` p=2200 m=20 c=52 |
| t159 | trnovo_east | kijevo_2 | **false** | `zero_eligible_axis` | `rs_trnovo_brigade` p=500 m=21 c=30 |
| t159 | trnovo_town | trnovo | **true** | — | `rs_1st_romanija_infantry` p=2200 m=20 c=51 |

Operation-level: **4 of 4 evaluations** report `any_executable=true`, `any_approaching=true`,
`executed=false`, `held_by_approaching=true`. `trnovo_town` was executable in **4/4** evaluations and
was refused every time. `trnovo_east` reported `zero_eligible_axis` in 4/4 — with its brigade
**present, at staging, and adjacent to its objective**, at exactly `MIN_ATTACK_PERSONNEL` (500, which
passes the floor since the test is `<`). Position and floor both clear, so the only failing term is
the **predicted outcome** — confirming the correction's inference. Nothing was "mid-march"; the
`anyApproaching` comment's assumption is simply false in this case.

**This closes the diagnosis.** `Operation Trnovo` captured nothing not because its objectives,
staging, or brigade positions were wrong — all four are sound, and panel bugs (2) and (3) remain
refuted — but because one under-strength axis is read as "still approaching" and vetoes an entire
multi-axis operation, indefinitely, while ambient drift degrades every brigade waiting on it.

### Open items this probe did NOT settle

1. **t141–t155 is untraced.** Readiness is only evaluated once
   `earlyElapsed > earlyPlanDuration + PLANNING_INVALIDATION_GRACE_TURNS`
   (`sector_offensive.ts:1263-1272`), so the first 15 turns of the op's 19-turn window produce no
   records at all. Whatever held the op during those turns is a **separate gate** (force-staging
   assembly), not this deadlock. The deadlock is confirmed only for t156-t159.
2. **Phase reads `planning` in all four evaluations**, even though the t156 evaluation should have
   driven `beginRecovery(...)` at `sector_offensive.ts:1269`. There are two call sites (1267 and
   1440) and the probe does not distinguish which emitted. Not resolved; flagged.
3. **A fix to `anyApproaching` alone is necessary but may not be sufficient.** Even with the veto
   removed, `trnovo_town` only becomes evaluable at t156 and the op aborts at t160 — roughly four
   turns for a morale-20 brigade to take Trnovo town. Bug (1) (mobilization starvation delaying
   injection from t69 to t141) plausibly has to be fixed as well before the op can do its
   historical job. Do not assume the single fix closes the 3-OSID gap; measure it.

### Fix framing (unchanged risk class, now better evidenced)

The finding is **general, not Trnovo-specific**: `evaluateOpeningAttackReadiness` is the shared
multi-axis readiness path for every pre-planned, triggered, and opportunity operation in the game.
Any multi-axis op with one weak axis is vetoed the same way, which makes this a plausible
contributor to EH-4's 32 `dead_ops` — worth measuring across all ops, not just this one.

The remedy must distinguish the two meanings currently collapsed into `zero_eligible_axis`:
*brigades en route* (waiting is correct) versus *brigades present but below the prediction
threshold* (waiting is futile and self-worsening). It must stay emergent — no hardcoded force-flip
of the three Trnovo OSIDs, per gap-finder's constraint.

Risk class and validation gate are **unchanged** from the correction above and remain binding:
EH-3/EH-4 class, `docs/life_lessons/calibration.md:350` precedent (30/30 anchors + every §6
invariant, still a −39 floor regression), fresh baseline, one change per run, full non-net
`anchor_checks` diff, 40w fingerprint byte-flat, repo-wide trajectory diff across all operations
(not theatre-scoped), automatic NO-GO on any Igman/Bjelašnica flip to RS. Panel + §6 sign-off before
any code change — not yet convened.

**Probe retained, not deleted.** `axis_readiness_debug.ts` is kept in the tree rather than reverted:
it is proven byte-identical, env-gated to a single named operation, and the validation gate above
requires exactly this trace again when a fix is measured. Delete it once the `anyApproaching` fix
lands and is signed off.
