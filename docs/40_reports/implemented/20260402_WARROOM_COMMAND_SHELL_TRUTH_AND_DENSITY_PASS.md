# 2026-04-02 - Warroom command shell truth and density pass

## Summary

Cleaned up the Warroom shell where it was still behaving like a plausible-looking but structurally dishonest draft. The pass focused on three things:

- removing fake-specific staff authorship and hardcoded certainty from Warroom modal prose
- clarifying what the Warroom command shell actually owns versus what it only summarizes
- tightening modal chrome so the Warroom feels like the same disciplined command product as the tactical shell

This was not a feature expansion. It was a truth-and-density cleanup of the existing Warroom surface.

## Problems found

### 1. Hardcoded command certainty

`CommandBriefingModal.ts` still contained fixed lines such as:

- "No critical enclaves nearing collapse this week."
- "UNHCR humanitarian convoys are moving with minimal disruption."

Those are polished lies when the engine has not actually derived those conclusions for the current turn.

### 2. Fake-specific report authorship

`ReportsModal.ts` used war-phase headers like `2nd Corps Intelligence Section` for all RBiH play, regardless of what the actual player-facing shell knows. That made the Warroom look more specific than its data contract really was.

### 3. Modal drift and shell waste

Several Warroom modals still used roomier spacing and older phrasing patterns than the tightened tactical shell. The result was unnecessary blank space and a product that felt like multiple UI eras stitched together.

## Changes made

### Command Briefing

`src/ui/warroom/components/CommandBriefingModal.ts`

- replaced hardcoded certainty with derived command-priority bullets based on:
  - routed brigades
  - cut-off brigades
  - starving brigades
  - strained municipalities
  - exposed front edges
  - active hostile-population timers
- replaced the fake enclave/logistics prose with abstract, player-safe status lines
- kept the modal in Warroom's role as a headquarters summary, not a debug console

### Reports

`src/ui/warroom/components/ReportsModal.ts`

- replaced fake-specific war-phase authorship with generic, player-safe headquarters language:
  - `Field Intelligence Summary Desk`
  - `Duty Intelligence Officer`
  - faction-appropriate top-level headquarters names only

### Operational Situation

`src/ui/warroom/components/OperationalSituationModal.ts`

- clarified the modal's scope toward sector stress and desk-map handoff
- surfaced exposed-front counts and active operation packets
- renamed the map handoff button to `OPEN DESK MAP CONTEXT`

### Warroom shell/help

`src/ui/warroom/warroom.ts`

- updated help text so it reflects current anchors and Warroom affordances instead of stale labels like `Military Hat`

### Density pass

`src/ui/warroom/styles/modals.css`

- tightened:
  - shared dialog padding
  - faction overview width/padding
  - magazine width/padding and stat block sizing
  - reports width/padding, header spacing, body line-height, and signature spacing

## Verification

- `node_modules\.bin\vitest.cmd run tests\warroom_player_visibility.test.ts tests\warroom_smoke.test.ts`
  - PASS
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Why this matters

The Warroom is not just a mood screen. It is the player's headquarters shell. That means it cannot earn trust by sounding more informed than the actual player-facing state contract allows.

The rule reinforced by this pass is:

> Warroom may summarize, interpret, and frame.  
> It must not invent certainty or smuggle in fake-specific authority.

This also continues the broader product direction:

- truthful command shell first
- dense and usable shell second
- richer historical flavor only after the shell is honest
