# Command Drilldown And Decision Ownership Polish

**Date:** 2026-06-23
**Result:** UI/read-model command polish plus active-doc hygiene

## Summary
- Foreign humanitarian convoy decisions now stay out of the player's Inbox, Decision Room blocker manifest, and desktop startup projection unless the convoy route belongs to the player faction.
- President's Desk, Decision Room, and Chronicle memory now share filed-record truth from actual filed turn records and decision receipts rather than local heuristics.
- Army HQ and Operations ORBAT drilldowns preserve sector context when a brigade has a current sector; recent engagements now render newest-first.
- Corps Front no longer redacts friendly personnel, readiness, and brigade strength behind enemy-sector intel confidence.
- Corps Detail and ORBAT panels now render missing stance and raw sector/corps ids as player-safe command copy.
- Active process docs now clarify ADR-0007 Phase C deletion, Srebrenica/Zepa event-owned fall receipts, packaging pause, and `.agent/napkin.md` historical status.

## Files Changed
| Area | Files |
|---|---|
| Decision ownership | `src/ui/map/data/inboxItems.ts`, `src/ui/map/data/GameStateAdapter.ts`, `src/state/player_decision_manifest.ts` |
| Filed-record truth | `src/ui/map/data/filedRecordTruth.ts`, `src/ui/map/components/PresidentialInbox.tsx`, `src/ui/map/data/presidentialDecisionRoom.ts`, `src/ui/map/i18n/messages.en.ts`, `src/ui/map/i18n/messages.bcs.ts` |
| Command drilldown | `src/ui/map/components/OperationsPanel.tsx`, `src/ui/map/components/army_hq/OrbatSection.tsx`, `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` |
| Command truth/copy | `src/ui/map/components/CorpsFrontPanel.tsx`, `src/ui/map/components/CorpsDetail.tsx`, `src/ui/map/components/OrbatPanel.tsx`, `src/ui/map/components/FormationDetail.tsx`, `src/ui/shared/playerFacingLabels.ts`, `src/ui/map/utils/recentEngagements.ts` |
| Tests | `tests/ui/inbox_items.test.ts`, `tests/player_decision_manifest.test.ts`, `tests/ui/presidential_decision_room.test.ts`, `tests/ui/inbox_dedup.test.ts`, `tests/ui/corps_front_panel_routing.test.ts`, `tests/ui/formation_detail_parity.test.ts` |
| Docs hygiene | `.claude/napkin.md`, `.agent/napkin.md`, `docs/20_engineering/ADR/ADR-0007-standing-og-defensive-model.md`, active plan/roadmap/board docs |

## Verification
- Red proof failed before implementation on foreign convoy routing, filed decision-receipt quiet-inbox/Chronicle memory, Corps Front friendly-force redaction, and recent engagement ordering.
- Focused green proof: `node node_modules\vitest\vitest.mjs run tests\ui\inbox_items.test.ts tests\player_decision_manifest.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\inbox_dedup.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\formation_detail_parity.test.ts --pool=forks --reporter=dot` passed 129/129.
- `npm.cmd run typecheck` passed.
- Targeted active-doc stale-language sweep passed for ADR-0007 Phase C active-gate wording, H1 DELIV active wording, and packaging-active wording.
- `npm.cmd run qa:player-journeys` passed 282/282.
- `npm.cmd run qa:live-surface:browser` passed with `ok: true`, `serverPortCleanupVerified: true`, war-start/foundational flow proof, RBiH/RS owner journey proof, map context-menu proof, battle-marker proof, and `armyHqSectorAssignmentTruthLiveProof: { rows: 19, zeroCurrentRows: 6, badZeroRows: [] }`; the generated `.tmp_live_surface_browser_sweep` folder was removed after inspection.
- `git diff --check` passed with the existing CRLF normalization warning for `src/ui/shared/playerFacingLabels.ts`.

## Scope
UI/read-model/i18n/test/docs hygiene only. No simulation logic, scenario data, startup artifact, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
