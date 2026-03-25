# Letter Home + Missing Essay Authoring Spec

**Date:** 2026-03-25
**Author:** Narrative Designer
**Purpose:** Two self-contained specs for nightshift agents. No design decisions required -- just execute.

---

## DELIVERABLE 1: Letter Home Template System

### 1.1 Overview

One procedural vignette per turn, drawn from that turn's casualties. Appears in the Chief of Staff briefing panel (`src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx`) as the final paragraph, after all military situation paragraphs. 3-5 sentences. Documentary tone. No sentimentality. The horror speaks for itself.

### 1.2 Template JSON Schema

Create file: `data/templates/letter_home_templates.json`

```json
{
  "version": 1,
  "templates": [
    {
      "id": "kia_off_01",
      "casualty_type": "kia_offensive",
      "text_template": "Private {name}, age {age}, from {municipality}. Enlisted with {brigade} after displacement from his home village. Killed during the assault on {circumstance}. His wife {wife_name} was notified at the displaced persons centre in {displacement_municipality}.",
      "required_fields": ["name", "age", "municipality", "brigade", "circumstance", "wife_name", "displacement_municipality"]
    }
  ]
}
```

**Schema fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique template ID. Format: `{casualty_type_abbrev}_{nn}`. kia_off, kia_def, kia_siege, wia, mia. |
| `casualty_type` | enum | One of: `kia_offensive`, `kia_defensive`, `kia_siege`, `wia`, `mia` |
| `text_template` | string | Template text with `{placeholder}` substitution markers |
| `required_fields` | string[] | List of placeholders used in this template |

**Placeholder definitions:**

| Placeholder | Source | Description |
|-------------|--------|-------------|
| `{name}` | Name pool (see 1.4) | Full name: "{first} {surname}" |
| `{age}` | Deterministic: `18 + ((turn * 3 + totalKIA) % 30)` | Age 18-47 |
| `{municipality}` | Brigade `home_osid` -> municipality slug, title-cased | Origin municipality |
| `{brigade}` | Formation display name from OOB | Brigade that took the casualty |
| `{circumstance}` | Derived from battle outcome + target OSID | e.g. "the failed offensive at Doboj" or "defensive positions near Gorazde" |
| `{wife_name}` | Name pool (female names, see 1.4) | Wife/mother/sister first name |
| `{displacement_municipality}` | Faction-appropriate rear municipality | Where family was displaced to |
| `{hospital}` | Faction-appropriate hospital town | For WIA templates |
| `{rank}` | Deterministic pick from [Private, Corporal, Sergeant] | Enlisted rank |

### 1.3 Twenty Templates

#### KIA -- Offensive (5)

**kia_off_01:**
{rank} {name}, age {age}, from {municipality}. Volunteered for {brigade} in the first weeks of the war. Killed during the assault on {circumstance}. He leaves behind a wife, {wife_name}, and two children he had not seen in four months.

**kia_off_02:**
{name}, {age} years old. A metalworker from {municipality} before the war. Died of wounds sustained during {brigade}'s advance on {circumstance}. The field medic's report notes he was conscious when they reached him. He asked about the outcome of the attack.

**kia_off_03:**
Lance Corporal {name}, age {age}, {brigade}. Originally from {municipality}. KIA during the operation near {circumstance}. His personal effects -- a photograph, a house key, forty-seven marks -- were forwarded to his mother, {wife_name}, at {displacement_municipality}.

**kia_off_04:**
{name} of {municipality}. Age {age}. Assigned to {brigade} after mobilization. Killed in action at {circumstance} during an assault that gained two hundred metres of ground. His unit took eleven casualties in the same engagement. The ground was not held.

**kia_off_05:**
Corporal {name}, {age}, from {municipality}. Former schoolteacher. Served with {brigade} since the summer. Killed leading his section forward at {circumstance}. His commanding officer noted he had requested transfer to a quieter sector the previous week. The request was still being processed.

#### KIA -- Defensive (5)

**kia_def_01:**
{rank} {name}, age {age}, {brigade}. From {municipality}. Killed defending positions near {circumstance} during an enemy assault. His trench was overrun at approximately 0430. Three other soldiers from his village died in the same action.

**kia_def_02:**
{name}, age {age}. A farmer from the hills above {municipality}. Enlisted with {brigade} when the front reached his district. Killed by mortar fire while holding a defensive line at {circumstance}. He had been on the front line for nine consecutive weeks without rotation.

**kia_def_03:**
Private {name} of {municipality}, age {age}. Killed during the defense of {circumstance}. {brigade} reported his position was hit by concentrated artillery before the infantry assault. His wife {wife_name} received the notification at {displacement_municipality}. She had last spoken to him by telephone eleven days earlier.

**kia_def_04:**
{name}, {age}, of {municipality}. Assigned to {brigade}. Died at his position near {circumstance} during a sustained enemy attack. The sector held, but at a cost of fourteen killed. His name appears on the unit's casualty roll between two men from the same neighbourhood.

