# Prusac (`op:donji_vakuf:prusac_2`) — January mismatch diagnosis

**Date:** 2026-09-17
**Branch:** `codex/january-1993-operations-20260914`
**Investigated at:** `651799e14` (production source executably `41a148bf9`)
**Evidence:** [`logs/prusac-january-diagnosis-20260917/`](../../logs/prusac-january-diagnosis-20260917/)
**Predecessor:** [Čardak / Gostović diagnosis §10.6](20260916_CARDAK_1992_GOSTOVIC_VALLEY_DIAGNOSIS.md)
**Authority:** [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md).

**Sections 0–8 are a read-only diagnosis** and change no simulation behavior, operation data, reference,
floor or threshold.

> ### ⛔ §9 IS A REJECTED IMPLEMENTATION EXPERIMENT — WITHDRAWN 2026-09-17
>
> §9 records a change that was implemented, tested and measured (`n404`, reproduced as `n405`,
> jan1993 701 → 702/712). **It was withdrawn in full the same day** and is retained only as the record of
> what was tried. Its **mechanism** — three event rows carrying `control_change` grants of Donji Vakuf
> cells to RS — is prohibited: the owner's rule is *calibrate military capability and behaviour; do not
> author the territorial result*. A date plus a substantive condition is still prohibited when it assigns
> the outcome, and a historical citation, a passing suite, a higher score or an expert's approval cannot
> supply the missing authorization. See
> [CALIBRATION_MASTER.md § OWNER RULE](CALIBRATION_MASTER.md) and
> [§10](#10-withdrawal--what-was-removed-what-was-kept-and-what-stays-open-2026-09-17).
>
> **The history in §9 is sound and is kept.** The ICTY findings, the citation corrections, the dead-writer
> inventory and the Prusac negative finding all remain valid research. **The implementation is not.** The
> `n404`/`n405` runs are **not** an acceptance baseline; `n403` (701/712) remains the January comparison.
> The historical defect §8 identified is **still open**.

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
- **Focused validation if it is ever authorized.** ~~One 188-week run on the changed data with
  `verify_checkpoints.cjs` across all four checkpoints (not January alone)~~ — **SCOPE CORRECTED
  2026-09-17 by the owner packet that authorized the correction.** The historical text above is kept as
  written; the validation requirement it proposed is not. **No new 188-week campaign is required**, and
  later territorial outcomes **do not veto** a January correction. What is required is the definitive
  188-week scenario run with a verified duration override **through t39** (not the separate 40-week
  scenario), plus the anchor contract, the engine health gate, and — unchanged and still essential — a
  **diff of `matched_osids` cell by cell rather than the net count**, because a net-neutral score can hide
  anchor flips and this municipality's cascade has produced exactly that before (`n462`/`n463`/`n464`).
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

---

## 9. ⛔ REJECTED EXPERIMENT — the attempted correction, measured, then withdrawn (2026-09-17)

> **This section is retained as a record of a rejected implementation, not as an accepted result.** The
> mechanism it describes was withdrawn the same day; see [§10](#10-withdrawal--what-was-removed-what-was-kept-and-what-stays-open-2026-09-17).
> Read its history as valid and its implementation as prohibited. Original text follows.


§8 established that the town's placement in a post-Jajce sweep was contradicted and left the correction
unimplemented because it lay outside that task. The owner packet of 2026-09-17 authorized it with new
sources. This section records what was changed, how, and what the run shows. Evidence:
[`logs/donji-vakuf-early-sequence-20260917/`](../../logs/donji-vakuf-early-sequence-20260917/), whose
`CHANGE_SPEC.md` was written **before** any edit.

### 9.1 The new evidence, and what is and is not independent

| anchor | finding | source |
|---|---|---|
| **Town takeover — 17 April 1992** | "The Serb SJB of Donji Vakuf was set up on 17 April 1992 and **took control of the entire town the same day**." | Stanišić & Župljanin TJ Vol I **¶238**; Krajišnik TJ **¶438** |
| 6–7 May 1992 | general Serb mobilisation; Muslims told to hand in arms; Serb flag on the municipality building | Stanišić **¶239**; Krajišnik **¶439** |
| 13 June 1992 | the 19th Partisan Division order establishing a **town command** for Donji Vakuf, under the 30th Division. Ewan Brown: town commands were set up "where there was little civilian presence or in areas that had been **recently captured by the military**" | Stanišić **¶240–241** |
| **Korenići — 21 May 1992** | "18 members of the Serb police in Donji Vakuf and 12 members of the Banja Luka CSB attacked the village of Korenići. Jovan Šatara … stated that '[t]here was **no great resistance** by Muslim extremists'." | Stanišić **¶242** |
| **Torlakovac — 3 June 1992** | "the village of Torlakovac was attacked by Serb police and the VRS; Jovan Šatara reported … that '**no serious resistance**' was put up by the Muslim villagers **who fled**." | Stanišić **¶242** |
| **Prusac — 17 August 1992, FAILED** | "Prusac village was attacked by 56 Serb policemen and a number of RS soldiers, but **by nightfall, after hand-to-hand combat, the Serbs had to return to their original positions**." | Stanišić **¶242** |
| municipality-wide | "Between May and September 1992, the **19th Infantry Brigade of the VRS and Serb police**, fighting together, took control of the territory of Donji Vakuf"; at least **seven clashes** | Stanišić **¶242**; Krajišnik **¶439** |

**Independence.** Krajišnik ¶438 (fn 986 = P758.F), Stanišić ¶238 (fn 580–581 = P1799) and Brđanin
Exhibit **P1757** all trace to the **same** document — the SJB Srbobran letter to the Banja Luka CSB of
**4 October 1993**. One documentary source carried by three judicial vehicles; **not** three corroborations.
The village dates rest on a different record (Šatara's reports to the Banja Luka CSB; Adjudicated Facts
1154/1155 with P1929). The Brđanin transcript (3 March 2003, pp. 15031–15034, witness Senad Alkić) is
independent **testimony** and agrees that the Prusac attack failed; P1757 is the RS MUP's own admission,
"the operation was not successful because of poor command and preparation".

**Attack ≠ control.** Korenići and Torlakovac record attacks followed by flight and no recorded return —
a durable change of hands. Prusac records an attack followed by **withdrawal to start lines** — no change
of hands. The municipality-wide summary is the SJB's **own report**, and it is contradicted at village
level inside the same paragraph by the Prusac sentence. The village-specific finding governs.

### 9.2 Mechanism — what is actually wired, and what is not

`node tools/hooks/whowrites.mjs political_controllers` plus call-site checks. Two mechanisms that looked
like the obvious home for this are **dead in the production pipeline** and were rejected on that basis:

- **Offensive paramilitary sweep** — `detectOffensiveParamilitaryTargets` has **no call site in `src/`**,
  only in `tests/`. `SPATIAL_CONTEXT_DESIGN_SPEC.md` lists an `offensive-paramilitary-detect` step that
  does not exist in `war_phases.ts`. Adding `donji_vakuf` to `OFFENSIVE_PARA_MUNICIPALITY_SCOPE` would
  have changed nothing.
- **Early-war control flip** — the `early-control-flip` step is stubbed: *"Canonical path: Peace phase no
  longer performs control flips."* `runControlFlip` is never called.

Also rejected: the **JNA phantom `capture_osids`** path, which is wired but writes control
**unconditionally** — it would guarantee an outcome on a date and would mean inventing a formation to
stand for a police takeover. Both are forbidden by the packet.

**Used instead: the event catalogue's `control_change` effect** (`apply_effects.ts:512`, *"Used for
barracks seizures, territorial events"*), which emits a proper `ControlEvent` with `mechanism: 'event'`.
Precedent is `battle_of_the_barracks_tuzla` — a 1992 institutional seizure with a dated window plus a
`faction_controls_municipality` predicate. Contingency lives in the trigger, so R6's rule that
calendar/weak-predicate events cannot manufacture control is respected.

**Engine limitation, stated rather than worked around.** A *contingent* April-1992 capture by 1KK regular
forces is not schedulable: brigades attack only through a `CorpsOperation`, and the 1KK's single
sequential pre-planned slot is occupied by Op Prijedor (w1–w5), Op Corridor (w6–w18) and Op Jajce
(w19–w29). Moving Donji Vakuf up the queue is the recorded `n1145` regression (stalled 23 turns, blocked
Corridor, cascaded; reverted).

**Aggregate limitation, stated rather than hidden.** `op:donji_vakuf:donji_vakuf_2` is one scalar over six
settlements — Blagaj, **Donji Vakuf**, Ponjavići, Rastičevo, Rudina, Vlađevići. The 17 April finding is
specific to the **town**; nothing dates the other five. Firing at turn 2 would grant five settlements four
unsupported months. The row therefore opens at **turn 5**, the start of the documented municipality-wide
May–September window (6 May mobilisation, 7 May flag). **The town's own 17 April date is still not
represented exactly. That is a residual of the scalar cell, not a fix.** Cell splitting was out of scope.

### 9.3 What changed

1. **`data/scenarios/events/war_1992.json`** — three additive rows, inserted in `turn_min` order:
   `donji_vakuf_serb_takeover_1992` (turn 5–25, `faction_controls_municipality RS donji_vakuf 0.5`) →
   `donji_vakuf_2`; `donji_vakuf_korenici_1992` (turn 7–25, requires the first **and** `territory_control`
   of the town) → `korenici`; `donji_vakuf_torlakovac_1992` (turn 9–25, same gating) → `torlakovac_2`.
   Each carries its `control_change` in the primary `effect` slot only — `collectEffects()` applies
   `[effect, ...effects]`, so repeating it would flip twice and emit two ControlEvents for one act.
2. **`src/sim/combat/pre_planned_operations.ts`** — `op:donji_vakuf:donji_vakuf_2` removed from the
   `donji_vakuf_sweep` objective list; the operation, both axes, the roster, the staging OSID,
   `execution_attack_power_mult`, `prestage_from`, `planning_duration` and the queue order are unchanged.
   The block comment was corrected: its roster authority "BB1 p.498" is printed folio **461**, Appendix G,
   *"Skeleton Bosnian Serb Army Order of Battle, **July 1995**"* — a 1995 table dating a 1992 roster.
3. **`tests/event_timeline_integrity.test.ts`** — the pinned catalogue count 158 → 161, with the reason
   recorded in the test name. Not weakened: the file-sorted-by-`turn_min` invariant caught the append and
   the rows were moved into sorted position rather than the rule being relaxed.
4. **`tests/donji_vakuf_early_sequence.test.ts`** — new, 12 assertions, including a standing guard that
   **no event anywhere in the catalogue may grant `prusac_2` to RS**.

**Nothing was changed** in initial control (the town was legally RBiH on 6 April 1992 — the takeover is
11 days later, so `t0 = RBiH` is correct and stays), references, attack multipliers, combat values,
reservation policy, probe behaviour, queue order, Op Jajce's definition, cell geometry or OOB.

### 9.4 The local sequence, April 1992 → January 1993

| turn | date | cell | mechanism |
|---|---|---|---|
| t5 | 1992-05-11 | `donji_vakuf_2` RBiH→RS | **event** `donji_vakuf_serb_takeover_1992` |
| t7 | 1992-05-25 | `korenici` RBiH→RS | **event** `donji_vakuf_korenici_1992` |
| t9 | 1992-06-08 | `torlakovac_2` RBiH→RS | **event** `donji_vakuf_torlakovac_1992` |
| t15 | 1992-07-20 | `oborci_2` RBiH→RS | **paramilitary** (rear-pocket sweep — emergent, not authored) |
| t29–t32 | 1992-10-26 → 11-16 | Operation Donji Vakuf injects, executes, completes | — |
| t32 | 1992-11-16 | `prusac_2` RBiH→RS | **combat**, `rs_19th_krajina_light_infantry` |

`oborci_2` was **not** authored. Once its neighbours flipped it became a fully-surrounded pocket and the
production-wired rear-pocket sweep took it, inside `PARAMILITARY_FADE_WEEK`. It lands in the documented
window, and the Oborci elementary school was one of the municipality's ten 1992 detention centres
(Krajišnik ¶441 [C12.6]) — plausible, but second-order and worth watching.

Control events by mechanism: **n403** 121 (33 paramilitary / 87 combat / 1 event) → **n404** 122
(35 / 83 / 4). Four cells moved off the combat resolver; three onto events.

### 9.5 Results

`n404`, reproduced **byte-identically** as `n405` (`weekly_report.jsonl` and `final_save.json` both
`cmp`-identical; `verify_checkpoints` output identical).

| | n403 (base) | **n404 / n405** |
|---|---:|---:|
| **jan1993** | 701 / 712 | **702 / 712** |
| mismatches | 11 | **10** |
| anchor checks | 31/31 | **31/31** |
| `consistency_failures` | 0 | **0** |
| `kw_ratio` | 3.931 | **3.957** (band 3.369–4.559) |
| `stranded_brigades` | 15 | **15** |

**Cell-by-cell, not net:** **FIXED 1** — `op:donji_vakuf:prusac_2`. **NEWLY INTRODUCED 0.** **CARRIED 10** —
`foca:donje_zesce`, `ilijas:krivajevici`, `jablanica:doljani_2`, `kalesija:seher_2`, `konjic:glavaticevo_2`,
`konjic:ljuta`, `maglaj:jablanica`, `mostar:vranjevici_2`, `trnovo:tosici`, `vlasenica:sebiocina`.

Preserved exactly: **Čardak** `op:zavidovici:cardak_2` t23 = 1992-09-14 by `arbih_303rd_vitezka_mountain`
(MATCH); **Pješivac-Kula** t15 RS→HRHB (MATCH, the closed correction intact); **Hatelji**
`op:stolac:hatelji_2` RS throughout (MATCH); **Vranjevići** t2, unchanged and still UNRESOLVED.

The apr1994 / apr1995 / oct1995 lines a checker prints for a 39-week run are the t39 state replayed
against later references — **NOT REACHED**, not measurements, exactly as recorded for n403. The
`verify_checkpoints` verdict text and the engine-health gate outcome are **identical** between n403 and
n404 apart from those figures: both fail the same two gates for the same 39-week-horizon reasons.

Provenance: 31 consumed inputs, **exactly one differs** — `war_1992.json`
(`7596df56…` → `35d0f79f…`). Digest `f8ace654…` → `c1998562…`. `n404`/`n405` ran `git_dirty: true`
(working tree); n403 was clean at `41a148bf9`.

### 9.6 What this does NOT prove

**The Prusac +1 is a coincidental match, not historical validation.** RS takes `prusac_2` at t32
(16 November 1992) by the 19th Brigade through ordinary combat. The record has the 17 August attack
**failing** and establishes **no** 1992 Serb capture of Prusac. So the candidate now agrees with a
reference the evidence does not vouch for. The gain was **not engineered** — no Prusac event, objective,
multiplier or date was added, and a standing test forbids any event granting the cell — it follows from
the earlier cells no longer being taken in November. It must not be read as confirmation of the reference.

**What can and cannot be established for the `prusac_2` aggregate.** The cell is Fakići, Guvna, Potkraj
and **Prusac**. *Established:* the 17 August 1992 attack failed; no later 1992 capture appears anywhere in
the record; three mosques in Prusac were **damaged** — not the village taken — in August/September 1992
(Stanišić ¶249, ¶264); and the ARBiH held Prusac in 1994, attacking *from* it in April and unable to
*push past* it in November (BB2 printed p.466). *Not established:* the January 1993 controller, in either
direction — **a failed August attack is not proof of January ownership** — and anything at all about
Fakići, Guvna and Potkraj. **The January reference is unchanged by this packet and no reference correction
is proposed here.** Any such proposal needs its own dated, geographic evidence and its own commit.

**Jajce moved one turn earlier, and that is a cost.** `jajce_3` now falls t26 (1992-10-05) against the
historical **29 October 1992** — the error grows from ~17 to ~24 days early; `jezero_2` moved the other
way, t31 → t34. This was **not authored**: Op Jajce's definition, timing and queue position are untouched,
and the shift comes from an earlier Serb-held Donji Vakuf shortening the 1st Šipovo Brigade's march. The
Prusac result does **not** depend on it — at a w30 injection the operation still reaches `prusac_2` before
t39. Recorded as a known residual; it must not be allowed to grow, and nothing here may be used to justify
accelerating Jajce deliberately.

**A knock-on exists outside the municipality.** `op:kotor_varos:kotor_varos_2` changed from combat t13 to
paramilitary t14 — same end owner (RS), still matching, but a different texture claim for a municipal seat.

**The documented cascade site is unmeasured.** Operation Donji Vakuf now completes at t32 instead of t43,
freeing five 1KK brigades ~11 turns earlier. `life_lessons/calibration.md` records that exactly this shape
damaged HRHB western Bosnia (Šipovo / Glamoč / Grahovo / Mrkonjić / Drvar) and that the damage is visible
**only at 188 weeks**. The packet waived a new 188-week campaign and stated that later territorial
outcomes do not veto a January correction. That site is therefore **accepted-unmeasured, not cleared**,
and is the first thing to check if this lane reopens at full duration.

**January acceptance is unchanged.** The minimum stays **700**; 702/712 meets it, and meeting it is not
acceptance. Overall January calibration remains **OPEN** unless separately accepted.

---

## 10. Withdrawal — what was removed, what was kept, and what stays open (2026-09-17)

**The owner rejected the §9 mechanism.** The rule, recorded in full at
[CALIBRATION_MASTER.md § OWNER RULE](CALIBRATION_MASTER.md):

> Calibrate military capability and behaviour. Do not author the territorial result.

No new or expanded event-driven OSID ownership transfer is authorized — `control_change` effects in events
or response options, event flags that trigger an equivalent assignment elsewhere, scripted
capture/surrender/withdrawal/defender-removal that guarantees the owner, direct `political_controllers`
writes, initial-control repainting used to bypass an in-campaign action, or target-specific immunity,
guaranteed victory or checkpoint ownership fixes. **A date plus a condition is still prohibited when it
assigns the outcome.** Naming it an "institutional takeover", a "historical correction", an "existing
writer" or a "substantive predicate" changes nothing. A historical citation, a passing suite, a higher
score, an expert's approval or an existing event elsewhere **cannot** supply the missing authorization;
only a separate explicit owner instruction naming the exception can.

**Where §9's reasoning went wrong.** §9.2 established that the alternative writers are dead
(`detectOffensiveParamilitaryTargets` has no production call site; the early-control-flip step is stubbed;
the JNA-phantom path writes unconditionally) and concluded that the event catalogue was therefore the
remaining home. The correct conclusion from those same facts is the opposite: when **every** available
writer is an ownership writer, no authored write is permitted at all. The predicate gating
(`faction_controls_municipality`, then `territory_control` of the town) made the rows *conditional on
state the scenario already guarantees*; it did not make the outcome contingent. The operation could not
fail, be delayed, or not launch, because there was no operation — only an assignment.

### 10.1 What was removed

| Removed | Detail |
|---|---|
| `donji_vakuf_serb_takeover_1992` | Row, `control_change` grant of `op:donji_vakuf:donji_vakuf_2`, narrative, two `dimension_shifts`, flag `donji_vakuf_serb_sjb_control` |
| `donji_vakuf_korenici_1992` | Row, grant of `op:donji_vakuf:korenici`, narrative, flag `donji_vakuf_korenici_taken` |
| `donji_vakuf_torlakovac_1992` | Row, grant of `op:donji_vakuf:torlakovac_2`, narrative, one `dimension_shift`, flag `donji_vakuf_torlakovac_taken` |
| `tests/donji_vakuf_early_sequence.test.ts` | Deleted; its Prusac and objective assertions are re-expressed in the new guard |

`data/scenarios/events/war_1992.json` is now **byte-identical** to its pre-experiment state at
`379427522`. The event-count pin in `tests/event_timeline_integrity.test.ts` returns **161 → 158**.

### 10.2 What was restored, and what that does not mean

`op:donji_vakuf:donji_vakuf_2` is restored as the **fourth** objective of the `donji_vakuf_sweep` axis, in
its authored position (`torlakovac_2 → babin_potok_2 → oborci_2 → donji_vakuf_2 → korenici → prusac_2`).
The executable configuration of `src/sim/combat/pre_planned_operations.ts` is **identical** to
`379427522`; only comments differ.

**Provenance check — the restored tree is `n403`'s configuration, by inspection not by measurement.**
`n403` ran at `41a148bf9` with `git_dirty: false`. Diffing the simulation inputs from that commit to the
withdrawal commit (`git diff 41a148bf9 HEAD -- src/ data/scenarios/ data/source/`) leaves exactly two
files, `pre_planned_operations.ts` and `triggered_operations.ts`, and **every differing line in both is a
comment** — verified by filtering the diff to non-comment lines, which is empty. So the executable
configuration that produced `n403` is what is in the tree now.

**This is a provenance argument, not a measurement. No fresh run was made, and 701/712 is not re-claimed
as a new result** — it is `n403`'s recorded figure, on the configuration now restored.

**This restores the comparison configuration. It does not endorse the chronology.** The engine again
captures the town at **t35 (7 December 1992)** against a documented **17 April 1992** institutional
takeover — the VRS conquering its own Vrbas-92 springboard five months late. **The historical defect
§8 identified remains OPEN** and is now recorded as such in the operation's own block comment.

### 10.3 What was preserved

- **All historical research**, including the ICTY findings in §9.1, the `HISTORICAL_TIMELINE_MASTER.md`
  entries (17 April, 6–7 May, 21 May, 3 June, 13 June, 17 August 1992), the corrected BB citation
  (the "BB1 p.498" scan index is printed folio 461, Appendix G — a **July 1995** table, not a 1992
  roster), and the dead-writer inventory.
- **The `n404`/`n405` evidence** under `logs/donji-vakuf-early-sequence-20260917/`, retained as the
  measurement record of a rejected experiment. It is **not** an acceptance baseline. `n403` (701/712)
  remains the January comparison.
- **The Prusac negative finding**: the 17 August 1992 attack **failed** (Stanišić TJ §242; Exhibit P1757:
  "not successful because of poor command and preparation"), and no 1992 Serb capture of Prusac is
  established anywhere. The 702nd cell was a **coincidental** agreement with an unvouched reference, and
  it disappears with the withdrawal. Prusac's own historical ownership question is **separate and still
  open**; matching its current reference would not have answered it.
- **Čardak** (t23, 1992-09-14), **Pješivac-Kula** (t15 RS→HRHB), the head-of-queue **reservation repair**
  and the **parser repair** are all untouched by this withdrawal — none of them is part of the rejected
  experiment.

### 10.4 The standing guard

`tests/donji_vakuf_no_authored_takeover.test.ts` (8 assertions) fails if any event in any catalogue file
grants `donji_vakuf_2`, `korenici`, `torlakovac_2` or `prusac_2` to any faction — via the primary effect,
an additional effect, or a response option — if any of the three withdrawn ids or flags reappears, or if
any guarded cell is mentioned in **any** effect kind. It also pins the restored objective list, the
staging and combat inputs, and the absence of a target-specific victory multiplier. **The guard was
falsified before being trusted**: re-applying the three rows makes 4 of its 8 assertions fail; removing
them makes all 8 pass. It changes no generic event behaviour and touches no grandfathered exception.

### 10.5 Label correction

§9.6 called the 188-week HRHB western-Bosnia cascade site **"accepted-unmeasured"**. That label is
withdrawn — later effects are **NOT MEASURED / DEFERRED**, never "accepted". The point is moot for this
change, since the change is gone and the operation's completion turn returns to t43, but the labelling
rule stands for any future experiment on this lane.

### 10.6 What stays open

1. **The town's capture date.** t35 vs 17 April 1992. No sound replacement exists yet. A repair must come
   from the military-capability side: an early, contingent, ordinary action path by forces that can
   actually reach the town in April–June 1992. See §11 for the specialist findings on whether such a path
   exists at all.
2. **Korenići (21 May 1992) and Torlakovac (3 June 1992)** carry the same defect and are back in the
   post-Jajce sweep for the same reason.
3. **Prusac's 1992–93 ownership** — the reference says RS in January; the evidence establishes a failed
   August attack and nothing more.
4. **Vranjevići / Kružanj** — unchanged, unresolved, outside this lane.
5. **Op Jajce's chronology** — `jajce_3` returns to its pre-experiment turn with the withdrawal; the
   underlying ~17-day error against 29 October 1992 predates this lane and is unaffected.

---

## 11. Specialist consultation — the bottleneck, the authority boundary, and the decision (2026-09-17)

Status: **read-only.** No calibration edit was made, no simulation was executed, no ownership writer was
touched, and no force value was changed. This section is the consultation receipt the packet requires
**before** any new calibration edit, and the record of the decision that follows from it.

### 11.0 Host note — how the consultation was actually run

The host exposes the `Task` tool with general-purpose subagents; it does **not** expose named Pyrrhic role
agents. Each consultation below was dispatched as an independent subagent that read the relevant
`.claude/skills/<role>/SKILL.md` body and examined the current source and the preserved artifacts itself.
The independent reviewer (D) was a separate subagent and did **not** author the conclusion it reviews.
This is the closest capability the host supports. It is stated plainly, per the packet's instruction to
report the limitation rather than present a single author's synthesis as independent consultation.

Every specialist below examined commit `5a6cd19d0`. Each response is summarised with its functions/files,
its evidence, its conclusion and its unresolved points. Disagreements were returned to evidence and are
recorded in 11.D.

### 11.A Gameplay / Systems Programmer — what determines the fight?

Traced the production path orders → battle → control, from the current code.

- **Attackers** — `generateAllBotOrdersOsid` (`bot_brigade_ai_osid.ts:703`) → `executeFactionDirectivesImpl`
  (`:458`) → `evaluateSectorAttack` (`bot_brigade_eval_attack.ts:176`), which writes the order
  (`:397`). Hard gates: `MIN_ATTACK_PERSONNEL` ≥ 500 (`formation_constants.ts:82`), tactical adjacency
  (`bot_brigade_eval_attack.ts:284-287`), predicted outcome ≥ the op threshold (`:375-379`),
  `MAX_ATTACKERS_PER_TARGET` 12 (`bot_brigade_targeting.ts:34`), per-corps share trim (`:772-793`).
  **Brigades never attack independently** — all attack flows through a `CorpsOperation`.
- **Defenders** — sector responsible via `findSectorForEnemyOsid` (`sector_utils.ts:118`), roster via
  `getStandingOgDefenseBrigadeIds` (`standing_og_defense.ts:13`), physical/reactive split and stacking in
  `rankDefendersByPower` (`attack_resolution_osid.ts:764,847,872`; `combat_math.ts:1874`), final assembly
  `:809-869`.
- **Personnel** enters `basePower` **linearly and once**:
  `personnel × equipmentRatio × (0.6 + 0.4·clamp(experience,0,1)) × (cohesion/100) × honorMult`
  (`combat_math.ts:1116-1124`). Its only other entry is casualty engagement
  (`attack_casualty_distribution.ts:53-73`; `DEFENDER_CASUALTY_ENGAGEMENT_CAP=1.5`,
  `combat_math.ts:301`). Personnel is **not** in `getEquipmentRatio`, composition, concentration
  (count-based), or the attack-decision threshold.
- **Outcome bands / floors.** decisive ≥2.0, victory ≥1.5, costly ≥1.0, stalemate ≥0.7, repulsed ≥0.5
  (`combat_math.ts:124-128`). Op Donji Vakuf's `min_attack_outcome: 'repulsed'` (`pre_planned_operations.ts:1064`)
  means **only `catastrophic` fails the attack gate** — the attack is effectively unconditional once an
  eligible participant exists.
- **Control writer.** On an occupying win, `state.political.political_controllers[targetOsid] = attackerFaction`
  (`attack_resolution_osid.ts:1477`) with `ControlEvent mechanism:'combat'` (`:1480-1489`). No event writer
  on this path.
- **Predictor vs resolver.** `execution_attack_power_mult` (Op Donji Vakuf = **1.65**) is applied in **both**
  (`combat_predictor.ts:503`; `attack_resolution_osid.ts:983`). The predictor omits concentration, tempo,
  firepower-deficit, intel friction, last-stand and donor power, and adds a fog discount plus a
  `costly_victory → stalemate` downgrade — decision-time only, not resolution.
- **Receipt reconstruction (n396 w35, town).** Resolved: attacker `rs_16th_krajina_motorized`, defender
  `arbih_705th_slavna_mountain`, `decisive_victory`, **ratio 3.97**. Predicted operands are **not
  recoverable** (`power_breakdown`/`axis_reject` instrumentation is off in n396/n403/n404/n405), so only the
  resolved ratio is receipted; the defender personnel base invert to ≈1,600 — reported as bounded, not as a
  measured decomposition.
- **Would +personnel matter?** `rs_16th_krajina_motorized` is at its 2,200 cap in these fights, so a grant is
  **excluded** unless the cap changes. `rs_19th`/`rs_31st` are **not participants** at t34 (the operation's
  receipts list 16th/22nd/5th/1st_banja_luka; the 19th/31st carry `active_op_id=null`), so their personnel is
  inert for the w35 battle. The w35 town capture was already `decisive_victory`, so personnel changes the
  **margin**, not the capture decision or the sequential objective chaining.

Unresolved: predicted-vs-actual decomposition is not in any relevant run (instrumentation off); the exact
w35 attacker set is not serialized.

### 11.B Operations Expert — do the available forces actually get to fight?

**The prior §9.2 "single sequential slot" claim is half-wrong and is corrected here.**

- The authored 1KK chain does occupy pre-planned slot 0: Prijedor → Corridor → Jajce → Donji Vakuf, and
  `injectQueuedOperation` (`pre_planned_operations.ts:2205`) fires only when `isSlot0AvailableForQueue`
  (`corps_operation_helpers.ts:193`) is true, so Op Donji Vakuf injects at **w30**.
- **But slot 0 does not exclude the commander paths.** At **w5** a 1KK **probe**
  (`vrs_1st_krajina:probe_vrs_1st_krajina_t4`, brigade `rs_11th_mrkonji_light_infantry`) attacked
  `op:donji_vakuf:donji_vakuf_2` with **`decisive_victory`, ratio 6.94, `attacker_won true`** — independently
  re-read from `runs/apr1992_definitive_188w__6898d6d2e324c7a3__w188_n396/weekly_report.jsonl` week 5 by the
  integrator. **No control change followed**, because `buildProbeOperation` sets
  `occupies_on_victory: false` (`corps_operation_helpers.ts:460`) and the resolver honours it
  (`attack_resolution_osid.ts:1450-1454`). So **force, position and combat capability are not the
  constraint.**
- `bot_strategy.ts:486` 'Krajina Sweep' (weight **45**, w12-30, targets `donji_vakuf`) and `:501` '1KK
  Consolidation' (weight **35**, w40+) are **below** the `army_hq_overrides.ts:11-13` probe threshold **50**,
  so they can never emit an override; they only bias brigade concentration. They generate no attack.
- No `triggered_operations.ts` entry targets `op:donji_vakuf:*`. Commander local-occupation returns null for
  `turn <= 20` (`commander/emit.ts:324`). `sector_offensive.ts`'s launch function has **no production call
  site** (`bot_corps_directives.ts:56` is an unused import). The opportunity-plan branch (`plan.ts`) needs a
  free corps and ≥3 reachable surplus brigades (`plan.ts:95`) and did not form here.
- Local formations are genuinely available: `rs_19th` sits at `op:donji_vakuf:jemanlici` (RS, adjacent to the
  town) and `rs_31st` is on the Jajce frontage; the 19th and 31st are **not roster-reserved before w19**
  (`getHeadQueuedPrePlannedBrigadeIds` bounds only the queue head). They are simply never selected for a
  **capturing** operation before w30.

Conclusion: bottleneck is **incorrect scenario/operation configuration** (no capture-capable operation
routed at this frontage in April–June 1992) **compounded by force not selected/committed**. Not combat
capability (disproved by the w5 probe at 6.94); not an implementation defect (`occupies_on_victory:false` and
slot-0 sequencing are explicit, documented behaviour). This is the same shape the calibration life lessons
already record — "FROZEN meant never-flipped, not never-attacked" (`docs/life_lessons/calibration.md`,
2026-08-25) — so no new lesson is added; the existing entry is cited rather than duplicated.

Unresolved: why the w4–5 intent competition produced no opportunity plan for this zone — no decision trace
survives.

### 11.C Formation Expert, with Historian — which force inputs are credible?

Traced `data/source/oob_brigades.json` → `oob_loader.ts:187,228` → `buildRecruitedFormation`
(`recruitment_engine.ts:217-268`) → live state → battle.

- Authored `initial_personnel` are 1000/1000/1000/1200/1200 for 19th/31st/22nd/5th/16th; live t35 in n403 are
  **824 / 856 / 1482 / 888 / 2200**.
- The 19th (~824) and 31st (~856) are **within or below** their bounded historical band (~800–1,500 and
  ~600–1,200) — labelled calibration estimates, not citations.
- **Local capacity is already spent.** Donji Vakuf had **9,364 Serbs** in 1991; the engine force-seeds
  **2,000** men for the 19th+31st — roughly all military-age Serb males of the municipality. An upward
  personnel adjustment is **not credible from local capacity** and would not survive the spawning contract
  without importing men from elsewhere.
- `rs_16th_krajina_motorized` is a **Banja Luka** formation, not placed in this sector in 1992: BB2 printed
  p.330 names **"the 19th at Donji Vakuf and the 22nd at Mount Vlašić"** as Vrbas 92's flank brigades. The
  16th is the actual t35 taker only because of engine availability after Corridor — the operation's own
  comment concedes this (`pre_planned_operations.ts:1036-1039`).
- Personnel does **not** alter composition or equipment ratio: `buildBrigadeComposition`
  (`recruitment_engine.ts:174-197`) is a function of equipment class × faction only.

Conclusion: **a personnel adjustment is not the credible lever for this defect** — the local inputs are
already at or below the record's band, and the load-bearing authoring problems are operational (roster
composition, the authored `execution_attack_power_mult: 1.65`, queue timing), which the owner rule treats as
operational/territorial authoring, not force inputs.

Unresolved: no direct 1992 strength figure exists in the repo knowledge base for the 19th/31st; whether the
31st was a formed brigade in April 1992 is not established; the exact 1992 role of the 22nd/5th is not
attested.

### 11.D Independent War-or-Game / Canon Reviewer — challenge

The reviewer independently re-verified the load-bearing claims against the current runtime and the
preserved artifacts. Verdicts: every load-bearing claim **CONFIRMED** except two immaterial phrasings —
11.A's reason for the 19th/31st being inert (it said "not adjacent"; the correct reason is
**non-participation**, `active_op_id=null`) and 11.B's "no capture-capable operation configured" (too
strong: emergent capture-capable `sector_attack`s — Kotor Varoš t10, Bor t27, Sjever t29 — exist; none was
routed **at this frontage** in the window). The reviewer's packet checks: no edit dictates control; the
identified direction (a contingent capturing operation) could fail, be delayed or not launch; costs and
defensive obligations are preserved; the historical question is not a painted-map target (the jan1993
reference already matches at t39; the defect is chronological/realism); the reference/aggregation issues are
documented, not concealed.

