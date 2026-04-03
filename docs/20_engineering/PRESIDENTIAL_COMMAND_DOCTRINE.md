# Presidential Command Doctrine

Single referenceable contract for player identity and command levels in AWWV.

All UI shells, event text, briefings, and future command mechanics must conform to this doctrine.

## Player Identity

The player is the wartime political leader (president) of their faction. Not a brigade commander, not a staff officer, not an omniscient general.

The game addresses them as head of state. Events, briefings, and diplomatic encounters treat them as the political authority. Military officers are subordinates who report to them.

The player never sees the battlefield directly. They see what their command chain reports to them.

## The Three Command Levels

### Level 1: Strategic Guidance (default presidential loop)

This is the normal turn-to-turn loop. The president:

- Sets faction-wide political posture
- Makes event decisions (war crimes policy, alliance posture, negotiation stance)
- Defines strategic priorities (which theater matters, what to protect at all cost)
- Allocates reserves at army level
- Approves or denies corps-level campaign plans
- Reviews intelligence summaries and staff assessments

Most turns, the player operates here and only here.

### Level 2: Army/Corps Directives (active command)

The player sets intent; corps commanders interpret and execute. The president:

- Changes corps stance (offensive, defensive, screening)
- Launches or cancels operations
- Appoints and dismisses commanders
- Issues OPSEC directives
- Loans or recalls elite brigades between corps
- Directs municipality-level support orders

This level is frequent but delegated. The command chain translates presidential intent into field orders.

### Level 3: Direct Intervention (exceptional override)

The president overrides the command chain. This includes:

- Force-launching attacks the corps commander would not choose
- Overriding corps commander recommendations
- Manual brigade repositioning

This level exists because sometimes the president must override. But it is the exception, not the default. Direct intervention should carry visible cost:

- Command authority spent
- Officer morale impact
- Competence penalty on the overridden commander
- Risk of poor execution (the corps staff did not plan this)

The game must make it clear when the player is operating at Level 3.

## Shell Ownership Under Presidential Model

Each product shell maps to a presidential relationship:

| Shell | Presidential Role | Verb |
|-------|------------------|------|
| **Warroom** | The president's desk | LIVES here |
| **Army HQ** | The military command center | VISITS here |
| **Tactical Map** | The field situation room | OBSERVES here |
| **Chronicle** | The presidential archive | REVIEWS here |
| **Codex** | The reference library | CONSULTS here |

- **Warroom** = strategic guidance, event decisions, campaign overview. The player's home screen.
- **Army HQ** = corps briefings, operations review, personnel decisions. The president reviews command chain output.
- **Tactical Map** = spatial awareness, front lines, settlement detail. The president observes the field picture and occasionally intervenes directly (Level 3).
- **Chronicle** = campaign memory. The president reviews what has happened.
- **Codex** = historical and doctrinal reference. The president consults background knowledge.

## Implementation Implications

These are constraints for future mechanics, not current features.

**Delegation.** Most military decisions flow through the command chain, not around it. The default path is: president sets intent -> corps commander interprets -> brigades execute. Bypassing the chain is Level 3.

**Automation.** Corps commanders handle routine without presidential input. The player should not need to micromanage brigade movements. When corps AI makes a reasonable decision, it should execute silently. When it makes a consequential decision, it should report.

**Override cost.** Direct intervention (Level 3) must have visible cost. The player can always override, but the game shows them what it costs. This is not a punishment mechanic — it is information. Real presidents who override their generals pay a price.

**Command friction visibility.** When a corps commander interprets or modifies a presidential directive, the player should see the friction. "2nd Corps received your directive to attack Brcko. General Halilovic has modified the timeline due to supply constraints." The player sees the gap between intent and execution.

**Fun principle.** The game is about consequential presidential decisions: which city to defend, whether to commit reserves, how to respond to atrocities, when to negotiate. Not about micromanaging brigade movements. Level 1 must be rich enough to fill a turn. Level 3 must feel like a genuine choice, not a routine click.

## Canon References

- Game Bible v0.6.0 §21: player identity as wartime political leader
- Game Bible v0.6.0 §3: agency through directives, not direct control
- Rulebook v0.7.0 §1: political and military leadership role
- Rulebook v0.7.0 §16.3: bounded player agency
- MASTER_ROADMAP v0.8.3: Order Interpretation (command friction)
- MASTER_ROADMAP v0.8.4: Autonomy (delegation mechanics)
- PRODUCT_SHELL_HIERARCHY.md: shell ownership contract
- UI_OWNERSHIP_MATRIX.md: concept-to-surface mapping
