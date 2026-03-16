# Pricing & Business Model — A War Without Victory

**Studio:** Pyrrhic Games
**Date:** 2026-03-16
**Platform:** Steam (primary)
**Status:** PLANNING — pre-launch analysis
**Disclaimer:** This document is deliberately conservative. Better to be pleasantly surprised than bitterly disappointed.

---

## The Harsh Reality First

Before anything else, here's what the data says about indie games on Steam:

- **The median indie game earns ~$4,000-$10,000 lifetime.** After Steam's 30% cut.
- **40-66% of Steam games** fail to earn back the $100 submission fee.
- **~50% of indie games** sell fewer than 100 copies.
- **~90%** sell fewer than 5,000 copies in year 1.
- **The median first-week net revenue** for an indie game: **$799.**
- 29% of games fail to reach even 1,000 wishlists before launch.

This is the base rate. Most indie games fail commercially. The question is whether AWWV has structural advantages that move it above the median.

---

## What AWWV Has Going For It (Honest Assessment)

### Real Advantages
- **Category monopoly** — there is literally no other strategy game about the Bosnian War. Zero competition for the topic.
- **Depth** — 763 tests, 247 brigades, calibrated to 90%+ historical accuracy. Wargamers can tell when a game is real.
- **Emotional constituency** — 20M ex-Yugoslav people care about this topic. Not all are gamers, but those who are have been waiting for this game without knowing it.
- **AI Commander** — genuine differentiator. "Your enemy thinks" is a headline that writes itself. Tech + gaming press coverage potential.
- **Low cost basis** — built by 1 person + AI over 8 weeks. No investors to repay. Break-even is very low.

### Real Risks
- **Subject matter sensitivity** — the Bosnian War is living memory. Controversy is inevitable. Some of it will help sales (attention), some will hurt (boycotts from one community or another).
- **Niche of a niche** — wargames are already niche (~500K active Steam users). A Bosnian War wargame is a niche within that niche.
- **Solo dev, first game** — no track record, no publisher, no existing audience. Steam's algorithm doesn't care about your game's quality until humans tell it to.
- **Discovery is the real problem** — the game could be brilliant and still sell 200 copies if nobody finds it.
- **BCS market has low purchasing power** — the people most emotionally connected have the least money to spend.

---

## Target Audiences (Sized Honestly)

### Primary: Hardcore Wargamers (Global)
- ~500K active strategy/wargame Steam users
- **Realistic addressable:** 1-3% might discover and buy = 5,000-15,000 units
- Will pay €19.99-29.99 without blinking
- Find games through: wargaming forums (Matrix/Slitherine community), YouTube (The Strategy Professor, DasTactic, Tortuga Power), 3MA podcast, Rock Paper Shotgun's wargame column, Reddit (r/wargames, r/computerwargames)

### Secondary: Ex-Yugoslav Gamers
- ~20M population, ~5-10% gamers (~1-2M), ~5-10% would play a war strategy game (~50K-200K)
- **Realistic addressable:** 2-5% of those might discover it = 1,000-10,000 units
- Price sensitive — regional pricing + sales essential
- Find games through: regional gaming media (N1, Klix.ba gaming section), YouTube (Balkan gaming channels), word of mouth, Facebook groups

### Tertiary: AI/Tech Curious Gamers
- Drawn specifically by the AI Commander feature
- Unpredictable — could be 0 or could be 50,000 if a major tech outlet covers it
- **Not a planning base** — treat as upside, not revenue

---

## Pricing

### Base Game: **€19.99 / $19.99**

| Why not cheaper | Why not more expensive |
|----------------|----------------------|
| €9.99 signals "weekend project" | €29.99 prices out Balkans entirely |
| Wargamers expect depth games to cost €20+ | First game, no track record to justify premium |
| €19.99 × 5,000 units = €100K. €9.99 × 5,000 = €50K. Same audience, half the revenue. | €29.99 × 3,000 (fewer buyers) = €90K. Worse outcome. |

### Steam Pricing Mechanics
- **Steam's cut: 30%** on first $10M (effectively all our revenue)
- **Regional pricing:** Steam auto-adjusts for purchasing power
  - BiH/Serbia/Croatia: ~40-50% of USD = ~$10-12 equivalent
  - Russia/Turkey/Brazil: similarly reduced
