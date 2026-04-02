# 2026-04-02 Entrypoint Authority Comment Hardening

## Summary

Added explicit authority comments to the main turn-pipeline files so future work is less likely to land in a prototype or smoke harness by mistake.

## What Changed

- `src/sim/turn_pipeline.ts`
  - now states clearly that it is the canonical war-phase entrypoint for live simulation, scenario runs, and desktop play
- `src/state/turn_pipeline.ts`
  - now states clearly that it is the canonical non-war/state-pipeline authority
- `src/turn/pipeline.ts`
  - now states clearly that it is a legacy/minimal harness rather than live war-phase authority
- `src/index.ts`
  - now states clearly that it is a minimal smoke entrypoint, not the main gameplay or desktop shell

## Why

The repo already had docs explaining this, but the files themselves were still easy to misread as co-equal entrypoints.

Strong repos do not rely on memory alone for this kind of thing. They put the ownership warning at the first place a future implementer is likely to look.

## Verification

- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Outcome

The turn-entrypoint split is now harder to misunderstand at the code surface itself, which reduces the chance of future changes landing in the wrong runtime lane.
