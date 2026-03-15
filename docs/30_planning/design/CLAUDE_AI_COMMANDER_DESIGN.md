# Claude AI Commander System — Design Document

**Status:** DESIGN — prototype scope defined
**Studio:** Pyrrhic Games
**Date:** 2026-03-15

---

## Vision

Replace the formula-based bot AI with Claude API-powered commanders at Army and Corps levels. Each commander has a historical personality that shapes strategic and operational reasoning. The player can also request Claude as an advisor.

This is not "AI assists gameplay." This is **AI IS the opposing general.** Your enemy thinks.

---

## Command Levels

### Army Commander (1 per faction, strategic)

**Role:** Sets faction-wide strategic direction. Decides front priorities, operation timing, peace plan responses, alliance management, patron relationships, reserve deployment.

**Who:** Mladić (RS), Halilović→Delić (RBiH), Petković (HRHB). Historical succession applies.

**API call frequency:** Every turn for bot factions. ~188 calls per faction per game.

**Prompt includes:**
- Commander identity and personality profile (from named officer data)
- War situation summary: territory %, front status per corps, casualties, supply, exhaustion
- Available decisions: corps stance changes, operation approvals, peace plan responses, reserve deployment
- Constraints: game rules, current doctrine phase, patron pressure
- Recent events: battles, territory changes, peace plan offers, alliance shifts
- Historical context: "You are in week 23 of the war. Historically, VRS held 65% at this point."

**Output (structured JSON):**
```json
{
  "corps_directives": {
    "vrs_1st_krajina": { "stance": "offensive", "priority": "brcko_corridor" },
    "vrs_drina": { "stance": "defensive", "priority": "hold_enclaves" }
  },
  "operation_decisions": {
    "approve": ["corridor_92"],
    "postpone": [],
    "abort": []
  },
  "peace_plan_response": null,
  "reserve_deployment": { "deploy_to": "vrs_sarajevo_romanija", "reason": "SRK siege thinning" },
  "strategic_reasoning": "Corridor must be secured before consolidation. Drina can hold with current forces. SRK needs reserve to maintain siege pressure.",
  "briefing_text": "Gospodo, the corridor is our lifeline. First Krajina Corps will push through Brčko while Drina holds. I am sending the Guards to reinforce Sarajevo — we cannot let the siege weaken."
}
```

### Corps Commander (1 per corps, operational)

**Role:** Interprets army directives into sector-level orders. Plans operations (objectives, axis, force composition, timing). Manages sector stances. Allocates brigades.

**Who:** Named officers with competence/aggressiveness/defense ratings.

**API call frequency:** Every turn for active corps. ~15-20 corps × 188 turns = ~3,000 calls per game. Use Haiku for routine, Sonnet for operation planning.

**Prompt includes:**
- Officer identity and stats (competence, aggressiveness, defense skill)
- Army directive received this turn
- Sector status: brigade assignments, density, threat levels, intel
- Available brigades and their status
- Operation in progress (if any): phase, momentum, casualties
- Supply status for the corps area

**Output:**
```json
{
  "sector_stances": {
    "sector_4": "fortify",
    "sector_7": "active_defense"
  },
  "operation_plan": {
    "target": "op:brcko:brcko_2",
    "force": ["rs_1st_krajina_mech", "rs_16th_krajina"],
    "approach": "concentrated_assault",
    "timing": "immediate"
  },
  "brigade_movements": {
    "rs_43rd_motorized": { "destination": "sector_7", "reason": "reinforce thin sector" }
  },
  "assessment": "Sector 4 is secure. Sector 7 needs reinforcement before we can launch toward Brčko. Recommend 2-turn buildup then concentrated assault."
}
```

### Player Advisor (optional, on-demand)

**Role:** When the player requests advice, Claude analyzes the situation and recommends actions. Player decides whether to follow.

**Trigger:** Player clicks "Ask Commander" button. Not automatic.

**Prompt includes:** Same as Army Commander, but framed as advisory. "The player commands [faction]. Analyze the current situation and recommend the top 3 priorities."

**Output:** Natural language advice displayed in a command briefing panel. No auto-execution — player must manually implement recommendations.

### Auto-Play / Spectator Mode

**Role:** Claude commands all three factions. Game runs automatically. Player watches.

**Use cases:**
- Calibration tool (run AI vs AI, analyze strategies)
- Entertainment (stream three AI generals fighting the Bosnian War)
- Historical simulation (set up scenarios, let AI play them out)

**Implementation:** Run game loop with API calls for all factions each turn. Log all reasoning. Generate AAR at end.

---

## Personality Profiles

Each commander gets a system prompt that defines their reasoning style:

