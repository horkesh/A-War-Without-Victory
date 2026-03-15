# Endgame, Negotiation & Scoring Design

**Status:** DESIGN — awaiting review and refinement
**Date:** 2026-03-15
**Owner:** Game Designer + Orchestrator

---

## Core Philosophy

**There is no victory screen.** The war ends at the negotiating table — or the player walks away and gets a report card. This is a negative-sum game. Nobody wins. The question is: how much did you lose?

---

## 1. How the Game Ends

There are exactly two ways a game ends:

### 1a. Dayton (The Real Ending)
The game builds toward the Dayton Agreement. The final negotiation **will happen** on 21 November 1995 (turn ~188 from April 1992 start). The player is forced to the table and forced to sign something. What they sign depends on their accumulated **negotiation capital**.

Before Dayton, there are scripted **peace plan events** — the historical "mini-Daytons" — which the player can accept or reject:

| Plan | Date | Proposed Split | Historical Outcome |
|------|------|---------------|-------------------|
| Cutileiro Plan | March 1992 | 44/44/12 cantonization | Signed then withdrawn by RBiH |
| Vance-Owen (VOPP) | Jan-May 1993 | 10 provinces (~53/30/17) | Rejected by RS parliament |
| Owen-Stoltenberg | Aug 1993 | Union of 3 republics (53/30/17) | Rejected by RBiH |
| Contact Group Plan | July 1994 | 51% Federation / 49% RS | Rejected by RS |
| **Dayton** | **Nov 1995** | **51/49, two entities** | **Forced acceptance** |

Each rejected plan has consequences: international pressure shifts, patron support changes, military escalation. Accepting an early plan ends the game early with a modified scoring evaluation.

### 1b. Player Termination (The Quit Screen)
The player can terminate at any point via a menu option. This is **not** an ending — it's quitting. The screen clearly communicates this:

> **"You have terminated the simulation."**
> *The war continues without you. Below is the state of affairs at the time of your departure.*

The player gets a full data screen (territory, casualties, refugees, military position) and a **verdict** — but no negotiation phase. The verdict is harsher than Dayton outcomes because the player abandoned the process.

**There is no turn-limit stalemate.** The existing `timeout_stalemate` at 208 weeks is removed. The game always runs to Dayton (November 1995) or player termination.

---

## 2. Negotiation Capital

Everything the player does during the war converts into negotiation capital. This is **not** a single number — it's a multi-dimensional position that determines what the player can demand (and what they must concede) at the negotiating table.

### Capital Dimensions

| Dimension | What It Measures | Accumulated From |
|-----------|-----------------|-----------------|
| **Military Position** | Territory held, front line strength, strategic positions | OSID control, brigade strength, sector density, enclave status |
| **Humanitarian Standing** | Civilian protection, refugee management | Civilians under protection, refugees created (negative), ethnic cleansing prevented/committed |
| **International Credibility** | Diplomatic weight, patron support | IVP score, patron commitment, compliance with UN resolutions, response to peace plans |
| **Military Effectiveness** | Combat performance relative to resources | Casualty exchange ratio, operations completed, territory defended per capita |
| **Political Cohesion** | Internal unity, authority maintenance | Authority stability, faction fragmentation, commander loyalty, alliance management |

### Per-Faction Capital Weighting

Each faction's "A+" outcome values these dimensions differently:

**ARBiH (RBiH):**
- **Humanitarian Standing** — highest weight. Preserving Bosniak population, preventing ethnic cleansing, maintaining multi-ethnic areas. The world's sympathy is ARBiH's strongest weapon.
- **Military Effectiveness** — rewarded for tenacious defense with inferior resources. Holding Sarajevo, defending enclaves, the transformation from militia to army. A high casualty exchange ratio with fewer resources is impressive, not shameful.
- **International Credibility** — maintaining the victim narrative, cooperating with international community, accepting reasonable peace plans (rejecting them costs credibility).
- **Military Position** — territory matters but ARBiH is not expected to hold 50%. Holding 30-35% as a faction (within the Federation 51%) is the realistic ceiling.
- **Political Cohesion** — managing the ARBiH-HVO relationship. The Washington Agreement is a political victory. Warlord friction (Dudakovic, Oric acting independently) costs cohesion.