**Missed lever: none that is genuinely in-scope.** The only force-sensitive alternative path,
`tryCreateFromOpportunity` (`plan.ts:1287-1345`), is blocked by a live major op (`plan.ts:939-956`), loses
to authored ops (`plan.ts:991-1006`) and empirically never chose this frontage early. A global VRS
force buff to make it fire would be untargeted, unmeasured at 188w, would still misrepresent a **police
(SJB) takeover** — which force parameters structurally cannot model — and would grant the cell's five
Bosniak-majority settlements unsupported months.

**Residual the reviewer flagged (recorded, not fixed):** `tests/donji_vakuf_no_authored_takeover.test.ts`
robustly covers the **event catalogue** (all files, primary/additional/response effects, plus any effect
mentioning a guarded cell) but does **not** cover `init_control` / `osid_control_overrides` initial-controller
repainting, nor a newly authored operation targeting the town. If this lane reopens, that is the uncovered
surface.

### 11.E Decision — bottleneck, lever, and authority boundary

| | |
|---|---|
| **Bottleneck** | Incorrect scenario/operation configuration: no capture-capable operation routed at the Donji Vakuf frontage in April–June 1992, compounded by force not selected/committed. |
| **Not** | Combat capability (w5 probe 6.94), implementation defect, or insufficient historical force (local inputs at/below band). |
| **In-scope force-level lever** | **None exists.** Personnel/equipment/readiness/cohesion/experience/officer-quality cannot create an operation; the 19th/31st are already at or below their credible strength; the 16th is capped and historically misplaced here. |
| **Decision** | **No new calibration edit.** The withdrawal and its documentation stand. |
| **Required change (reported, not implemented)** | A contingent, capturing operation for this frontage available Apr–Jun 1992 on an existing channel — a new triggered/pre-planned operation definition, or a change making the existing opportunity-plan branch viable there. This is an operation/configuration change, is **out of scope**, and needs separate authorization. |

