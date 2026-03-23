# AWWV Event Research: 1994-1995 Bosnian War

**Historian research document -- RESEARCH ONLY, no code changes.**

This document provides comprehensive, ICTY-sourced event proposals for the 1994 and 1995 years of the Bosnian War simulation. Events are organized chronologically within each year. Turn numbers assume Week 0 = April 6, 1992 (scenario start).

## Turn Number Reference

| Date | Approx Turn | Notes |
|------|-------------|-------|
| Feb 5, 1994 | 96 | Already in war_1994.json |
| Feb 28, 1994 | 99 | Already in war_1994.json |
| Mar 18, 1994 | 102 | Already in war_1994.json |
| Apr 10, 1994 | 105 | Already in war_1994.json |
| Jul 5, 1994 | 117 | Already in war_1994.json |
| Aug 4, 1994 | 121 | NEW |
| Oct 25, 1994 | 130 | NEW |
| Nov 1, 1994 | 131 | NEW |
| Nov 23, 1994 | 134 | Already in war_1994.json |
| Dec 23, 1994 | 138 | NEW |
| Jan 1, 1995 | 139 | NEW |
| Apr 1, 1995 | 152 | NEW |
| May 1, 1995 | 157 | NEW |
| May 25, 1995 | 160 | NEW |
| Jul 11, 1995 | 170 | Already in war_1995.json |
| Jul 25, 1995 | 172 | Already in war_1995.json |
| Jul 25, 1995 | 172 | NEW (Operation Summer '95) |
| Aug 4, 1995 | 174 | Already in war_1995.json |
| Aug 28, 1995 | 177 | Already in war_1995.json |
| Sep 8, 1995 | 179 | NEW |
| Oct 12, 1995 | 183 | Already in war_1995.json |
| Nov 1, 1995 | 186 | Already in war_1995.json |
| Dec 14, 1995 | 189 | NEW |

## Existing Events (already in JSON files)

### war_1994.json (8 events)
1. `markale_massacre_1994` -- turn 96
2. `nato_ultimatum_sarajevo_1994` -- turn 96
3. `nato_shoots_down_planes_1994` -- turn 99
4. `washington_agreement_1994` -- turn 102
5. `gorazde_crisis_1994` -- turn 105
6. `contact_group_plan_1994` -- turn 117
7. `anti_sniping_agreement_1994` -- turn 123
8. `bihac_crisis_1994` -- turn 135

### war_1995.json (8 events)
1. `srebrenica_falls_1995` -- turn 170
2. `zepa_falls_1995` -- turn 172
3. `operation_storm_1995` -- turn 174
4. `second_markale_massacre_1995` -- turn 177
5. `nato_deliberate_force_1995` -- turn 177
6. `federation_ground_offensive_1995` -- turn 179
7. `ceasefire_1995` -- turn 183
8. `dayton_talks_begin_1995` -- turn 186

---

# SECTION 1: NEW EVENTS FOR 1994

---

## 1.1 Sarajevo Exclusion Zone Enforced (Feb-Mar 1994)

**Event ID:** `sarajevo_exclusion_zone_1994`
**Date:** February 17-21, 1994 (turn 97-98)
**Category:** military

### Historical Description
Following the NATO ultimatum triggered by the Markale massacre, VRS forces begin large-scale withdrawal of heavy weapons from a 20km exclusion zone around Sarajevo on February 17. By the deadline of February 21, most weapons are withdrawn or placed under UNPROFOR control at collection points. On February 12, Sarajevo enjoys its first casualty-free day since April 1992. The exclusion zone fundamentally constrains VRS operations around the capital.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T), paras. 3521-3524 -- the Trial Chamber found that in the face of NATO ultimatum pressure, Karadzic decided it was necessary to curtail the campaign of shelling. Also: UNSCR 836 (1993) authorization; BB Vol. II chronology.

### Factions Affected
- **RS**: Forced to withdraw heavy weapons from Sarajevo periphery; major operational constraint
- **RBiH**: Temporary relief from bombardment; first civilian respite in nearly two years

### Suggested Mechanical Effects
```json
{
  "id": "sarajevo_exclusion_zone_1994",
  "title": "Sarajevo Exclusion Zone Takes Effect",
  "narrative": "Under threat of NATO air strikes, the VRS begins withdrawing heavy weapons from a 20-kilometer exclusion zone around Sarajevo. Hundreds of artillery pieces and mortars are moved or placed under UNPROFOR control at collection points. On February 12, Sarajevo experiences its first day without a single casualty since April 1992. The siege is not lifted, but its deadliest instrument is temporarily muzzled.",
  "category": "military",
  "trigger": { "turn_min": 97, "turn_max": 98, "phase": "war", "requires_events": ["nato_ultimatum_sarajevo_1994"] },
  "once": true,
  "effect": { "kind": "supply_delta", "faction": "RS", "delta": -5 },
  "effects": [
    { "kind": "morale_change", "faction": "RBiH", "delta": 5 },
    { "kind": "aggression_modifier", "faction": "RS", "delta": -0.10, "duration_turns": 12 },
    { "kind": "narrative", "text": "VRS heavy weapons are withdrawn from around Sarajevo. The exclusion zone brings the first sustained relief to the besieged capital." }
  ],
  "historical_source": "ICTY Karadzic Judgment (IT-95-5/18-T), paras. 3521-3524. UNSCR 836. BB Vol. II."
}
```

### Player Decision: No (automatic)
### Trigger: Calendar (turn 97-98), requires NATO ultimatum event

---

## 1.2 Belgrade Imposes Embargo on Republika Srpska (Aug 1994)

**Event ID:** `belgrade_embargo_rs_1994`
**Date:** August 4, 1994 (turn 121)
**Category:** political

### Historical Description
After the Bosnian Serb assembly rejects the Contact Group plan on August 3, Slobodan Milosevic responds by imposing sanctions on Republika Srpska, severing military and economic support. The border between Serbia and RS is nominally closed to all but humanitarian goods. Milosevic, seeking relief from UN sanctions on Serbia, publicly breaks with Pale. The embargo weakens RS supply lines and deepens the emerging rift between Belgrade and the RS leadership. UNSCR 942 (September 23, 1994) adds further targeted sanctions specifically against RS.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T) -- Karadzic's rejection of the Contact Group plan and resulting isolation from Belgrade. Milosevic testified about the embargo at the ICTY. UNSCR 942 (1994). BB Vol. II Ch. 10.

### Factions Affected
- **RS**: Loss of primary patron support; supply lines degraded; political isolation from Belgrade

