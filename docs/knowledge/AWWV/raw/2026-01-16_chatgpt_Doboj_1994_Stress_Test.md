---
title: Doboj 1994 Stress Test
date: 2026-01-16
source: chatgpt
confidence: medium
primary_topics: [systems, design]
---

**User**

Let's do a stress test. What would have happened to Ozren and Vozuća if ARBiH took Doboj in, say, 1994, and closed that supply chain?
---

**Assistant**

The file contents provided above are truncated/partial snippets. The complete content for these files IS accessible via querying.

If the user asks a question related to these files, and the provided snippets do not clearly answer it, you **MUST** use the `file_search` tool to search the full document contents before responding.

## How to invoke the file_search tool
If the user's query isn't sufficiently answered by the provided snippets, parsed text, or images, you should invoke `file_search.msearch`.
To search the full content of the available files, you **must** send one message with recipient `to=file_search.msearch` in the analysis channel. Your message should be structured exactly as follows:
```
{
  'queries': ['Example query 1', 'Example query 2']  // List of up to five queries to search for.
}
```

Carefully balance the number of `file_search` calls and the quality of your response with the latency incurred by `file_search` calls.

Important guidelines for query formatting:
- Your message must be a valid JSON object. Do not include any extraneous text, backticks, markdown formatting, or comments beyond what is shown.
- The `queries` field must be a list of strings.
- One of the queries **MUST** exactly match the user's original question, but stripped of any extraneous details, and with ambiguous references clearly resolved using context from the conversation. It **MUST** be a complete sentence.
- Even if you suspect the user meant something else, one query **MUST** still be their original question.

## How to handle results from file_search
The file search tool will respond with the relevant search results from the full files. After you receive these results:
- Carefully evaluate each result to determine its relevance and quality.
- Use the high-quality and relevant results to inform your answer to the user's question.
- When possible, reuse information from prior file_search results and avoid repeating identical queries.

## Tool usage instructions and ordering
When the user asks a question, carefully consider whether the provided snippets sufficiently answer the query, whether you need to invoke `file_search.msearch`, or another available tool (such as `web`, if available) should be used instead.

Tool-ordering Guidelines:
1. For queries related to uploaded files, if snippets are insufficient, strongly prefer invoking `file_search.msearch` over other tools.
    - Avoid using `web.run`, `python` analysis, or any other tools until you have either:
        - Confirmed with high confidence the answer is not in the files, or
        - Have high confidence `file_search_tool` queries are not sufficient to answer the query.
2. Avoid usage of `web_search/web.run` for queries related to uploaded files
    - Carefully consider whether the user's query is better answered by web search results rather than available snippets or results from `file_search_tool`.
    - Unless the user's query is clearly unrelated to the uploaded files, prefer using `file_search.msearch`. You can always follow up with a web search if necessary for a more complete response.
3. Avoid using `python` unless necessary or requested by user.
    - If the user's query is answerable from the parsed text and images from the uploaded files, or from `file_search_tool`, do not invoke `python`.

Always keep this instruction in mind for the rest of the conversation, as the user may reference these files or ask related questions later on.
---

**Assistant**

image_group{"query":["Doboj Bosnia map","Ozren Vozuća map","Ozren mountain Bosnia","Vozuća valley Bosnia"]}

This is a **high-impact counterfactual**, because entity["city","Doboj","bosnia city"] sits exactly where **western RS, Ozren, and eastern Posavina interlock**. Taking it in 1994 would not just be a local defeat, it would **re-write the logistics geometry** of northern Bosnia.

I’ll break this down cleanly, and I’ll flag where assumptions matter.

---

## 1. What Doboj actually does (baseline reality check)

By 1993–94, Doboj functioned as:
- A **rail and road hinge** between Banja Luka–Prijedor axis and eastern RS
- The **rear logistical node** for:
  - Ozren massif VRS groupings
  - The Doboj–Maglaj–Teslić belt
  - Indirectly, Vozuća through Ozren and Teslić links
- A **buffer preventing ARBiH Tuzla–Zenica forces from linking cleanly**

Crucially, **Ozren and Vozuća were not independent pockets**. They were viable only because Doboj kept:
- Ammunition rotation possible
- Casualty evacuation plausible
- Unit relief cyclical instead of terminal

---

## 2. Immediate effects if ARBiH takes Doboj (1994)