**kia_def_05:**
Sergeant {name}, age {age}, {brigade}. Originally from {municipality}. KIA at {circumstance} while organizing the withdrawal of wounded from an exposed trench line. The battalion commander's report describes his actions as having prevented additional casualties. His family at {displacement_municipality} was informed the following day.

#### KIA -- Siege (5)

**kia_siege_01:**
{name}, age {age}, of {municipality}. {brigade}. Killed by a sniper round while crossing an intersection at {circumstance}. He was carrying water. The crossing had been designated high-risk for three weeks. There was no alternative route.

**kia_siege_02:**
{rank} {name}, {age} years old. Born in {municipality}. Serving with {brigade} in the siege perimeter at {circumstance}. Killed by shrapnel from a mortar round that struck the trench line during the afternoon bombardment. His wife {wife_name} lives two kilometres from where he died. She heard the impact.

**kia_siege_03:**
{name} of {municipality}, age {age}. {brigade}. Died of wounds sustained during shelling at {circumstance}. He had survived three previous woundings. The field hospital recorded cause of death as haemorrhage. Insufficient blood supply for transfusion.

**kia_siege_04:**
Private {name}, age {age}, from {municipality}. Assigned to {brigade}. Killed at {circumstance} by a direct hit on his observation post. He had been posted there for rotating shifts since the siege began. His mother, {wife_name}, asked the unit to return his journal. It was not recovered.

**kia_siege_05:**
{name}, {age}, of {municipality}. A carpenter before the war, now {brigade}. Shot and killed at {circumstance} while repairing a section of barricade after dark. The work had been postponed twice due to sniper activity. On the third night, the unit commander decided it could not wait any longer.

#### WIA -- Wounded in Action (5)

**wia_01:**
{rank} {name}, age {age}, {brigade}. Wounded by shrapnel at {circumstance}. Evacuated to {hospital}. Right leg amputated below the knee. Expected to survive. He asked the surgeon when he could return to his unit.

**wia_02:**
{name}, {age}, from {municipality}. {brigade}. Sustained gunshot wounds during fighting at {circumstance}. Currently at {hospital} in serious condition. His wife {wife_name} has been unable to reach the hospital due to road closures. She does not know his status.

**wia_03:**
Private {name} of {municipality}, age {age}. Multiple fragment wounds sustained at {circumstance} during mortar bombardment. Transferred to {hospital}. Burns to upper body. The medical officer's report notes the hospital is operating at three times its designed capacity. No anaesthetic was available for the procedure.

**wia_04:**
Corporal {name}, {age}, {brigade}. Wounded during operations near {circumstance}. Lost sight in his left eye. Evacuated to {hospital} where he remains under observation. A former mechanic from {municipality}, he had requested assignment to the maintenance section. The request was denied due to manpower shortages.

**wia_05:**
{name}, age {age}, of {municipality}. {brigade}. Shot through the shoulder at {circumstance}. Carried to the aid station by two soldiers who themselves had minor wounds. At {hospital}, the surgeon removed the round with improvised instruments. He will not raise that arm again. He is nineteen years old.

#### MIA -- Missing in Action (5)

**mia_01:**
{rank} {name}, age {age}, {brigade}. Listed missing following the loss of positions at {circumstance}. Last seen by his squad leader during the withdrawal. His family in {displacement_municipality} has received no further information. His wife {wife_name} visits the Red Cross office each Thursday.

**mia_02:**
{name} of {municipality}, age {age}. {brigade}. Failed to report after the engagement at {circumstance}. Neither his unit nor the enemy have confirmed his status. His personal file lists a wife and infant daughter at {displacement_municipality}. The file has been annotated: "Missing -- fate unknown."

**mia_03:**
Private {name}, {age}, from {municipality}. Missing since the action at {circumstance}. {brigade} reports that his section was cut off during the enemy advance and could not be reached. Three other soldiers from the same section are also unaccounted for. No contact has been established.

**mia_04:**
{name}, age {age}, {brigade}. From {municipality}. Disappeared during the confusion of the retreat from {circumstance}. Witnesses report he was wounded and moving toward the rear when contact was lost. His mother {wife_name} was told he is classified as missing. She was not told what that means.

**mia_05:**
Corporal {name}, {age}, of {municipality}. {brigade}. Missing in action at {circumstance}. His commanding officer filed the report with the notation: "Every effort to locate." The unit moved forward the next day. No search was conducted. The front does not wait.

### 1.4 Name Pool

Names are historically common for the 1991 census generation in Bosnia-Herzegovina. Organized by ethnicity (determined by brigade faction) and gender.

#### Bosniak Male First Names (100)