**RS (VRS):**
- **Military Position** — highest weight. Territory IS the RS project. Holding contiguous Serb-majority territory. The corridor (Brcko-Posavina) is existential.
- **Military Effectiveness** — leveraging JNA inheritance efficiently. Not wasting the equipment advantage. Maintaining the professional army as long as possible.
- **Political Cohesion** — keeping Belgrade's support (or managing without it after Contact Group rejection). Avoiding the Karadzic-Milosevic split.
- **Humanitarian Standing** — NEGATIVE for RS. Every atrocity, every concentration camp, every ethnic cleansing campaign COSTS capital. Srebrenica is catastrophic. This is the RS trap: territorial gains come with humanitarian costs that destroy negotiating position.
- **International Credibility** — already low. Avoiding NATO intervention is the key. Each rejected peace plan increases intervention risk.

**HRHB (HVO):**
- **Political Cohesion** — highest weight. Managing the two-front dilemma. The alliance with ARBiH is the key strategic variable — break it at the wrong time and you fight everyone.
- **Military Position** — securing Herzegovina, maintaining Posavina corridor, controlling central Bosnia is ambitious but historically failed.
- **International Credibility** — maintaining Croatia's support, managing the Tudjman relationship, avoiding HVO war crimes (Ahmici, Mostar) that damage Zagreb's position.
- **Humanitarian Standing** — the Mostar siege and Lasva Valley operations cost HRHB dearly. A player who avoids these gains significant capital.
- **Military Effectiveness** — HVO is small but capable. Efficiency matters more than scale.

### Capital Accumulation (Per-Turn Tracking)

Each turn, the engine updates a `NegotiationCapital` record per faction:

```
state.negotiation_capital[faction] = {
    military_position: number,      // territory %, strategic positions held
    humanitarian_standing: number,   // net civilian impact (positive = protected, negative = harmed)
    international_credibility: number, // IVP-derived, patron support, peace plan responses
    military_effectiveness: number,  // combat performance ratio
    political_cohesion: number,      // internal stability, alliance management

    // Detailed breakdowns for the verdict screen
    territory_controlled_pct: number,
    civilians_under_protection: number,
    refugees_created: number,
    refugees_received: number,
    military_casualties_inflicted: number,
    military_casualties_taken: number,
    civilian_casualties_caused: number,
    enclaves_held: string[],
    enclaves_lost: string[],
    peace_plans_accepted: string[],
    peace_plans_rejected: string[],
    operations_launched: number,
    operations_successful: number,
    war_crimes_events: number,        // atrocity events triggered (negative capital)
}
```

---

## 3. The Dayton Negotiation

When the game reaches 21 November 1995 (or the player accepts an earlier peace plan), the **Dayton Negotiation Screen** opens. This is not a simple "you won/lost" — it's an interactive negotiation where the player spends capital.

### What's Negotiated

**A. The Map (Entity Boundary Line)**
- The current front line is the starting proposal.
- Players can trade territory: "I'll give you Gorazde corridor access if you give me Brcko."
- Each territorial concession/demand costs/provides capital.
- The bot evaluates proposals based on its own capital position.
- Historically: 51% Federation / 49% RS. Deviation from this is possible but costly.

**B. Institutional Structure**
- How centralized is the post-war state?
- More central institutions = stronger unified BiH (ARBiH goal)
- More entity autonomy = weaker central state (RS goal)
- HRHB may push for 3rd entity (historically failed — absorbed into Federation)

Negotiable institutional points:
| Institution | Centralized (costs RS capital) | Decentralized (costs RBiH capital) |
|-------------|-------------------------------|-----------------------------------|
| Military | Unified army | Entity armies (historical) |
| Police | Central police force | Entity police (historical) |
| Judiciary | Central courts | Entity courts + international judges (historical) |
| Economy | Central bank + unified taxation | Entity economic autonomy |
| Education | Unified curriculum | Entity education (historical) |
| Presidency | Single president | Tripartite rotating (historical) |

Each institutional point has a capital cost. The more military position you have, the more institutional demands you can make. But humanitarian standing matters too — a faction with high humanitarian capital gets international backing for their institutional preferences.