- **Net per sale:** €19.99 → **€13.99** to Pyrrhic Games (after Steam 30%)

### Sale Strategy (Conservative)
| Timing | Discount | Effective Price | Purpose |
|--------|----------|----------------|---------|
| Launch week | 10% | €17.99 | Convert wishlists |
| Month 3 | 20% | €15.99 | Catch considerers |
| Month 6 (Summer/Winter Sale) | 30% | €13.99 | Broader reach |
| Year 1 | 40% | €11.99 | Long tail |
| Year 2+ | 50-75% | €4.99-9.99 | Volume/discovery |

Average effective price after discounts and regional pricing: **~€12-14 per unit.**
Average net to Pyrrhic after Steam: **~€8-10 per unit.**

---

## AI Commander Premium

### Editions
| Edition | Price | Contents |
|---------|-------|----------|
| **Standard** | €19.99 | Full game. Cadet Mode (formula bot). All scenarios, all factions. |
| **Commander Edition** | €24.99 | Full game + AI Commander unlock + 10 game credits. |

### AI Commander Access
| Path | How | For Whom |
|------|-----|---------|
| **BYOK** | Player's own API keys | Power users, developers |
| **Pyrrhic Credits** | Pre-paid packs via Pyrrhic proxy | Most players |
| **No AI** | Cadet Mode (free, always available) | Everyone else |

### Credit Packs (Honest Cost Basis)
| Pack | Player Pays | Pyrrhic API Cost | Margin |
|------|------------|-----------------|--------|
| 5 Officer games | €7.99 | ~€18 | **-€10 loss** |
| 10 Officer games | €14.99 | ~€36 | **-€21 loss** |
| 5 Commander games | €14.99 | ~€67 | **-€52 loss** |

**The truth: AI credits are a loss at current API prices.** Pyrrhic cannot profitably sell AI Commander credits without either:
1. API prices dropping ~75% (possible by 2027 launch — prices fall ~50%/year)
2. Aggressive prompt caching (reduces cost ~50%)
3. Pricing credits at true cost (€13.50/Commander game = no one buys)
4. BYOK as primary path (zero cost to Pyrrhic)

**Recommended launch approach:** BYOK primary. Credits offered at cost with transparent messaging: "5 Commander games = €14.99. This covers API costs." Don't pretend there's margin. Gamers respect honesty.

---

## Revenue Projections (Deliberately Conservative)

### Probability-Weighted Scenarios

| Scenario | Probability | Year 1 Units | Avg Net/Unit | Net Revenue | What Happens |
|----------|------------|-------------|-------------|------------|-------------|
| **Failure** | **40%** | <500 | €8 | **<€4,000** | Nobody finds the game. Algorithm buries it. No press coverage. |
| **Below median** | **20%** | 500-2,000 | €9 | **€4,500-€18,000** | Some forum posts, a few YouTubers. Trickle sales. |
| **Modest niche hit** | **20%** | 2,000-5,000 | €10 | **€20,000-€50,000** | Wargame community notices. Good reviews. Steady tail. |
| **Solid niche success** | **12%** | 5,000-15,000 | €10 | **€50,000-€150,000** | Press coverage (AI angle). Community grows. DLC viable. |
| **Breakout** | **6%** | 15,000-40,000 | €11 | **€165,000-€440,000** | Major press coverage. AI Commander goes viral. Real money. |
| **Lightning** | **2%** | 40,000+ | €11 | **€440,000+** | This War of Mine scenario. Cultural moment. Unlikely. |

### Expected Value (Probability-Weighted)
```
E[Revenue] = 0.40 × €2,000 + 0.20 × €11,000 + 0.20 × €35,000
           + 0.12 × €100,000 + 0.06 × €300,000 + 0.02 × €500,000
           = €800 + €2,200 + €7,000 + €12,000 + €18,000 + €10,000
           = ~€50,000 expected value (Year 1)
```

**The honest number: expect ~€50,000 in Year 1 net revenue as the probability-weighted average.** This is not life-changing money. It's a solid side income that validates the project and funds continued development.

### What Each Scenario Means Practically

