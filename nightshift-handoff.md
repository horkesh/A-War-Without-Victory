# Nightshift Handoff — 2026-03-26

## Work Order

**Primary plan:** `docs/plans/2026-03-26-nightshift-dispatch.md` — 8 parallel workstreams, all specs ready.

## Execution Order

Execute workstreams in parallel where possible. The dispatch plan has a full dependency map and merge order. Key rule: **no two agents modify the same file.**

### Parallel Group A (start immediately, zero dependencies):
- **WS1**: Author 13 missing essays — spec at `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md` Section 2. Content already exists inline in `essay_index.json` — extract, verify with /historian, rewrite to quality bar if needed.
- **WS2**: Letter Home templates — spec at same file, Section 1. Format 20 templates + name pools into `data/templates/letter_home_templates.json`.
- **WS7**: v0.8.0 types + v0.9 design docs — architecture at `docs/plans/2026-03-25-command-chain-architecture.md`. Types-only scaffold (STOP AND ASK gate: interfaces only from Section 1.2, no logic, no open question resolution).
- **WS8**: Canon audit Phases A-C — spec at `docs/plans/2026-03-23-canon-audit-checklist.md`. HARD STOP at Phase D. After Phase A deletion, grep tests/ for phase0 imports and clean up.

### Parallel Group B (start immediately, isolated worktrees):
- **WS3**: Ghost Map + Exhaustion Clock — spec at `docs/plans/2026-03-25-ghost-map-exhaustion-clock-spec.md`. Worktree: `feature/ghost-map-exhaustion-clock`.
- **WS4**: Letter Home engine — spec at `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md` Section 1.5-1.7. Worktree: `feature/letter-home`. STOP AND ASK gate: UI-side generation recommended (no pipeline change).
- **WS5**: Ops Modal UX — spec at `docs/40_reports/PROMPT_OPS_MODAL_UX_OVERHAUL.md`. Worktree: `feature/ops-modal-ux`. WP4a (pointer-events) first.
- **WS6**: Integration tests — spec at `docs/plans/2026-03-25-integration-test-plan.md`. Worktree: `feature/integration-tests`.

### Merge Order (when workstreams complete):
WS1 -> WS2 -> WS7 -> WS8 -> WS6 -> WS3 -> WS5 -> WS4

### Post-merge: Full smoke triad + 40w calibration run.

## Bonus Tasks (for agents that finish early)
- WS1 done -> 3-pass QA on 13 new essays
- WS2 done -> Author 8-12 Patron Phone Call events (/historian ICTY transcripts)
- WS6 done -> Adapter field audit + 52w regression run + /war-or-game sign-off
- WS7 done -> Kolovarice OSID research, historical painted targets w10/w20/w30
- WS8 done -> Stale plan archiving, branch cleanup (clean_gone), MEMORY.md curation (<200 lines), napkin curation (max 10/category)
- Any idle -> Event narrative review (95 narratives in war_*.json)
- Last thing -> Session report via /visual-explainer

## Pyrrhic Process Rules (ENFORCED)
- Smoke triad after every code change
- /simplify after every code workstream (see schedule in dispatch plan)
- /code-review before any merge
- /determinism-auditor for WS4 (Letter Home — only new sim-adjacent code)
- /canon-compliance-review for WS8
- /war-or-game sign-off for WS1 essays and any calibration runs
- /quality-assurance-process at every merge gate
- ICTY verdicts are historical truths — no hedging
- Never auto-edit FORAWWV.md
- Determinism is sacred — no Math.random() in any new code

## DO NOT Touch
- `docs/10_canon/FORAWWV.md` — sacred, never auto-edit
- Canon audit Phase D/E — type system changes need daytime sign-off
- Any sim-affecting changes that would require calibration tuning
- Command chain architecture open questions (8 unresolved — flag for morning)

## Special Instructions
- Essay content exists inline in `essay_index.json` — extract to standalone files, don't write from scratch
- Letter Home: recommend UI-side generation from adapter data (simpler than pipeline step)
- Ghost Map: census data is in `data/derived/settlements_wgs84_1990.geojson` with embedded demographics
- Exhaustion Clock: reads `warPhaseExhaustion` already parsed in ArmyHQModal
- Ops Modal WP4a (pointer-events fix) is critical path — fix FIRST, then WP1-3

## Context
- v0.7.0 COMPLETE. 91.7% calibration. 95 events. 83 essays (13 missing).
- Today's session: Phase 5 event wiring, exhaustion overhaul, pool decay, Codex 3-pass QA (30 corrections), 6 tone fixes, Gorazde consolidation event, Hrasnica pocket fix, OSID display names, chronicle expandable cards, real dates, control_change effect type, art direction + 84 image prompts, 9 legendary features on roadmap.
- All design decisions pre-made in specs. No ambiguity should remain.