**C. Special Provisions**
- Brcko status (district, entity, arbitration)
- Refugee return guarantees (strong vs. weak)
- War crimes tribunal cooperation requirements
- International oversight (OHR powers)
- Arms embargo lifting timeline

### Bot Negotiation AI

The bot factions evaluate proposals using their own capital reserves:
- **Will accept** if the proposal is within their capital-affordable range
- **Will reject** if the proposal exceeds their capital (they can't concede that much given their position)
- **Will counter** with their own proposal within their range
- International pressure (patron input) narrows the acceptable range for all factions
- At Dayton specifically, the range is maximally compressed — all sides MUST sign

### The Dayton Forcing Function

As the game approaches November 1995, several mechanisms force convergence:
1. **NATO bombing** (if RS hasn't conceded enough) — devastating military impact
2. **Operation Storm aftermath** — RS loses strategic depth
3. **Patron pressure peaks** — Milosevic negotiates for RS (sidelining Pale), US pushes all sides
4. **War exhaustion** — all factions approaching personnel/equipment floors
5. **International intervention threshold** — crossed after Srebrenica

The player can resist Dayton but cannot avoid it. The final screen on 21 November 1995 is mandatory. If the player has refused to negotiate, the international community imposes terms — the player gets the worst possible version of Dayton for their faction.

---

## 3b. Patron Pressure in Negotiations

**Patrons are not decorative. They determine whether a faction can say "no" at the table.**

Each faction has a patron relationship that evolves over the war:

| Faction | Patron | Relationship Arc |
|---------|--------|-----------------|
| RS | Serbia (Milošević) | Starts strong → fractures after Contact Group rejection (1994) → Milošević negotiates FOR RS at Dayton (1995) |
| RBiH | International community (US, UN) | Starts with sympathy → strengthens after atrocities → US brokers Dayton directly |
| HRHB | Croatia (Tuđman) | Starts with direct military support → HVO war crimes strain relationship → Washington Agreement realigns → Tuđman at Dayton table |

### Patron Override Mechanic

The key insight: **Milošević could not force the Bosnian Serbs in 1993, but he did force them in 1995.** This isn't arbitrary — it emerged from specific conditions:

**1993 (Vance-Owen):** RS held 70% territory, VRS military was at peak strength, Milošević still needed Karadžić politically, Belgrade sanctions on RS hadn't started yet, there was no NATO bombing threat. The RS parliament could reject the plan and Milošević couldn't override them. The patron had **low override authority**.

**1995 (Dayton):** RS territory collapsing (70%→49%), VRS losing ground to Federation + NATO bombing, Milošević had already sanctioned RS after Contact Group rejection, RSK destroyed by Operation Storm, Belgrade exhausted by international sanctions. Milošević negotiated on behalf of RS — Karadžić/Mladić weren't even at Dayton. The patron had **maximum override authority**.

### Patron Override Authority (0-100 scale)

Tracks how much a patron can force their client faction to accept terms:

```
patron_override_authority[faction] = f(
    patron_sanctions_on_client,     // Belgrade sanctions on Pale (+30)
    client_military_collapse,       // territory loss rate (+20)
    client_international_isolation, // ICTY indictments, UN votes (+15)
    patron_own_exhaustion,          // patron's own war weariness (+15)
    alternative_patron_options,     // can the client find another patron? (-20 if yes)
    client_military_strength,       // strong army resists patron (-25 if VRS at peak)
    recent_military_defeats,        // Operation Storm, NATO bombing (+20)
)
```

**At Dayton:** If patron override authority > 75, the patron can **force acceptance** on their client. The player (if playing the client faction) sees their negotiation options narrowed — certain demands are "blocked by [patron]." If playing RS in 1995, Milošević removes your ability to reject the deal entirely.

**At earlier peace plans:** Lower override authority means the player can reject. But rejection has consequences — it may increase patron sanctions, which raises future override authority. The Bosnian Serbs rejecting the Contact Group plan in 1994 is what caused Milošević to sanction them, which is what gave him the override authority by 1995.

### Patron Pressure Timeline (Historical Baseline)

| Period | RS Override | RBiH Override | HRHB Override | Key Events |
|--------|-------------|---------------|---------------|------------|
| 1992 | 10-15 | 5-10 | 20-30 | Milošević supportive, US uninvolved, Tuđman directing HVO |
| Early 1993 | 15-20 | 15-20 | 30-40 | Vance-Owen pressure, Tuđman pushes Croat-Bosniak war |
| Late 1993 | 20-25 | 20-25 | 35-45 | Owen-Stoltenberg, international frustration growing |
| Mid-1994 | 40-50 | 25-30 | 60-70 | Contact Group rejection → Belgrade sanctions RS; Washington Agreement → Croatia controls HVO |
| Early 1995 | 50-60 | 30-40 | 70-80 | Sanctions biting, Srebrenica pressure building |
| Aug-Oct 1995 | 75-90 | 50-60 | 80-90 | NATO bombing, Storm, rapid RS territorial collapse |
| **Dayton** | **90-95** | **60-70** | **85-90** | Milošević negotiates for RS. Tuđman negotiates for HRHB. US brokers for RBiH. |

### Mechanical Effect on Negotiations

When patron override > threshold during a peace plan negotiation:

| Override Level | Effect |
|---------------|--------|
| 0-25 | Patron "recommends" acceptance. No mechanical effect. Player fully free. |
| 25-50 | Patron "urges" acceptance. Rejection costs international credibility capital. |
| 50-75 | Patron "demands" acceptance. Rejection triggers patron sanctions (supply reduction, diplomatic isolation). Some negotiation options locked out. |
| 75-100 | Patron **forces** acceptance of minimum terms. Player can negotiate details but cannot reject the framework. At Dayton with override 90+, the patron sits at the table instead of the player for rejected items — the worst-case version is imposed. |

### Player Agency Within Patron Pressure

Even at high override, the player retains some agency:
- **Spend military capital** to resist patron pressure (you can say no if your army is winning)
- **Spend humanitarian capital** to get international community to restrain the patron
- **Negotiate within the framework** — even if you can't reject the 51/49 split, you can fight over which specific territories, and which institutions
- **Pre-Dayton actions** matter — a player who kept patron relationship healthy has more room than one who burned bridges

This creates the historical dilemma: RS rejecting the Contact Group plan felt powerful in 1994, but it's the decision that gave Milošević the authority to force Dayton in 1995. Short-term defiance, long-term catastrophe. Pyrrhic.

---

## 4. Scenarios

| Scenario | Start Date | Turn 0 | Dayton Turn | Duration | Focus |
|----------|-----------|--------|-------------|----------|-------|
| **September 1991** | 1 Sep 1991 | t0 | t~218 | ~4.2 years | Full experience: peace → war → endgame |
| **April 1992** | 6 Apr 1992 | t0 | t~188 | ~3.6 years | Standard war start |
| **April 1993** | 5 Apr 1993 | t0 | t~136 | ~2.6 years | Croat-Bosniak war begins |
| **April 1994** | 4 Apr 1994 | t0 | t~84 | ~1.6 years | Post-Washington, endgame buildup |
| **January 1995** | 2 Jan 1995 | t0 | t~46 | ~10 months | Endgame: Srebrenica → Storm → Dayton |

Each scenario:
- Initializes negotiation capital based on what happened historically before the start date
- Sets appropriate peace plan schedule (only plans after start date are available)
- Loads the correct OOB, territorial control, alliance state, and international pressure
- All end at the same place: Dayton, 21 November 1995

---

## 5. Verdict & Grading

Whether the player reaches Dayton or terminates early, they get a **Verdict Screen** with:

### Faction Report Card

Graded on each capital dimension (A+ through F):

**ARBiH Grading Anchors:**
| Grade | Description | Historical Equivalent |
|-------|-------------|----------------------|
| A+ | Defended most territory, minimal civilian losses, strong international position, Federation intact | Better than historical Dayton |
| A | Roughly historical outcome — 30-33% territory, Sarajevo held, enclaves mostly defended | Historical Dayton |
| B | Lost some key positions but maintained core territory, moderate civilian losses | Slightly worse than history |
| C | Lost significant territory, high civilian casualties, enclaves fallen early | Much worse than history |
| D | Catastrophic losses, most cities fallen, massive displacement | Near-total defeat |
| F | Faction effectively destroyed | Collapse |

**RS Grading Anchors:**
| Grade | Description | Historical Equivalent |
|-------|-------------|----------------------|
| A+ | Held >55% territory, avoided NATO bombing, maintained international standing | Better than peak (impossible without atrocities, hence the trap) |
| A | 49% territory, contiguous entity, Belgrade relationship intact | Historical Dayton |
| B | 45-49% territory, some international concessions | Slightly worse than history |
| C | <45% territory, heavy NATO bombing, international isolation | Much worse |
| D | <40% territory, military collapse, Milosevic abandonment | Near-total defeat |
| F | Entity dissolved in negotiations | Collapse |

**HRHB Grading Anchors:**
| Grade | Description | Historical Equivalent |
|-------|-------------|----------------------|
| A+ | 3rd entity recognized OR Federation with strong Croat autonomy, Herzegovina secured | Better than history (3rd entity) |
| A | Federation partner, constitutional protections, Herzegovina intact | Historical Washington + Dayton |
| B | Federation absorbed but Croat interests protected | Slightly worse |
| C | Marginalized within Federation, lost central Bosnia | Much worse |
| D | No constitutional protections, Croatian support withdrawn | Near-total defeat |
| F | Faction irrelevant at negotiations | Collapse |

### Data Display

The verdict screen shows comprehensive statistics:
- Territory controlled (% and km², with map overlay)
- Population under control (total + by ethnicity)
- Military casualties (inflicted and taken, military + civilian)
- Refugees/IDPs (created and received)
- Enclaves (held, lost, timing of loss)
- Operations (launched, successful, failed)
- Peace plans (offered, accepted, rejected)
- Alliance history (RBiH-HRHB relationship arc)
- International pressure arc (IVP over time)
- Negotiation capital breakdown (if Dayton reached)
- Dayton outcome (if applicable): map + institutions + special provisions

### Composite Score

A single "Pyrrhic Score" (0-100) combining all dimensions with faction-specific weights. This is the leaderboard number — but the detailed breakdown is what matters.

**The score name is deliberate.** A high Pyrrhic Score means you achieved the best possible outcome in a war where the best possible outcome is still terrible. 100 is not a celebration — it's the least bad version of a tragedy.

---

## 6. Design Decisions (Resolved 2026-03-15)

1. **Negotiation UI** — **Card-trading with map preview.** Pre-defined territorial packages ("Goražde corridor", "Brčko district", "Posavina pocket") that the player trades. Each has a capital cost. Map updates in real-time. This mirrors how real negotiations worked — named regions, not arbitrary lines.

2. **Bot negotiation depth** — **Multi-factor but transparent.** Bot evaluates using same 5 capital dimensions the player sees. Shows reaction: "RS rejects — insufficient territorial compensation." No black box.

3. **Peace plan player agency** — **Respond only until Dayton, then propose at Dayton.** Historical plans are scripted events (accept/reject/counter within bounds). At final Dayton, the player assembles their own proposal from territorial + institutional packages.

4. **Srebrenica** — **The central moral question.** RS player faces a decision event at the Srebrenica operation. Historical path: gain territory, lose catastrophic humanitarian capital, trigger NATO bombing. Restraint path: occupy without massacre, less humanitarian cost, NATO may still come from other triggers. The game never rewards the genocide, but shows it wasn't militarily necessary — RS could have taken Srebrenica without it. That's the lesson.

5. **Operation Storm** — **Scripted trigger, player-influenced scope.** Storm happens when Croatia is ready (Aug 1995). Player (as HRHB/ARBiH) influences the follow-up Federation offensive. As RS, player manages the retreat — pull back to defensible lines vs fight for every OSID.

6. **Patron switching** — **Yes, losing your patron is catastrophic.** RS alienating Milošević completely = supply drops to zero, diplomatic cover gone, game-over-in-slow-motion. HRHB alienating Tuđman = HV support withdrawn. RBiH can squander international sympathy via atrocities or unreasonable peace plan rejections.

7. **Early peace plan acceptance** — **Game ends immediately with abbreviated verdict.** "The war never happened. X lives saved." Short campaign = limited data = limited verdict. Rewards peace but gives less "game."

8. **Multiplayer Dayton** — **Deferred to post-1.0.** Hot-seat sealed proposals + patron arbitration is the concept, but this is a v2.0 problem.

## 6b. Washington Agreement & Croatian Military Integration

The Washington Agreement (March 1994) is a separate framework that must be implemented:

**Washington Agreement mechanics:**
- Ends the HRHB-ARBiH war (alliance locked at 0.80)
- HRHB entity dissolved — HVO absorbed into Federation structure
- Joint ARBiH-HVO command structure for anti-RS operations
- Constitutional protections for Croats (1/3 presidency, House of Peoples parity)

**Croatian Army (HV) integration — post-Washington:**
- After Washington, **Croatian regular army brigades appear on the western front** to fight alongside HVO against RS
- This is historically accurate: HV directly participated in Operations Mistral, Sana, Southern Move (Sep-Oct 1995)
- Implementation: HV brigades spawn as HRHB-faction formations with special `origin: 'hv'` tag, high equipment quality, and assignment to western front sectors
- HV brigades are NOT player-controlled if playing HRHB — they follow Croatian strategic objectives (primarily territorial, directed by Zagreb)
- If playing RS: the sudden appearance of professional HV brigades on the western front is the strategic crisis that mirrors Operation Storm's impact

**Washington as a negotiation event:**
- Triggered by: mutual HRHB-ARBiH exhaustion + US patron pressure on both sides
- Player (as RBiH or HRHB) can accept or delay
- Accepting: immediate ceasefire on bilateral front, corps redeploy to RS front, HV integration begins
- Delaying: continued two-front war, patron pressure increases, both factions weaken against RS
- Bot auto-accepts when alliance < -0.3 AND patron override > 50 AND bilateral war duration > 40 weeks

**Design note:** Washington is the mid-game Dayton — a forced peace within the larger war. It must feel like a genuine turning point, not just a flag flip. The mechanical impact (HV brigades + joint command + freed-up corps) should be dramatic and visible on the map within 2-3 turns.

---

## 7. Historical Reference Data

### Territorial Control Arc (RS)
| Period | RS Territory | Notes |
|--------|-------------|-------|
| April 1992 | ~30-40% | Initial seizures, no corridor |
| October 1992 | ~65-68% | Peak after Jajce, Bosanski Brod |
| Mid-1993 | ~70% | Absolute peak, Drina operations |
| 1993-1994 | ~70% stable | Croat-Bosniak war prevents Federation challenge |
| July 1995 | ~70% | Srebrenica falls, but peak maintained |
| October 1995 | ~49% | Post-Storm + NATO bombing + Federation offensives |
| Dayton | 49% | Locked in by agreement |

### Casualty Data (RDC Study)
| Faction | Military KIA | Civilian Dead | Total | % of All |
|---------|-------------|--------------|-------|----------|
| Bosniak | ~30,000 | ~33,000 | ~64,300 | 66.2% |
| Serb | ~24,000 | ~700 | ~24,700 | 25.4% |
| Croat | ~8,000 | ~500 | ~7,600 | 7.8% |
| **Total** | **~62,000** | **~34,200** | **~97,200** | |

### Displacement
- Total displaced: 2.2 million+ (50% of pre-war population)
- Internal: ~1 million
- Abroad: ~1.2 million
- Serb refugees from Croatia (Storm): ~200,000

### Peace Plan Timeline
| Plan | Date | Split | Accepted By | Rejected By |
|------|------|-------|-------------|-------------|
| Cutileiro | Mar 1992 | 44/44/12 | All (then RBiH withdrew) | RBiH (after signing) |
| Vance-Owen | Jan-May 1993 | 10 provinces | RBiH, HRHB | RS (parliament) |
| Owen-Stoltenberg | Aug 1993 | 53/30/17 | RS, HRHB | RBiH |
| Contact Group | Jul 1994 | 51/49 | RBiH, HRHB, Serbia | RS |
| Dayton | Nov 1995 | 51/49 | All (forced) | None |

---

*"Another such victory and we are undone." — But at Dayton, even the undone must sign.*