Assume:
- Doboj is taken and **held**, not raided
- The Posavina Corridor east of Doboj is **functionally severed**
- No immediate NATO intervention spike (important)

### a) Ozren becomes a semi-isolated mountain complex

Ozren would shift from *supplied salient* to *logistically brittle strongpoint*.

Effects within **weeks to months**:
- Supply state degrades from *strained* to *critical*
- Artillery usage collapses fastest (shell weight matters)
- Infantry ammunition becomes rationed, not absent, but **tempo dies**

Ozren’s terrain favors defense, but **defense without rotation is exhaustion, not stability**.

Key point:
> Ozren could not “collapse fast”, but it **could not sustain 1993–94 intensity** without Doboj.

### b) Vozuća becomes strategically doomed, not tactically weak

Vozuća’s VRS presence already relied on:
- Ozren as its *northern anchor*
- Teslić–Doboj depth for fallback and logistics

With Doboj gone:
- Vozuća becomes a **forward pocket with no operational depth**
- Relief operations require **mountain routing only**
- Any ARBiH pressure now compounds instead of disperses

This means:
- Vozuća’s fall would likely occur **earlier than 1995**, potentially late 1994
- Not via sudden collapse, but via **controlled withdrawal under pressure**, or forced evacuation

---

## 3. Medium-term dynamics (3–9 months)

### Ozren trajectory
Two plausible paths:

**Path A: Orderly contraction**
- VRS shortens lines
- Abandons exposed slopes
- Retains Ozren core as symbolic high ground
- Accepts loss of Vozuća to stabilize Teslić–Prnjavor depth

**Path B: Exhaustion spiral**
- Attempts to hold everything
- Fails to rotate brigades
- Morale and cohesion degrade
- Local collapses force larger pullback anyway

Path A is more likely if **Belgrade pressure increases**, which it would.

---

## 4. Strategic knock-on effects (often missed)

### a) Tuzla–Zenica operational link opens
With Doboj gone:
- ARBiH 2nd and 3rd Corps can **coordinate more freely**
- Vozuća ceases to be a blocking wedge
- Pressure on Teslić and even Prnjavor increases indirectly

This doesn’t mean breakthroughs, but it **tilts initiative westward**.

### b) RS patron pressure spikes
By 1994:
- Serbia is sanctions-fatigued
- RSK is already strategically problematic
- Losing Doboj signals **northern RS fragility**

Result:
- **Belgrade pushes de-escalation**, not counteroffensive
- RS tolerance for “symbolic holds” like Vozuća drops sharply

---

## 5. Bottom line (stress-test verdict)

**If ARBiH takes Doboj in 1994:**

- **Vozuća almost certainly falls earlier** (months, not years)
- **Ozren does not collapse**, but is **forced into contraction**
- RS shifts from *holding salients* to *damage control*
- Northern Bosnia stabilizes into a less favorable RS posture
- War trajectory accelerates toward **earlier strategic exhaustion**

This would **not** end the war in 1994.
But it **removes one of the last VRS interior pressure points** against central Bosnia.

---

## 6. Design takeaway for your game (important)

Doboj should be modeled as:
- A **logistical hinge**, not just a city
- Its fall should:
  - Degrade Ozren supply over time
  - Trigger Vozuća vulnerability escalation
  - Increase RS exhaustion *asymmetrically*

In other words:
> Doboj is not a “win condition”, it is a **cascade initiator**.

If you want, next we can:
- Quantify *how many turns* Vozuća survives post-Doboj
- Or compare this scenario vs the **actual 1995 Vozuća collapse** to calibrate realism
---

**User**

I don't want to model Doboj specifically. I want a general model that will cover all this.
---

**Assistant**

You can model this generically with a **Networked Supply + Depth Shock** system, where “Doboj-like” places emerge from topology instead of being hard-coded.

### 1) Build a supply network from your municipality adjacency graph
Each municipality is a node, each border connection is an edge.
Each side has a **Control Graph**: nodes you politically control, edges between them.

Supply is then just a propagation problem: supply can only flow through your **continuous political control** (unless a corridor exception applies). This matches your existing “supply propagates through continuous political control” concept. fileciteturn0file2

### 2) Give every node two computed values each turn
These are automatic, derived from the graph.

**A. Depth (D)**
- D = shortest controlled-path distance (in edges) from the node to the nearest “Base Source” (capital, major border gateway, sea gateway, etc, defined per faction).
- Low D = rear, high D = frontier.