| Scenario | What You Can Do With It |
|----------|------------------------|
| Failure (<€4K) | Nothing financially. Portfolio piece. Learning experience. |
| Below median (€4K-€18K) | Covers a few months of API costs for development. Beer money. |
| Modest hit (€20K-€50K) | Real supplementary income. Justifies continued development. |
| Solid success (€50K-€150K) | Meaningful income. DLC worth making. Consider part-time transition. |
| Breakout (€165K-€440K) | Potentially life-changing. Full-time indie viable. Sequel warranted. |

---

## What Moves the Needle (Controllable Levers)

### Pre-Launch (6+ months before v1.0)

**These are the highest-ROI activities.** The difference between the 40% failure bucket and the 20% modest-hit bucket is almost entirely pre-launch marketing, not game quality.

| Action | Cost | Impact | When |
|--------|------|--------|------|
| **Steam page up early** | Free | Wishlists accumulate while developing | As soon as capsule art exists |
| **Steam Next Fest demo** | Free | Single biggest free visibility event for unknown devs. 1 demo = 1,000-10,000 wishlists if good. | When playable demo exists |
| **Dev blog (Steam News)** | Free | Algorithm rewards regular updates. Weekly posts. | Now (start immediately) |
| **Reddit presence** | Free | r/wargames, r/computerwargames, r/paradoxplaza. NOT spamming — genuine community participation. | Now |
| **YouTube content creators** | Free (review keys) | 1 well-matched wargame YouTuber = 500-5,000 wishlists. Target: The Strategy Professor, DasTactic, Tortuga Power. | 3 months pre-launch |
| **3MA podcast** | Free (pitch) | THE wargame podcast. One appearance = massive niche credibility. | 2 months pre-launch |
| **Wargaming forum presence** | Free | Matrix Games forums, Slitherine forums, Wargamer.com. | Now |
| **Capsule art** | €200-500 | Your Steam capsule is the SINGLE most important marketing asset. Click-through rate determines algorithmic promotion. Professional art, not placeholder. | Before Steam page |
| **Trailer** | €0-1,000 | 60-second gameplay trailer showing the AI Commander thinking. "Watch Mladić reason about your defenses." | 1 month pre-launch |
| **Press kit** | Free | Screenshots, key art, fact sheet, review copies. Must be ready at launch. | 1 month pre-launch |
| **Balkan media outreach** | Free | N1, Al Jazeera Balkans, Klix.ba, Index.hr. "Bosnian developer builds first-ever Bosnian War strategy game." Cultural story, not just gaming. | 2 weeks pre-launch |

**Total marketing budget: €200-1,500.** Most of the high-impact activities are free.

### The AI Commander Press Angle

This is the single biggest amplifier available. The story writes itself in multiple markets:

| Outlet Type | Angle | Example Headline |
|-------------|-------|-----------------|
| Gaming press | Unique gameplay | "This wargame's opposing general is actually an AI that thinks and adapts" |
| Tech press | AI application | "Claude AI powers the opposing commanders in this indie wargame" |
| Cultural press | Historical/regional | "A Bosnian developer built the first strategy game about his country's war" |
| AI industry | Novel use case | "How one developer used multi-model AI to create thinking opponents" |

**Four different press angles, four different audiences.** Most indie games have one angle. AWWV has four.

### Launch Week

| Action | Details |
|--------|---------|
| 10% launch discount | Converts wishlists |
| Press embargo lifts | Reviews from YouTubers + outlets publish same day |
| Dev livestream | Play the game live, show AI Commander in action |
| Reddit AMA | r/wargames + r/gaming AMA: "I built a wargame about the Bosnian War using AI opponents, AMA" |
| Regional media blast | Bosnian/Serbian/Croatian outlets simultaneously |

### Post-Launch (Ongoing)

| Action | Frequency | Impact |
|--------|-----------|--------|
| Steam News updates | Weekly | Algorithm rewards activity |
| Community engagement | Daily (Discord, Steam forums) | Reviews, word of mouth |
| Respond to EVERY review | Ongoing | Shows care, builds trust |
| Bug fixes + quality patches | Bi-weekly | Review score protection |
| DLC announcements | Quarterly | Keeps the game in the news cycle |

---

