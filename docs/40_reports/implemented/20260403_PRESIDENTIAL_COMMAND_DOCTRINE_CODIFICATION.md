# Presidential Command Doctrine Codification

**Date:** 2026-04-03
**Wave:** v0.8.x-final doctrine alignment
**Roles:** Game Designer, Technical Architect, Documentation Specialist

---

## Summary

Codified the player's true role as "president of the faction" into a single referenceable engineering contract, and aligned shell ownership docs to the presidential model.

## Problem

The existing canon (Game Bible §21, Rulebook §1) already positioned the player as wartime political leader, but this was scattered across 6+ docs with no single contract defining:
- The three command levels (strategic guidance, active command, direct intervention)
- How each shell relates to the presidential role
- What future mechanics must respect about command delegation, automation, override cost, and friction visibility

The result: new features and UI work had no single doc to check for player-identity consistency.

## Changes

### New: `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md` (101 lines)
Single referenceable contract defining:
- **Player identity**: president, not brigade commander
- **Level 1 — Strategic Guidance**: default turn-to-turn loop (political posture, event decisions, strategic priorities, reserve allocation, plan approval)
- **Level 2 — Army/Corps Directives**: active command via delegation (corps stance, operations, commanders, OPSEC, elite loans)
- **Level 3 — Direct Intervention**: exceptional override with visible cost (force-launch, override recommendations, manual repositioning)
- **Shell ownership table**: Warroom (LIVES), Army HQ (VISITS), Tactical Map (OBSERVES), Chronicle (REVIEWS), Codex (CONSULTS)
- **Implementation implications**: delegation, automation, override cost, command friction visibility, fun principle
- **Canon references**: Game Bible, Rulebook, Master Roadmap

### Updated: `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`
- Added "Presidential Model" section after intro, before "Core rule"
- Names all five shells with presidential relationship verbs
- Cross-links to new doctrine doc

### Updated: `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- Added "Governing Principle" paragraph after Purpose
- One-sentence presidential framing with cross-link to doctrine doc

### Verified (no changes needed):
- Game Bible v0.6.0 §21 — already explicitly states player is wartime political leader
- Rulebook v0.7.0 §1 — already states political and military leadership
- MASTER_ROADMAP.md — no language implying player is brigade commander
- No docs found contradicting presidential model

## Verification

- `check_claude_governance.ps1` — OK
- Grep for "brigade commander", "unit commander", "player controls brigades" across all docs — zero matches

## Completion Block

```
Canonical owner:     docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md
Demoted path:        Scattered player-identity language across 6+ docs with no single contract
Player-visible truth: Player is the president; Level 1 = default loop, Level 3 = exception with cost
Canonical UI surface: Warroom (LIVES), Army HQ (VISITS), Tactical Map (OBSERVES)
Done means:          One referenceable doctrine doc exists; shell docs cross-link to it; canon verified consistent
```
