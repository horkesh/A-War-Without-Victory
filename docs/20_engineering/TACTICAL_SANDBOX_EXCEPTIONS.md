# Tactical Sandbox Exceptions (Non-Canon)

This document is the single reference for tactical-sandbox behaviors that are intentionally non-canon.

## Scope

- Applies to `tactical_sandbox.html` / `tactical_sandbox.ts` workflows only.
- Does not change canonical turn execution, save compatibility, or phase rules for main game play.

## Sandbox-only Rules

1. **Pre-claim during movement**
   - Sandbox can pre-claim destination path ownership for interaction flow.
   - Canonical game state does not pre-claim movement path ownership.

2. **Traversal through uncontrolled settlements**
   - Sandbox reachability may allow movement through uncontrolled settlements.
   - Canonical movement validation remains friendly-only traversal.

3. **Deploy flow AoR expansion behavior**
   - Sandbox deploy/undeploy UX may apply direct AoR expansion/contraction shortcuts.
   - Canonical deploy/undeploy transitions must remain in phase pipeline with deterministic order staging.

4. **7-step sandbox subset**
   - Sandbox runs a reduced tactical loop for fast iteration.
   - Canonical runs use full `runTurn` phase pipeline and its complete side effects.

5. **Sandbox-specific UI affordances**
   - Sandbox-only controls/panels can exist for experimentation and scenario authoring.
   - Main tactical UI remains constrained by canonical desktop IPC and map-system requirements.

## Promotion Rule

Any sandbox behavior can become canonical only after:
- canon/spec updates,
- deterministic validation gates,
- pipeline integration in main process,
- and ledger entry documenting the promotion.
