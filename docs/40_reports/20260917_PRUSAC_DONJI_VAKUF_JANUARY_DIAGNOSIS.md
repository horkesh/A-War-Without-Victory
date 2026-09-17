# Prusac (`op:donji_vakuf:prusac_2`) — January mismatch diagnosis

**Date:** 2026-09-17
**Branch:** `codex/january-1993-operations-20260914`
**Investigated at:** `651799e14` (production source executably `41a148bf9`)
**Evidence:** [`logs/prusac-january-diagnosis-20260917/`](../../logs/prusac-january-diagnosis-20260917/)
**Predecessor:** [Čardak / Gostović diagnosis §10.6](20260916_CARDAK_1992_GOSTOVIC_VALLEY_DIAGNOSIS.md)
**Authority:** [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md). This report is a read-only diagnosis. It
changes no simulation behavior, no operation data, no reference, no floor and no threshold.

---

## 0. Verdict

**Classification C — a legitimate consequence of the repaired command-selection policy that remains a
calibration discrepancy.** No implementation-contract violation is established. No engine defect is
established. **No production correction is proposed, and none should be applied to restore this cell.**

The single load-bearing finding:

> The pre-repair Prusac *match* was purchased by the defect the reservation repair removed. In `n396` an
> ARBiH brigade was committed to a hopeless probe at a **0.30** power ratio and lost **65 % of its
> strength in one week**; that self-destruction is what left Korenići weakly held and let the VRS
> spearhead reach Prusac before t39. Restoring the Prusac match by reverting would restore that
> behaviour.

`prusac_2` is **OPEN**, with no waiver. The January minimum of 700 is met at **701/712**; meeting it does
not close this cell.

---

## 1. What the cell is

| | |
|---|---|
| OSID | `op:donji_vakuf:prusac_2` |
| Initial controller (t0) | **RBiH** |
| `jan1993` reference | **RS** |
| Candidate at t39 | **RBiH** — mismatch |
| Control events through t39 | **none** (one of the ten frozen turn-0 cells) |

Verified from `final_save.political.initial_political_controllers` and
`final_save.political.control_events` — [`control_events.txt`](../../logs/prusac-january-diagnosis-20260917/control_events.txt).

The mismatch is **RS not having arrived**, not RBiH over-extending.

---

## 2. Provenance and prefix binding (the 188-week evidence is usable)

The advisory-baseline reproduction (`data/derived/scenario/_baseline_tmp/apr1992_188w`) was bound to the
January candidate **before** being relied on — not by inferring from a comment-only source diff, but by
checking the run-affecting inputs and the shared measured interval.

| check | result |
|---|---|
| Surviving artifacts belong to the recorded run | **yes** — all 8 pinned artifacts re-hash to the values in `logs/baseline-pins-advisory-20260917/`; nothing overwritten |
| `git_commit` / `git_dirty` | `0033517b6` / `false` (n403: `41a148bf9` / `false`) |
| Source difference `41a148bf9..0033517b6` | two hunks, both wholly inside `//` comment blocks |
| Node / harness / `collapse_enabled` | `v22.23.2` / `headless` / `false` — identical across all runs |
| **Consumed inputs** | **all 31 files byte-identical; digest `f8ace65496620fad…4748caaf` on both**, equal to the digest CALIBRATION_MASTER §C records for n403 |
| **`weekly_report.jsonl` weeks 1–39** | **39 of 39 records byte-identical** to n403 |
| **`replay_save_manifest` turns 1–39** | **39 of 39 frames identical**; turn 39 control-by-faction HRHB 86 / RBiH 251 / RS 375 on both |

[`provenance_and_prefix.txt`](../../logs/prusac-january-diagnosis-20260917/provenance_and_prefix.txt).

**Prefix equivalence is measured, not assumed.** The 188-week run's first 39 weeks are n403's 39 weeks.
Its later weeks may therefore be read as this candidate's continuation, under its own provenance
(`0033517b6`, 188 weeks) — never relabelled as n403 output.