## Game Positioning

### What AWWV Is
- A serious historical simulation of the 1992-1995 Bosnian War
- A negative-sum strategic game where nobody wins and every decision has cost
- The first game with AI-powered opposing commanders who think and adapt
- A game made with deep respect for the history and its survivors

### What AWWV Is NOT
- Not a casual game (complex, deep, requires investment)
- Not a power fantasy (you will lose things you care about)
- Not sensationalist (no graphic violence, no exploitation of tragedy)
- Not a political statement (all three sides are playable, none are heroes)

### Steam Tags (Discovery)
Primary: Strategy, Wargame, Historical, Turn-Based Strategy, Grand Strategy
Secondary: Military, Simulation, Singleplayer, Indie, Difficult
Community: War, Realistic, Dark, Atmospheric, Political

### Capsule Art Direction
Dark, muted, military. A war room table seen from above with maps of Bosnia. Three faction markers. Dim lighting. The title in austere military stencil. **NOT:** explosions, action poses, dramatic lighting. This is a thinking game, and the art should say so.

---

## Comparable Games — Honest Benchmarks

| Game | Dev Size | Price | Reviews | Est Lifetime Sales | Relevance |
|------|---------|-------|---------|-------------------|-----------|
| **Shadow Empire** | 1 person | €35 | ~1,200 | 25,000-35,000 | Solo dev, deep systems, cult following |
| **Unity of Command II** | Small studio | €30 | ~1,900 | 40,000-60,000 | WWII wargame, ex-Yu developer (Croatian!) |
| **Decisive Campaigns: Ardennes** | Small studio | €30 | ~450 | 10,000-15,000 | Niche WWII wargame, Slitherine published |
| **This War of Mine** | 11 bit studios | €20 | ~58,000 | 500,000+ | War civilian sim, emotional hook, NOT a wargame |
| **Highfleet** | 1 person | €30 | ~2,500 | 50,000-75,000 | Niche, unique, solo dev, cult hit |
| **Radio Commander** | Small studio | €15 | ~370 | 8,000-12,000 | Vietnam War, voice-only command, unique concept |

**Most relevant comp: Radio Commander.** Similar profile — niche war game, unique mechanic (voice command), small team, historical setting. ~10,000 copies. This is the realistic "solid success" benchmark for AWWV.

**Aspirational comp: Unity of Command II.** Also ex-Yugoslav developer, WWII strategy, published by 2x2 Games. ~50,000 copies. This is what "breakout" looks like in this niche.

---

## The Break-Even Calculation

### Development Costs (Actual)
| Item | Cost |
|------|------|
| Developer time (8 weeks intensive, opportunity cost) | €0 (passion project) or €10,000-15,000 (if counting lost income) |
| Claude API (development) | ~€500 (estimated across all sessions) |
| Gemini Pro (asset generation) | ~€50 |
| Historical source material (Balkan Battlegrounds) | ~€100 |
| Steam submission fee | €100 |
| Capsule art + marketing materials | €500-1,000 |
| **Total cash outlay** | **~€1,250-1,750** |

### Break-Even
At €8-10 net per unit (after Steam cut, averaged across regions/discounts):
- **Break-even: ~150-200 copies sold**
- This is achievable even in the failure scenario

### Return on Time
If counting developer opportunity cost at €15,000:
- Break-even at ~1,500-2,000 copies
- Achievable in the "modest niche hit" scenario (20% probability)

---

## DLC Strategy (If Base Game Succeeds)

Only invest in DLC if base game reaches "modest hit" tier (2,000+ copies):

| DLC | Price | Content | Dev Time |
|-----|-------|---------|----------|
| v1.1 "Operation Corridor" | €4.99 | Posavina focus, expanded Brčko/Orašje | 2 weeks |
| v1.2 "Autumn Leaves" | €4.99 | 1993-1994 Croat-Bosniak war deep content | 2 weeks |
| v1.3 "Deliberate Force" | €4.99 | NATO intervention, 1995 endgame | 2 weeks |
| v1.4 "The Hague" | €6.99 | War crimes consequences, moral choices | 3 weeks |

DLC conversion rate for niche games: typically 15-30% of base owners.
At 5,000 base copies: 750-1,500 DLC sales per pack = €3,750-€7,500 per DLC.

