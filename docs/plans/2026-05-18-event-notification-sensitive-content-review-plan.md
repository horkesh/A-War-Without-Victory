# Event Notification Sensitive Content Review Plan

**Date:** 2026-05-18
**Owner:** Future content pass
**Input tracker:** `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
**Output target:** `notifications_to_other_factions` blocks on gated `requires_player_response` events

## Scope

This plan covers the residual event-notification backfill rows that were intentionally not authored during safe-content batches. The future pass may add recipient notification text only after the relevant gate has been cleared.

No sensitive recipient copy is provided here.

## Residual Classification

| Review type | Rows | Remaining recipient blocks | Events |
|---|---:|---:|---|
| Historian-required | 6 | 28 | `drina_cleansing_decision_1992`; `concentration_camps_revealed_1992`; `srebrenica_demilitarization_1993`; `operation_lukavac_93`; `nato_ultimatum_sarajevo_1994`; `un_hostage_crisis_1995` |
| Narrative tone required | 0 | 0 | Closed 2026-05-22 by the 1992 foundational-decision narrative-tone slice. |
| Washington timing policy | 2 | 8 | `washington_agreement_1994`; `ic_rbih_restraint_post_washington` |
| Late-war outcome policy | 7 | 28 | `contact_group_plan_1994`; `belgrade_embargo_rs_1994`; `carter_ceasefire_1994`; `karadzic_mladic_split_1995`; `us_halts_federation_advance_1995`; `holbrooke_ceasefire_demand_oct95`; `dayton_talks_begin_1995` |
| Front-visit mixed-sensitive | 3 | 18 | `visit_to_front_rbih`; `visit_to_front_rs`; `visit_to_front_hrhb` |

## Prep Matrix Addendum 2026-05-21

Docs-only prep is complete:

- Residual matrix: `docs/40_reports/audits/20260521_EVENT_NOTIFICATION_RESIDUAL_REVIEW_MATRIX.md`
- Historian packet: `docs/40_reports/audits/20260521_EVENT_NOTIFICATION_HISTORIAN_REVIEW_PACKET.md`
- Narrative/timing/outcome packet: `docs/40_reports/audits/20260521_EVENT_NOTIFICATION_NARRATIVE_TIMING_PACKET.md`

The original matrix reconciled the tracker to event JSON at 20 rows / 102 missing recipient blocks and assigned every missing block to one of six buckets: safe (12), historian-required (34), narrative-tone (16), Washington-timing (8), late-war-outcome (28), and blocked-sensitive (4). After the 2026-05-21 safe slice and 2026-05-22 narrative-tone slice, the active residual is 18 rows / 82 blocks.

First implementation slice closed 2026-05-21: safe rows only, capped below five event rows. The twelve safe front-visit blocks for `visit_to_front_rbih`, `visit_to_front_rs`, and `visit_to_front_hrhb` are authored. Second implementation slice closed 2026-05-22: the two narrative-tone 1992 foundational-decision rows are authored. Blocked-sensitive and other gated front-visit blocks remain out of scope.

Required tests for the safe slice:

```powershell
npx.cmd vitest run tests/sim/events/event_notification_content_backfill.test.ts tests/sim/events/two_level_surfacing.test.ts tests/ui/inboxItems.notifications.test.ts tests/event_timeline_integrity.test.ts --reporter=dot
```

Feature-flag-off baseline behavior must remain stable; notification text may only emit through the existing two-level-notification path.

## Review Lanes

1. Historian-required lane
   - Confirm each recipient notification is grounded in the event's existing title, narrative, response label, response description, effects, flags, and cited historical source.
   - Require explicit reviewer sign-off before atrocity, detention-camp, safe-area, siege, NATO-ultimatum, or hostage-crisis copy is added.
   - Stop if a needed fact is not already supported by the event row or a cited source.

2. Narrative tone lane
   - Apply to sparse opening-political rows where remaining options are not graphic but need careful inter-faction framing.
   - Avoid omniscient accusations, present-day moralizing, and prose that grants private intent to non-source factions unless already authored in the row.
   - Keep notification bodies as intelligence/diplomatic readouts, not new event narration.

3. Washington timing lane
   - Preserve the established policy split: `washington_signed` / `washington_turn` is the emergent live framework predicate, while `washington_agreement_1994` is the authored week-102 historical event.
   - Recipient copy must describe formal historical-signature events only for `washington_agreement_1994`.
   - Recipient copy for `ic_rbih_restraint_post_washington` must not imply the formal agreement fires before its calendar/narrative event.

4. Late-war outcome lane
   - Review copy against late-war diplomacy and outcome policy before authoring.
   - Keep notifications compatible with alternate simulation state. Do not assert Dayton, territorial percentages, refugee outcomes, Banja Luka outcomes, or final settlement facts unless the triggering event and prerequisites already make them true.
   - Stop if a response would require policy on counterfactual end-state claims.

5. Front-visit mixed-sensitive lane
   - Treat recurring front visits as mixed operational, morale, media, and sensitive-location notifications.
   - Separate ordinary command-visit options from Sarajevo siege, Drina enclave, Bihac pocket, Mostar blockade, central Bosnia, detention-camp press, or international-observer implications.
   - Author only the options cleared for tone and historical sensitivity; leave unclear options absent.

## Implementation Steps

1. Start from `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md` and keep its coverage table as the source of truth for residual counts.
2. For one review lane at a time, prepare a short reviewer note listing the exact event ids, response ids, target factions, and supporting row text.
3. Obtain required historian, narrative, timing, or outcome-policy sign-off before editing any event JSON.
4. Add `notifications_to_other_factions` only for cleared response/recipient pairs.
5. Update `tests/sim/events/event_notification_content_backfill.test.ts` with the newly cleared rows and expected recipient sets.
6. Update `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md` coverage counts and move completed rows out of residual scope.
7. Add an implemented report summarizing lane, rows, counts, reviewers, and verification.

## Acceptance Criteria

- Every added notification has `headline` and `body` for exactly the intended non-source recipient factions.
- No notification is authored for the responding faction.
- No fallback prose is invented for uncleared rows; absent blocks remain absent.
- Copy is supported by the event row and accepted source/reviewer note.
- Feature-flag-off behavior remains baseline-stable.
- Feature-flag-on notification emission remains deterministic and sorted by `notification_id`.
- The tracker count matches the event JSON after the pass.

## Stop Gates

- Stop if a row needs new historical claims not already present in the event row or cited source.
- Stop if reviewer notes conflict with canon, Washington timing policy, or late-war outcome policy.
- Stop if a recipient notification would disclose knowledge the target faction should not plausibly receive.
- Stop if a recurring front-visit option mixes safe command-presence copy with unresolved atrocity, siege, enclave, detention, or blockade implications.
- Stop if tests reveal notification text is emitted with `AWWV_TWO_LEVEL_NOTIFICATIONS` disabled.

## Required Verification For Future Content Pass

- `npm run test -- tests/sim/events/event_notification_content_backfill.test.ts`
- `npm run test -- tests/sim/events/two_level_surfacing.test.ts`
- `npm run test -- tests/ui/inboxItems.notifications.test.ts`
- `npm run test -- tests/event_timeline_integrity.test.ts`
- `git diff --check -- data/scenarios/events docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md tests/sim/events/event_notification_content_backfill.test.ts`

If a tracker consistency script is added in the future, it should assert that every row listed as complete has all non-source recipient blocks for all response options, and that every row listed as residual still has the expected missing blocks.