### Suggested Mechanical Effects
```json
{
  "id": "belgrade_embargo_rs_1994",
  "title": "Belgrade Breaks with Pale",
  "narrative": "Milosevic has had enough. After the Bosnian Serb assembly rejects the Contact Group plan, Belgrade imposes sanctions on Republika Srpska, closing the border to military supplies and severing the political lifeline that has sustained the war effort. The move is calculated -- Milosevic wants relief from international sanctions on Serbia, and Pale's intransigence is the price he is no longer willing to pay. Your army's supply lines from Serbia are now severed. The international community watches to see if this is real or theater.",
  "category": "political",
  "trigger": { "turn_min": 121, "turn_max": 122, "phase": "war", "requires_events": ["contact_group_plan_1994"] },
  "once": true,
  "requires_player_response": true,
  "bot_response_logic": "historical",
  "effect": { "kind": "supply_delta", "faction": "RS", "delta": -10 },
  "effects": [
    { "kind": "patron_pressure", "faction": "RS", "delta": 15 },
    { "kind": "morale_change", "faction": "RS", "delta": -5 },
    { "kind": "narrative", "text": "Belgrade imposes an embargo on Republika Srpska. The border with Serbia is closed to military supplies." }
  ],
  "response_options": [
    {
      "id": "defiant",
      "label": "Defy Belgrade",
      "description": "We do not need Belgrade's permission to defend our people. Reject the Contact Group map and accept the consequences. Morale holds, but supplies will suffer.",
      "effects": [
        { "kind": "morale_change", "faction": "RS", "delta": 3 },
        { "kind": "supply_delta", "faction": "RS", "delta": -5 }
      ],
      "sets_flags": { "rs_belgrade_response": "defiant" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "internal_cohesion", "delta": 10 },
        { "faction": "RS", "dimension": "patron_confidence", "delta": -20 },
        { "faction": "RS", "dimension": "international_standing", "delta": -10 }
      ],
      "aggression_affinity": 0.7,
      "risk_level": 0.8
    },
    {
      "id": "negotiate",
      "label": "Seek accommodation with Belgrade",
      "description": "Open back-channels to Milosevic. Signal willingness to reconsider the Contact Group map. The embargo may be softened, but at the cost of political independence.",
      "effects": [
        { "kind": "supply_delta", "faction": "RS", "delta": 5 }
      ],
      "sets_flags": { "rs_belgrade_response": "negotiate" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "patron_confidence", "delta": 5 },
        { "faction": "RS", "dimension": "internal_cohesion", "delta": -10 },
        { "faction": "RS", "dimension": "negotiating_leverage", "delta": 5 }
      ],
      "aggression_affinity": -0.5,
      "risk_level": 0.4
    }
  ],
  "historical_source": "ICTY Karadzic Judgment (IT-95-5/18-T). UNSCR 942 (1994). BB Vol. II Ch. 10. Milosevic ICTY testimony."
}
```

### Player Decision: Yes (RS player decides how to respond to Belgrade's break)
### Trigger: Calendar (turn 121-122), requires Contact Group event

---

## 1.3 5th Corps Bihac Offensive / Operation Grmec (Oct 1994)

**Event ID:** `bihac_5th_corps_offensive_1994`
**Date:** October 25, 1994 (turn 130)
**Category:** military

### Historical Description
After defeating Fikret Abdic's breakaway APWB forces, the ARBiH 5th Corps under General Atif Dudakovic launches Operation Grmec, a bold offensive south and east from the Bihac enclave. The 5th Corps captures the strategic Grabez plateau and over 100 km2 of territory within days, advancing toward Bosanska Krupa. The offensive demonstrates the 5th Corps' remarkable combat capability despite its besieged status, but also provokes a devastating VRS counteroffensive that will become the Bihac Crisis.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T), discussion of Bihac pocket operations. BB Vol. II, Ch. 11. ICTY Prosecutor's Pre-Trial Brief, Karadzic case.

### Factions Affected
- **RBiH**: 5th Corps morale surge; territorial gains from Bihac pocket
- **RS**: Strategic concern -- Bihac breakout threatens western flank

### Suggested Mechanical Effects
```json
{
  "id": "bihac_5th_corps_offensive_1994",
  "title": "5th Corps Breaks Out of Bihac",
  "narrative": "General Dudakovic and the 5th Corps have achieved the impossible. After crushing Abdic's breakaway forces, the besieged garrison has turned outward and launched Operation Grmec, striking south and east from the Bihac pocket. The Grabez plateau falls in days. Over 100 square kilometers of territory change hands as ARBiH brigades advance toward Bosanska Krupa. The VRS is caught off guard. But the success will not go unanswered -- the Bosnian Serb command is already mobilizing a massive counteroffensive.",
  "category": "military",
  "trigger": { "turn_min": 129, "turn_max": 132, "phase": "war" },
  "once": true,
  "effect": { "kind": "morale_change", "faction": "RBiH", "delta": 5 },
  "effects": [
    { "kind": "aggression_modifier", "faction": "RS", "delta": 0.15, "duration_turns": 8 },
    { "kind": "narrative", "text": "The 5th Corps breaks out of the Bihac pocket. VRS positions on the Grabez plateau are overrun in a stunning offensive." }
  ],
  "dimension_shifts": [
    { "faction": "RBiH", "dimension": "military_credibility", "delta": 10 }
  ],
  "sets_flags": { "bihac_breakout_occurred": true },
  "historical_source": "BB Vol. II, Ch. 11. ICTY Karadzic Judgment. 5th Corps operational records."
}
```

### Player Decision: No (automatic -- military event)
### Trigger: Calendar (turn 129-132)

---

## 1.4 Operation Cincar / Battle of Kupres (Nov 1994)

**Event ID:** `operation_cincar_1994`
**Date:** November 1, 1994 (turn 131)
**Category:** military

### Historical Description
The HVO launches Operation Cincar, capturing the strategically important town of Kupres on November 3 after fierce fighting. The operation, conducted with significant Croatian Army (HV) support, represents the first major HVO offensive since the Washington Agreement and demonstrates the new Federation's combined military capability. Kupres' capture threatens VRS supply routes to Donji Vakuf and sets the stage for Operation Winter '94.

**ICTY Source:** Prlić et al. Judgment (IT-04-74-T) provides context on HVO/HV military coordination. BB Vol. II, Ch. 11. Croatian War of Independence operational records.

### Factions Affected
- **HRHB**: Major military success; demonstrates post-Washington Agreement capability
- **RS**: Loss of strategic position; supply route threatened

### Suggested Mechanical Effects
```json
{
  "id": "operation_cincar_1994",
  "title": "Operation Cincar -- Kupres Falls to HVO",
  "narrative": "The HVO, reinforced by Croatian Army units operating across the border, launches Operation Cincar against VRS positions around Kupres. After fierce fighting in the mountainous terrain, Kupres falls on November 3. The operation captures a strategically vital junction that threatens VRS supply routes to Donji Vakuf and opens the possibility of deeper operations into western Bosnia. The Washington Agreement's military dividend is becoming apparent.",
  "category": "military",
  "trigger": { "turn_min": 131, "turn_max": 133, "phase": "war", "requires_events": ["washington_agreement_1994"] },
  "once": true,
  "effect": { "kind": "morale_change", "faction": "HRHB", "delta": 5 },
  "effects": [
    { "kind": "morale_change", "faction": "RS", "delta": -3 },
    { "kind": "supply_delta", "faction": "RS", "delta": -3 },
    { "kind": "narrative", "text": "Kupres falls to HVO forces in Operation Cincar. VRS supply routes in western Bosnia are threatened." }
  ],
  "dimension_shifts": [
    { "faction": "HRHB", "dimension": "military_credibility", "delta": 10 },
    { "faction": "RS", "dimension": "territorial_legitimacy", "delta": -5 }
  ],
  "sets_flags": { "kupres_recaptured": true },
  "historical_source": "BB Vol. II, Ch. 11. ICTY Prlić et al. (IT-04-74-T) context. Croatian operational records."
}
```

### Player Decision: No (automatic)
### Trigger: Calendar (turn 131-133), requires Washington Agreement

---

## 1.5 Carter Ceasefire / Cessation of Hostilities Agreement (Dec 1994)

**Event ID:** `carter_ceasefire_1994`
**Date:** December 23, 1994 (turn 138)
**Category:** diplomatic

### Historical Description
Former US President Jimmy Carter brokers a four-month Cessation of Hostilities Agreement (COHA) during a personal visit to Sarajevo and Pale on December 18-23, 1994. The agreement includes a complete ceasefire effective January 1, 1995, reopening of Sarajevo airport to humanitarian flights, and a pledge from all parties to resume peace negotiations. The ceasefire holds imperfectly through the winter months, with both sides using the pause to rearm and reposition. The agreement buys time but does not resolve fundamental territorial disputes.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T), discussion of ceasefire violations and buildup period. BB Vol. II, Ch. 12.

### Factions Affected
- **All factions**: Temporary ceasefire; opportunity to rearm and resupply