Adem, Adnan, Admir, Ahmed, Amir, Armin, Asim, Avdo, Azem, Bajro, Bakir, Bego, Besim, Dino, Dzemal, Dzevad, Edhem, Edin, Edis, Eldin, Elvir, Emir, Enver, Ermin, Esad, Fahrudin, Faruk, Fehim, Fikret, Fuad, Haris, Hasan, Hasib, Hikmet, Husein, Ibrahim, Idriz, Irfan, Ismet, Jasmin, Jusuf, Kasim, Kemal, Kenan, Lejla (m.), Mehmed, Mensur, Meho, Midhat, Mirsad, Mirza, Mujo, Muhamed, Murat, Muris, Mustafa, Nadir, Nail, Nasir, Nazif, Nedim, Nedžad, Nermin, Nihad, Nurdin, Nusret, Omer, Osman, Ramiz, Rasim, Ramo, Refik, Reuf, Rizah, Sabahudin, Sabit, Safet, Sakib, Salih, Salko, Samir, Senad, Sead, Selim, Suad, Sulejman, Sefik, Semir, Tarik, Vahid, Vejsil, Zaim, Zijad, Zlatko, Zoran, Zuhdija, Zulfik, Suljo, Hamid, Hamdija

#### Bosniak Female First Names (50)

Aiša, Almasa, Amira, Azra, Bahra, Behija, Bisera, Dženana, Edina, Emina, Enisa, Esma, Fadila, Fatima, Fikreta, Habiba, Hafiza, Hajra, Halima, Hanifa, Hasiba, Hatidža, Hidajeta, Jasmina, Kadira, Lejla, Mediha, Meliha, Merjema, Merima, Mirsada, Munevera, Murisa, Mubera, Nadzija, Nafa, Nafija, Nasiha, Nermina, Nurija, Razija, Refija, Remza, Sabaheta, Sadija, Safija, Saliha, Senada, Šefika, Zuhra

#### Serbian Male First Names (50)

Bogdan, Bojan, Borislav, Branko, Cvjetko, Danilo, Darko, Dejan, Dragan, Dragiša, Dragoljub, Dušan, Đorđe, Goran, Ilija, Ivan, Jovan, Lazar, Ljubiša, Marko, Milan, Milenko, Milorad, Miloš, Milovan, Mirko, Miroslav, Mladen, Momčilo, Nebojša, Nedeljko, Nenad, Nikola, Novak, Obrad, Petar, Predrag, Rade, Radenko, Radislav, Ranko, Ratko, Saša, Slavko, Slobodan, Srđan, Sreten, Stojan, Velimir, Zoran

#### Croatian Male First Names (30)

Ante, Boris, Bruno, Damir, Darijo, Drago, Franjo, Gojko, Hrvoje, Ivica, Ivo, Jozo, Josip, Krešimir, Luka, Marinko, Mario, Marin, Mate, Mato, Mirko, Niko, Pero, Robert, Slaven, Stipe, Tihomir, Tomislav, Vinko, Zdravko

#### Surname Pool (shared across ethnicities, selected by faction)

**Bosniak surnames (60):**
Ahmetović, Avdić, Bašić, Begić, Bećirović, Čaušević, Čolić, Dedić, Delić, Dizdarević, Đonlagić, Duraković, Dželilović, Efendić, Fejzić, Ganić, Hadžić, Halilović, Hasanović, Hodžić, Hrustić, Huseinović, Ibrahimović, Imamović, Ismailović, Jahić, Junuzović, Karić, Kazazić, Kovačević, Kurtović, Ličina, Mahmutović, Mehmedović, Memić, Mešanović, Mujić, Mulabdić, Musić, Mustafić, Nuhanović, Omerović, Osmić, Pašalić, Ramić, Redžić, Salihović, Selimović, Smajlović, Subasić, Šehić, Terzić, Tokić, Tulić, Turković, Zukić, Zukanović, Žiga, Delić, Hrnjić

**Serbian surnames (40):**
Babić, Bogdanović, Cvijić, Dragičević, Đurić, Gavrić, Ilić, Janković, Jovanović, Knežević, Kovačević, Lazarević, Lukić, Marjanović, Milanović, Milić, Milošević, Mirković, Nikolić, Novaković, Ostojić, Pavlović, Petrović, Popović, Radić, Radonjić, Savić, Simić, Stanković, Stefanović, Stević, Stojanović, Šljivić, Todorović, Tomić, Vasić, Vidović, Vukašinović, Vuković, Živanović

**Croatian surnames (30):**
Andrić, Barišić, Bošnjak, Čović, Filipović, Galić, Grgić, Jurić, Knežević, Krajišnik, Kvesić, Lozančić, Mandić, Marić, Martinović, Matić, Milićević, Pavlović, Perić, Perković, Raguž, Rajić, Šimić, Skočibušić, Soldo, Šunjić, Tomić, Vidović, Vrdoljak, Zovko

### 1.5 Deterministic Selection Algorithm