**n403's `NOT REACHED` labels stand unchanged.** n403 executed 39 weeks; April 1994, April 1995 and
October 1995 are not reached by it, and the 666 / 658 / 569 figures a checker prints for those references
are the t39 state replayed against later references, not measurements. Nothing here alters that.

No week-188 artifact was compared against a week-39 artifact as a determinism test.

---

## 3. The new observation the truncated evidence could not supply

§10.6 of the Čardak report correctly refused to assert any later capture, because n399/n400 end at t39.
With provenance and prefix now established, the 188-week continuation supplies it:

> **RS does capture `prusac_2` — at turn 41**, `decisive_victory`, ratio 9.89, target **undefended**,
> attacker `rs_16th_krajina_motorized`, and `Operation Donji Vakuf` reaches `recovery: completed` at w41.

The cell is not unreachable, not dead-opped and not blocked. **It is two turns late against a checkpoint
boundary.**

| run | source | Korenići | Prusac | at t39 |
|---|---|---|---|---|
| `n396` | `e9024b61a` + predicate-only patch | **t36** | **t39** | RS ✓ |
| `n399` / `n401` / `n403` | repaired, 39-week | t38 | not reached (run ends) | RBiH ✗ |
| **188w reproduction** | `0033517b6` clean | **t38** | **t41** | RBiH ✗ |

---

## 4. Causal chain

### A. First relevant divergence — turn 32, and it is not on the Donji Vakuf frontage

The first divergence is **which objective the ARBiH 3rd Corps probe selects at t32**:

| | `n396` (pre-repair) | repaired runs |
|---|---|---|
| probe at t30 | — | `op:bugojno:medini` |
| probe at t32 | **`op:donji_vakuf:babin_potok_2`** | **`op:vares:gornja_borovica_2`** |
| probe at t34 | `op:maglaj:donja_bocinja_2` | `op:vares:gornja_borovica_2` |

`op:vares:gornja_borovica_2` and `op:bugojno:medini` are **authored objectives** — of the Central Bosnia
Counteroffensive `vares_approach` axis and the Battle of Bugojno `bugojno_northern_positions` axis
respectively. `op:donji_vakuf:babin_potok_2` is the **second objective of the VRS Operation Donji Vakuf
sweep**, RS-held by t32. Pre-repair, the corps threw a brigade at an RS-held objective on the enemy's own
axis of advance; post-repair it pursues its own campaign's positions.

### B. Which caller produced it, and why

`src/sim/combat/commander/emit.ts:1595-1616`:

```js
if (canConsiderLocalOpportunity && (localOccupationCandidate != null || !probeOnCooldown)) {
    // A verified local occupation pair takes precedence. If there is none,
    // retain the existing highest-fitness probe selection unchanged.
    const probeBrigade = localOccupationCandidate?.brigade ?? (() => {
        const queuedHistoricalParticipants = getHeadQueuedPrePlannedBrigadeIds(briefing.state_ref);
        return allocation.surplus_pool
            .filter(...)
            .filter(ev => !queuedHistoricalParticipants.has(ev.brigade_id))
            ...
```

`localOccupationCandidate` (`emit.ts:328`) and the generic probe fallback (`emit.ts:1604`, `:1795`) are
gated by the **same** helper, `getHeadQueuedPrePlannedBrigadeIds`
(`src/sim/combat/pre_planned_operations.ts:2478`), whose own doc comment states: *"Probe selection needs
this narrower reservation than the full-queue helper above."*

- **Old:** the ARBiH 3rd Corps queue head is the Central Bosnia Counteroffensive (`available_from` 60), so
  its **16** brigades were reserved from t14 to t60. `findLocalOccupationCandidate` found nothing, so
  control fell through to the **generic highest-fitness probe**.
- **Repaired:** the bound `(def.available_from ?? 0) <= state.meta.turn` releases those 16 until the plan
  is due, a local-occupation candidate exists, and **it takes precedence** — the generic probe is not
  reached.

