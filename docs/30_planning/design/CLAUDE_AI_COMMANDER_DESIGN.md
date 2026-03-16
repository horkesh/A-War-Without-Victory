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

### Multi-Model Architecture

**Don't pick one API. Pick three and use each where it's strongest.** Claude for character and persona. Gemini for cheap volume. GPT for reasoning value. The architecture routes each decision to the right model.

#### Model Selection Per Command Level (March 2026 Pricing)

| Level | What Matters | Best Model | Why |
|-------|-------------|-----------|-----|
| Army Commander | Character + strategy | Claude Opus 4.6 | Best persona consistency, nuanced reasoning, moral complexity |
| Corps routine | Speed + cost | Gemini 2.5 Flash / Flash-Lite | 20-50× cheaper, fast enough for "maintain stance" |
| Corps operations | Reasoning | Claude Haiku 4.5 or GPT-5.2 | Good tactical thinking at low cost |
| Player advisor | Player-facing quality | Claude Opus 4.6 / Sonnet 4.6 | Player reads this directly — quality matters |

#### Player-Selectable Configurations

| Config | Army | Corps Routine | Corps Ops | Advisor | **Cost/Game** | **Experience** |
|--------|------|--------------|-----------|---------|--------------|----------------|
| **Commander Mode** | Opus 4.6 ($5/$25) | Haiku 4.5 ($1/$5) | Opus 4.6 ($5/$25) | Opus 4.6 | **~$13.50** | "Your enemy is a mind" |
| **Officer Mode** | Sonnet 4.6 ($3/$15) | GPT-5 Mini ($0.25/$2) | Haiku 4.5 ($1/$5) | Sonnet 4.6 | **~$3.60** | "Your enemy adapts" |
| **Recruit Mode** | Haiku 4.5 ($1/$5) | Gemini Flash-Lite ($0.10/$0.40) | Haiku 4.5 | Haiku 4.5 | **~$1.10** | "Your enemy thinks — sometimes" |
| **Cadet Mode** | Formula bot | Formula bot | Formula bot | None | **Free** | "Your enemy follows rules" |

#### Full Model Reference (March 2026)

**Anthropic Claude:**
| Model | Input $/1M | Output $/1M | Context | Speed | Persona |
|-------|-----------|-------------|---------|-------|---------|
| Opus 4.6 | $5.00 | $25.00 | 1M | Medium | Excellent |
| Sonnet 4.6 | $3.00 | $15.00 | 1M | Fast | Very Good |
| Haiku 4.5 | $1.00 | $5.00 | 200K | Very Fast | Good |

**OpenAI GPT:**
| Model | Input $/1M | Output $/1M | Context | Speed | Persona |
|-------|-----------|-------------|---------|-------|---------|
| GPT-5.4 | $2.50 | $15.00 | 1.05M | Medium | Very Good |
| GPT-5.2 | $1.75 | $14.00 | 400K | Medium-Fast | Very Good |
| GPT-5 Mini | $0.25 | $2.00 | 128K | Fast | Fair |
| GPT-5 Nano | $0.05 | $0.40 | 128K | Very Fast | Poor |

**Google Gemini:**
| Model | Input $/1M | Output $/1M | Context | Speed | Persona |
|-------|-----------|-------------|---------|-------|---------|
| Gemini 3.1 Pro | $2.00 | $12.00 | 1M | Medium | Fair |
| Gemini 3 Flash | $0.50 | $3.00 | 1M | Very Fast | Fair |
| Gemini 2.5 Flash | $0.30 | $2.50 | 1M | Very Fast | Fair |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | 1M | Very Fast | Poor |

### API Configuration

```typescript
// Game settings (player-facing)
ai_commander_mode: 'commander' | 'officer' | 'recruit' | 'cadet';

// API keys (player provides, or Pyrrhic Games proxy)
ai_keys: {
    anthropic?: string;    // Claude — army commander + advisor
    openai?: string;       // GPT — corps operations (officer mode)
    google?: string;       // Gemini — corps routine (all modes)
}

// Internal routing (determined by mode + keys available)
AI_COMMANDER_TEMPERATURE=0;
AI_COMMANDER_FALLBACK='formula';  // when API unavailable
```

### Business Model — How Players Pay

**Three access paths:**

#### Path 1: Bring Your Own Keys (BYOK)
- Player enters their own API keys in game settings
- Game routes calls directly to providers
- Player pays their own API bills
- No Pyrrhic Games involvement in billing
- **Best for:** developers, power users, people with existing API accounts

#### Path 2: Pyrrhic Credits (Pre-Paid)
- Player buys credit packs from Pyrrhic Games:
  - 5 Commander games — $75 (~$15/game)
  - 10 Officer games — $40 (~$4/game)
  - 25 Recruit games — $30 (~$1.20/game)