All selection must be deterministic (no `Math.random()`, no `Date.now()`). The turn number and cumulative casualty data serve as the seed.

```typescript
// src/sim/letter_home.ts

import type { CasualtyLedger } from '../state/casualty_ledger.js';
import type { FactionId } from '../state/game_state.js';

interface LetterHomeVignette {
    text: string;
    casualty_type: string;
    faction: string;
    turn: number;
}

/**
 * Deterministic hash from turn + casualties.
 * Used to select template, name, age, municipality without Math.random().
 */
function deterministicHash(turn: number, totalCasualties: number, salt: number): number {
    // Simple but effective: multiply by primes, XOR, modulo
    return Math.abs(((turn * 2654435761) ^ (totalCasualties * 40503) ^ (salt * 12289)) | 0);
}

/**
 * Select template index deterministically.
 * Each casualty_type has 5 templates, so index into the filtered array.
 */
function selectTemplate(turn: number, totalCasualties: number, templateCount: number): number {
    return deterministicHash(turn, totalCasualties, 1) % templateCount;
}

/**
 * Select name index from the appropriate pool.
 */
function selectName(turn: number, totalCasualties: number, poolSize: number, salt: number): number {
    return deterministicHash(turn, totalCasualties, salt) % poolSize;
}

/**
 * Determine casualty_type from the most recent turn's battle data.
 * Priority: kia_siege (if any siege corps involved) > kia_offensive (if attacker)
 *   > kia_defensive (if defender) > wia (if wounded > killed) > mia (fallback).
 */
function determineCasualtyType(
    factionKilled: number,
    factionWounded: number,
    factionMissing: number,
    siegeActive: boolean,
    wasAttacker: boolean
): string {
    if (factionKilled > 0 && siegeActive) return 'kia_siege';
    if (factionKilled > 0 && wasAttacker) return 'kia_offensive';
    if (factionKilled > 0) return 'kia_defensive';
    if (factionWounded > 0) return 'wia';
    return 'mia';
}

/**
 * Compute age deterministically: 18-47 range.
 */
function computeAge(turn: number, totalCasualties: number): number {
    return 18 + (deterministicHash(turn, totalCasualties, 7) % 30);
}
```

**Selection flow (executed once per turn in the CoS briefing generator):**

1. Read `state.military.casualty_ledger[playerFaction]` to get cumulative killed/wounded/missing.
2. Read `state.latestTurnSummary.battles` to determine if player faction was attacker or defender, and whether any siege corps were involved.
3. Compute `casualty_type` via priority logic above.
4. Filter templates by `casualty_type`. Select template index: `deterministicHash(turn, totalKIA, 1) % filteredCount`.
5. Select first name index: `deterministicHash(turn, totalKIA, 2) % firstNamePoolSize`. Pool determined by faction.
6. Select surname index: `deterministicHash(turn, totalKIA, 3) % surnamePoolSize`.
7. Select female name (for wife/mother): `deterministicHash(turn, totalKIA, 4) % femalePoolSize`.
8. Compute age: `18 + deterministicHash(turn, totalKIA, 7) % 30`.
9. Derive municipality from the brigade that took casualties this turn (first brigade in sorted order with >0 KIA).
10. Derive circumstance from the battle's target OSID, title-cased.
11. Substitute all placeholders. Return the vignette.

**Skip condition:** If no casualties occurred this turn for the player faction, no Letter Home is generated. The briefing shows only military paragraphs.

### 1.6 Component Integration

**Placement:** The Letter Home vignette renders as the LAST paragraph in `ChiefOfStaffBriefing`, after all existing military situation paragraphs (battles, territory, criticals, warnings).

**Visual treatment:**

```tsx
{/* Letter Home — after all military paragraphs */}
{letterHomeText && (
    <div className="mt-2 pt-2 border-t border-neutral-300/40">
        <p
            className="text-[9.5px] text-neutral-600 leading-relaxed italic"
            style={{ fontFamily: 'Georgia, serif', borderLeft: '2px solid #b8860b44', paddingLeft: '8px' }}
        >
            {letterHomeText}
        </p>
    </div>
)}
```

**Design rationale:**
- Slightly smaller font (9.5px vs 10px for military text) -- the personal recedes behind the strategic.
- Italic -- marks it as a different register from the CoS's military voice.
- Left border accent in muted gold (`#b8860b44`) -- visually distinct but not attention-grabbing. Same palette as the briefing's cream/amber scheme.
- Separated by a thin top border to create visual breathing room.
- No heading, no label. It just appears. The player learns to dread it.

**File changes required:**

1. Create `data/templates/letter_home_templates.json` (template data)
2. Create `src/sim/letter_home.ts` (selection + substitution logic)
3. Modify `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx` (render vignette)

### 1.7 Implementation Checklist