**Roster membership verified from source, and it corrects the predecessor report.** §10.6 states
*"`arbih_705th` is on the released Central Bosnia roster."* **It is not.** The Central Bosnia roster
(`pre_planned_operations.ts:1369-1454`) is the 16 brigades `17th/733rd/737th`, `329th/303rd/319th`,
`314th/330th/717th`, `708th/712th/727th`, `327th/328th/351st`, `7th`. `arbih_705th_slavna_mountain` and
`arbih_707th_slavna_mountain` are on the **Battle of Bugojno** roster (`:1457-1498`, `available_from` 66),
which sits *behind* Central Bosnia in the same corps queue and was therefore **never reserved by the head
helper in either version**. `arbih_770th_slavna_mountain` is on no pre-planned roster at all.

The effect on the 705th is therefore **indirect and second-order**: releasing a *different* operation's
roster changes which branch the probe selector takes, and so which brigade is spent.

### C. How it changed the Korenići engagements

`arbih_705th_slavna_mountain`, per-turn
([`brigade_705th_condition.txt`](../../logs/prusac-january-diagnosis-20260917/brigade_705th_condition.txt)):

| turn | `n396` personnel / morale / location | repaired personnel / morale / location |
|---|---|---|
| t31 | 1800 / 78 / `bugojno:kula_2` | 1800 / 78 / `bugojno:kula_2` |
| t32 | 1800 / 78 — **joins `probe_arbih_3rd_corps_t32`** | 1800 / 78 — no operation |
| t33 | **1126** / 68 — probe battle, `catastrophic`, **ratio 0.30** | **1800** / 78 — no battle |
| t35 | **650** / 60 | **934** / 70 — at `korenici` |
| t37 | 712 / 57 — displaced to `bugojno:prijaci` | **890** / 71 — **defending `korenici`** |

In `n396` the 705th fights exactly **one** battle between t20 and t42 — the probe that destroys it. In the
repaired runs it fights **none** before Korenići and arrives intact.

Korenići, same attacker `rs_16th_krajina_motorized`, identical `execution_friction`
(`stale_intel`, low confidence band) in both — so no intel, supply or modifier difference is in play:

| | `n396` | repaired |
|---|---|---|
| w36 | `decisive_victory` **2.03** vs 707th → **captured** | `costly_victory` **1.32** vs 707th |
| w37 | — | `stalemate` **0.79** vs **705th** |
| w38 | — | `decisive_victory` **2.65** vs 770th → **captured** |

One strike becomes three. The same brigade that defended at a ratio of 3.97 when gutted (n396 w35) defends
at **0.79** when intact (repaired w37) — the attacker is *unfavoured*.

### D. How that cost the Prusac capture

`Operation Donji Vakuf` is a strict sequential six-objective sweep ending at `prusac_2`
(`pre_planned_operations.ts:1026-1080`): `torlakovac_2 → babin_potok_2 → oborci_2 → donji_vakuf_2 →
korenici → prusac_2`. There is no slack.

Per-week operation diagnostics
([`operation_diagnostics.txt`](../../logs/prusac-january-diagnosis-20260917/operation_diagnostics.txt)) —
**the post-Korenići tempo is identical, offset by exactly two turns**:

| stage | `n396` | 188w reproduction |
|---|---|---|
| Korenići captured | t36 | t38 |
| objective advances to `prusac_2` | w36 | w38 |
| idle — `eligible_attacker_count` **0** | w37, w38 | w39, w40 |
| `prusac_2` captured, `recovery: completed` | **w39** | **w41** |

Both runs: capture, two turns with zero eligible attackers while the spearhead repositions, capture on the
third. `skipped_attack_orders` empty, `invalidation_reasons` empty, no `recovery` anomaly, in both.

**The entire discrepancy reduces to the two-turn delay at Korenići, and nothing else.** The two idle turns
are not new and are not a defect: they are present identically in the run that *matched*.