**B. Betweenness (B), your “hinge score”**
- B = how often this node lies on the shortest supply paths between rear sources and frontline-demand nodes.
- High B nodes are your generic “Doboj”, “Brčko pinch”, “Konjic hinge”, etc, without naming any of them.

You don’t need perfect math if you don’t want it:
- Approx B by counting how many controlled paths from sources to front nodes pass through the node (sampled paths is fine).

### 3) Supply State becomes a function of topology, not events
Each brigade/node has Supply State: Adequate, Strained, Critical (you already use this). fileciteturn0file3

Update rule each turn:
- Start Adequate.
- If node is connected but **(D is high)** or **(B is high and edges are contested/interdicted)**, push to Strained.
- If node becomes disconnected from all sources, push to Critical.
- If it stays Critical, it drives exhaustion and brittleness (which you already want). fileciteturn0file3

### 4) Add a “Depth Shock” when a hinge or deep rear node flips
When a municipality changes political control (combat or coercive takeover), trigger a one-time shock that propagates outward.

**Shock magnitude** should depend on:
- How rear it was: (lower D = bigger shock)
- How hinge it was: (higher B = bigger shock)

**Shock effects (generic, reusable):**
- Nearby controlled nodes take a temporary Supply downgrade (one step) proportional to shock.
- Corps in that region take an exhaustion spike proportional to shock.
- Frontline inertia penalty is applied if this forces withdrawal/line shortening (you already have inertia logic). fileciteturn0file3

This is exactly how “take Doboj, Ozren and Vozuća degrade” emerges naturally:
- Ozren/Vozuća-like areas are typically high-D, dependent on one or two high-B connectors.
- Remove the connector, they fall off the graph, go Critical, then exhaustion makes them contract or collapse.

### 5) Make “salients” and “pockets” automatic, too
Compute for each node:
- **Cut risk**: number of independent controlled paths to a source (2+ is resilient, 1 is fragile, 0 is isolated).
- **Salientness**: if most neighbors are enemy-controlled but node is yours, it’s salient.

Then add simple rules:
- Cut risk = 1 → supply is at least Strained under pressure.
- Cut risk = 0 → Critical, and each turn in Critical increases collapse odds or forces contraction choices.

### 6) Minimal parameters you actually need to tune
- Sources per side (usually 1–3).
- What counts as a “frontline-demand node” (any node adjacent to enemy control, plus enclaves/strongpoints).
- Shock radii (e.g., 1–2 edges for supply downgrade, corps-level exhaustion region).
- How quickly Critical converts into exhaustion/collapse (you already have exhaustion as the core currency). fileciteturn0file2

### 7) Why this works for everything, not just Doboj
Because it’s not “Doboj causes Ozren to die”.
It’s “removing a high-betweenness, low-depth node causes supply graph fragmentation, which makes high-depth sectors go Critical, which accelerates exhaustion and forces contraction”.

If you want, I can express this as:
- A very small set of formulas (Excel-friendly),
- Or pseudocode for Godot,
- Or a plain-language rules section that drops straight into the Rulebook.
---

**User**

Take into consideration 1993. After starting war with HVO, ARBiH was absolutely cut off from former supply chain in Croatia. Yet it not only survived, it defeated HVO. How was this possible and how to model this? Also, ARBiH had its own ammo and weapons production lines, albeit namjenska industrija.
---

**Assistant**

{"search_query":[{"q":"ARBiH arms production 1993 Bosnia wartime weapons production namjenska industrija","recency":3650},{"q":"Bosnian government army logistics 1993 arms embargo smuggling routes Croatia supply cutoff","recency":3650},{"q":"Washington Agreement 1994 Croatia shift support ARBiH supply routes","recency":3650},{"q":"Bosnia war ARBiH improvised weapons factories ammunition production 1992 1993","recency":3650}],"response_length":"short"}
---

**Assistant**

{"open":[{"ref_id":"turn0search1"},{"ref_id":"turn0search1","lineno":120}],"response_length":"short"}
---

**Assistant**

{"search_query":[{"q":"1994-05-13 CIA Lifting the Arms Embargo Impact on the War in Bosnia pdf mirror","recency":3650},{"q":"Croatia cut off arms deliveries April 1993 Bosnian government sustained by weapons leakage quote","recency":3650},{"q":"ARBiH domestic arms production 1992 1993 Travnik Zenica Bugojno weapons factories","recency":3650},{"q":"Bosnia war arms production 'namjenska industrija' 1993 ammunition factory","recency":3650}],"response_length":"short"}
---