### Ratko Mladić (RS Army Commander)
- **Style:** Aggressive, ruthless, tactically brilliant, strategically reckless
- **Priorities:** Territory above all. Ethnic consolidation. Siege warfare.
- **Weakness:** Overcommits to offensives. Dismisses international consequences. Atrocities cost negotiation capital.
- **Speech:** Direct, commanding, uses military terminology. References JNA tradition.

### Sefer Halilović → Rasim Delić (RBiH Army Commander)
- **Halilović style:** Cautious, political, struggles with warlord commanders
- **Delić style:** More professional, builds institutions, patient
- **Priorities:** Defend population centers. Build army capability over time. Maintain international sympathy.
- **Weakness:** Slow to attack. Warlord friction (Dudaković, Orić act independently). Under-equipped.
- **Speech:** Formal, appeals to multi-ethnic values, references international law.

### Milivoj Petković (HRHB Army Commander)
- **Style:** Politically constrained, competent but limited by Zagreb's agenda
- **Priorities:** Secure Herzegovina. Manage RBiH alliance. Follow Tuđman's direction.
- **Weakness:** Two-front dilemma. Small force. Dependent on Croatia.
- **Speech:** Measured, references Croatian national interest, careful about alliance.

### Corps Commanders (personality from stats)
- **High aggressiveness:** "Attack now, don't wait for intel."
- **High competence:** "The terrain analysis shows a weakness at..."
- **High defense:** "We should fortify this position before advancing."
- **Low competence:** "Just send everyone forward." (worse decisions)

---

## Cost Model

### Per-Game Estimates

| Level | Model | Calls/Game | Cost/Call | Total |
|-------|-------|-----------|----------|-------|
| Army Commander (3 factions) | Sonnet | 564 | ~$0.005 | ~$2.80 |
| Corps Commander (routine) | Haiku | ~3,000 | ~$0.0005 | ~$1.50 |
| Corps Commander (operations) | Sonnet | ~200 | ~$0.005 | ~$1.00 |
| Player Advisor (on-demand) | Sonnet | ~20 | ~$0.005 | ~$0.10 |
| **Total per game** | | | | **~$5.40** |

### Business Model Options

1. **Player provides API key** — zero cost to Pyrrhic Games. Power users only.
2. **Bundled credits** — game purchase includes N games of AI commander. Additional via in-app purchase.
3. **Subscription** — $5/month for unlimited AI commander games.
4. **Free tier** — formula bot is free. AI commander is premium feature.
5. **Hybrid** — Army-level AI free (low cost), Corps-level AI is premium.

**Recommendation:** Option 1 for launch (API key), option 2/4 post-launch if demand warrants a proxy server.

---

## Determinism Handling

**The sacred rule:** The simulation must be deterministic. Claude is not.

**Solution: Separation of concerns.**

```
DETERMINISTIC LAYER (simulation engine)
  ├── Combat resolution (formulas, no randomness)
  ├── Supply, displacement, morale (deterministic)
  ├── Territory control (deterministic)
  └── All game state mutations (deterministic)

NON-DETERMINISTIC LAYER (command decisions)
  ├── Army Commander AI (Claude or formula bot)
  ├── Corps Commander AI (Claude or formula bot)
  └── Player decisions (inherently non-deterministic)
```

**Key insight:** Player decisions are already non-deterministic. A human choosing "attack Brčko" vs "defend Tuzla" isn't reproducible. Claude-as-commander is in the same category as the player — a decision-maker, not a simulation component.

**Replay:** Log all Claude decisions as `CommandDecisionLog[]` in the save file. Replay uses logged decisions instead of re-calling the API. Deterministic replay of non-deterministic games.

**Formula bot fallback:** When Claude is unavailable (offline, no API key, rate limit), the formula bot produces the same type of output. The game is always playable.

---

## Technical Architecture

### New Module: `src/sim/ai_commander/`

```
src/sim/ai_commander/
  ├── claude_client.ts          — API wrapper (handles auth, retries, rate limits)
  ├── prompt_builder.ts         — Builds prompts from game state
  ├── response_parser.ts        — Validates + parses Claude JSON responses
  ├── personality_profiles.ts   — Commander personality system prompts
  ├── army_commander_ai.ts      — Army-level decision maker
  ├── corps_commander_ai.ts     — Corps-level decision maker
  ├── player_advisor.ts         — On-demand advice generator
  ├── decision_log.ts           — Log decisions for replay
  └── fallback.ts               — Routes to formula bot when API unavailable
```

### Integration Points

