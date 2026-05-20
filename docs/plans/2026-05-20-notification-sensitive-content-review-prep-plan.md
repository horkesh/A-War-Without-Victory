# Notification Sensitive Content Review Prep Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare a non-code review packet for the remaining event notification content blocks so future authors can clear safe rows without inventing sensitive or counterfactual prose.

**Architecture:** Classify each residual event row and missing recipient block before authoring text. Separate safe, historian-required, narrative-tone, Washington-timing, late-war-outcome, and blocked-sensitive work.

**Tech Stack:** Documentation-only review, `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`, event JSON inspection, existing notification content tests for later implementation passes.

---

## Source Evidence

Existing plan: `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`.

Known residual floor from Batch 9 notification audit:
- 20 event rows.
- 102 missing recipient blocks.
- Existing classes: historian-required, narrative-tone, Washington-timing, late-war-outcome, and front-visit mixed-sensitive.

This prep plan adds an explicit `safe` and `blocked-sensitive` sorting pass before any text is authored.

## Scope

In scope:
- Documentation-only classification.
- Event id, response id, source faction, target faction matrix.
- Reviewer-needed notes.
- Clear "safe to author" versus "needs sign-off" split.

Out of scope:
- Writing notification body copy.
- Editing event JSON.
- Adding tests.
- Changing notification emission behavior.

## Classification Buckets

Use exactly these buckets:

| bucket | meaning | allowed next action |
|---|---|---|
| safe | Row text and effects support neutral recipient notification with no sensitive-history or timing risk. | Future content author may draft text with normal review. |
| historian-required | Atrocity, detention, safe-area, hostage, NATO ultimatum, or similar historical claim. | Historian review required before drafting. |
| narrative-tone | Politically charged but not graphic; needs careful faction framing. | Narrative review required before drafting. |
| Washington-timing | Risks conflating live framework predicate with formal Washington Agreement event. | Timing policy review required before drafting. |
| late-war-outcome | Risks asserting Dayton, end-state, territorial, or counterfactual late-war outcome. | Outcome-policy review required before drafting. |
| blocked-sensitive | Should not be authored from current data because it would add unsupported facts or disclose implausible knowledge. | Leave absent; record blocker. |

## Task 1: Build The Residual Matrix

**Files:**
- Create: `docs/40_reports/audits/YYYYMMDD_EVENT_NOTIFICATION_RESIDUAL_REVIEW_MATRIX.md`

**Steps:**
1. Read `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`.
2. For every residual event row, list:
   - event id
   - response ids still missing blocks
   - source/responding faction
   - target recipient faction
   - current title/narrative/effects fields that support or do not support recipient copy
3. Count rows and blocks.
4. Confirm the matrix count equals 20 rows / 102 blocks unless the tracker has changed.

**Acceptance:** The matrix is count-complete before classification.

## Task 2: Assign Buckets

**Files:**
- Modify: `docs/40_reports/audits/YYYYMMDD_EVENT_NOTIFICATION_RESIDUAL_REVIEW_MATRIX.md`

**Steps:**
1. Classify each missing block into one bucket.
2. If a row has mixed buckets, split by response id and recipient faction.
3. Add one-sentence reason per bucket assignment.
4. Mark rows with no safe blocks as "blocked for content implementation."

**Acceptance:** Every missing block has one bucket and one reason.

## Task 3: Prepare Reviewer Packets

**Files:**
- Create: `docs/40_reports/audits/YYYYMMDD_EVENT_NOTIFICATION_HISTORIAN_REVIEW_PACKET.md`
- Create: `docs/40_reports/audits/YYYYMMDD_EVENT_NOTIFICATION_NARRATIVE_TIMING_PACKET.md`

**Steps:**
1. Historian packet includes only historian-required and blocked-sensitive rows.
2. Narrative/timing packet includes narrative-tone, Washington-timing, and late-war-outcome rows.
3. Safe bucket rows stay in the residual matrix and do not need a separate packet.
4. Include exact event ids and response ids, not prose summaries only.

**Acceptance:** A future reviewer can approve or reject rows without searching the entire event catalog.

## Task 4: Define The Future Implementation Slice

**Files:**
- Modify: `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`
- Modify: `docs/PROJECT_LEDGER.md`

**Steps:**
1. Add a "prep matrix" addendum linking the new matrix and reviewer packets.
2. Define the first future content slice as safe rows only, capped at no more than 5 event rows.
3. Define required tests for that future slice:

```powershell
npx.cmd vitest run tests/sim/events/event_notification_content_backfill.test.ts tests/sim/events/two_level_surfacing.test.ts tests/ui/inboxItems.notifications.test.ts tests/event_timeline_integrity.test.ts --reporter=dot
```

4. State that feature-flag-off baseline behavior must remain stable.

## Required Verification For This Prep Pass

```powershell
git diff --check
```

No typecheck or baseline run is required for a docs-only classification pass.

## Stop Gates

- Stop if tracker counts do not reconcile to event JSON.
- Stop if an event row lacks enough support for any recipient copy.
- Stop if a row would require new historical claims.
- Stop if recipient copy would disclose knowledge the recipient faction should not plausibly have.
- Stop if Washington timing would be ambiguous.