---

## 5. Why this is not a defect

1. **No contract is violated.** The operation runs, wins, completes and transfers control through the
   ordinary battle resolver. No order is skipped or rejected; no objective is invalidated; the `w39/w40`
   idle pair is unchanged from the matching run.
2. **The repaired behaviour is the intended behaviour.** Releasing a distant roster so a corps pursues its
   own authored objectives instead of a hopeless generic probe is precisely the Čardak repair's stated
   purpose (§10.3, §10.5), and the helper's own documentation.
3. **The old behaviour was the less plausible one.** A ~1,800-strong ARBiH brigade attacking an RS-held
   position at a 0.30 power ratio and losing 674 men in a week, then a further 476, is not a defensible
   command decision. The repaired run keeps it defending its own municipality's approaches — which is both
   the sounder behaviour and the historically ordinary one for the Bugojno/Donji Vakuf frontage.
4. **The better Prusac number depended on the worse engine.** This is the pattern
   `docs/life_lessons/calibration.md` warns about: a matched cell bought by a defect is not a gain.

Accordingly the reservation repair **must not be reverted** to restore this cell, and no location-specific
hold, capture date, target-specific bonus or combat-value change may be introduced for it. All are
forbidden by the packet and none is warranted by this evidence.

---

## 6. What remains open, and the smallest justified next action

**No correction is proposed.** The evidence establishes a cause and does not establish a defect.

The residual question is **not** an engine question and is explicitly *not* adjudicated here:
`Operation Donji Vakuf` has `prestage_from: 21`, `planning_duration: 7`, and is queued fourth in the 1KK
chain behind Op Jajce, so its start is emergent. Whether the authored **launch timing of that chain**
should place a six-objective sweep's terminal cell before the January checkpoint is a
**scenario/operational-data and historical-review question** (classification B) belonging to the
operations/historian lanes under `R6-CALIBRATION-INTEGRATION` — not a combat or reservation question.
The repository has the same shape on record for the Sana follow-on, where the lever was catalogue launch
timing rather than brigade reconcentration. **Nothing in that direction is proposed, scoped or authorized
by this report.**

If the owner wants it pursued, the minimal additional evidence is the **Op Jajce → Op Donji Vakuf queue
timing chain** — when Jajce completes and why the sweep opens when it does — read from the *existing*
188-week reproduction. No new campaign, no parameter search, and no fresh January run is required for it.

**Prusac remains an OPEN January mismatch with no waiver.** January calibration is not closed by this
report and the candidate is not promoted by it.

---

## 7. Method and limits

Read-only throughout. No instrumentation was added to production source; every figure is read from
artifacts that already existed. **No simulation was executed for this diagnosis** — the preserved runs
`n396`, `n397`, `n398`, `n399`, `n401`, `n403` and the 188-week advisory reproduction supplied all of it.
The reverted `n397` / `n398` authored-operation experiments were read for their control history only and
were not recreated.

Limits, stated rather than inferred:

- `control_delta.json` is a final aggregate and the replay frames carry only faction totals, so a
  **complete per-OSID t39 ownership set cannot be reconstructed from the 188-week artifacts alone.** The
  authoritative t39 ownership and the eleven-cell mismatch set remain **n403's**, which is why n403 was
  used for them. What the 188-week run independently corroborates is that every per-week observable over
  weeks 1–39 is byte-identical to n403, including the turn-39 faction control totals.
- `n396`, `n399` and `n401` ran with `git_dirty: true` (working-tree patches); only `n403` and the
  188-week reproduction are clean-tree runs. Their patches are preserved under
  `logs/january-1993-operations-20260917/` and the three `preserve/*` tags.

---

## 8. Amendment — the Op Jajce → Op Donji Vakuf chronology, reviewed against the record (2026-09-17)

