# Pricing & Business Model — A War Without Victory

**Studio:** Pyrrhic Games
**Date:** 2026-03-16
**Platform:** Steam (primary), potentially itch.io (secondary)
**Status:** PLANNING — pre-launch analysis

---

## Target Audience

### Primary: Ex-Yugoslav Diaspora + Region (~20M population)
- Emotional connection to subject matter — their war, their families' stories
- Lower purchasing power than Western markets (avg Steam spend in BiH ~€5-15/game)
- Small but intensely motivated: will buy because nothing else exists on this topic
- Estimated addressable: 10,000-30,000 units from the region
- BCS localization is emotional necessity (not commercial — most can read English)

### Secondary: Hardcore Wargamers (Global, ~500K active Steam users)
- Will pay premium for depth and historical accuracy
- Used to: Gary Grigsby ($40), Decisive Campaigns ($30), Shadow Empire ($35), Command: Modern Operations ($80)
- Paradox reference: HOI4 ($40), CK3 ($50), EU4 ($40)
- Judge by depth, not graphics. Respect historical accuracy.
- Estimated addressable: 5,000-20,000 units globally

### Tertiary: AI/Tech Enthusiasts
- Drawn by the AI Commander feature specifically
- "This game uses Claude to power its opposing generals" is a tech story
- Press coverage from gaming + tech publications
- Estimated additional discovery: 2,000-10,000 units

---

## Base Game Pricing

### Recommended: **€19.99 / $19.99**

| Price Point | Wargamer Reaction | Ex-Yu Reaction | Signal |
|---|---|---|---|
| €9.99 | "Suspiciously cheap" | "I'll buy it" | Indie amateur |
| **€14.99** | "Great deal" | "I'll buy it" | Good indie |
| **€19.99** | "Excellent value for this depth" | "I'll consider it / wait for sale" | Serious indie |
| €24.99 | "Fair, standard niche" | "I'll wait for sale" | Niche standard |
| €29.99 | "Expected for wargame" | "Too expensive" | Matrix/Slitherine territory |
| €39.99 | "Only if reviews are stellar" | "No" | AAA niche only |

**€19.99 rationale:**
- Wargamers see exceptional value (most niche wargames €30-50)
- Signals quality without pricing out the Balkan market
- Room for sales: 30% off = €13.99, 50% off = €9.99
- Competitive with: Decisive Campaigns, Shadow Empire, Strategic Command

### Steam Regional Pricing
- Steam auto-suggests ~40-50% of USD for BiH/Serbia/Croatia
- €19.99 → ~$10-12 equivalent in the Balkans
- Don't override — Steam's algorithm handles purchasing power parity
- Russia/Turkey/Brazil similarly adjusted

### Sale Strategy
| Timing | Discount | Price | Target |
|--------|----------|-------|--------|
| Launch | 10% launch week | €17.99 | Early adopters + wishlists |
| 3 months | 20% | €15.99 | Patient wargamers |
| 6 months (Summer Sale) | 30% | €13.99 | Broader audience |
| 1 year (Anniversary) | 50% | €9.99 | Ex-Yu mass market |
| 18+ months | 60-75% | €4.99-7.99 | Long tail discovery |

---

## AI Commander Premium

The game ALWAYS works without AI Commander (Cadet Mode = formula bot, free). AI Commander is optional premium.

### Editions

| Edition | Price | Includes |
|---------|-------|---------|
| **Standard Edition** | €19.99 | Full game, Cadet Mode (formula bot), all scenarios, all factions |
| **Commander Edition** | €24.99 | Full game + AI Commander unlock + 10 game credits (~$15 API value) |

### AI Commander Access Paths

| Path | How It Works | Best For |
|------|-------------|----------|
| **BYOK (Free)** | Player enters own Anthropic/OpenAI/Google API keys in settings. Game routes calls directly. Player pays their own API bills. | Developers, power users, existing API accounts |
| **Pyrrhic Credits (Pre-Paid)** | Buy credit packs: 5 games/$7.99, 10 games/$14.99, 25 games/$29.99. Credits deducted per API call via Pyrrhic proxy. When credits gone → Cadet Mode. No surprise bills. | Most players |
| **Subscription (Post-Launch)** | $14.99/month unlimited Officer Mode, $29.99/month Commander Mode. Monthly cap prevents runaway cost. | Heavy players, streamers |

### Credit Pack Economics

| Pack | Player Pays | Pyrrhic API Cost | Pyrrhic Margin |
|------|------------|-----------------|----------------|
| 5 Officer games | $7.99 | ~$18 API | -$10 (loss leader for adoption) |
| 10 Officer games | $14.99 | ~$36 API | -$21 (subsidized) |
| 5 Commander games | $14.99 | ~$67 API | -$52 (heavy subsidy) |