- [ ] Create `data/templates/letter_home_templates.json` with all 20 templates + name pools
- [ ] Create `src/sim/letter_home.ts` with deterministic selection (no Math.random, no Date.now)
- [ ] Add `generateLetterHome(state, faction)` function that returns `string | null`
- [ ] Import and call in `ChiefOfStaffBriefing.tsx` inside `generateCoSBriefing()`
- [ ] Add the vignette as a final paragraph with the specified visual treatment
- [ ] Run smoke-test triad: `tsc --noEmit` + `vitest run` + `desktop:map:build`
- [ ] Verify determinism: same save file produces same vignette on reload

---

## DELIVERABLE 2: Missing Essay Authoring Prompt

### 2.1 Context

The Codex contains 96 essays. 83 exist as standalone JSON files in `data/scenarios/essays/`. 13 essays exist only as inline content within `essay_index.json` but have NO standalone `{event_id}.json` file. These 13 must be extracted into standalone files AND their content must be reviewed/rewritten to the quality bar of the certified 83.

Additionally, the `essay_index.json` has a prefix mismatch: the `id` field uses `essay_` prefix (e.g. `essay_ahmici_massacre_1993`) while filenames use `event_id` without prefix (e.g. `ahmici_massacre_1993.json`). This is cosmetic but should be documented.

### 2.2 Essay JSON Schema (Exact)

Each essay is a standalone JSON file at `data/scenarios/essays/{event_id}.json`.

```json
{
  "id": "essay_{event_id}",
  "event_id": "{event_id}",
  "title": "Human-Readable Title",
  "year": 1992,
  "category": "political|military|humanitarian|diplomatic",
  "sources": [
    "ICTY Case Name (Case Number), specific finding",
    "UN Resolution or Report"
  ],
  "generated": true,
  "content": "Full essay text as a single string. Paragraphs separated by \\n\\n. 800-1500 words. ICTY-first sourcing. No hedging judicial findings. Documentary register."
}
```

**Field reference (from `ahmici_massacre_1993.json`):**

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `essay_` + event_id. Must match the `id` in essay_index.json. |
| `event_id` | string | No prefix. Must match the filename (minus .json). Must match the event trigger ID in the game event system. |
| `title` | string | Descriptive, colon-separated format common. |
| `year` | number | Year of the event (1992 or 1993 for all 13 missing). |
| `category` | string | One of: `political`, `military`, `humanitarian`, `diplomatic`. |
| `sources` | string[] | ICTY case citations first, then UN/ICJ, then secondary. Format: "ICTY {Name} Trial Judgment ({Case Number}), {specific finding}". |
| `generated` | boolean | Always `true` for AI-authored essays. |
| `content` | string | Full essay text. Single string. `\n\n` between paragraphs. |

### 2.3 Quality Bar

- **Length:** 800-1500 words per essay.
- **Source hierarchy:** ICTY trial judgments FIRST. Then ICJ. Then UN reports. Then Balkan Battlegrounds (BB). Then academic secondary sources. NEVER cite Wikipedia or journalistic sources as primary.
- **Judicial findings:** State them as established fact. Do NOT hedge with "allegedly" or "it is claimed that" when citing ICTY convictions. The tribunal found X. Say X.
- **Tone:** Documentary, analytical, historically grounded. Match the register of `ahmici_massacre_1993.json` and `independence_referendum_1992.json`. No advocacy. No melodrama. No rhetorical questions. Present causes, events, consequences, and legal accountability with equal weight.
- **Structure:** Context paragraph (why this matters in the war) -> what happened -> who was responsible (ICTY findings) -> consequences and significance.
- **Faction balance:** Each faction's perspective and motivations must be presented. Even when documenting atrocities, explain the strategic logic without endorsing it.

### 2.4 Per-Essay Research Instructions

#### Essay 1: `hrhb_political_goal`
- **File:** `data/scenarios/essays/hrhb_political_goal.json`
- **Title:** "Herceg-Bosna: Zagreb's Project and the Croat Dilemma"
- **Year:** 1992 | **Category:** political
- **Key facts:** Proclamation of Croatian Community of Herceg-Bosna (Nov 1991). Mate Boban's appointment. Tudjman-Milosevic partition discussions. HVO formation. Relationship between Zagreb and Bosnian Croat leadership. Dual loyalty dilemma for ordinary Bosnian Croats.
- **ICTY cases:** Prlic et al. (IT-04-74-T) -- JCE findings on Herceg-Bosna as a criminal enterprise. Kordic (IT-95-14/2-T) -- central Bosnia command structure.
- **BB pages:** Chapter 4 (Croat political structures), Chapter 8 (HVO formation).
- **Mandatory citations:** At least one Prlic finding, at least one Kordic finding.
- **NOTE:** Content exists inline in essay_index.json. Extract, review for quality bar compliance, rewrite if needed.

