# Working On: UI Overhaul Master Plan

## Status: Phase 4 COMPLETE — Phase 5 next

### Completed:
- **Phase 0:** Foundation Repair — design tokens, EventDecisionModal migration, GlassPanel color fix
- **Phase 1:** Army HQ Shell — modal, commander card, situation card, corps grid, alert strip, H key
- **Phase 2:** Corps Drill-Down — 5 collapsible sections (commander, sectors, ops, orbat, combat record)
- **Phase 3:** Actions — corps stance, sector stance, force launch, stand down, commander replacement
- **Phase 4:** Deep Drill-Down — brigade/operation/sector sub-card expansions, officer dismissal IPC, ArmyDetail retired, simplify pass (shared utils, Map lookups, memoization)

### Remaining for Phase 5:
- CorpsFrontPanel interior theme transition (Option A: paper unfolds from dark chrome)
- Settlement panel quick-actions (Dig In / Attack Adjacent per brigade)
- Map legend enrichment (numeric scale labels at key thresholds)
- Keyboard shortcuts (Tab=cycle corps, Space=advance turn, B=briefing, O=operations)
- Command Briefing actionability (text items → clickable links to HQ/ops/officers)
- Map atmosphere (deeper hillshade + warm sepia tint)

### Asset integration (optional, waiting on user):
- Wood texture (512x512 webp) → src/ui/map/assets/texture_wood_dark.webp
- Paper texture (512x512 webp) → src/ui/map/assets/texture_paper_cream.webp

### Plan: `docs/plans/2026-03-20-ui-overhaul-master-plan.md`
