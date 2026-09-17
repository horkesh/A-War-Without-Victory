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
