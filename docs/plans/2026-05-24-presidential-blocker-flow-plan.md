# Presidential Blocker Flow Simplification Plan

Date: 2026-05-24
Branch: `codex/presidential-desk-flow`

## Problem

The current presidential Inbox can show an urgent/blocking item, but blocked advance often routes the player into the Army HQ Decision Room. That screen is a synthesis board, not the owner of every required decision, so the player can land on non-clickable or indirect review rows and still be blocked without a clear next action.

## Target Flow

1. Inbox rows for hard decisions open the owning modal or panel directly.
2. ADVANCE always opens the advance confirmation modal.
3. If advance is blocked, the modal lists concrete presidential blockers first, with direct action buttons.
4. Decision Room remains a briefing/synthesis surface and can link to owners, but it is not the primary blocker resolver.
5. Player-facing text must avoid opposing-faction internals, raw ids, and non-player implementation names.

## Implementation Tasks

1. Add a direct presidential blocker read model with focused tests.
2. Sanitize blocker-facing Inbox text, starting with convoy decisions.
3. Wire the advance modal to show direct blockers and dispatch the same actions as Inbox.
4. Change Warroom ADVANCE so blocked turns open the advance modal instead of detouring to Decision Room.
5. Retune Decision Room review-card routing/copy toward the Inbox when it represents unresolved presidential reviews.
6. Verify focused UI tests, typecheck, and diff hygiene.