§6 named the residual as a scenario/operational-data and historical-review question and proposed nothing.
That review is now done. It is **read-only**: no simulation was executed, no production source was
instrumented, and nothing here changes timing, objectives, queue order, references, initial control or any
threshold. Evidence:
[`logs/jajce-donji-vakuf-chronology-20260917/`](../../logs/jajce-donji-vakuf-chronology-20260917/).

**Verdict: an authored grouping and dependency premise is specifically contradicted by the record.** The
Prusac two-turn delay is contingent campaign timing *downstream* of that premise. The correction this
implies is **not** "start the sweep two turns earlier" — that direction is affirmatively ruled out in §8.5.

### 8.1 The queue-head transition, and what actually gates it

`inject-queued-operations` (`src/sim/turn_phases/war_phases.ts:1938-1954`) runs every war turn over
corps sorted by `strictCompare` and calls `injectQueuedOperation` only when `isSlot0AvailableForQueue`
(`src/sim/combat/corps_operation_helpers.ts:193`) is true — that is, when the corps holds **no active
operation with `is_pre_planned`**. Bot probe/sector operations in other slots never block it. So the
predecessor-completion condition is *removal of the predecessor from `active_operations`* after its
recovery phase, not "its objectives were taken".

Measured across the whole 1KK chain, the pattern is exact and identical three times: **two turns recorded
as `recovery: completed`, injection on the third**.

| 1KK slot-0 occupant | injected | planning | execution | `recovery: completed` | successor injects |
|---|---|---|---|---|---|
| Operation Prijedor | (t0) | — | w1–w3 | w4–w5 | w6 |
| Operation Corridor | w6 | w6–w8 | w9–w15 | w16–w18 | w19 |
| Operation Jajce | w19 | **w19–w24** | w25–w27 | w28–w29 | w30 |
| Operation Donji Vakuf | w30 | **w30 only** | w31–w40 | w41–w43 | (Bosanski Novi) |

The two planning figures look inconsistent and are not. `planning_duration: 7` on Operation Donji Vakuf
is **not a seven-turn wait**: `operation_preparation.ts:828-842` short-circuits pre-planned operations —
*"Pre-planned ops bypass the preparation state machine … Skip straight to 'ready'; the outer lifecycle
owner still enforces one planning turn plus participant/opening-attack readiness"* — so `planning_duration`
only raises the anti-paralysis `preparation_max_turns`, which the bypass makes moot. Jajce sat in planning
for **six** turns because its brigades were marching (`movement_order_count` 3,3,3,3,2,2 across w19–w24):
a **legal movement/readiness constraint**. Donji Vakuf needed **one** because `prestage_from: 21`
(`pre_planned_operations.ts:1906`) had already marched its brigades to `op:sipovo:pribeljci_2` during
Jajce. Neither interval is an authored delay.

The post-Korenići `eligible_attacker_count = 0` interval at w39/w40 is the same category: both turns carry
`movement_order_count = 3` and no attack attempts — the spearhead is repositioning through Jemanlići, the
approach the operation's own comment names. It is a **legal movement constraint**, it is present
identically in `n396` (there at w37/w38), and it is therefore not newly introduced. That it is unchanged
does not by itself make it correct; it does remove it as a candidate cause.

**Classification of every interval in the chain:** shared-force/queue constraint (slot 0 sequencing, three
times); legal movement/readiness constraint (Jajce's six planning turns, DV's one, the w39/w40 pause);
authored timing constraint (`prestage_from: 21` only, and it *shortens* rather than delays). **No
unexplained wait was found.** The runtime is doing exactly what the contract says.

### 8.2 Actual execution timeline

Turn N's boundary date is `1992-04-06 + 7N` days (`src/ui/map/utils/formatters.ts:12`); turn N closes the
seven days before it.

