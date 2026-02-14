---
description: Establishes the hierarchy and priority for Paradox team roles during task execution.
---

# Orchestrator Priority Protocol

This workflow defines the primary communication channel when starting new work or delegating tasks.

0. **Session start**:
   - Read `.agent/napkin.md` first. Apply its corrections, preferences, and patterns. Update it as you work.

1. **Orchestrator Invocation**: 
   - Every new high-level request or phase transition MUST first be processed by the Orchestrator persona.
   - Ref: [.cursor/skills/orchestrator/SKILL.md](../../.cursor/skills/orchestrator/SKILL.md)

1b. **Toolbelt (skills catalog + using-superpowers)**:
   - **Catalog awareness:** At invocation, read [.agent/skills-catalog.md](../skills-catalog.md) so the Orchestrator is always aware of all available skills and subagent capabilities.
   - **Best-skill selection:** From the catalog, select the skills best suited for the request — process skills first (awwv-read-first, awwv-plan-change, brainstorming, etc.), then domain skills (product-manager, formation-expert, scenario-creator-runner-tester, etc.), and dispatching/subagent skills (dispatching-parallel-agents, subagent-driven-development, executing-plans) when the task benefits from parallel work or task-by-task delegation.
   - **Invoke:** Follow **using-superpowers** — invoke every selected skill (and any other that might apply, even ~1% chance) so the Orchestrator has the full toolbelt before deciding or delegating.
   - Refs: [skills-catalog.md](../skills-catalog.md) | [using-superpowers/SKILL.md](../../.cursor/skills/using-superpowers/SKILL.md)

2. **State Analysis**:
   - The Orchestrator assesses the "State of the Game" against the roadmap and ledger.
   - Delegation: Orchestrator assigns specific domains to Paradox roles (Technical Architect, Game Designer, etc.).

3. **Product Manager Supervision**:
   - The Product Manager (deputy) takes the Orchestrator's direction and oversees the detailed team execution.
   - Ref: [.cursor/skills/product-manager/SKILL.md](../../.cursor/skills/product-manager/SKILL.md)

4. **Wargame Consultation**:
   - For any system design related to simulation, the Wargame Specialist MUST be consulted.
   - Ref: wargame-specialist role (no local skill file currently exists in this repository).