### Suggested Mechanical Effects
```json
{
  "id": "carter_ceasefire_1994",
  "title": "Carter Brokers Winter Ceasefire",
  "narrative": "Jimmy Carter arrives in Sarajevo. The former president, acting as private mediator, shuttles between the warring parties and extracts a commitment to a complete cessation of hostilities effective New Year's Day. Humanitarian corridors will reopen. The airport will accept aid flights again. Both sides publicly commit to peace talks. Behind the scenes, both sides know the ceasefire is a breathing space -- time to rearm, resupply, and prepare for whatever comes next.",
  "category": "diplomatic",
  "trigger": { "turn_min": 138, "turn_max": 139, "phase": "war" },
  "once": true,
  "requires_player_response": true,
  "bot_response_logic": "capital_based",
  "effect": { "kind": "narrative", "text": "A four-month cessation of hostilities is agreed. The guns fall temporarily silent across Bosnia." },
  "effects": [
    { "kind": "supply_delta", "faction": "RBiH", "delta": 5 },
    { "kind": "supply_delta", "faction": "RS", "delta": 3 }
  ],
  "response_options": [
    {
      "id": "respect",
      "label": "Honor the ceasefire",
      "description": "Use the pause to resupply and rebuild. Comply with the agreement's terms. International credibility improves.",
      "effects": [
        { "kind": "negotiation_capital", "faction": "RBiH", "dimension": "international_credibility", "delta": 10 },
        { "kind": "aggression_modifier", "faction": "RBiH", "delta": -0.10, "duration_turns": 16 }
      ],
      "dimension_shifts": [
        { "faction": "RBiH", "dimension": "international_standing", "delta": 10 }
      ],
      "aggression_affinity": -0.5,
      "risk_level": 0.3
    },
    {
      "id": "exploit",
      "label": "Use the pause to prepare offensives",
      "description": "Nominally comply while aggressively repositioning forces and stockpiling supplies. Risk of exposure, but the spring offensive will be stronger.",
      "effects": [
        { "kind": "supply_delta", "faction": "RBiH", "delta": 5 },
        { "kind": "aggression_modifier", "faction": "RBiH", "delta": 0.05, "duration_turns": 16 }
      ],
      "dimension_shifts": [
        { "faction": "RBiH", "dimension": "military_credibility", "delta": 5 },
        { "faction": "RBiH", "dimension": "international_standing", "delta": -5 }
      ],
      "aggression_affinity": 0.3,
      "risk_level": 0.5
    }
  ],
  "sets_flags": { "carter_ceasefire_active": true },
  "historical_source": "Carter Center archives. BB Vol. II, Ch. 12. ICTY Karadzic Judgment."
}
```

### Player Decision: Yes (player chooses compliance level)
### Trigger: Calendar (turn 138-139)

---

## 1.6 COHA Ceasefire Begins (Jan 1995)

**Event ID:** `coha_ceasefire_begins_1995`
**Date:** January 1, 1995 (turn 139)
**Category:** diplomatic

### Historical Description
The Cessation of Hostilities Agreement (COHA) takes effect at noon on January 1, 1995. Fighting diminishes significantly along most front lines, though sporadic violations occur. Both sides use the respite to reposition forces, rebuild depleted units, and stockpile supplies. The ceasefire will nominally last until May 1, when it expires without renewal, after which fighting resumes with increased intensity.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T). BB Vol. II.

### Factions Affected
- **All factions**: Reduced combat intensity; resupply window

### Suggested Mechanical Effects
```json
{
  "id": "coha_ceasefire_begins_1995",
  "title": "Cessation of Hostilities Takes Effect",
  "narrative": "At noon on New Year's Day, the guns fall silent across most of Bosnia. The four-month cessation of hostilities agreement is imperfect -- snipers still shoot, mortars still fall on Sarajevo's outskirts -- but the wholesale combat operations that have defined the war pause. Both sides know this is a breathing space, not peace. The question is who will use it better.",
  "category": "diplomatic",
  "trigger": { "turn_min": 139, "turn_max": 140, "phase": "war", "requires_events": ["carter_ceasefire_1994"] },
  "once": true,
  "effect": { "kind": "aggression_modifier", "faction": "RS", "delta": -0.15, "duration_turns": 16 },
  "effects": [
    { "kind": "aggression_modifier", "faction": "RBiH", "delta": -0.10, "duration_turns": 16 },
    { "kind": "aggression_modifier", "faction": "HRHB", "delta": -0.10, "duration_turns": 16 },
    { "kind": "narrative", "text": "The four-month ceasefire begins. Both sides use the respite to rearm and reposition." }
  ],
  "sets_flags": { "coha_active": true },
  "historical_source": "BB Vol. II. ICTY Karadzic Judgment."
}
```

### Player Decision: No (automatic)
### Trigger: Calendar (turn 139-140), requires Carter ceasefire

---

# SECTION 2: NEW EVENTS FOR 1995

---

## 2.1 COHA Ceasefire Expires (May 1995)

**Event ID:** `coha_expires_1995`
**Date:** May 1, 1995 (turn 157)
**Category:** military

### Historical Description
The four-month Cessation of Hostilities Agreement expires on May 1, 1995, without renewal. Fighting resumes across multiple fronts with increased intensity. Both sides have used the winter pause to rearm and reposition. The VRS, in particular, has used the ceasefire to concentrate forces for planned operations against the eastern enclaves. The ARBiH has reorganized and received equipment through clandestine supply channels.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T). Mladic Trial Judgment (IT-09-92-T) -- planning for Srebrenica operation began during the ceasefire period.

### Factions Affected
- **All factions**: Return to full combat operations

### Suggested Mechanical Effects
```json
{
  "id": "coha_expires_1995",
  "title": "Ceasefire Expires -- War Resumes",
  "narrative": "The four-month ceasefire expires without renewal. Within days, artillery resumes along front lines across Bosnia. Both sides have used the winter to prepare. The VRS has quietly concentrated Drina Corps assets near the eastern enclaves. The ARBiH has reorganized its corps structure and received equipment through back-channels. The final act of the war begins.",
  "category": "military",
  "trigger": { "turn_min": 156, "turn_max": 158, "phase": "war" },
  "once": true,
  "effect": { "kind": "narrative", "text": "The COHA ceasefire expires. Full-scale hostilities resume across Bosnia-Herzegovina." },
  "effects": [
    { "kind": "aggression_modifier", "faction": "RS", "delta": 0.15, "duration_turns": 12 },
    { "kind": "aggression_modifier", "faction": "RBiH", "delta": 0.10, "duration_turns": 12 }
  ],
  "sets_flags": { "coha_expired": true },
  "historical_source": "ICTY Karadzic Judgment (IT-95-5/18-T). ICTY Mladic Judgment (IT-09-92-T)."
}
```

### Player Decision: No (automatic)
### Trigger: Calendar (turn 156-158)

---

## 2.2 Operation Flash -- Croatia Retakes Western Slavonia (May 1995)

**Event ID:** `operation_flash_1995`
**Date:** May 1-3, 1995 (turn 157)
**Category:** military

### Historical Description
The Croatian Army launches Operation Flash, recapturing all of the Republic of Serbian Krajina's territory in western Slavonia in a swift three-day offensive. The operation demonstrates the HV's dramatically improved military capability since 1991 and serves as a dress rehearsal for the much larger Operation Storm three months later. The Bosnian Serbs retaliate by shelling Zagreb with cluster munitions, killing 7 civilians. For the VRS, Flash is a warning that the strategic balance is shifting.

**ICTY Source:** Gotovina et al. Trial Judgment (IT-06-90-T) provides operational context. UNSCR 981 (1995). BB Vol. II, Ch. 13.

### Factions Affected
- **RS**: Strategic alarm -- RSK losing territory signals VRS vulnerability
- **HRHB**: Morale boost -- Croatian military success emboldens HVO