| Existing System | Integration |
|----------------|-------------|
| `bot_strategy.ts` | Army AI replaces strategy generation |
| `bot_corps_directives.ts` | Corps AI replaces directive generation |
| `bot_brigade_ai_osid.ts` | Unchanged — stays formula-based (too many calls) |
| `officer_system.ts` | Personality profiles derived from officer stats |
| `operation_preparation.ts` | Corps AI decides preparation tempo |
| Command briefing UI | Displays Claude's `briefing_text` and `reasoning` |
| Save/load | `CommandDecisionLog` persisted in save |

### API Configuration

```typescript
// .env or settings
ANTHROPIC_API_KEY=sk-ant-...
AI_COMMANDER_ENABLED=true
AI_COMMANDER_ARMY_MODEL=claude-sonnet-4-6      // strategic decisions
AI_COMMANDER_CORPS_MODEL=claude-haiku-4-5       // routine operational
AI_COMMANDER_CORPS_OP_MODEL=claude-sonnet-4-6   // operation planning
AI_COMMANDER_ADVISOR_MODEL=claude-sonnet-4-6    // player advice
AI_COMMANDER_TEMPERATURE=0                       // minimize variance
AI_COMMANDER_FALLBACK=formula                    // fallback when offline
```

---

## Prototype Scope (v0.5.0 or dedicated feature branch)

### Phase A: Single Army Commander (RS only)
- Claude-as-Mladić commands RS army strategy
- Structured prompt with war state summary
- JSON response parsed into existing `CorpsDirective` format
- Formula bot remains for RBiH + HRHB
- Decision logging for replay
- Fallback to formula bot when API unavailable
- ~1 session to implement

### Phase B: All Three Army Commanders
- Add Halilović/Delić and Petković personality profiles
- Run AI-vs-AI-vs-AI (spectator mode)
- Compare AI strategies to formula bot strategies
- Calibration: does AI produce historically plausible outcomes?
- ~1 session

### Phase C: Corps Commander AI
- Claude generates operational decisions for corps
- Haiku for routine turns, Sonnet for operation planning
- Corps personality from officer stats
- Player receives corps assessments as briefing text
- ~2 sessions

### Phase D: Player Advisor
- "Ask Commander" button in UI
- Situation analysis + top 3 recommendations
- Displayed in command briefing panel
- ~0.5 session

### Phase E: Auto-Play / Spectator
- Full AI control of all factions
- Run loop with visualization
- AAR generation at end
- ~1 session

---

## What This Means for the Game

This isn't a feature. It's a **paradigm shift**.

Most strategy games have AI opponents that follow decision trees or utility curves. They're predictable. Players learn their patterns and exploit them. The AI never surprises you after the first few games.

Claude-as-Mladić would be different. He would:
- **Adapt** to the player's strategy (not just react to the current state)
- **Remember** what happened earlier in the war (context window covers the whole game)
- **Explain** his reasoning in character ("The corridor MUST hold. I don't care what Belgrade says.")
- **Make mistakes** that a real general would make (overcommit, underestimate, let ego drive decisions)
- **Negotiate** at peace plans with actual strategic reasoning, not threshold checks

The player wouldn't be fighting a formula. They'd be fighting a **mind**.

And the corps commanders wouldn't be executing scripts. They'd be **interpreting orders with judgment** — sometimes brilliantly, sometimes badly, depending on their competence rating.

This is the game that Pyrrhic Games was named for. Every decision has cost. Even the AI's decisions.

---

## Open Questions

1. **Context window management** — A full game is 188 turns of state summaries. Does Claude need the full history or just the last N turns + a running summary?
2. **Prompt caching** — Can we cache the system prompt (personality + game rules) to reduce per-call cost?
3. **Structured output** — Use Claude's tool_use / JSON mode for reliable directive parsing?
4. **Streaming** — Should corps assessments stream to the UI in real-time during the "thinking" phase?
5. **Multiplayer** — In multiplayer, does each player's faction get its own Claude advisor? Who pays?
6. **Modding** — Can players write custom personality profiles for commanders? Historical what-ifs?
7. **Content rating** — Mladić's personality involves war crimes decisions. How explicit should the AI reasoning be?

---

## Version Assignment (Revised per CROSS_PLAN_REVIEW_V04.md)

| Version | Milestone |
|---------|-----------|
| **v0.4.5** | Phase A: Single Army Commander prototype (RS/Mladić) — after v0.4.4 Officer Experience |
| v0.5.4 | Phase B-D: All three armies + corps + advisor |
| v0.6.3 | Phase E: Auto-Play + spectator mode |

Note: Originally v0.4.4, renumbered to v0.4.5 so officer experience (v0.4.4) comes first. Claude needs the full officer picture (experience, friction, relationships) to make rich decisions.

*"Your enemy thinks. Your commanders judge. Your advisor reasons. And all of them remember what you did last turn."*