This is the packet's anticipated outcome: "do not try to represent an April action by strengthening a force
that cannot act there until November … If the current configuration cannot provide one, report the precise
operation/configuration change needed rather than forcing ownership or inflating troops in the wrong
period."

### 11.F Measurement disposition

No candidate was produced, so **no fresh run was made and none is claimed.** `n403`'s recorded **701/712**
remains the January comparison. The withdrawn tree's executable identity to `41a148bf9` (which produced
`n403` clean) is confirmed independently: `git diff 41a148bf9 HEAD -- src/ data/scenarios/ data/source/`
filtered to non-comment lines is **empty**. January calibration remains **OPEN**; 701/712 is a recorded
figure on the restored configuration, not a new measurement, and meeting the minimum is not acceptance.

---

## 12. Bounded operation-configuration experiment — the triggered offer was INERT; reverted (2026-09-17)

A separate owner packet authorized **one** bounded local operation-configuration experiment through an
existing live operation-admission path — an *attempt* to take and hold `op:donji_vakuf:donji_vakuf_2`, not a
guaranteed capture — while the event-flip prohibition and every owner boundary stayed in force. Full record:
[`logs/donji-vakuf-local-action-20260917/`](../../logs/donji-vakuf-local-action-20260917/) (predeclared
`CHANGE_SPEC.md`, `OUTCOME.md`, evidence).