### Suggested Mechanical Effects
```json
{
  "id": "operation_flash_1995",
  "title": "Operation Flash -- Croatia Retakes Western Slavonia",
  "narrative": "The Croatian Army strikes without warning, launching Operation Flash against the RSK enclave in western Slavonia. In three days, Croatian forces overrun the entire enclave, scattering its defenders. The operation demonstrates a Croatian military transformed from the ragtag forces of 1991 into a capable, NATO-trained army. The Bosnian Serbs retaliate by firing cluster munitions at Zagreb, but the message is clear: the strategic balance in the region has shifted. The VRS command takes note.",
  "category": "military",
  "trigger": { "turn_min": 157, "turn_max": 158, "phase": "war" },
  "once": true,
  "effect": { "kind": "morale_change", "faction": "RS", "delta": -3 },
  "effects": [
    { "kind": "morale_change", "faction": "HRHB", "delta": 5 },
    { "kind": "narrative", "text": "Croatia's Operation Flash shatters the RSK enclave in western Slavonia in three days. The strategic balance in the region begins to shift." }
  ],
  "dimension_shifts": [
    { "faction": "RS", "dimension": "military_credibility", "delta": -5 },
    { "faction": "HRHB", "dimension": "military_credibility", "delta": 5 }
  ],
  "sets_flags": { "operation_flash_occurred": true },
  "historical_source": "ICTY Gotovina et al. (IT-06-90-T). UNSCR 981. BB Vol. II, Ch. 13."
}
```

### Player Decision: No (automatic -- external event)
### Trigger: Calendar (turn 157-158)

---

## 2.3 Tuzla Gate Massacre (May 25, 1995)

**Event ID:** `tuzla_gate_massacre_1995`
**Date:** May 25, 1995 (turn 160)
**Category:** humanitarian

### Historical Description
A single 130mm artillery shell fired by the VRS strikes the Kapija (Gate) area of Tuzla at 8:55 PM, killing 71 civilians and wounding 240 others. The date -- May 25 -- was formerly celebrated as Youth Day in Yugoslavia, and the downtown was crowded with young people enjoying an evening out. The average age of those killed is 21 years; the youngest victim is two-and-a-half-year-old Sandro Kalesic. The attack is ordered by VRS Chief of Staff General Novak Djukic. The massacre deepens international outrage against the VRS.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T), scheduled shelling incidents. Bosnian State Court convicted Djukic to 20 years (2014). BB Vol. II.

### Factions Affected
- **RS**: International condemnation; war crimes accountability
- **RBiH**: Civilian casualties; morale impact (grief and determination)

### Suggested Mechanical Effects
```json
{
  "id": "tuzla_gate_massacre_1995",
  "title": "Tuzla Gate Massacre",
  "narrative": "A single artillery shell strikes the Kapija -- the Gate -- in downtown Tuzla on a warm May evening. The date is Youth Day, and hundreds of young people crowd the streets. The shell detonates at 8:55 PM. Seventy-one people are killed. Two hundred and forty are wounded. The average age of the dead is twenty-one years. The youngest victim is two and a half years old. The VRS Chief of Staff ordered the bombardment of a city that has no military targets in its center.",
  "category": "humanitarian",
  "trigger": { "turn_min": 160, "turn_max": 160, "phase": "war" },
  "once": true,
  "effect": { "kind": "humanitarian_impact", "faction": "RS", "war_crimes_delta": 2 },
  "effects": [
    { "kind": "patron_pressure", "faction": "RS", "delta": 10 },
    { "kind": "morale_change", "faction": "RBiH", "delta": -3 },
    { "kind": "negotiation_capital", "faction": "RS", "dimension": "international_credibility", "delta": -10 },
    { "kind": "narrative", "text": "71 civilians, mostly young people, are killed by VRS shelling of Tuzla's town center on Youth Day. The youngest victim is two years old." }
  ],
  "dimension_shifts": [
    { "faction": "RS", "dimension": "international_standing", "delta": -10 }
  ],
  "historical_source": "ICTY Karadzic Judgment (IT-95-5/18-T). Bosnian State Court, Novak Djukic conviction (2014). BB Vol. II."
}
```

### Player Decision: No (automatic)
### Trigger: Calendar (turn 160)

---

## 2.4 UN Hostage Crisis (May-June 1995)

**Event ID:** `un_hostage_crisis_1995`
**Date:** May 26-June 18, 1995 (turn 160-163)
**Category:** diplomatic

### Historical Description
After NATO air strikes against VRS ammunition depots near Pale on May 25-26, the VRS seizes 377 UN peacekeepers as hostages. Some are chained to potential NATO bombing targets as human shields -- images broadcast worldwide that shock the international community. The crisis paralyzes NATO's willingness to use air power and exposes the fundamental contradiction of UNPROFOR's mandate: peacekeepers cannot enforce peace while simultaneously being vulnerable to hostage-taking. The crisis prompts the creation of the UN Rapid Reaction Force (RRF) and begins the chain of decisions that will lead to Deliberate Force.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T), Count 11 -- hostage-taking conviction. Karadzic was found to have participated in a JCE to take UN personnel hostage to compel NATO to abstain from air strikes. Mladic Judgment (IT-09-92-T). UNSCR 998 (1995).

### Factions Affected
- **RS**: Short-term tactical gain (NATO stops strikes); long-term strategic catastrophe (hardens international resolve)
- **RBiH**: Demoralized by failure of international protection

### Suggested Mechanical Effects
```json
{
  "id": "un_hostage_crisis_1995",
  "title": "UN Hostages Chained to VRS Targets",
  "narrative": "The VRS response to NATO air strikes near Pale is swift and calculated. Within hours, 377 UN peacekeepers are seized across Bosnian Serb territory. Some are chained to bridges and military installations as human shields against further bombing. The images -- blue-helmeted soldiers handcuffed to ammunition bunkers -- are broadcast worldwide. NATO's air campaign stops. UNPROFOR is paralyzed. The tactic works in the short term. But in the corridors of Washington, London, and Paris, the humiliation is hardening resolve. The rules of engagement are about to change.",
  "category": "diplomatic",
  "trigger": { "turn_min": 160, "turn_max": 163, "phase": "war" },
  "once": true,
  "requires_player_response": true,
  "bot_response_logic": "historical",
  "effect": { "kind": "patron_pressure", "faction": "RS", "delta": 15 },
  "effects": [
    { "kind": "morale_change", "faction": "RBiH", "delta": -5 },
    { "kind": "humanitarian_impact", "faction": "RS", "war_crimes_delta": 1 },
    { "kind": "narrative", "text": "377 UN peacekeepers are taken hostage by the VRS. Images of soldiers chained to military targets as human shields shock the world." }
  ],
  "response_options": [
    {
      "id": "maintain_hostages",
      "label": "Hold hostages until NATO guarantees no more strikes",
      "description": "Maximum leverage. NATO stops bombing. But every day the hostages remain deepens the diplomatic catastrophe.",
      "effects": [
        { "kind": "patron_pressure", "faction": "RS", "delta": 10 },
        { "kind": "negotiation_capital", "faction": "RS", "dimension": "international_credibility", "delta": -20 }
      ],
      "sets_flags": { "un_hostage_response": "maintain" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "international_standing", "delta": -20 },
        { "faction": "RS", "dimension": "patron_confidence", "delta": -15 }
      ],
      "aggression_affinity": 0.8,
      "risk_level": 0.9
    },
    {
      "id": "release_gradually",
      "label": "Release hostages in exchange for concessions",
      "description": "Trade hostages for guarantees. Some diplomatic damage can be contained. NATO may hesitate to strike again.",
      "effects": [
        { "kind": "patron_pressure", "faction": "RS", "delta": 5 },
        { "kind": "negotiation_capital", "faction": "RS", "dimension": "international_credibility", "delta": -10 }
      ],
      "sets_flags": { "un_hostage_response": "gradual_release" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "international_standing", "delta": -10 },
        { "faction": "RS", "dimension": "negotiating_leverage", "delta": 5 }
      ],
      "aggression_affinity": 0.0,
      "risk_level": 0.5
    }
  ],
  "dimension_shifts": [
    { "faction": "RS", "dimension": "international_standing", "delta": -15 }
  ],
  "sets_flags": { "un_hostage_crisis_occurred": true },
  "historical_source": "ICTY Karadzic Judgment (IT-95-5/18-T), Count 11 (hostage-taking). Mladic Judgment (IT-09-92-T). UNSCR 998 (1995)."
}
```