**Reality check:** At current API prices, Pyrrhic cannot profitably sell AI Commander credits at consumer-friendly prices. Options:
1. **BYOK-first strategy** — most players bring their own keys. Pyrrhic credits as convenience with explicit cost transparency.
2. **Wait for API prices to drop** — model costs decrease ~50% per year. By v1.0 launch (est. 2027), current $13.50/game could be $3-5/game.
3. **Negotiate volume discounts** — Anthropic/OpenAI/Google offer committed-use pricing at ~50% off.
4. **Prompt caching** — Pyrrhic proxy caches system prompts, reducing effective input cost by ~50%. This is already planned.

**Recommended launch strategy:** BYOK is the primary path. Credits offered at cost (no markup, no margin) as a convenience service. Make it transparent: "10 Commander games = $14.99. This covers our API costs." Players respect honesty.

---

## Revenue Projections

### Year 1 Scenarios

| Scenario | Units | Base Rev | AI Rev | Total | After Steam 30% | Monthly |
|---|---|---|---|---|---|---|
| **Pessimistic** | 5,000 | €100K | €10K | €110K | **€77K** | €6.4K |
| **Moderate** | 15,000 | €250K | €40K | €290K | **€203K** | €17K |
| **Optimistic** | 30,000 | €500K | €80K | €580K | **€406K** | €34K |
| **Breakout** | 60,000 | €900K | €150K | €1.05M | **€735K** | €61K |

### Comparable Sales Data

| Game | Type | Price | Year 1 Units (est) | Notes |
|------|------|-------|-------------------|-------|
| Decisive Campaigns: Ardennes | Hex wargame | $30 | ~15,000 | No emotional constituency |
| Shadow Empire | 4X/wargame, solo dev | $35 | ~50,000 | Deep systems, cult following |
| Gary Grigsby's War in the East 2 | Hex wargame | $40 | ~10,000 | Extremely niche |
| Strategic Command WWII | Grand strategy | $40 | ~20,000 | Established franchise |
| This War of Mine | War civilian sim | $20 | ~500,000+ | Emotional hook drove mass market |

**Key insight:** This War of Mine sold 500K+ because it was the first game to show war from civilian perspective. AWWV is the first game about the Bosnian War from the commander perspective. Different scale, same category-creation dynamic.

### Post-Launch DLC Revenue

| DLC | Price | Est Units (of base owners) | Revenue |
|-----|-------|---------------------------|---------|
| v1.1 "Operation Corridor" | €4.99 | 30% | €22K-90K |
| v1.2 "Autumn Leaves" | €4.99 | 25% | €19K-75K |
| v1.3 "Deliberate Force" | €4.99 | 20% | €15K-60K |
| v1.4 "The Hague" | €6.99 | 15% | €16K-63K |

---

## Marketing & Discovery

### Pre-Launch (6 months before v1.0)
- **Steam wishlist campaign** — target 10,000 wishlists before launch
- **Dev blog** — weekly updates showing AI Commander in action, historical research, development process
- **Reddit** — r/wargames, r/paradoxplaza, r/bosnia, r/europe, r/gaming
- **YouTube** — gameplay videos showing AI Commander reasoning. "Watch Mladić think."
- **Discord** — community server for playtesting, feedback, historical discussion
- **Press outreach** — tech angle ("AI-powered opposing general") + historical angle ("first Bosnian War strategy game")

### Launch Week
- 10% launch discount (€17.99)
- Press kit with key art, screenshots, trailer
- Review copies to: Wargamer.com, PCGamer, Rock Paper Shotgun, 3MA podcast, The Flare Path (RPS column)
- Balkan media: N1, Al Jazeera Balkans, regional tech blogs

### The AI Commander Press Angle
This is the unique hook. No other strategy game has an LLM commanding the opposing army with historically-grounded personality. Every tech publication and gaming outlet will cover this. The story writes itself:
- "This indie wargame uses Claude AI as your opposing general — and he plays like the real Mladić"
- "The first game where your enemy actually thinks"
- "A Bosnian developer built a wargame about his country's war — with AI"

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Subject matter controversy | High | Sensitive content guidelines in design. War crimes handled with historical accuracy, not sensationalism. |
| Bosnian market too small alone | Certain | Global wargamer audience is the commercial target. Balkan audience is the emotional core. |
| Steam discovery failure | Medium | Wishlist campaign, press angle (AI), community building pre-launch |
| API costs make AI Commander unprofitable | High | BYOK-first, credits at cost, wait for price drops, prompt caching |
| Niche game, niche audience | Medium | AI Commander differentiator expands beyond wargamer niche. "This War of Mine" precedent. |
| Emotional backlash from affected communities | Medium | Respectful treatment, historical accuracy, advisory board from all three communities |
| Price too high for Balkans | Low | Regional pricing + sale strategy addresses this |

---

## Summary

- **Base game: €19.99** — signals quality, accessible to wargamers, reachable by Balkans via regional pricing + sales
- **Commander Edition: €24.99** — includes AI Commander + 10 game credits
- **AI credits: at cost** — no margin, transparency, BYOK primary
- **Realistic year 1: 15,000 units, €203K after Steam cut** — sustainable indie revenue
- **The AI Commander is the marketing story** — not just a feature, it's the headline

---

*"Another such victory and we are undone." — But at €19.99, the price of understanding is affordable.*