- Credits stored server-side, deducted per API call
- Game communicates with Pyrrhic Games proxy server that holds the real API keys
- **Overage handling:** when credits run low (20% remaining), player warned. When credits exhausted, game falls back to Cadet Mode (formula bot) mid-game. No surprise billing.
- Player can buy more credits from in-game store or website
- **Best for:** most players, simple UX, predictable cost

#### Path 3: Subscription (Post-Paid with Cap)
- Monthly subscription: $15/month for unlimited Officer Mode, $30/month for Commander Mode
- Hard monthly cap prevents runaway costs (e.g., 50 games/month at Officer = $200 API cost, absorbed by Pyrrhic)
- Pyrrhic Games absorbs the margin risk
- **Best for:** heavy players, competitive/streaming use
- **Note:** Only viable if player base is large enough to amortize — defer to post-launch

#### Overage Protection (All Paths)
- **BYOK:** player manages their own budget — game shows estimated cost per turn and running total
- **Credits:** hard cap — when credits gone, Cadet Mode activates. No debt.
- **Subscription:** monthly cap — when reached, downgraded to Recruit Mode for rest of month

#### Cost Visibility in UI
- Settings panel: "AI Commander: Commander Mode — estimated $13.50/game"
- During gameplay: running cost counter in toolbar (subtle, not intrusive): "$4.23 spent this game"
- Pre-game: "This game will cost approximately $X at your current tier"
- On credit purchase: clear breakdown of what you get

#### Pyrrhic Games Proxy Architecture
For Path 2 and 3, Pyrrhic Games runs a lightweight proxy:
```
Player Game → HTTPS → Pyrrhic Proxy → Anthropic/OpenAI/Google APIs
                        ↓
                  Deduct credits
                  Log usage
                  Rate limit
                  Cache system prompts
```
The proxy adds: credit management, usage logging, rate limiting, and prompt caching (system prompts cached server-side, reducing per-call cost by ~50% for input tokens).

**Important: The game MUST work fully without any API.** Cadet Mode (formula bot) is always available. AI Commander is a premium feature, not a requirement.

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

1. **Context window management** — A full game is 188 turns of state summaries. Does Claude need the full history or just the last N turns + a running summary? Opus 4.6 has 1M context — could fit entire game history, but cost scales with input tokens. Likely best: rolling 20-turn window + cumulative summary.
2. **Prompt caching** — Yes. System prompt (personality + rules, ~2KB) cached server-side via Pyrrhic proxy. Reduces input costs ~50% for repeated calls. All three providers support caching.
3. **Structured output** — Claude tool_use for army decisions, JSON mode for corps routine. GPT function calling where GPT models used. Gemini function calling for Flash calls.
4. **Streaming** — Deferred. Add in v0.5.4 when full corps AI is live. Corps assessments could stream "thinking..." to a briefing panel.
5. **Multiplayer** — Each player could have their own advisor. Costs additive. Deferred to post-1.0.
6. **Modding** — Yes. Personality profiles are JSON/text. Player-editable. "What if Mladić was cautious?" Historical what-ifs as a feature.
7. **Content rating** — AI reasoning should be military-strategic, not graphic. "Securing Srebrenica eliminates the enclave threat" not graphic descriptions. Content filter in the system prompt.
8. **Billing disputes** — What happens if the proxy fails mid-game? Fallback to Cadet Mode. Credits not deducted for failed calls. Retry logic with exponential backoff.
9. **Model updates** — When providers release new models, how do we update? Model IDs stored in config, not hardcoded. Pyrrhic proxy can route to latest models without game update.

---

## Version Assignment (Revised 2026-03-16)

| Version | Milestone | AI Features |
|---------|-----------|-------------|
| **v0.4.5** | AI Command Layer (bundled) | All 3 Army Commanders + Corps Commander AI + Ops Planning AI + Player Advisor. Shared infra: prompt builder, response parser, decision log, fallback, multi-model routing. |
| **v0.5.4** | AI Narrative Layer + Auto-Play | After-Action Reports in character, post-game analysis, AI-vs-AI auto-play/spectator, contextual tutorial/advisor |
| **v0.6.3** | AI Dynamic Content | Procedural events (react to actual gameplay), peace negotiation dialogue (multi-turn with AI-Milošević/Izetbegović/Tuđman) |
| **v0.6.4** | Historical Essays | AI-generated at dev time (~$5 total), shipped with game, unlocked per event |
| *v1.5.0* | AI Scenario Editor + Streaming | Scenario editor assistant ("make Srebrenica hold"), streaming narrator for live commentary |

Note: v0.4.5 bundles Army + Corps + Ops Planning because they share architecture (prompt builder, response parser, fallback). Building one means building all three. Officer experience (v0.4.4) comes first so Claude has the full officer picture.

*"Your enemy thinks. Your commanders judge. Your advisor reasons. And all of them remember what you did last turn."*