### Player Decision: Yes (RS player decides hostage strategy)
### Trigger: Calendar (turn 160-163)

---

## 2.5 Rapid Reaction Force Deployed (Jul 1995)

**Event ID:** `rapid_reaction_force_1995`
**Date:** July 1995 (turn 168-170)
**Category:** military

### Historical Description
In response to the hostage crisis and the manifest inadequacy of UNPROFOR, Britain, France, and the Netherlands deploy a 4,000-strong Rapid Reaction Force (RRF) equipped with heavy artillery and armored vehicles. The RRF is positioned on Mount Igman overlooking Sarajevo, with orders to use force to protect the supply route into the capital. Unlike UNPROFOR, the RRF operates under robust rules of engagement permitting offensive fire. The deployment signals a fundamental shift in the international community's approach -- from peacekeeping to peace enforcement.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T). UNSCR 998 (1995) authorizing the RRF. BB Vol. II, Ch. 14.

### Factions Affected
- **RS**: New military threat; heavy artillery on Igman constrains SRK operations
- **RBiH**: Improved supply access to Sarajevo; signal of hardening international resolve

### Suggested Mechanical Effects
```json
{
  "id": "rapid_reaction_force_1995",
  "title": "UN Rapid Reaction Force Deploys to Mount Igman",
  "narrative": "A new force arrives on the battlefield. Four thousand British, French, and Dutch troops -- equipped with heavy artillery, armored vehicles, and orders to shoot back -- take up positions on Mount Igman above Sarajevo. The Rapid Reaction Force is not UNPROFOR. Its rules of engagement permit offensive fire against any force that threatens UN operations or the humanitarian supply route. For the first time, the international presence in Bosnia has teeth. The VRS now faces a second army overlooking its siege positions around the capital.",
  "category": "military",
  "trigger": { "turn_min": 168, "turn_max": 170, "phase": "war" },
  "once": true,
  "effect": { "kind": "supply_delta", "faction": "RBiH", "delta": 5 },
  "effects": [
    { "kind": "morale_change", "faction": "RBiH", "delta": 3 },
    { "kind": "patron_pressure", "faction": "RS", "delta": 10 },
    { "kind": "narrative", "text": "The UN Rapid Reaction Force deploys heavy artillery on Mount Igman. For the first time, the international military presence in Bosnia has offensive capability." }
  ],
  "dimension_shifts": [
    { "faction": "RS", "dimension": "military_credibility", "delta": -5 }
  ],
  "sets_flags": { "rrf_deployed": true },
  "historical_source": "UNSCR 998 (1995). ICTY Karadzic Judgment (IT-95-5/18-T). BB Vol. II, Ch. 14."
}
```

### Player Decision: No (automatic -- external event)
### Trigger: Calendar (turn 168-170)

---

## 2.6 Operation Summer '95 / Glamoc-Grahovo (Jul 1995)

**Event ID:** `operation_summer_95`
**Date:** July 25-29, 1995 (turn 172)
**Category:** military

### Historical Description
A joint HV-HVO force of 8,500 troops under Croatian Lieutenant General Ante Gotovina launches Operation Summer '95, capturing Bosansko Grahovo on July 28 and Glamoc on July 29. The offensive captures approximately 1,600 km2 of VRS-held territory in western Bosnia. Critically, the capture of Grahovo cuts the main supply road from Knin to Banja Luka, strategically isolating the Republic of Serbian Krajina and setting the conditions for Operation Storm one week later.

**ICTY Source:** Gotovina et al. Trial Judgment (IT-06-90-T). BB Vol. II, Ch. 14.

### Factions Affected
- **HRHB**: Major territorial gains; morale surge
- **RS**: Strategic supply route severed; RSK isolation

### Suggested Mechanical Effects
```json
{
  "id": "operation_summer_95",
  "title": "Operation Summer '95 -- Grahovo and Glamoc Fall",
  "narrative": "Croatian Army and HVO forces launch Operation Summer '95, striking at the strategic junction towns of Bosansko Grahovo and Glamoc. The HV 4th and 7th Guards Brigades, battle-hardened veterans of Operation Flash, spearhead the assault. Grahovo falls on July 28, Glamoc the following day. In five days, 1,600 square kilometers change hands. The critical Knin-Banja Luka supply road is cut. The Republic of Serbian Krajina is now strategically isolated. The groundwork for a far larger operation is laid.",
  "category": "military",
  "trigger": { "turn_min": 172, "turn_max": 173, "phase": "war", "requires_events": ["washington_agreement_1994"] },
  "once": true,
  "effect": { "kind": "morale_change", "faction": "HRHB", "delta": 5 },
  "effects": [
    { "kind": "morale_change", "faction": "RS", "delta": -5 },
    { "kind": "supply_delta", "faction": "RS", "delta": -5 },
    { "kind": "narrative", "text": "Grahovo and Glamoc fall to HV-HVO forces. The Knin-Banja Luka supply road is severed, isolating the RSK." }
  ],
  "dimension_shifts": [
    { "faction": "HRHB", "dimension": "military_credibility", "delta": 10 },
    { "faction": "RS", "dimension": "territorial_legitimacy", "delta": -10 }
  ],
  "sets_flags": { "grahovo_glamoc_captured": true },
  "historical_source": "ICTY Gotovina et al. (IT-06-90-T). BB Vol. II, Ch. 14."
}
```

### Player Decision: No (automatic -- external military event)
### Trigger: Calendar (turn 172-173), requires Washington Agreement

---

## 2.7 Karadzic-Mladic Command Crisis (Aug 1995)

**Event ID:** `karadzic_mladic_split_1995`
**Date:** August 4-11, 1995 (turn 174)
**Category:** political

### Historical Description
On August 4, 1995 -- the same day Operation Storm begins -- Karadzic announces he is removing General Mladic from command and assuming personal control of the VRS. Karadzic blames Mladic for the loss of Grahovo and Glamoc. The crisis exposes deep tensions between the political and military leadership of Republika Srpska. However, Mladic's immense popularity with the army and officers corps forces Karadzic to rescind his order on August 11. The episode damages RS cohesion at the worst possible moment.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T). Mladic Trial Judgment (IT-09-92-T). Multiple ICTY witness testimonies on the command crisis.

### Factions Affected
- **RS**: Internal cohesion crisis; command paralysis at critical moment

