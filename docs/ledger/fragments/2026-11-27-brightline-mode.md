## 2026-11-27 — BRIGHTLINE-MODE: the §2a bright line applies to every faction in every decision mode, live and headless alike

Authority: orchestrator ruling §58 item 1 (pre-freeze MUST-FIX; owner rule hands-off live = headless at every autonomy level, all three factions); §6 bright-line panel 8/8 for option B (historian, scenario-creator-runner-tester, systems-programmer, red-team; game-designer, narrative-designer, canon-compliance, operations-expert). Hash-neutral.

**Premise (main da0f06a2c, t188 live compare, autonomy 2, historical, hands-off).** The full t188 save was EQUAL live vs headless for RS and HRHB. Only the read-time verdict differed, and only for HRHB: headless A / survival against hands-off live C / hollow_victory [authorized_cleansing_condemnation]. The trigger was the staff-default RF-5B wave (`war_crimes_events_emergent` = 1).

**Change.**
- `isBrightLineFaction` and `src/state/atrocity_accountability.ts` are retired.
- The §2a flag, its display freshening and the atrocity term of `war_cost_index` (scoring.ts) apply to every faction in both decision modes. They read no `decision_mode`, `player_faction`, autonomy or headless marker.
- G5 holds: silence is never cheaper than an explicit order.
- The patron-defiance supply cut stays emergent-only.
- Canon:
  - SENSITIVE_HISTORY_DESIGN_GATE.md: the §2a(i) scope; supersessions on the 2026-11-16 and RF-5B records; a new §6 record.
  - VICTORY_AND_PYRRHIC_SCORING.md: §3.4, §3.5 and the header.
  - Engine_Invariants items 6-7.

**Measured.**
- 188w pair: hist `d15363bd762ddd32`, emer `1ea21613fa5d09f6`. Both are identical to main, and verify output is identical to main in both modes.
- Strict health, consistency and Washington (t98) pass.
- Full-save live parity at t188 a2 historical is EQUAL for RS, HRHB and RBiH.
- Verdicts, live and headless alike: RBiH B, RS D (genocide precedence), HRHB C (was A headless). The only persisted copy that moves is `meta.endgame_snapshot` on a run that reaches game over.
