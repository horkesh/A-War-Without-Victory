Run a governance review on the current work, not a general code review.

## Required reading

1. `docs/20_engineering/COMMAND_AUTHORITY_GATES.md`
2. `docs/20_engineering/ROADMAP_GOVERNANCE.md`
3. `docs/20_engineering/PLAYER_VISIBLE_STATE.md`
4. `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
5. `docs/20_engineering/DEBUG_SURFACE_POLICY.md`
6. `docs/20_engineering/FEATURE_DONE_MEANS.md`
7. `docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md`
8. `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md`

## Review only for these failures

1. overlapping ownership
2. fake flexibility
3. roadmap mis-slotting
4. UI truth drift
5. operations still not being treated as the first fully real command object
6. missing or weak canonical/transitional comments in changed hotspot files
7. mismatch between claimed "done means" and actual verification
8. player-facing truth drifting away from the player-visible-state contract
9. canonical UI ownership drifting or being duplicated
10. debug-only surfaces leaking into normal player experience

## Output format

Write:

1. Governance findings
2. Failed gates
3. What must be corrected before calling the work done
4. Whether the active governance artifact is still accurate
5. The required five-line completion block:
   - Canonical owner
   - Demoted path
   - Player-visible truth
   - Canonical UI surface
   - Done means

Do not dilute this with general praise.