### Suggested Mechanical Effects
```json
{
  "id": "karadzic_mladic_split_1995",
  "title": "Karadzic Attempts to Remove Mladic",
  "narrative": "The crisis erupts on the worst possible day. As Croatian forces launch Operation Storm, Karadzic announces from Pale that he is removing Mladic from command and assuming personal control of the army. He blames the general for losing Grahovo and Glamoc. The army's reaction is immediate and hostile -- officers rally behind their commander, ignoring the political leadership. For seven days, Republika Srpska's command structure is paralyzed by an internal power struggle. On August 11, Karadzic is forced to back down. Mladic remains. But the damage is done.",
  "category": "political",
  "trigger": { "turn_min": 174, "turn_max": 175, "phase": "war" },
  "once": true,
  "requires_player_response": true,
  "bot_response_logic": "personality_weighted",
  "effect": { "kind": "cohesion_change", "faction": "RS", "delta": -5 },
  "effects": [
    { "kind": "morale_change", "faction": "RS", "delta": -5 },
    { "kind": "narrative", "text": "Karadzic attempts to remove Mladic from command. The VRS officer corps rallies behind the general. RS political-military leadership is paralyzed for a week." }
  ],
  "response_options": [
    {
      "id": "remove_mladic",
      "label": "Press the dismissal -- assert political control",
      "description": "Force Mladic out. You may lose the army's loyalty, but civilian authority over the military must be established. The officer corps will resist.",
      "effects": [
        { "kind": "cohesion_change", "faction": "RS", "delta": -10 },
        { "kind": "morale_change", "faction": "RS", "delta": -5 }
      ],
      "sets_flags": { "karadzic_mladic_crisis": "mladic_removed" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "internal_cohesion", "delta": -20 },
        { "faction": "RS", "dimension": "military_credibility", "delta": -15 }
      ],
      "aggression_affinity": -0.3,
      "risk_level": 0.9
    },
    {
      "id": "back_down",
      "label": "Rescind the order -- Mladic stays",
      "description": "Admit defeat. Mladic remains in command. Your authority is diminished, but the army's command structure is preserved at a critical moment.",
      "effects": [
        { "kind": "morale_change", "faction": "RS", "delta": 3 }
      ],
      "sets_flags": { "karadzic_mladic_crisis": "backed_down" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "internal_cohesion", "delta": -5 },
        { "faction": "RS", "dimension": "military_credibility", "delta": 5 }
      ],
      "aggression_affinity": 0.0,
      "risk_level": 0.3
    }
  ],
  "dimension_shifts": [
    { "faction": "RS", "dimension": "internal_cohesion", "delta": -10 }
  ],
  "sets_flags": { "karadzic_mladic_crisis_occurred": true },
  "historical_source": "ICTY Karadzic Judgment (IT-95-5/18-T). Mladic Judgment (IT-09-92-T). ICTY witness testimony."
}
```

### Player Decision: Yes (RS player decides whether to press Mladic removal)
### Trigger: Calendar (turn 174-175)

---

## 2.8 Operation Mistral 2 / Recapture of Jajce (Sep 1995)

**Event ID:** `operation_mistral_2_1995`
**Date:** September 8-15, 1995 (turn 179)
**Category:** military

### Historical Description
HV and HVO forces under Major General Ante Gotovina launch Operation Mistral 2, a major offensive in western Bosnia. The elite 4th and 7th Guards Brigades, fresh from Operation Storm, attack north from Grahovo. Jajce -- lost to the VRS in October 1992 -- is recaptured on September 13. In eight days, approximately 2,000 km2 of territory changes hands. Combined with the ARBiH's Operation Sana from the north, VRS-held territory in western Bosnia collapses toward the 49% line envisioned by the Contact Group plan.

**ICTY Source:** Gotovina et al. Trial Judgment (IT-06-90-T). BB Vol. II, Ch. 15.

### Factions Affected
- **HRHB**: Massive territorial gains; Jajce recaptured
- **RS**: Catastrophic territorial loss; western front collapses
- **RBiH**: Federation partner's success improves overall strategic position

### Suggested Mechanical Effects
```json
{
  "id": "operation_mistral_2_1995",
  "title": "Operation Mistral 2 -- Jajce Recaptured",
  "narrative": "The Croatian war machine rolls north from Grahovo. Operation Mistral 2 sends the 4th and 7th Guards Brigades -- the same elite formations that took Knin -- into the heart of VRS-held western Bosnia. Sipovo falls. Mrkonjic Grad falls. And on September 13, Jajce -- the symbolic prize lost in October 1992 amid mutual HVO-ARBiH recriminations -- is liberated. Two thousand square kilometers change hands in eight days. The VRS line in western Bosnia is disintegrating.",
  "category": "military",
  "trigger": { "turn_min": 179, "turn_max": 180, "phase": "war", "requires_events": ["operation_storm_1995"] },
  "once": true,
  "effect": { "kind": "morale_change", "faction": "HRHB", "delta": 8 },
  "effects": [
    { "kind": "morale_change", "faction": "RS", "delta": -8 },
    { "kind": "morale_change", "faction": "RBiH", "delta": 5 },
    { "kind": "supply_delta", "faction": "RS", "delta": -10 },
    { "kind": "narrative", "text": "Jajce is recaptured after three years. HV-HVO forces sweep through western Bosnia, collapsing VRS positions across a 2,000 km2 front." }
  ],
  "dimension_shifts": [
    { "faction": "HRHB", "dimension": "military_credibility", "delta": 10 },
    { "faction": "HRHB", "dimension": "territorial_legitimacy", "delta": 15 },
    { "faction": "RS", "dimension": "territorial_legitimacy", "delta": -15 },
    { "faction": "RS", "dimension": "military_credibility", "delta": -10 }
  ],
  "sets_flags": { "jajce_recaptured": true },
  "historical_source": "ICTY Gotovina et al. (IT-06-90-T). BB Vol. II, Ch. 15."
}
```

### Player Decision: No (automatic)
### Trigger: Calendar (turn 179-180), requires Operation Storm

---

## 2.9 Operation Sana -- 5th Corps Final Offensive (Sep-Oct 1995)

**Event ID:** `operation_sana_1995`
**Date:** September 13, 1995 (turn 179)
**Category:** military

### Historical Description
The ARBiH 5th Corps, reinforced by elements of the 7th Corps, launches Operation Sana from the Bihac pocket on September 13. The offensive advances toward Bosanski Petrovac, Sanski Most, and Bosanska Krupa. After initial setbacks near Kljuc that require HV intervention (Operation Southern Move), the 5th Corps captures Sanski Most on October 12. The operation, combined with Mistral 2, establishes the 51/49% territorial distribution envisioned by the Contact Group -- the map that will become the Dayton line. ARBiH casualties: 178 killed, 588 wounded. VRS losses: 900 killed, over 1,000 wounded.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T). BB Vol. II, Ch. 15.

### Factions Affected
- **RBiH**: Major offensive success; 5th Corps vindicated; territory recovered
- **RS**: Catastrophic territorial loss in western Bosnia

### Suggested Mechanical Effects
```json
{
  "id": "operation_sana_1995",
  "title": "Operation Sana -- The 5th Corps Advances",
  "narrative": "Three years of siege end in a single week. The 5th Corps -- the same formation that held the Bihac pocket against VRS, RSK, and Abdic's forces combined -- breaks out in force. Operation Sana sweeps south and east. Bosanski Petrovac falls. Bosanska Krupa falls. Sanski Most is captured on October 12. The 5th Corps, which spent three years defending the most isolated pocket in Bosnia, now spearheads the largest ARBiH territorial gain of the entire war.",
  "category": "military",
  "trigger": { "turn_min": 179, "turn_max": 183, "phase": "war", "requires_events": ["nato_deliberate_force_1995"] },
  "once": true,
  "effect": { "kind": "morale_change", "faction": "RBiH", "delta": 10 },
  "effects": [
    { "kind": "morale_change", "faction": "RS", "delta": -8 },
    { "kind": "supply_delta", "faction": "RS", "delta": -10 },
    { "kind": "narrative", "text": "The 5th Corps breaks out of the Bihac pocket. Operation Sana captures Sanski Most, Bosanski Petrovac, and Bosanska Krupa. RS territory approaches the 49% Dayton line." }
  ],
  "dimension_shifts": [
    { "faction": "RBiH", "dimension": "military_credibility", "delta": 15 },
    { "faction": "RBiH", "dimension": "territorial_legitimacy", "delta": 10 },
    { "faction": "RS", "dimension": "territorial_legitimacy", "delta": -10 }
  ],
  "sets_flags": { "operation_sana_occurred": true },
  "historical_source": "ICTY Karadzic Judgment (IT-95-5/18-T). BB Vol. II, Ch. 15."
}
```