---

## What To Tell Your Wife

**The honest version:**

"I'm building a strategy game about the Bosnian War. It cost me €1,500 in cash and 8 weeks of evenings. There's a 40% chance it makes less than €4,000. There's a 20% chance it makes €20,000-€50,000 — real supplementary income. There's a 12% chance it makes €50,000-€150,000, which would be serious money. And there's a small chance it breaks out bigger, but I'm not planning for that.

The break-even is 150 copies. I'll almost certainly clear that. The expected value — the probability-weighted average — is about €50,000 in the first year. Not guaranteed, but that's what the math says.

What I'm NOT doing: quitting my job, taking loans, or investing money we can't afford to lose. The total cash investment is €1,500. Everything else is my time, which I'd be spending on this anyway because I care about the subject.

The AI feature is genuinely novel — no other game does this. It could get press coverage that puts us in the 'solid success' bucket. Or it could get no coverage and we're in the 'modest hit' bucket. Either way, we're not losing money."

---

## Anthropic Partnership Strategy

### Why Not a Patent
The AI Commander technique (LLM with historical personality as opposing commander, multi-model routing by command level) is not worth patenting:
- **Prior art everywhere** — AI opponents in games, LLM-powered NPCs (Inworld AI, Nvidia ACE), model-tier routing all exist
- **Software patents weak in EU** — European Patent Convention doesn't cover software "as such"; US patents cost $15-30K, take 2-3 years, hard to enforce for solo indie
- **The moat is execution, not technique** — anyone can call Claude with a personality prompt; nobody else has 879 tests of calibrated Bosnian War simulation with 247 brigades and historical officer data
- **Patents attract unwanted attention** — at this scale, obscurity is better protection than a patent you can't afford to litigate

**Real IP protection:** Ship fast (first-mover advantage), trademark the brand ("Pyrrhic Games — your enemy thinks"), keep calibration data/OOB/personality profiles proprietary (copyright covers automatically).

### Anthropic Developer Relations — When and How

**When to reach out:** After v0.4.5 prototype is working. Need:
1. A working prototype of Claude-as-Mladić making actual strategic decisions in a real game
2. A 2-minute demo video — "watch Claude decide to abandon Srebrenica"
3. Ideally a few hundred Steam wishlists showing there's an audience

**Who to contact:**
- **Developer Relations team**, not partnerships — they actively seek interesting use cases, run case studies, give credits, feature projects
- **Twitter/X is the best door** — post the demo video, tag @AnthropicAI and @alexalbert (head of developer relations). A compelling public demo gets more attention than a cold email to partnerships@anthropic.com
- Anthropic Discord developer channel for additional visibility

**What to ask for (not money):**
- **API credits** for development and early access players (~$500-1,000 covers months)
- **A case study** — they write it, we get exposure, they get a novel showcase
- **Technical guidance** on prompt caching and structured output for the use case
- **Early access** to new models before public release (they do this for interesting projects)

**The pitch in one sentence:**
> "We built a historically calibrated Bosnian War simulation where Claude commands opposing armies with historically accurate personalities — the first strategy game where your enemy genuinely thinks."

**Why Anthropic might care:**
- Novel showcase: Claude reasoning as Mladić about Brčko corridor vs Sarajevo reinforcement — compelling demo of persona consistency, structured reasoning, moral complexity
- Validates their model tiering strategy (Opus for army, Haiku for corps)
- Wargames are a respectable AI benchmark domain (military strategy as AI testing ground since the 1950s)

**Why they might hesitate:**
- Content sensitivity: "AI roleplays as a war criminal" is a headline their policy team would think carefully about
- API revenue is negligible: 10,000 players × $5/game = $50K/year — noise for Anthropic
- Framing matters: position as historical simulation and educational tool, not glorification

**Action items:**
1. Build v0.4.5 (working AI Commander prototype)
2. Record demo video (2 min, compelling gameplay moment)
3. Post publicly on Twitter/X with tags
4. Follow up with dev rel email if public post gets traction
5. Apply for Anthropic Accelerate program if available

---

*"Another such victory and we are undone." — But at €1,500 invested, even undoing is affordable.*
