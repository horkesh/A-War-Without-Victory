# BC04 P2 independent Historian + technical-plan review

**Review basis:** HEAD `f117fe47536398add3a966d177b3dce54fc820ac`;
`historical-targets.md`; `trace.md`; `fixture-output.json`; the P2 portions of the
2026-09-06 Historian, scenario/calibration, engine/systems, and red-team seat
records. This was a bounded review. No campaign, production/test edit, canon
edit, or new panel was performed.

## Historical ratification

The target groupings are **GO**:

| Receipt(s) | Ratified historical placement | Source posture |
|---|---|---|
| Tuzla Kapija / UN hostage crisis | 25 May 1995 and the onset week containing the NATO strikes of 25-26 May | The Court of BiH page is a **first-instance judgment announcement**, used for the 25 May date and not as a claim that the original sentence remained unchanged. NATO's 1997 background records the 25-26 May strikes followed by hostage-taking. |
| Srebrenica fall / column | 11 July and the night of 11-12 July/following days, together in 10-16 July | *Krstić* **Trial Judgment** paragraphs 36 and 60-62. This does not substitute trial posture for appeal posture. |
| Zepa | Week containing 25 July, two weeks after Srebrenica | *Tolimir* **Trial Judgment** paragraphs 639-641 establishes that civilian transportation began on 25 July and continued through 27 July. This ratifies the panel's late-July receipt target; it does not compress every aspect of Zepa's fall into one day. |
| Markale II / Deliberate Force | 28 and 30 August together in 28 August-3 September | NATO's *Crossing the Rubicon* gives both dates. BB1 KB p.414 (printed p.377) corroborates Markale II and the chapter's 30 August opening; BB1 KB p.423 (printed p.386) states the air campaign began on 30 August. |

The July BB1 page range is absent locally, so the ICTY judgments properly fill
that gap. No BB citation should be invented for it.

## Numeric tuple and display semantics

The raw receipt tuple is **historically ratified as completed-week placement**:

`164 / 164 / 171 / 171 / 173 / 178 / 178`

in this order: Tuzla, hostage crisis, Srebrenica, column, Zepa, Markale II,
Deliberate Force. It maps to completed intervals 22-28 May, 10-16 July,
24-30 July, and 28 August-3 September 1995.

This ratification depends on the well-supported interpretation of `runTurn`:
receipt `tN` is written after the pre-increment while closing the interval from
`date(tN-1)` through `date(tN)-1 day`. The save stores a turn, not an occurrence
date or interval. Existing chronology readers label the receipt with the
post-advance boundary date. Therefore the proposed receipt-only completed-week
range formatter is justified and necessary for the UI to state what the weekly
simulation actually resolved. It must leave current-state headers, epoch, save
turns, and schema untouched.

## Proposal assessment

The catalog-only alternative is **not coherent**. The real-function fixture
shows the pre-fire snapshot delays the column to `t172` and Deliberate Force to
`t179`, outside their ratified weeks. Moving the upstream rows earlier makes the
upstream historical events early; deleting or duplicating prerequisites weakens
the authored causal contract.

The proposed opt-in is the smallest technically coherent mechanism:

- `same_turn_requires_events: true` only on
  `srebrenica_column_breakout_1995` and `nato_deliberate_force_1995`;
- one post-primary, canonical-order snapshot wave over unprocessed opted-in
  automatic rows;
- no recursion and no second readiness update;
- loader rejection unless the row is `once:true`, pressure-free,
  response-free, and has non-empty `requires_events`;
- existing `requires_events`, conditions, maxima, effects, Zepa floor/backstop,
  initial control, and operation rows preserved.

That contract preserves deterministic ordering, keeps pressure accrual at once
per turn, and leaves all non-opted-in rows on the existing next-turn default.
The focused tests listed in `trace.md` are proportionate. The post-wave tests
must pin upstream-before-dependent report order, canonical order among multiple
eligible opted-in rows, absence of third-level cascade, and unchanged behavior
for every non-opted-in prerequisite row.

## Verdict: CHANGES NEEDED before implementation authorization

The history and concrete mechanism are sound, but the proposal is not yet
compliant with the existing panel signature. Two recorded panel conditions are
still binding:

1. The scenario/calibration seat required P2 to move `turn_min` only. The newly
   established ordering evidence proves that condition cannot deliver the
   ratified same-week pairs, but evidence does not silently retire the condition.
2. The engine/systems seat required the D3 loader lint and its two P2-derived
   siblings to be written first. HEAD does not contain those lints, and the
   smallest proposal omits them.

The owner must explicitly amend or retire those two process conditions before
authorizing this implementation shape. No new broad sensitive-history panel is
needed for the historical dates: the proposal preserves event-owned enclave
outcomes, the existing prerequisites, and all Ring-3 restrictions. If the owner
does not retire the lint-first condition, the lint work must precede P2 and the
current proposal is no longer the authorized single smallest packet.

This verdict approves neither implementation nor a 188-week campaign. After the
authority residual is resolved, the proposed implementation should still stop
after focused tests; the existing controlled 188-week and full anchor-diff gate
remains the later calibration acceptance check, not part of this investigation.