| turn | date | event |
|---|---|---|
| w19 | 1992-08-17 | Operation Jajce injects; brigades march |
| w25 | 1992-09-28 | `op:jajce:divicani_2` (HRHB→RS), `op:jajce:kruscica` (RBiH→RS) |
| w26 | 1992-10-05 | `op:jajce:barevo_2` (HRHB→RS) |
| **w27** | **1992-10-12** | **`op:jajce:jajce_3` (RBiH→RS) — the town** |
| w28 | 1992-10-19 | `op:jajce:vinac_2` (RBiH→RS); operation enters recovery |
| w30 | 1992-11-02 | Operation Donji Vakuf injects |
| w31 | 1992-11-09 | `op:donji_vakuf:torlakovac_2` (RBiH→RS); `op:travnik:gornje_krcevine` (RBiH→RS) |
| — | — | `op:donji_vakuf:babin_potok_2` is **already RS at t0** — no capture needed |
| w34 | 1992-11-30 | `op:donji_vakuf:oborci_2` (RBiH→RS) |
| **w35** | **1992-12-07** | **`op:donji_vakuf:donji_vakuf_2` (RBiH→RS) — contains Donji Vakuf town** |
| w38 | 1992-12-28 | `op:donji_vakuf:korenici` (RBiH→RS) |
| w39 | 1993-01-04 | **January checkpoint boundary** — `prusac_2` still RBiH |
| w41 | 1993-01-18 | `op:donji_vakuf:prusac_2` (RBiH→RS), undefended |

`op:donji_vakuf:donji_vakuf_2` is not a suburb: its member settlements are **Blagaj, Donji Vakuf,
Ponjavići, Rastičevo, Rudina, Vlađevići** — the town itself. `prusac_2` is Fakići, Guvna, Potkraj,
**Prusac**.

### 8.3 The historical record

Printed folios, each read off the page rather than derived from an offset; see §8.6 on the indexing.

| event / place | historical date or supported interval | source (printed folio) | simulation | authored dependency | confidence |
|---|---|---|---|---|---|
| VRS prepares the Jajce operation | June–July 1992 | BB1 p.147 | Op Jajce injects w19 (17 Aug) | after Op Corridor frees slot 0 | high |
| First major attack, to within 2 km | mid-August 1992 | BB1 p.147 | first captures w25 (28 Sep) | — | high; sim ~6 weeks late to first capture |
| Second step, to within 1 km | 9–16 September 1992 | BB1 p.147; BB2 p.330 | w26 (5 Oct) | — | high |
| Final push along all three axes | 25 October 1992 | BB1 p.147 | — | — | high |
| **Jajce town falls** | **29 October 1992** | BB1 p.147–148 | **w27 = 12 October 1992** | — | high — sim ~2.5 weeks **early** |
| Karaula salient erased; **1KK halts** | 12–18 November 1992 | BB2 p.332 | `gornje_krcevine` w31 (9 Nov) | Vlašić Pocket axis of Op **Donji Vakuf** | medium — right ground and month, wrong parent operation |
| **Donji Vakuf town** | **Serb-held from early 1992**; renamed "Srbobran"; the springboard of Vrbas 92's southern axis | BB2 p.465; BB2 p.330; BB2 p.277–279 | **captured by RS w35 = 7 Dec 1992, from RBiH** | 4th objective of a post-Jajce sweep | **high — contradicted** |
| 19th Krajina LIB at Donji Vakuf | flank protection **during** Vrbas 92 | BB2 p.330 | sweeps *southward* from w30 | roster | high — location right, role inverted |
| 16th Krajina Motorized as DV spearhead | HQ Banja Luka; not placed in this sector | BB2 p.277–279; BB2 p.330 names the 19th and 22nd | takes five of six cells | roster convenience, stated in the comment | medium — unsupported here |
| Torlakovac, Babin Potok, Oborci, Korenići | **no mention in either volume** | — | w31 / t0 / w34 / w38 | sequential sweep | insufficient evidence |
| **Prusac** | ARBiH's own forward position in April **and** November 1994 | BB2 p.466 | RS captures w41 (18 Jan 1993) | terminal objective | jan1993 = RS **not attested**; apr1994 = RS **contradicted** |
| Bugojno front | jointly defended **against the VRS** by HVO "Eugen Kvaternik" + ARBiH 307th until mid-1993 | BB1 p.198 | — | — | high — a static line, not a VRS advance |
| ARBiH takes Donji Vakuf | 13–14 September 1995 | BB1 p.382 | t183 = 9 Oct 1995 | — | outside scope; noted only |