### Player Decision: No (automatic)
### Trigger: Calendar (turn 179-183), requires Deliberate Force

---

## 2.10 US Halts Federation Advance (Oct 1995)

**Event ID:** `us_halts_federation_advance_1995`
**Date:** October 12, 1995 (turn 183)
**Category:** diplomatic

### Historical Description
As Federation forces approach Banja Luka -- the largest city in Republika Srpska with approximately 200,000 residents -- the United States intervenes diplomatically to halt the advance. Richard Holbrooke and US envoys pressure both Croatia and Bosnia to accept a ceasefire, warning that the capture of Banja Luka could trigger a humanitarian catastrophe (mass refugee flows, possible VRS scorched-earth response) and destabilize the nascent peace process. The front lines freeze approximately along the 51/49% line that will become the Dayton inter-entity boundary.

**ICTY Source:** BB Vol. II, Ch. 15. Holbrooke, "To End a War" (1998). US State Department chronology.

### Factions Affected
- **RBiH**: Advance halted short of maximum gains; forced to negotiate
- **HRHB**: Similarly constrained by Zagreb's deference to Washington
- **RS**: Saved from complete military collapse; Banja Luka preserved

### Suggested Mechanical Effects
```json
{
  "id": "us_halts_federation_advance_1995",
  "title": "Washington Halts the Federation Advance",
  "narrative": "Banja Luka is within reach. Federation forces have driven the VRS from a third of its territory in six weeks. But the phone rings from Washington. Holbrooke is blunt: take Banja Luka and you will have 200,000 Serb refugees, a humanitarian catastrophe, and no peace agreement. Zagreb backs down immediately. Sarajevo follows reluctantly. The front lines freeze. The 51/49 line that has defined every peace plan since July 1994 becomes reality not through negotiation, but through the calculated halt of a military advance.",
  "category": "diplomatic",
  "trigger": {
    "turn_min": 182, "turn_max": 184, "phase": "war",
    "requires_events": ["federation_ground_offensive_1995"]
  },
  "once": true,
  "requires_player_response": true,
  "bot_response_logic": "accept_first",
  "effect": { "kind": "narrative", "text": "The United States pressures Federation forces to halt their advance short of Banja Luka. The front lines freeze along the 51/49% territorial division." },
  "effects": [
    { "kind": "aggression_modifier", "faction": "RBiH", "delta": -0.20, "duration_turns": 12 },
    { "kind": "aggression_modifier", "faction": "HRHB", "delta": -0.20, "duration_turns": 12 }
  ],
  "response_options": [
    {
      "id": "comply",
      "label": "Accept the halt -- pursue peace",
      "description": "Stop the advance. The territorial gains are sufficient for a strong negotiating position. Holbrooke promises a seat at the table.",
      "effects": [
        { "kind": "negotiation_capital", "faction": "RBiH", "dimension": "international_credibility", "delta": 15 },
        { "kind": "morale_change", "faction": "RBiH", "delta": -3 }
      ],
      "dimension_shifts": [
        { "faction": "RBiH", "dimension": "international_standing", "delta": 10 },
        { "faction": "RBiH", "dimension": "negotiating_leverage", "delta": 10 }
      ],
      "aggression_affinity": -0.7,
      "risk_level": 0.2
    },
    {
      "id": "push_further",
      "label": "Push for Banja Luka before stopping",
      "description": "Defy Washington. Take Banja Luka and negotiate from maximum strength. But you may lose American support entirely.",
      "effects": [
        { "kind": "morale_change", "faction": "RBiH", "delta": 5 },
        { "kind": "negotiation_capital", "faction": "RBiH", "dimension": "international_credibility", "delta": -20 },
        { "kind": "patron_pressure", "faction": "RBiH", "delta": 15 }
      ],
      "dimension_shifts": [
        { "faction": "RBiH", "dimension": "international_standing", "delta": -15 },
        { "faction": "RBiH", "dimension": "territorial_legitimacy", "delta": 10 }
      ],
      "aggression_affinity": 0.8,
      "risk_level": 0.9
    }
  ],
  "sets_flags": { "advance_halted": true },
  "historical_source": "Holbrooke, 'To End a War' (1998). BB Vol. II, Ch. 15. US State Dept. chronology."
}
```

### Player Decision: Yes (RBiH player decides whether to comply with US pressure)
### Trigger: Calendar (turn 182-184), requires federation ground offensive

---

## 2.11 Dayton Agreement Signed (Dec 14, 1995)

**Event ID:** `dayton_signed_1995`
**Date:** December 14, 1995 (turn 189)
**Category:** diplomatic

### Historical Description
After 21 days of proximity talks at Wright-Patterson Air Force Base in Dayton, Ohio (November 1-21), the General Framework Agreement for Peace in Bosnia and Herzegovina is formally signed in Paris on December 14, 1995. The agreement establishes Bosnia as a single sovereign state composed of two entities: the Federation of Bosnia and Herzegovina (51%) and Republika Srpska (49%). A NATO-led Implementation Force (IFOR) of 60,000 troops, including 20,000 Americans, deploys on December 20 to enforce the military provisions. The war that killed over 100,000 people and displaced over two million is formally over.

**ICTY Source:** Karadzic Trial Judgment (IT-95-5/18-T) -- the Dayton framework is referenced throughout as the resolution of the conflict. UNSCR 1031 (1995) authorizing IFOR.

### Factions Affected
- **All factions**: War ends; territorial settlement fixed; IFOR deployed

### Suggested Mechanical Effects
```json
{
  "id": "dayton_signed_1995",
  "title": "The Dayton Agreement Is Signed",
  "narrative": "In a ceremony in Paris, the presidents of Bosnia, Croatia, and Serbia affix their signatures to the General Framework Agreement for Peace. The document -- hammered out over 21 days of grueling proximity talks at Wright-Patterson Air Force Base -- establishes Bosnia as a single state composed of two entities. Fifty-one percent for the Federation. Forty-nine percent for Republika Srpska. Sixty thousand NATO troops will enforce the peace. The war that began with shots fired at a wedding procession in Sarajevo in March 1992 is over. Over 100,000 are dead. Over two million are displaced. The peace is imperfect. But the killing stops.",
  "category": "diplomatic",
  "trigger": { "turn_min": 189, "turn_max": 189, "phase": "war", "requires_events": ["dayton_talks_begin_1995"] },
  "once": true,
  "effect": { "kind": "narrative", "text": "The Dayton Agreement is signed in Paris. Bosnia is divided into two entities. 60,000 NATO troops deploy to enforce the peace." },
  "effects": [
    { "kind": "morale_change", "faction": "RBiH", "delta": 5 },
    { "kind": "morale_change", "faction": "RS", "delta": 5 },
    { "kind": "morale_change", "faction": "HRHB", "delta": 5 }
  ],
  "sets_flags": { "dayton_signed": true },
  "historical_source": "ICTY Karadzic Judgment (IT-95-5/18-T). UNSCR 1031 (1995). Dayton General Framework Agreement (1995)."
}
```

### Player Decision: No (automatic -- endgame event)
### Trigger: Calendar (turn 189), requires Dayton talks

---

# SECTION 3: SUMMARY -- COVERAGE GAP ANALYSIS

## Events Now Covered by Year

### 1994 (8 existing + 4 new = 12 total)

