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

## 6. Open Design Questions (For Future Sessions)

1. **Negotiation UI** — is this a map-drawing interface (player proposes boundary lines) or a card-trading system (pre-defined territorial packages)?
2. **Bot negotiation depth** — how sophisticated is the AI at evaluating proposals? Simple threshold or multi-factor?
3. **Peace plan player agency** — can the player propose their OWN peace plans, or only respond to scripted ones?
4. **Srebrenica** — if the player (as RS) could prevent Srebrenica, what happens? Does avoiding the genocide give RS dramatically more negotiation capital? Is this the key "what-if" of the game?
5. **Operation Storm** — is this a scripted event or can the player (as HRHB/ARBiH) influence its timing and scope?
6. **Patron switching** — can the player lose patron support entirely? What happens to RS if Milosevic cuts them off completely?
7. **Early game ending** — if a player accepts Cutileiro in March 1992, does the game end immediately with a short verdict? How do we handle 3+ years of "missing" war?
8. **Multiplayer Dayton** — if multiplayer is implemented, how do three human players negotiate Dayton? Real-time negotiation session?

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