**Assistant**

Two things can be true at once in 1993, ARBiH was cut off from the *older, easier* Croatia-linked pipeline, and ARBiH still had enough **alternative supply generation** to keep fighting and, in key sectors, beat HVO.

### How ARBiH could survive the Croatia cutoff and still defeat HVO
1) **The cutoff was not “zero supply”, it was “loss of the main artery”**  
Even after Croatia reportedly cut off deliveries in spring 1993, weapons still reached ARBiH through leakage, covert transit, and back channels, including Iranian-supplied arms moving via Croatia, alongside other clandestine routes. citeturn0search3turn2search12

2) **ARBiH replaced imports with a wartime “munitions economy”**
ARBiH did three practical things that scale surprisingly well in a siege economy:
- **Repaired and recirculated** weapons, captured parts, and ammunition components  
- **Improvised local production** (mines, grenades, simple munitions)  
- **Focused scarce rounds on decisive fights**, while holding other fronts with low-fire methods

A concrete example is central Bosnia, where capturing areas with industrial assets mattered. In Bugojno, control of a weapons factory producing mines and hand grenades is described as strategically important, and after ARBiH’s victory the HVO’s Central Bosnia zone became cut off from significant resupply from Herzegovina. citeturn2search5

3) **The “defeat HVO” part is as much about HVO constraints as ARBiH supply**
In 1993, HVO in central Bosnia ends up fragmented, with some pockets increasingly isolated from their own depth, and under growing political patron constraints that later culminate in the Washington Agreement in March 1994. citeturn2search5turn0search18  
So ARBiH didn’t need abundance, it needed to keep its fighting capacity above the HVO’s breaking point in key municipalities.

4) **ARBiH also had legacy stocks and captures**
Even without perfect documentation, the mechanism is well supported: early-war TO/JNA stocks, battlefield capture, and later inflows all mattered, the ARBiH was chronically short, but not empty. citeturn0search5

---

## How to model this generically (so it covers Doboj-type cases *and* 1993 survival)
Your model needs **multiple supply sources** and **substitution under pressure**, not a single “route = alive/dead”.

### A) Split supply into three streams (all can be partial)
1) **Import flow** (cross-border, patron-gated, volatile)  
2) **Domestic production** (namjenska industrija + workshop improvisation)  
3) **Battlefield capture** (spiky, opportunity-driven)

Total effective supply is a weighted sum:
- Import is high-volume but politically fragile
- Domestic production is lower-volume but resilient once established
- Capture is inconsistent but can be decisive locally

### B) Track “munition quality”, not just “supply”
Use two separate meters per corps/sector:
- **Sustainment supply** (food, basics, spare parts, transport)  
- **Combat munitions** (ammo, explosives, key calibers)

A force can be “supplied enough to exist” yet “munition-poor” and still win, if:
- It concentrates munitions on priority fights
- The opponent’s munitions collapse sooner
- Local isolation punishes the opponent harder (as happened to HVO pockets after losses like Bugojno) citeturn2search5

### C) Add an “Adaptation Curve”
When import flow drops sharply, don’t just downgrade supply forever. Trigger:
- **Shock**: immediate ammo scarcity, readiness penalty
- **Adaptation**: after N turns, domestic production + recovery networks ramp up (if prerequisites exist)

Prerequisites can be generic, not named:
- Industrial base present (any “munitions-capable” node)
- Skilled labor intact
- Energy access
- Security from deep raids

### D) Model why ARBiH could outlast despite scarcity
Make scarcity hurt both sides, but in different ways:
- ARBiH often has **manpower depth** and can accept lower ammo-per-soldier
- HVO pockets can be **logistically brittle** if their internal lines are cut, causing faster collapse when isolated (central Bosnia case) citeturn2search5
- Patron pressure can throttle import flow or force strategic reversals (your existing patron logic fits here) fileciteturn0file2

### E) The key balancing rule
**Isolation + low domestic production = inevitable degradation**  
**Isolation + even modest domestic production = survivable stalemate**  
That single rule is what makes “ARBiH survives 1993 cutoff” compatible with “Doboj hinge collapse cascades”.

If you want, I can turn this into a compact Rules section with exact tracks, thresholds, and turn updates that plug into your existing “Adequate/Strained/Critical” supply states and exhaustion engine. fileciteturn0file2
---