| # | Event | Turn | Status | Category |
|---|-------|------|--------|----------|
| 1 | Markale Massacre I | 96 | EXISTING | humanitarian |
| 2 | NATO Ultimatum on Sarajevo | 96 | EXISTING | diplomatic |
| 3 | Sarajevo Exclusion Zone Enforced | 97-98 | **NEW** | military |
| 4 | NATO Shoots Down VRS Aircraft | 99 | EXISTING | military |
| 5 | Washington Agreement | 102 | EXISTING | diplomatic |
| 6 | Gorazde Crisis | 105 | EXISTING | military |
| 7 | Contact Group Plan | 117 | EXISTING | diplomatic |
| 8 | Belgrade Embargo on RS | 121 | **NEW** | political |
| 9 | Anti-Sniping Agreement | 123 | EXISTING | diplomatic |
| 10 | 5th Corps Bihac Offensive | 130 | **NEW** | military |
| 11 | Operation Cincar / Kupres | 131 | **NEW** | military |
| 12 | Bihac Crisis | 135 | EXISTING | military |
| 13 | Carter Ceasefire | 138 | **NEW** | diplomatic |

### 1995 (8 existing + 11 new = 19 total)

| # | Event | Turn | Status | Category |
|---|-------|------|--------|----------|
| 1 | COHA Ceasefire Begins | 139 | **NEW** | diplomatic |
| 2 | COHA Expires -- War Resumes | 157 | **NEW** | military |
| 3 | Operation Flash | 157 | **NEW** | military |
| 4 | Tuzla Gate Massacre | 160 | **NEW** | humanitarian |
| 5 | UN Hostage Crisis | 160-163 | **NEW** | diplomatic |
| 6 | Rapid Reaction Force Deployed | 168-170 | **NEW** | military |
| 7 | Srebrenica Falls | 170 | EXISTING | humanitarian |
| 8 | Zepa Falls | 172 | EXISTING | territorial |
| 9 | Operation Summer '95 | 172 | **NEW** | military |
| 10 | Operation Storm | 174 | EXISTING | military |
| 11 | Karadzic-Mladic Command Crisis | 174 | **NEW** | political |
| 12 | Markale Massacre II | 177 | EXISTING | humanitarian |
| 13 | NATO Deliberate Force | 177 | EXISTING | military |
| 14 | Operation Mistral 2 / Jajce | 179 | **NEW** | military |
| 15 | Operation Sana | 179-183 | **NEW** | military |
| 16 | Federation Ground Offensive | 179 | EXISTING | military |
| 17 | US Halts Federation Advance | 183 | **NEW** | diplomatic |
| 18 | Ceasefire | 183 | EXISTING | diplomatic |
| 19 | Dayton Talks Begin | 186 | EXISTING | diplomatic |
| 20 | Dayton Agreement Signed | 189 | **NEW** | diplomatic |

## Events NOT Yet Covered (Candidates for Future Expansion)

### 1994
- **Sarajevo humanitarian corridor improvements** (post-exclusion zone) -- could be folded into exclusion zone event
- **RS referendum rejecting Contact Group plan** (Aug 27-28, 1994) -- could be a sub-event of Belgrade embargo
- **Operation Winter '94** (Nov-Dec, HV/HVO in SW Bosnia) -- partially covered by Bihac crisis context
- **UNSCR 942** (Sept 23, 1994 -- targeted RS sanctions) -- could be folded into Belgrade embargo

### 1995
- **Split Agreement** (Jul 22 -- Tudjman-Izetbegovic mutual defense pact) -- important diplomatic event enabling HV operations in BiH
- **Srebrenica genocide detailed sub-events** (column of men, Kravica warehouse, Branjevo farm) -- too granular for strategic sim
- **Prijedor expulsions** (Sep-Oct 1995, 6,500 civilians expelled) -- important humanitarian event
- **IFOR deployment details** (Dec 20 onward) -- could be folded into Dayton signed event

## Category Distribution

| Category | 1994 | 1995 | Total |
|----------|------|------|-------|
| Military | 5 | 8 | 13 |
| Diplomatic | 4 | 5 | 9 |
| Political | 1 | 1 | 2 |
| Humanitarian | 1 | 2 | 3 |
| Territorial | 0 | 1 | 1 |
| **Total** | **11** | **17** | **28** |

## Player Decisions Summary

| Event | Faction | Decision Type |
|-------|---------|---------------|
| Belgrade Embargo on RS | RS | Response to patron break (defiant vs. accommodate) |
| Carter Ceasefire | All | Compliance level (honor vs. exploit) |
| Contact Group Plan (existing) | All | Accept vs. reject territorial division |
| Washington Agreement (existing) | RBiH/HRHB | Embrace vs. reluctant acceptance |
| UN Hostage Crisis | RS | Hostage strategy (maintain vs. release) |
| Karadzic-Mladic Split | RS | Command crisis (remove Mladic vs. back down) |
| US Halts Advance | RBiH | Comply with Washington vs. push further |
| Dayton Talks (existing) | All | Good faith vs. hardline negotiation |

---

## Sources

- [ICTY Karadzic Case (IT-95-5/18)](https://www.icty.org/en/case/karadzic)
- [ICTY Mladic Case (IT-09-92)](https://www.icty.org/en/case/mladic)
- [ICTY Prlic et al. Case (IT-04-74)](https://www.icty.org/en/case/prlic)
- [ICTY Gotovina et al. Case (IT-06-90)](https://www.icty.org/en/case/gotovina)
- [ICTY Krstic Judgment -- Srebrenica](https://www.icty.org/x/cases/krstic/tjug/en/krs-tj010802e-1.htm)
- [Siege of Sarajevo -- IRMCT](https://www.irmct.org/en/mip/features/sarajevo)
- [UN About Srebrenica Genocide](https://www.un.org/en/observances/srebrenica-genocide-commemoration-day/about)
- [NATO Intervention in Bosnia -- Wikipedia](https://en.wikipedia.org/wiki/NATO_intervention_in_Bosnia_and_Herzegovina)
- [Operation Deliberate Force -- Wikipedia](https://en.wikipedia.org/wiki/Operation_Deliberate_Force)
- [Operation Storm -- Wikipedia](https://en.wikipedia.org/wiki/Operation_Storm)
- [Operation Flash -- Wikipedia](https://en.wikipedia.org/wiki/Operation_Flash)
- [Operation Sana -- Wikipedia](https://en.wikipedia.org/wiki/Operation_Sana)
- [Operation Mistral 2 -- Wikipedia](https://en.wikipedia.org/wiki/Operation_Mistral_2)
- [Dayton Agreement -- Wikipedia](https://en.wikipedia.org/wiki/Dayton_Agreement)
- [1994 Gorazde Air Strikes -- Wikipedia](https://en.wikipedia.org/wiki/1994_Gora%C5%BEde_air_strikes)
- [Banja Luka Incident (Feb 1994) -- Wikipedia](https://en.wikipedia.org/wiki/Banja_Luka_incident_(February_1994))
- [25 May 1995 Tuzla Massacre -- Wikipedia](https://en.wikipedia.org/wiki/25_May_1995_Tuzla_massacre)
- [Washington Agreement -- Wikipedia](https://en.wikipedia.org/wiki/Washington_Agreement)
- [Siege of Bihac -- Wikipedia](https://en.wikipedia.org/wiki/Siege_of_Biha%C4%87_(1992%E2%80%931995))
- [Carter Center -- Bosnia Ceasefire](https://www.cartercenter.org/news/documents/doc214.html)
- [US State Dept. Balkan Conflict Chronology](https://1997-2001.state.gov/regions/eur/bosnia/balkan_conflict_chron.html)
- [NATO Peace Support Operations in Bosnia](https://www.nato.int/en/what-we-do/operations-and-missions/peace-support-operations-in-bosnia-and-herzegovina-1995-2004)
- [Holbrooke, "To End a War" (1998)](https://www.brookings.edu/articles/decision-to-intervene-how-the-war-in-bosnia-ended/)