#### Essay 2: `arms_embargo_impact_1992`
- **File:** `data/scenarios/essays/arms_embargo_impact_1992.json`
- **Title:** "The Arms Embargo: How the UN Disarmed Bosnia's Defenders"
- **Year:** 1992 | **Category:** military
- **Key facts:** UNSC Resolution 713 (Sept 1991). JNA arsenal inheritance by VRS. ARBiH weapons shortage. Asymmetric impact. Clandestine arms flows. Political debate over lifting.
- **ICTY cases:** Hadzihasanovic (IT-01-47-T) -- ARBiH equipment shortages as context. Mladic (IT-09-92-T) -- VRS inheritance of JNA assets.
- **BB pages:** Chapter 2 (JNA dissolution), Chapter 5 (arms flows).
- **Mandatory citations:** UNSC Resolution 713, at least one ICTY reference to equipment asymmetry.

#### Essay 3: `battle_of_the_barracks_sarajevo`
- **File:** `data/scenarios/essays/battle_of_the_barracks_sarajevo.json`
- **Title:** "Storming the Barracks: How Sarajevo Armed Itself"
- **Year:** 1992 | **Category:** military
- **Key facts:** JNA barracks seizures in Sarajevo (Apr-May 1992). Marsal Tito Barracks, Viktor Bubanj. Dobrovoljacka Street incident (May 3). Weapons captured. Impact on siege defense capability.
- **ICTY cases:** Galic (IT-98-29-T) -- siege context. Mladic (IT-09-92-T) -- JNA withdrawal.
- **BB pages:** Chapter 3 (Sarajevo operations, spring 1992).
- **Mandatory citations:** At least one ICTY reference to equipment captured.

#### Essay 4: `battle_of_the_barracks_tuzla`
- **File:** `data/scenarios/essays/battle_of_the_barracks_tuzla.json`
- **Title:** "The Tuzla Column: Ambush, Seizure, and the Birth of 2nd Corps"
- **Year:** 1992 | **Category:** military
- **Key facts:** JNA column ambush in Tuzla (May 15, 1992). Brcanska Malta incident. Casualties on both sides. Equipment seized. Formation of ARBiH 2nd Corps from Tuzla TO and captured assets.
- **ICTY cases:** Mladic (IT-09-92-T) -- JNA withdrawal context. Tolimir (IT-05-88/2) -- Drina valley context.
- **BB pages:** Chapter 3 (northeast Bosnia), Chapter 6 (2nd Corps formation).
- **Mandatory citations:** At least one source on the Tuzla column incident.

#### Essay 5: `battle_of_the_barracks_zenica`
- **File:** `data/scenarios/essays/battle_of_the_barracks_zenica.json`
- **Title:** "The Zenica Seizure: Arming 3rd Corps from JNA Stores"
- **Year:** 1992 | **Category:** military
- **Key facts:** JNA barracks seizure in Zenica. Equipment captured for what became ARBiH 3rd Corps. Negotiated withdrawals vs forced seizures. Central Bosnia military balance.
- **ICTY cases:** Hadzihasanovic (IT-01-47-T) -- 3rd Corps formation and equipment.
- **BB pages:** Chapter 3 (central Bosnia), Chapter 6 (3rd Corps).
- **Mandatory citations:** Hadzihasanovic judgment on 3rd Corps equipment origins.

#### Essay 6: `battle_of_the_barracks_visoko`
- **File:** `data/scenarios/essays/battle_of_the_barracks_visoko.json`
- **Title:** "Visoko Depot: A Small Victory on the Sarajevo Approaches"
- **Year:** 1992 | **Category:** military
- **Key facts:** JNA depot seizure at Visoko. Smaller scale than Sarajevo/Tuzla/Zenica. Significance for supply to Sarajevo corridor. Local TO units involved.
- **ICTY cases:** Galic (IT-98-29-T) -- siege supply context. Hadzihasanovic (IT-01-47-T) -- central Bosnia TO.
- **BB pages:** Chapter 3 (central Bosnia spring 1992).
- **Mandatory citations:** At least one contextual ICTY reference.

#### Essay 7: `sarajevo_siege_begins_1992`
- **File:** `data/scenarios/essays/sarajevo_siege_begins_1992.json`
- **Title:** "The Siege Begins: Sarajevo Under the Guns"
- **Year:** 1992 | **Category:** military
- **Key facts:** April-May 1992 encirclement. SRK positions in hills. Shelling of city. Sniping campaigns. Siege ring geography. Initial humanitarian crisis. International airport negotiations.
- **ICTY cases:** Galic (IT-98-29-T) -- THE definitive source. Findings on campaign of sniping and shelling. Milosevic (IT-02-54) -- broader context. Karadzic (IT-95-5/18-T) -- JCE for Sarajevo.
- **BB pages:** Chapter 3 (Sarajevo spring 1992), Chapter 7 (siege operations).
- **Mandatory citations:** Galic judgment findings on the nature of the siege as a crime against humanity. MUST be the primary source.

