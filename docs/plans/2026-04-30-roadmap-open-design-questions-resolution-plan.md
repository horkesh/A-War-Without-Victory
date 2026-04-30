# Roadmap Open Design Questions Resolution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the Master Roadmap's open design questions into explicit design decisions, deferrals, or child-plan triggers before any related implementation starts.

**Architecture:** This is a design-governance plan. It does not answer the questions by itself; it defines who must answer, what evidence is required, and which roadmap milestone consumes the answer.

**Tech Stack:** Documentation, canon review, scenario evidence, UI/product architecture review.

---

## Questions Covered

1. Negotiation counter-offers
2. International intervention
3. Multiplayer
4. Modding
5. Play length / quick modes
6. War economy depth

Resolved questions remain documented in canon and do not need new design sessions:

- Victory / Pyrrhic scoring
- Srebrenica / sensitive-history boundary

## Task 1: Negotiation Counter-Offers

**Files:**
- Reference: `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`
- Reference: `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md`
- Reference: `src/sim/negotiation/*`
- Output: `docs/40_reports/design/YYYYMMDD_NEGOTIATION_COUNTER_OFFER_DECISION.md`

**Steps:**
1. Decide whether player agency is map-drawn, package-based, or dimension-derived only.
2. Evaluate UI burden, save compatibility, and canon risk.
3. Produce decision with milestone owner (`v0.9.1`, post-1.0, or no).

## Task 2: International Intervention

**Files:**
- Reference: `docs/40_reports/COMBAT_MASTER.md`
- Reference: `docs/20_engineering/EMERGENT_CASCADE_ARCHITECTURE.md`
- Reference: `data/scenarios/events/*`
- Output: `docs/40_reports/design/YYYYMMDD_INTERNATIONAL_INTERVENTION_DECISION.md`

**Steps:**
1. Decide whether NATO remains event-only, becomes a temporary combat modifier, or becomes a multi-turn campaign.
2. Require sensitive-history review for atrocity-linked triggers.
3. Assign result to `v1.6 Deliberate Force` unless a small v1.0 bugfix is required.

## Task 3: Multiplayer

**Files:**
- Reference: `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- Reference: `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`
- Output: `docs/40_reports/design/YYYYMMDD_MULTIPLAYER_DEFERRAL_DECISION.md`

**Steps:**
1. Decide hot-seat, network, or explicit post-2.0 deferral.
2. Assess save format and asymmetric information impact.
3. Update roadmap if multiplayer remains outside v1.x.

## Task 4: Modding

**Files:**
- Reference: `data/scenarios/*`
- Reference: `data/scenarios/events/*`
- Reference: `docs/20_engineering/LUA_SCRIPTING.md` if present
- Output: `docs/40_reports/design/YYYYMMDD_MODDING_SURFACE_DECISION.md`

**Steps:**
1. Inventory implicit modding surfaces: scenarios, event JSON, essays, Lua.
2. Decide whether v1.0 exposes none, read-only docs, or a formal editor.
3. Assign editor work to `v1.7` only if it survives scope review.

## Task 5: Play Length / Quick Modes

**Files:**
- Reference: `data/scenarios/*.json`
- Reference: `docs/plans/2026-03-31-v092-tutorial-and-onboarding-plan.md`
- Output: `docs/40_reports/design/YYYYMMDD_PLAY_LENGTH_DECISION.md`

**Steps:**
1. Define expected full-campaign session length.
2. Decide whether quick battle modes exist in v1.0 or wait for historical scenario starts.
3. Ensure tutorial/onboarding sets the right expectation.

## Task 6: War Economy Depth

**Files:**
- Reference: `src/sim/equipment/*`
- Reference: `src/sim/supply/*`
- Reference: `docs/40_reports/COMBAT_MASTER.md`
- Output: `docs/40_reports/design/YYYYMMDD_WAR_ECONOMY_DEPTH_DECISION.md`

**Steps:**
1. Decide whether abstract economy remains final v1.0 posture.
2. Explicitly reject Paradox-style production queues unless a product thesis demands them.
3. Update roadmap language to prevent future feature creep.

## Done Means

- Every open design question has a written decision, deferral, or child-plan trigger.
- No implementation starts from an unresolved question.
- Canon-sensitive questions receive canon/historian review before any code plan.