**Candidate.** One new `TriggeredOpDef` (`Donji Vakuf Local Action`) on `vrs_1st_krajina`: objective
`op:donji_vakuf:donji_vakuf_2`, participants `rs_19th_krajina_light_infantry` (anchor, adjacent at
`op:donji_vakuf:jemanlici`) + `rs_31st_light_infantry`, window `turn >= 2 && turn <= 6 &&
hasEnemyObjective(...)`, `planning_duration: 2`, no `execution_attack_power_mult`. The Operations Expert and
Gameplay/Systems specialist confirmed the path, and the independent reviewer **APPROVED** the spec. In
isolation the definition admitted correctly (11 focused assertions via `checkTriggeredOperations`).

**Measured: it never launched.** Run `n406` (`--weeks 39`) — `triggered_operations_accepted` has no entry for
it; `verify_checkpoints` jan1993 = **701 / 712**; a cell-by-cell comparison against
`painted_control_jan1993.json` is **identical to `n403`** (same 11 mismatches, **FIXED 0, NEWLY INTRODUCED
0**); `anchor_checks`, `behavioral_health`, `attack_resolution` and `takeover_displacement` are
byte-identical to `n403`. The town is still captured at **t35** by the authored operation. The only state
difference is the `watched_operations` trace the never-firing def writes in t2–6.