**User**

Do it
---

**Assistant**

## Supply system expansion, multi source logistics, 1993 resilient survival model  
This section replaces any implicit single pipeline assumption with a multi source model that allows an actor to lose an external artery and still fight by substitution, adaptation, and prioritization, while still making hinge losses and corridor failures produce cascades. fileciteturn0file2 fileciteturn0file3  
### 1. Two supply planes, Sustainment and Munitions  
Each municipality, and each Corps if you track Corps level supply, carries two parallel states, Sustainment Supply, SS, and Munitions Supply, MS. SS covers food, fuel, basic spares, medical, transport friction, MS covers ammunition, explosives, key weapon consumables. SS and MS each use the same three step state ladder, Adequate, Strained, Critical. A force can be SS Adequate and MS Critical, this represents 1993 style survival with low fire intensity operations, rationing, and concentrated offensives. fileciteturn0file2 fileciteturn0file3  
### 2. Three supply sources, Import, Domestic, Capture  
Each side has three source streams that feed SS and MS differently. You do not model named routes, you model the streams and their constraints. Import Flow, IF, an external stream, high potential volume, high political volatility. Domestic Production, DP, a resilient internal stream, limited by industrial base and security. Capture Yield, CY, an opportunistic stream, spiky, local, tied to combat outcomes. Each stream produces points into SS and MS each turn, then points are converted into states, with conversion losses if the network is fragmented.  
### 3. Local Production Capacity, LPC, the generic namjenska industry abstraction  
Each municipality has a Local Production Capacity rating, LPC, from 0 to 3. LPC 0 means no meaningful wartime production. LPC 1 means workshop level output, mines, grenades, simple repairs, limited. LPC 2 means light industrial, steady output of small arms ammunition components, explosives, repairs. LPC 3 means true industrial capacity, sustained ammunition and explosives output, plus repair and refurbishment depth. LPC is not “a factory”, it is a composite of workforce, tooling, know how, power access, and protection. LPC can be damaged by capture, siege, or deep disruption, and it can be slowly improved by investment actions.  
### 4. Sector Production Pool, SPP, and why ARBiH could substitute  
For each Corps, compute a Sector Production Pool each turn, SPP, as the sum of LPC values for municipalities that are, first, politically controlled by the Corps owner, second, connected to the Corps HQ node through political control links, third, not under Critical SS, because a starving sector cannot produce reliably. SPP generates Domestic Production points into MS first, then SS second, reflecting that wartime industry primarily matters for munitions and repair. This is the core 1993 mechanism, external import collapses, DP continues, so MS does not go to zero, it goes to strained and then stabilizes. fileciteturn0file2 fileciteturn0file3  
### 5. Import Flow, IF, patron gated and volatility driven  
Each side has an Import Flow rating per turn, IF, from 0 to 3, set by patron posture and international visibility pressure, and optionally by border access nodes you hold. IF is not a route, it is net inflow. IF produces points into MS and SS, with MS weighted higher than SS. IF can drop suddenly, this is your 1993 Croatia cutoff analogue. IF can also rise later, this models covert inflow or policy shifts without naming them. Patron systems and IVP can directly cap IF, this integrates with your existing patron pressure and IVP concepts. fileciteturn0file2 fileciteturn0file3  
### 6. Capture Yield, CY, spiky local munitions acquisition  
Capture Yield triggers only if a Tactical Group achieves a success result that includes enemy materiel seizure, or if an enemy brigade collapses in place. CY creates immediate MS points in the capturing municipality, plus a smaller amount that can be routed to the Corps pool if SS connectivity exists. CY cannot be banked indefinitely, unused CY decays, representing mismatched calibers, spoilage, and lack of spares. CY is how offensives can self sustain briefly even under MS strain, but it is not stable enough to replace DP or IF. fileciteturn0file3  
### 7. Conversion, from points to SS and MS states  
You can implement this without arithmetic heavy bookkeeping by using thresholds. For each Corps each turn, compute two totals, SS Points, MS Points. SS Points equal base SS inflow plus a fraction of DP, MS Points equal base MS inflow plus full DP plus CY. Then apply the thresholds below to set SS State and MS State for each brigade in the Corps, modified by isolation. Suggested thresholds, MS, 0 to 1 points equals Critical, 2 to 3 equals Strained, 4 plus equals Adequate. SS, 0 to 1 equals Critical, 2 equals Strained, 3 plus equals Adequate. If you want less math, set SS and MS states directly by lookup table using, IF level, SPP band, CY presence, and isolation.  
### 8. Isolation penalty, the hinge collapse and pocket death rule  
Connectivity matters twice, first for receiving supply, second for distributing it. For each municipality, compute Supply Connectivity, SC, as Connected or Isolated, based on whether a political control path exists to a Corps source node. If Isolated, SS state worsens by one step, MS state worsens by one step, but only if the Corps level state is not already Critical. This preserves the idea that you can have production in a pocket but still lose distribution capacity, and it makes hinge losses create cascades without naming Doboj. fileciteturn0file2 fileciteturn0file3  
### 9. Shock and Adaptation, the 1993 survival curve  
When Import Flow drops by 2 or more levels in a single turn, trigger an Import Shock for that side. Import Shock applies for 2 turns, during shock, all Corps suffer, MS worsens by one step for offensive actions only, meaning defenders can still hold, but major offensives cost extra exhaustion and degrade Tactical Groups faster. After shock ends, trigger Adaptation. Adaptation lasts 4 turns and represents substitution, rationing, production reallocation, repair networks, and improved salvage. During Adaptation, each Corps with SPP at or above 2 gains plus 1 MS point per turn, or treats its MS state as one step better for defensive operations only. This is the key, losing IF hurts, but sectors with DP can stabilize and even win local wars through prioritization. fileciteturn0file2 fileciteturn0file3  
### 10. Prioritization, how you model “defeat HVO while short”  
Each Corps chooses one Supply Priority each turn, Defensive Sustainment, Offensive Concentration, or Industrial Protection. Defensive Sustainment, reduces exhaustion growth from MS strain on all holding combats, but prevents TG formation above a small limit. Offensive Concentration, allows one TG to treat MS as one step better for that TG only, but increases exhaustion elsewhere and worsens MS elsewhere by one step, this models concentrating scarce rounds. Industrial Protection, prevents LPC damage from raids and reduces the chance of SPP drop, but forces frontline inertia penalties if territory is voluntarily thinned to guard industry, tying this into your anchoring and withdrawal costs. fileciteturn0file2 fileciteturn0file3  
### 11. HVO style pockets, why they can lose despite being “closer to Croatia”  
Pockets and salients are modeled via SC and via a second derived value, Redundancy, R, the number of independent controlled paths to a source. If R equals 0, isolated. If R equals 1, fragile. If R equals 2 plus, resilient. If a pocket is R 1 and under pressure, it must test each turn, on a fail, it becomes effectively Isolated for MS distribution, even if SS trickles, this models ammunition specific cutoff. This is how a side can lose pockets even if it has an external patron, because the patron inflow cannot traverse the local graph reliably.  
### 12. Industrial capture effects, why capturing production nodes matters  
If you capture a municipality with LPC 2 or 3, you gain an immediate one time MS bonus, representing stock on hand and machinery takeover, plus you can add its LPC to your SPP only after a 2 turn Stabilization delay, representing labor retention, tooling adaptation, and security. If the municipality was heavily contested, there is a chance the LPC is degraded by 1 on capture. This makes fights over “industrial towns” strategically meaningful without naming Bugojno or any specific facility.  
### 13. Exhaustion links, scarcity wins fights but loses wars  
Whenever a TG conducts an attack while its MS state is Strained, add plus 1 TG degradation. If MS is Critical, add plus 2 TG degradation and plus 1 Corps exhaustion. Defensive combats under Critical MS do not add the same TG degradation, but they add slow brigade CR erosion. This ensures ARBiH can survive 1993 style scarcity, but sustained high tempo offensives remain costly, consistent with your exhaustion first design. fileciteturn0file2 fileciteturn0file3  
### 14. What this produces in play, sanity check against 1993  
Croatia cutoff, IF drops, Import Shock hurts ARBiH offensives briefly. If ARBiH controls enough LPC across connected municipalities, Adaptation stabilizes MS for defense, and Offensive Concentration allows decisive pushes in selected municipalities at the cost of exhaustion elsewhere. HVO pockets, if they become R 1 under pressure or R 0 through hinge losses, slide into MS distribution failure faster than ARBiH core sectors, and can be beaten locally even if ARBiH remains overall short. This reproduces “cut off yet survives, and wins the internal war in key sectors” without requiring you to hard code routes or specific cities.