#### Essay 8: `jna_withdrawal_1992`
- **File:** `data/scenarios/essays/jna_withdrawal_1992.json`
- **Title:** "The JNA Withdrawal: A Handover, Not a Retreat"
- **Year:** 1992 | **Category:** military
- **Key facts:** JNA formally ordered to withdraw from BiH (May 1992). In practice: personnel from BiH left, equipment and Bosnian Serb personnel stayed. VRS formed May 12 from JNA remnants. Scale of inheritance (tanks, artillery, AA, logistics). International pressure vs fait accompli.
- **ICTY cases:** Mladic (IT-09-92-T) -- VRS formation from JNA. Karadzic (IT-95-5/18-T) -- political direction of the handover. Perisic (IT-04-81) -- FRY/VRS relationship.
- **BB pages:** Chapter 2 (JNA dissolution), Chapter 5 (VRS order of battle).
- **Mandatory citations:** At least two ICTY judgments on the JNA-to-VRS transfer.

#### Essay 9: `mostar_liberation_1992`
- **File:** `data/scenarios/essays/mostar_liberation_1992.json`
- **Title:** "Mostar Liberated: A Shared Victory, A Divided City"
- **Year:** 1992 | **Category:** military
- **Key facts:** Joint HVO-ARBiH operations to drive JNA/VRS from Mostar (June 1992). Brief period of cooperation. Eastern vs western Mostar geography. Seeds of future Croat-Bosniak conflict. Old Bridge significance.
- **ICTY cases:** Prlic et al. (IT-04-74-T) -- Mostar findings. Naletilic & Martinovic (IT-98-34-T) -- Mostar military operations.
- **BB pages:** Chapter 4 (Herzegovina operations), Chapter 8 (Mostar).
- **Mandatory citations:** Prlic findings on the transition from cooperation to conflict in Mostar.

#### Essay 10: `srebrenica_enclave_forms_1992`
- **File:** `data/scenarios/essays/srebrenica_enclave_forms_1992.json`
- **Title:** "The Srebrenica Pocket: Oric's Desperate Enclave"
- **Year:** 1992 | **Category:** military
- **Key facts:** Formation of the Srebrenica pocket (spring-summer 1992). Naser Oric's defense. Drina valley cleansing pushes survivors toward Srebrenica. Enclave demographics. Counter-raids into surrounding Serb villages. Humanitarian conditions.
- **ICTY cases:** Oric (IT-03-68-T) -- defense of Srebrenica and counter-raids. Karadzic (IT-95-5/18-T) -- strategic goal 3. Tolimir (IT-05-88/2) -- Drina Corps operations.
- **BB pages:** Chapter 5 (Drina valley 1992), Chapter 9 (enclaves).
- **Mandatory citations:** Oric judgment on the formation and defense of the enclave. Karadzic on strategic goal 3.

#### Essay 11: `drina_cleansing_decision_1992`
- **File:** `data/scenarios/essays/drina_cleansing_decision_1992.json`
- **Title:** "The Drina Valley Question: Strategic Goal Three and Its Consequences"
- **Year:** 1992 | **Category:** political
- **Key facts:** RS Assembly's third strategic goal (Drina as border with Serbia). Political decision-making behind the cleansing campaign. Karadzic and Krajisnik's roles. Relationship to Milosevic's Serbia. Military implementation via Drina Corps.
- **ICTY cases:** Karadzic (IT-95-5/18-T) -- strategic goals and JCE. Krajisnik (IT-00-39-T) -- political responsibility. Mladic (IT-09-92-T) -- military implementation.
- **BB pages:** Chapter 2 (strategic goals), Chapter 5 (Drina operations).
- **Mandatory citations:** Karadzic judgment on strategic goal 3. Krajisnik judgment on political responsibility for Drina valley.

#### Essay 12: `drina_valley_ethnic_cleansing_1992`
- **File:** `data/scenarios/essays/drina_valley_ethnic_cleansing_1992.json`
- **Title:** "Ethnic Cleansing Along the Drina: Visegrad, Foca, Zvornik"
- **Year:** 1992 | **Category:** humanitarian
- **Key facts:** Systematic cleansing of Bosniak population from Drina valley municipalities. Visegrad bridge killings (Lukic). Foca rape camps (Kunarac). Zvornik attacks and Karakaj killings. Scale of displacement. Detention facilities.
- **ICTY cases:** Lukic & Lukic (IT-98-32/1-T) -- Visegrad atrocities. Kunarac et al. (IT-96-23-T & IT-96-23/1-T) -- Foca rape camps (landmark sexual violence ruling). Karadzic (IT-95-5/18-T) -- Zvornik as scheduled municipality.
- **BB pages:** Chapter 5 (Drina valley), Chapter 10 (atrocities documentation).
- **Mandatory citations:** Kunarac (rape as crime against humanity). Lukic (Visegrad bridge/house burnings). At least three ICTY sources total.

