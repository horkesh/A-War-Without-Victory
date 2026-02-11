---
description: Establishes the hierarchy and priority for Paradox team roles during task execution.
---

# Orchestrator Priority Protocol

This workflow defines the primary communication channel when starting new work or delegating tasks.

0. **Session start**:
   - Read `.agent/napkin.md` first. Apply its corrections, preferences, and patterns. Update it as you work.

1. **Orchestrator Invocation**: 
   - Every new high-level request or phase transition MUST first be processed by the Orchestrator persona.
   - Ref: [.cursor/agents/orchestrator.md](../../.cursor/agents/orchestrator.md)

2. **State Analysis**:
   - The Orchestrator assesses the "State of the Game" against the roadmap and ledger.
   - Delegation: Orchestrator assigns specific domains to Paradox roles (Technical Architect, Game Designer, etc.).

3. **Product Manager Supervision**:
   - The Product Manager (deputy) takes the Orchestrator's direction and oversees the detailed team execution.
   - Ref: [.cursor/agents/product-manager.md](../../.cursor/agents/product-manager.md)

4. **Wargame Consultation**:
   - For any system design related to simulation, the Wargame Specialist MUST be consulted.
   - Ref: [.cursor/agents/wargame-specialist.md](../../.cursor/agents/wargame-specialist.md)
