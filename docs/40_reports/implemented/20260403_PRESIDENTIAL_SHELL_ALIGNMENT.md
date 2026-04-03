# Presidential Shell Alignment

**Date:** 2026-04-03
**Wave:** Presidential command doctrine alignment (v0.8.x-final)
**Roles:** UI/UX Developer, Technical Architect

---

## Summary

Aligned live shell code framing and player-facing tooltips to the presidential command doctrine. No structural or routing changes — prior work (2026-04-02/03) already resolved ownership ambiguities. This pass makes the doctrine visible in code comments and player-facing tooltip text.

## Problem

The presidential command doctrine was codified in `PRESIDENTIAL_COMMAND_DOCTRINE.md`, but the live code still carried older framing:
- `PresidentialToolbar` described itself as "The president's desk" — but it sits on the Tactical Map (field situation room), not the Warroom (president's desk)
- `ArmyHQModal` described itself generically as "Multi-tab military command center" without reflecting the presidential visit model
- `shellNavigation.ts` had no doctrine context for future developers
- Toolbar buttons had no tooltips — players couldn't tell which buttons were local summaries vs Army HQ handoffs

## Changes

### PresidentialToolbar.tsx
- **Docstring**: "The president's desk" → "The president's field command bar" with command level taxonomy (Level 1 Strategic Guidance, Level 2 Army HQ handoff, Reference)
- **8 tooltips added**: WARROOM ("Return to president's desk"), CHRONICLE ("Campaign timeline"), SUMMARY ("Field situation briefing"), RECORDS ("Army HQ staff records"), OPS ("Active operations"), EVENTS ("Event log"), CODEX ("Historical reference"), army crest ("Visit Army HQ [H]")

### ArmyHQModal.tsx
- **Docstring**: "Multi-tab military command center" → "The military command center the president visits" with Level 2 doctrine reference

### shellNavigation.ts
- **Module docstring added**: Names the three shells and their presidential roles

## What Was Already Clean

Three-auditor investigation (earlier this session) confirmed:
- Shell ownership is structurally correct (no duplicate deep-review surfaces)
- RECORDS routes to Army HQ, not a map-local panel
- SUMMARY (map-local) is correctly distinguished from Army HQ Summary (deep review)
- Warroom return path is working
- No brigade-commander fantasy in the main loop

## Verification

- `tsc --noEmit` — clean
- `vite build` — success
- `check_claude_governance.ps1` — OK

## Completion Block

```
Canonical owner:     PresidentialToolbar (field command bar), ArmyHQModal (command center the president visits), shellNavigation (handoff helpers)
Demoted path:        "President's desk" framing on Tactical Map toolbar; generic ArmyHQ docstring
Player-visible truth: Tooltips communicate command levels — player sees "Field situation briefing" vs "Army HQ staff records"
Canonical UI surface: Tactical Map toolbar (observation + intervention), Army HQ (command review)
Done means:          Docstrings aligned to doctrine; 8 tooltips added; tsc clean; vite build clean; governance OK
```