#### Essay 13: `operation_corridor_1992`
- **File:** `data/scenarios/essays/operation_corridor_1992.json`
- **Title:** "Operation Corridor: The Lifeline Through Brcko"
- **Year:** 1992 | **Category:** military
- **Key facts:** VRS Operation Corridor (June-July 1992). Objective: link Krajina Serbs to Serbia via Posavina corridor through Brcko. Momir Talic and 1st Krajina Corps. Strategic significance (without corridor, western RS is cut off). Fierce fighting. Corridor achieved but narrow. Brcko's contested status through to Dayton.
- **ICTY cases:** Brdanin (IT-99-36-T) -- Krajina operations context. Karadzic (IT-95-5/18-T) -- strategic goal 2 (corridor). Mladic (IT-09-92-T) -- military operations.
- **BB pages:** Chapter 4 (Posavina), Chapter 5 (corridor operations).
- **Mandatory citations:** Karadzic judgment on strategic goal 2. At least one source on the military operation itself.

### 2.5 Execution Instructions for Nightshift Agent

1. **For each of the 13 essays above:**
   a. Read the inline content already in `essay_index.json` for that essay.
   b. Evaluate against the quality bar in section 2.3. Key checks:
      - Is it 800-1500 words?
      - Does it cite ICTY judgments by case number?
      - Does it present judicial findings as established fact (no hedging)?
      - Does it follow the structure: context -> events -> accountability -> consequences?
      - Does it match the documentary register of the certified 83?
   c. If the inline content meets the quality bar, extract it into a standalone file as-is.
   d. If it falls short (too short, missing ICTY citations, hedging language, wrong tone), rewrite it following the research instructions above.
   e. Save as `data/scenarios/essays/{event_id}.json` using the exact schema from section 2.2.

2. **After all 13 files are created**, verify:
   - All 96 entries in `essay_index.json` have a corresponding `{event_id}.json` file.
   - Run: `node -e "const idx=require('./data/scenarios/essays/essay_index.json');const fs=require('fs');let m=0;idx.essays.forEach(e=>{if(!fs.existsSync('data/scenarios/essays/'+e.event_id+'.json')){m++;console.log('MISSING:',e.event_id)}});console.log(m+' missing')"`
   - Expected output: `0 missing`

3. **Index prefix documentation** (informational, no code change needed):
   - The `id` field in `essay_index.json` uses `essay_` prefix (e.g. `essay_ahmici_massacre_1993`).
   - The `event_id` field and the filenames do NOT have the prefix (e.g. `ahmici_massacre_1993`).
   - The CodexPanel (`src/ui/map/components/CodexPanel.tsx`) correctly uses `event_id` for event matching and `id` for internal keying. This is working as intended.
   - The standalone JSON files use `event_id` as filename. This is correct and consistent with the 83 existing files.
   - **No fix needed.** The prefix mismatch is by design: `id` is a namespaced identifier (prefixed for uniqueness in broader systems), `event_id` is the game event system key. Document this in the file header if desired but do not rename files or change IDs.

4. **Smoke test after completion:**
   ```bash
   npx tsc --noEmit
   npm run test:vitest
   npm run desktop:map:build
   ```

### 2.6 Historian Consultation Notes

The /historian agent MUST be consulted for the following essays due to high sensitivity:

- `drina_valley_ethnic_cleansing_1992` -- multiple ICTY cases, sexual violence findings, mass killing documentation. Get the legal citations exactly right.
- `srebrenica_enclave_forms_1992` -- Oric's counter-raids are legally and historically complex. The ICTY acquitted Oric on appeal. Do not imply guilt after acquittal.
- `sarajevo_siege_begins_1992` -- Galic judgment is the cornerstone source. Do not understate the findings.
- `operation_corridor_1992` -- Brdanin case context is important for Krajina operations.

For the four barracks essays, the /historian should verify the specific dates, unit designations, and equipment types captured. These are factual claims that must be accurate.

---

## Appendix: File Inventory

### New files to create:
- `data/templates/letter_home_templates.json` (Deliverable 1)
- `src/sim/letter_home.ts` (Deliverable 1)
- 13 essay JSON files in `data/scenarios/essays/` (Deliverable 2)

### Files to modify:
- `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx` (add Letter Home rendering)

### Files to reference (read-only):
- `src/state/casualty_ledger.ts` -- CasualtyLedger type, recordBattleCasualties, getFactionTotalCasualties
- `src/state/game_state.ts` -- `state.military.casualty_ledger` field
- `data/scenarios/essays/essay_index.json` -- index with inline content for 13 missing essays
- `data/scenarios/essays/ahmici_massacre_1993.json` -- reference essay for quality/format
- `src/ui/map/components/CodexPanel.tsx` -- how essays are loaded and displayed