The three load-bearing quotations:

> "The third route, from the south/southwest … one running along the Selinac River valley and the other
> along the Vrbas River valley **from the direction of Serb-held Donji Vakuf (Srbobran)**. … Two light
> infantry brigades, the **19th at Donji Vakuf** and the 22nd at Mount Vlašić near Travnik, protected the
> flanks of the assault forces." — BB2 p.330

> "The Bosnian Serbs, however, **took over the town early in 1992**, driving thousands of Muslims from
> their homes … The triumphant Serbs renamed the town '**Srbobran**'" — BB2 p.465

> "on 12 November, 30th Division forces began grinding away at the awkward salient at Karaula, and erased
> it from the map 18 November. **Here the VRS halted, apparently content with its gains.**" — BB2 p.332

### 8.4 What that establishes

1. **The grouping is contradicted.** Donji Vakuf town cannot be the fourth objective of a November-1992
   conquest: it was Serb-held from early 1992 and was the **departure point** for the Jajce operation's own
   southern axis. The sim has the VRS capture its own springboard six months after it took it.
2. **The dependency is a queue artifact, not history.** "Fires after Op Jajce completes" is slot-0
   sequencing. Historically the Donji Vakuf-area brigades were committed **concurrently** with Vrbas 92, as
   flank protection — if anything the causal arrow runs the other way: Serb-held Donji Vakuf enabled the
   Jajce attack.
3. **The timing sits entirely after the historical halt.** The operation runs 2 Nov 1992 – 18 Jan 1993.
   The 1st Krajina Corps' 30th Division stopped on **18 November 1992** and BB says so in terms.
4. **The roster's cited authority is a later table.** The operation comment cites "BB1 p.498" for the
   claim that the 19th and 31st were organic to Donji Vakuf and the 16th was a 1KK formation. That page is
   **Appendix G, "Skeleton Bosnian Serb Army Order of Battle, July 1995"** (printed folio 461; header at
   459) — a July-1995 snapshot standing in for a 1992 deployment. The 19th's 1992 location is nonetheless
   *independently* supported by BB2 p.330, and BB2 p.277–279 is a genuinely period-spanning table
   ("June 1992–October 1995") that also puts the 19th and 31st at Srbobran (Donji Vakuf). The **16th
   Krajina Motorized** as the sweep's spearhead is the part that remains unsupported for this sector; the
   comment itself concedes the reason is engine availability after Corridor.
5. **The January checkpoint cannot see any of this.** The reference asks only who holds each cell on
   4 January 1993. Five of the six cells reach the historically correct owner — by a route that is wrong in
   direction, parent operation and date. Only `prusac_2` fails, and it fails on two turns of marching.

### 8.5 Why "start two turns earlier" is affirmatively the wrong answer

The sweep's start is bounded by Jajce's recovery, and **Jajce already runs ~2.5 weeks ahead of history**:
the sim takes the town on 12 October 1992 against a real fall of 29 October. Advancing Operation Donji
Vakuf by pulling the queue forward therefore has to make an already-fast Jajce faster still, trading a
documented, anchor-relevant date for an undocumented one. That is a worse fit to the record, not a better
one, and it would be adopted purely because it moves a checkpoint cell. Nothing in the evidence points that
way.

### 8.6 The citation convention — stated, not assumed