**Root cause, from retained evidence.** The trigger is true and the slot free from t2, but
`rs_19th_krajina_light_infantry` is **persistently `in_transit` to `op:donji_vakuf:pribraca_2`** (from t1,
location never leaving `jemanlici` through t16+). `buildOperation` excludes in-transit brigades, so only the
31st survives the axis and `allParticipating < MIN_OPERATION_PARTICIPANTS (2)` →
`build_insufficient_participants`; at t5 the t4 probe on the same objective yields `objective_overlap`
first. The stale order is **pre-existing in the unmodified baseline** (`pribraca_2` appears nowhere in
`src/` except the late-war RBiH opportunity catalog), i.e. a movement/availability blocker, not an
offer-definition one.

**Disposition.** Reverted before commit — the definition, the catalogue-pin reconciliation and the focused
test are removed, because an operation that cannot fire in the only scoring scenario is an inert operation,
which the packet forbids shipping. `src/sim/combat/triggered_operations.ts` and
`tests/triggered_operations.test.ts` are byte-identical to `b9024b97b`; no ownership writer, baseline,
reference or threshold was touched. The historical defect stays **OPEN**.

**Next proposed change — separate, not implemented.** (1) Re-select participants from 1KK brigades actually
free at t2–6 (the 31st plus the 11th Mrkonji, the brigade that already attacked this cell as a probe at w5,
and/or the 22nd Krajina) under its own predeclared spec; settle first whether such an op can open an attack
inside the window. (2) Investigate why the 19th never clears its `in_transit` state — a movement-layer
question that would also restore the historically correct Donji Vakuf formation. (3) Reserving non-elite
triggered participants before the generic movement router runs is a broader admission/reservation-policy
change requiring separate authorization; it is not proposed as a fallback.
