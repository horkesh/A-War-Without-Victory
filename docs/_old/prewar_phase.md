# Pre-War Phase — Latent capacity, political control, alignment, and declaration pressure

## Purpose

The Pre-War Phase models the political, organizational, and alliance struggle before open war becomes self-sustaining. It allows players to allocate scarce capital to shape early-war possibilities without creating military formations, territorial control through force, or scripted outcomes.

This phase runs once, before Phase I.0. It produces **latent modifiers and asymmetries** that condition later militia emergence, brigade formation, authority stability, alliance tension, and declaration timing.

---

## Core principles

• No military formations exist during the pre-war phase.  
• No fronts or sustained combat exist.  
• Territorial control does not change through force.  
• All effects are latent and forward-propagating.  
• Scarcity and tradeoffs dominate; no action is free.  

Pre-war decisions permanently shape the opening conditions of the war.

---

## Initial political control (canonical substrate)

At game start, **political control is initialized strictly at the municipality level**, based on the **1990 elections** and pre-war institutional dominance.

This initialization is part of the canonical substrate and is already implemented.

Key constraints:
• Municipalities are the base political unit.  
• Initial control reflects electoral and institutional reality, not armed power.  
• Control at this stage represents *political dominance*, not military occupation.

---

## Control stability during pre-war

During the pre-war phase:

• Municipalities **cannot flip political control through violence**.  
• Armed intimidation, coercion, or organization does not immediately change control.  
• Control degradation may occur, but **control does not transfer**.

This reflects historical cases such as Prijedor, where political dominance existed prior to open war, but formal control changes through force occurred only after escalation.

Pre-war actions may:
• Weaken authority.  
• Increase fragmentation risk.  
• Undermine legitimacy.  

They may not:
• Transfer municipal control.  
• Resolve contested authority through force.

All actual control flips are deferred to the war phase.

---

## Player capital

Players spend a limited pool of **pre-war political capital**, representing organizational effort, legitimacy, secrecy, and diplomatic exposure.

Capital is scarce, mostly irreversible, and spent without full knowledge of future war geometry. It cannot be invested everywhere.

---

## Organizational penetration

Players may invest capital to strengthen clandestine or institutional organization in specific municipalities.

Examples:
• RBiH invests in Patriotic League organization and cadres.  
• SDS invests in institutional capture, depots, and command continuity.  

Organizational penetration:
• Does not create units.  
• Does not grant control.  
• Does not flip municipalities.  

Instead, it modifies:
• Militia emergence speed and cap.  
• Initial militia cohesion.  
• Brigade formation friction in Phase I.  

Uneven investment creates uneven early-war capacity.

---

## Alliance management (RBiH–HRHB)

During the pre-war phase, RBiH and HRHB begin aligned but without unified command or authority.

Players may:
• Coordinate actions to reduce exposure and escalation risk.  
• Act unilaterally to consolidate organizational presence.

Tradeoff:
• Cooperation preserves alignment but slows unilateral consolidation.  
• Unilateral action accelerates preparedness but strains the alliance.

Pre-war alliance strain carries forward as the initial RelationshipState in Phase I.

---

## Declaration pressure and timing

The pre-war phase includes **declaration pressure**, not scripted declarations.

RS and HRHB declarations do not occur automatically. They become **available outcomes** when enabling conditions accumulate.

Enabling pressures include:
• Sufficient organizational penetration.  
• Degradation of shared political frameworks.  
• Alliance deterioration.  
• External signaling and patron alignment.

Players may:
• Accelerate conditions toward declaration to lock in advantages.  
• Delay declaration to preserve ambiguity and limit escalation.

Declarations:
• Do not instantly end the pre-war phase.  
• Increase polarization and escalation risk.  
• Shape early-war legitimacy, patron behavior, and control dynamics.

---

## Escalation threshold

The game transitions from pre-war to open war when any persist:
• Sustained organized violence.  
• Hostile inter-faction relationship states.  
• Collapse of monopoly on force across multiple municipalities.

The transition is emergent, not date-driven.

---

## Hand-off to Phase I

Pre-war outcomes feed directly into Phase I.0:

• Organizational penetration → militia emergence modifiers.  
• Alliance strain → initial RelationshipState.  
• Authority degradation → brigade formation friction.  
• Declaration timing → legitimacy and patron posture.  
• Initial political control → starting condition for wartime control contests.

No values reset. All consequences persist.

---

## Design intent

The pre-war phase ensures that:
• Early war is uneven and asymmetric.  
• Political dominance precedes military control.  
• Restraint is meaningful but costly.  
• Declarations are strategic commitments, not buttons.  

The pre-war phase is about **shaping the war that will occur**, not fighting it.