Three page indexes exist for these volumes and they disagree. The repository's own citations —
`HISTORICAL_TIMELINE_MASTER.md`'s "BB1 p.183", the operation comment's "BB1 p.498" — are **scan/KB page
indexes**, whose printed folios are **147** and **461** respectively. The gap is not constant: measured,
the knowledge-base `page_number` equals the `pdftotext` index for BB1 pages from ~450 on, but is one lower
in the chapter range (KB 183 = pdftotext 184 = folio 147). **No offset may be applied blindly.** Every
folio in §8.3 was read off its own page; `bbfolio.cjs` in the evidence directory reproduces that.

### 8.7 Disposition — no correction applied, and none in this task's scope

A correction **is** justified in principle: an authored premise is contradicted, not merely unsupported.
But every repair that follows from the evidence lands on surfaces this task explicitly protects — initial
control, operation objectives, queue order and timing, references — so **nothing is implemented, no A/B
candidate was run, and none is proposed for adoption here.** What is offered, for the owner and for
`R6-CALIBRATION-INTEGRATION`, is the scope such a correction would have:

- **Affected definitions.** `Operation Donji Vakuf` in `src/sim/combat/pre_planned_operations.ts:1003-1080`
  — its position in the 1KK `queued_operations` chain (`:2144`), its `prestage_from`/`planning_duration`,
  its six-objective `donji_vakuf_sweep` axis and that axis's roster; and the `vlasic_pocket` axis, which on
  this evidence belongs with the historical **Karaula/Turbe** action of 12–18 November 1992 rather than
  with a Donji Vakuf sweep.
- **The premise to settle first, before any code or data changes.** Whether `op:donji_vakuf:donji_vakuf_2`
  should transfer in the **spring/early-summer 1992 takeover phase** — which is an initial-control or
  early-war-takeover question, not an operations question — and, if it should, what the remaining five
  cells then represent: a static confrontation line north of Bugojno (which BB1 p.198 supports) rather than
  a sweep.
- **Focused validation if it is ever authorized.** One 188-week run on the changed data with
  `verify_checkpoints.cjs` across all four checkpoints (not January alone), the anchor contract, the engine
  health gate, and a diff of `matched_osids` rather than the net count — because a net-neutral score can
  hide anchor flips, and this municipality's cascade has produced exactly that before (`n462`/`n463`/`n464`).
- **Explicitly not proposed:** any target-specific bonus, capture date, scripted capture, forced surrender,
  location-specific hold, checkpoint exception, or reversion of the reservation repair.

### 8.8 Residual questions and evidence limits

- **`prusac_2` at January 1993 is undetermined by this evidence.** BB is silent on Prusac in 1992–93. The
  jan1993 = RS reference is *consistent* with BB (the front only moved toward Donji Vakuf after the ARBiH
  took Bugojno in July 1993), but it is not attested. **Prusac stays OPEN with no waiver**, and this review
  neither supports nor impeaches the January reference for it.
- **A separate, out-of-scope observation, recorded not pursued:** the **apr1994** reference marks
  `prusac_2` as RS, while BB2 p.466 twice places the ARBiH at Prusac in 1994 — attacking *from* it in April
  and unable to *push past* it in November. That is a later-checkpoint reference question for the
  calibration/historian lanes; it is not a January acceptance gate and nothing is proposed for it here.
- **Evidence limitation, restated.** The 188-week artifacts supply matched weekly records and faction-total
  replay frames, **not a reconstructed complete per-OSID t39 state**. The authoritative t39 ownership and
  the eleven-cell mismatch set remain **n403's**. No 188-week artifact is relabelled as n403 output.
- Torlakovac, Babin Potok, Oborci and Korenići appear nowhere in either Balkan Battlegrounds volume;
  their 1992–93 ownership is **insufficiently evidenced** by this source and would need a different one.

**Nothing in §8 changes the January candidate.** It remains 701/712 with eleven mismatches, the floor and
the packet minimum are untouched, Čardak's 1992 capture and the closed Pješivac-Kula correction stay
preserved, and Vranjevići/Kružanj remains UNRESOLVED and outside this task.
