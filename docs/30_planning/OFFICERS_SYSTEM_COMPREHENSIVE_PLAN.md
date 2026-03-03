# Officers System — Comprehensive Design Plan

**Created:** 2026-03-03
**Status:** IMPLEMENTED (Phases A–D complete, 2026-03-03; n403 88.0% OSID match)
**Implementation report:** `docs/40_reports/implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md`
**Supersedes:** `OFFICER_QUALITY_AND_GENERALS_PLAN.md` (brigade-only sketch)
**Research base:** Balkan Battlegrounds I/II (CIA), ICTY trial records, Wikipedia biographies, IWPR trial monitoring reports, academic sources. Game design survey: HoI4, Gary Grigsby WitE2, AGEOD Civil War II, Decisive Campaigns: Barbarossa, Command Ops 2, Unity of Command 2, Strategic Command, Panzer Corps 2.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture: Two-Tier System](#2-architecture-two-tier-system)
3. [Tier 1: Named Officers (Corps and Above)](#3-tier-1-named-officers-corps-and-above)
4. [Historical Officer Database](#4-historical-officer-database)
5. [Corps Sensitivity and Assignment Rules](#5-corps-sensitivity-and-assignment-rules)
6. [Tier 2: Abstracted Brigade Officer Quality](#6-tier-2-abstracted-brigade-officer-quality)
7. [Replacement and Succession](#7-replacement-and-succession)
8. [Combat and Bot AI Integration](#8-combat-and-bot-ai-integration)
9. [War Timeline Integration](#9-war-timeline-integration)
10. [Design Patterns from Other Games](#10-design-patterns-from-other-games)
11. [Codebase Integration Points](#11-codebase-integration-points)
12. [Implementation Phases](#12-implementation-phases)
13. [Determinism Checklist](#13-determinism-checklist)

---

## 1. Executive Summary

The Bosnian War's defining military narrative is an inversion of officer quality:

- **VRS** inherits the entire JNA professional officer corps on 12 May 1992 — and has no way to replace officers lost to attrition, brain drain, or death. By 1995, the officer corps is exhausted.
- **ARBiH** starts with almost zero trained officers (Bosniaks were <8% of JNA officer positions). By 1995, battle-hardened NCOs and TO veterans have become competent corps commanders.
- **HVO** gets a steady trickle of Croatian Army (HV) officers from Zagreb, but political appointments over military merit (the "Praljak problem") undermine effectiveness.

This plan introduces a **two-tier officer system**:

| Tier | Scope | Granularity | Key mechanic |
|------|-------|-------------|--------------|
| **Tier 1: Named Officers** | Corps and above | Individual named officers with ratings, assignment, succession | Corps sensitivity, replacement cost, combat modifiers |
| **Tier 2: Brigade Officer Quality** | Brigade-level | Abstracted `officer_quality` stat on FormationState | Growth/loss curves per faction, organic arc emergence |

The tiers interact: a named corps commander's quality flows down to brigades under that corps as a modifier. Brigade officer quality is the base; corps commander quality is a multiplier.

---

## 2. Architecture: Two-Tier System

```
                    ┌───────────────────────┐
                    │   ARMY COMMANDER       │  Faction-level: Mladić, Delić, Petković
                    │   (faction singleton)  │  Sets faction strategy parameters
                    └──────────┬────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────┴──────┐ ┌──────┴───────┐ ┌──────┴───────┐
    │  CORPS OFFICER  │ │ CORPS OFFICER │ │ CORPS OFFICER │  Named individuals
    │  (Tier 1)       │ │ (Tier 1)      │ │ (Tier 1)      │  with ratings
    │  Talić (1KK)    │ │ Galić (SRK)   │ │ Živanović(DC) │
    └────────┬────────┘ └──────┬────────┘ └──────┬────────┘
             │                 │                  │
     ┌───────┼───────┐    ┌───┼───┐         ┌────┼────┐
     │   │   │   │   │    │   │   │         │    │    │
    [B] [B] [B] [B] [B]  [B] [B] [B]      [B]  [B]  [B]   Brigade formations
     ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓        ↓    ↓    ↓    with officer_quality
                                                              (Tier 2)
```

### Data Flow

1. **Brigade base power** includes `officer_quality` (Tier 2) as a modifier
2. **Corps commander** (Tier 1) provides a multiplicative bonus/penalty to all subordinate brigades
3. **Army commander** (Tier 1) sets faction-wide parameters (not per-combat)
4. **Replacement pool** — when a corps commander is killed/removed, the faction draws from its officer pool; quality depends on pool depth

### Key Design Principles

- **Organic emergence**: The VRS→degraded / ARBiH→professional arc must emerge from mechanics, not phase switches
- **Modest modifiers**: Officers matter but don't dominate. Terrain, supply, numbers still more important.
- **Determinism**: All growth/loss/replacement is deterministic. No Math.random().
- **Corps sensitivity**: Historical commanders assigned to their historical corps. Reassignment carries a penalty.
- **Negative-sum**: Officers are a wasting asset for all factions. VRS wastes fastest. ARBiH has the best growth rate but starts from nothing.

---

## 3. Tier 1: Named Officers (Corps and Above)

### Officer Data Structure

```typescript
interface NamedOfficer {
    id: string;                         // e.g., "vrs_talic", "arbih_dudakovic"
    name: string;                       // Display name
    faction: FactionId;
    rank: 'army_commander' | 'corps_commander' | 'deputy';

    // Ratings (1-5 scale, historically calibrated)
    competence: number;                 // Overall military skill, affects combat modifier
    aggressiveness: number;             // Affects attack willingness, corps directive
    defensive_skill: number;            // Affects defensive combat modifier
    political_reliability: number;      // Affects replacement cost, loyalty checks

    // Assignment
    home_corps_id?: string;             // Preferred corps (no penalty)
    compatible_corps_ids?: string[];    // Acceptable corps (small penalty)
    // All other corps = large penalty

    // Availability
    available_from_turn: number;        // When officer enters the pool
    available_until_turn?: number;      // When officer leaves (historical departure)
    is_historical_start?: boolean;      // Starts assigned at scenario begin

    // Lifecycle
    origin: 'jna' | 'hv' | 'to' | 'militia' | 'foreign' | 'political';
    casualty_vulnerability: number;     // 0.0-1.0, higher = more likely to be killed/captured
    can_improve: boolean;               // false for JNA veterans near ceiling
    improvement_rate: number;           // Per-battle competence gain (0.0-0.1)

    // State (mutable, on GameState)
    status?: 'active' | 'reserve' | 'killed' | 'captured' | 'retired' | 'defected';
    assigned_corps_id?: string | null;
    turns_in_command?: number;
    battles_as_commander?: number;
    victories_as_commander?: number;
}
```

### Rating Scale (1–5)

| Rating | Meaning | Examples |
|--------|---------|---------|
| 1 | Incompetent / Non-military | Praljak (theatre director), Kordić (politician) |
| 2 | Below average / Limited training | Lasić (militia leader), Hajrulahović (JNA captain) |
| 3 | Competent / Adequate | Galić, Živanović, Hadžihasanović, Blaskić |
| 4 | Very good / Professional | Talić, Milovanović, Delić, Pasalić, Karavelić |
| 5 | Exceptional | Dudaković, Alagić, Mladić (tactical), Roso |

### Combat Effect of Corps Commander

```
corps_commander_modifier = 0.90 + (competence × 0.04)
```

| Competence | Modifier | Effect |
|-----------|----------|--------|
| 1 | 0.94× | -6% combat power for all brigades in corps |
| 2 | 0.98× | -2% |
| 3 | 1.02× | +2% |
| 4 | 1.06× | +6% |
| 5 | 1.10× | +10% |

This replaces the current faction-level `getOfficerQualityMult()` in `combat_math.ts`, which returns 0.85–1.10 depending on faction and turn. The new system produces similar ranges but is per-corps and per-officer.

### Defensive vs. Offensive Split

When attacking:
```
attack_officer_mod = 0.90 + (competence × 0.03) + (aggressiveness × 0.01)
```

When defending:
```
defense_officer_mod = 0.90 + (competence × 0.03) + (defensive_skill × 0.01)
```

This means an aggressive commander (Dudaković: comp 5, agg 5) gives +0.20 on attack but only +0.15 on defense. A defensive specialist (Karavelić: comp 4, def 5) gives +0.17 on defense but only +0.14 on attack.

### Bot AI Effect

Corps commander aggressiveness feeds into `CorpsDirective`:

```
// In bot_corps_ai.ts when generating directive:
const commanderAggression = namedOfficer?.aggressiveness ?? 3;
const aggressionShift = (commanderAggression - 3) * 0.05;
directive.aggression_modifier += aggressionShift;
```

An aggressive commander (5) adds +0.10 aggression. A cautious one (1) subtracts -0.10.

---

## 4. Historical Officer Database

### 4.1 VRS (Vojska Republike Srpske)

**Source:** JNA 2nd Military District. 80,000+ troops inherited with full officer corps.
**30th Personnel Centre:** VRS officers remained on Yugoslav Army payroll throughout the war (salaries, pensions, promotions from Belgrade).

#### Army-Level

| ID | Name | Comp | Agg | Def | Pol | Origin | Available | Notes |
|----|------|:----:|:---:|:---:|:---:|--------|-----------|-------|
| `vrs_mladic` | Ratko Mladić | 4 | 5 | 3 | 2 | JNA | Turn 0 | Army commander. Brilliant tactician, poor strategist. Centralized command — bypassed corps commanders. Pol=2: defied Karadžić. |
| `vrs_milovanovic` | Manojlo Milovanović | 4 | 3 | 4 | 4 | JNA | Turn 0 | Chief of Staff / Deputy. "Ignites in third gear" — steady counterpart to Mladić. Coordinated western front. |

#### Corps Commanders

| ID | Name | Corps | Comp | Agg | Def | Pol | Origin | From | Until | Notes |
|----|------|-------|:----:|:---:|:---:|:---:|--------|------|-------|-------|
| `vrs_talic` | Momir Talić | 1KK | 5 | 4 | 4 | 4 | JNA | 0 | — | Best VRS corps commander. Operation Corridor 92, Jajce. Managed 60-72k troops. CoS: Boško Kelečević. |
| `vrs_boric` | Grujo Borić | 2KK | 3 | 3 | 3 | 3 | JNA | 0 | w110 | Adequate given severe resource constraints. Weakest corps (~15k). Succeeded by Tomanić (Nov 1994). |
| `vrs_tomanic` | Radivoje Tomanić | 2KK | 2 | 2 | 3 | 3 | JNA | w110 | — | Inherited impossible situation. Corps collapsed after Operation Storm. |
| `vrs_simic` | Novica Simić | IBK | 4 | 3 | 4 | 4 | JNA | 0 | — | Earned corps command via Op Corridor 92 (was 16th Krajina Mtbr cdr in 1KK). Sole IBK cdr entire war. CoS: Budimir Gavrić (Col→MajGen 1994). |
| `vrs_sipcic` | Tomislav Šipčić | SRK | 3 | 3 | 3 | 3 | JNA | 0 | w18 | First SRK commander. Set up siege infrastructure. Replaced after ~4 months. |
| `vrs_galic` | Stanislav Galić | SRK | 3 | 4 | 4 | 5 | JNA | w18 | w118 | Core siege period. Came from 1KK 30th Division command. CoS: Milošević (Mar 93–Aug 94), then Sladoje. ICTY: life. |
| `vrs_d_milosevic` | Dragomir Milošević | SRK | 3 | 3 | 4 | 5 | JNA | w118 | — | Promoted from SRK CoS to commander. Continued siege under increasing NATO pressure. |
| `vrs_zivanovic` | Milenko Živanović | Drina | 3 | 3 | 3 | 4 | JNA | w28 | w170 | First Drina Corps commander. Enclave siege ops. CoS: Krstić (Oct 94–Jul 95), then Andrić. |
| `vrs_krstic` | Radislav Krstić | Drina | 3 | 4 | 3 | 5 | JNA | w170 | — | Promoted from Drina CoS. Physical courage (returned after amputation). Short tenure. |
| `vrs_grubac` | Radovan Grubač | HK | 3 | 2 | 4 | 4 | JNA | 0 | — | Sole wartime HK cdr. Grew corps 4,500→24,000. Op Star '94. Defensive posture, 250km front. |

**Pool (available as replacements if starter is killed/removed):**

*Tier A — Main Staff officers and OG commanders (immediate availability):*

| ID | Name | Comp | Agg | Def | Pol | Home | Compatible | Notes |
|----|------|:----:|:---:|:---:|:---:|------|------------|-------|
| `vrs_lisica` | Slavko Lisica | 4 | 5 | 3 | 3 | 1KK | IBK | OG Doboj cdr. Corridor hero, founded VRS armored school. Blitzkrieg tactician. |
| `vrs_tolimir` | Zdravko Tolimir | 3 | 3 | 3 | 5 | — | — | Intelligence chief. Not a combat cdr but intensely loyal to Mladić. |
| `vrs_miletic` | Radivoje Miletić | 3 | 3 | 3 | 4 | — | — | Main Staff Operations & Training. Staff officer, emergency corps cdr. |
| `vrs_kelecevic` | Boško Kelečević | 3 | 3 | 4 | 4 | 1KK | IBK | 1KK Chief of Staff. Natural 1KK successor if Talić falls. |
| `vrs_sladoje` | Čedomir Sladoje | 3 | 3 | 4 | 4 | SRK | — | SRK CoS (Aug 94+). Natural SRK successor after Milošević. |
| `vrs_gavric` | Budimir Gavrić | 3 | 3 | 3 | 4 | IBK | — | IBK CoS (Col→MajGen 1994). Natural IBK successor if Simić falls. |

*Tier B — Distinguished brigade/OG commanders (available after 2-turn transition):*

| ID | Name | Comp | Agg | Def | Pol | Home | Compatible | Notes |
|----|------|:----:|:---:|:---:|:---:|------|------------|-------|
| `vrs_pandurevic` | Vinko Pandurević | 4 | 5 | 3 | 3 | Drina | — | Zvornik Bde (5,012 men — largest Drina Bde). JNA academy. Bold tactical decisions. ICTY: 13y. |
| `vrs_andric` | Svetozar Andrić | 4 | 4 | 4 | 4 | Drina | IBK | Birčani Bde cdr → Drina CoS (Jul 95+). Commanded during Srebrenica aftermath. |
| `vrs_zeljaja` | Radmilo Željaja | 4 | 5 | 3 | 3 | 1KK | — | Rose to OG Prijedor (14,000+ troops). Aggressive. Kozarac/Prijedor operations. |
| `vrs_samardzija` | Drago Samardžija | 4 | 4 | 4 | 3 | 2KK | 1KK | Exceptional: 3 brigades, 2 corps (1KK+2KK). Light infantry + motorized. Versatile. |
| `vrs_kutlesic` | Milorad Kutlešić | 3 | 3 | 5 | 4 | IBK | — | 1st Posavina Bde (Brčko), sole cdr entire war. Strategically critical corridor defense. |
| `vrs_gusic_n` | Novica Gušić | 4 | 3 | 5 | 3 | HK | — | 8th Mtbr Nevesinje (legendary). "No further withdrawal." Mitrovdan defense hero. |
| `vrs_colic` | Pero Čolić | 3 | 3 | 4 | 4 | 1KK | 2KK | 5th Kozara Bde. Later nominated VRS Chief of Staff. Solid conventional officer. |
| `vrs_lalovic` | Dragan Lalović | 3 | 3 | 4 | 3 | HK | — | 2 HK brigades (3rd Kalinovik, 1st Trebinje). 3+ year tenure. Steady. |
| `vrs_despotovic` | Pero Despotović | 3 | 3 | 3 | 3 | IBK | SRK | Brigades in 2 corps (IBK Majevica + SRK). Versatile cross-corps officer. |
| `vrs_arsic` | Vladimir Arsić | 3 | 4 | 3 | 3 | 1KK | IBK | 43rd Prijedor Mtbr, promoted to OG Doboj command. Kozarac operations. |

*Tier C — Late-war or specialist (limited availability):*

| ID | Name | Comp | Agg | Def | Pol | Notes |
|----|------|:----:|:---:|:---:|:---:|-------|
| `vrs_blagojevic` | Vidoje Blagojević | 3 | 3 | 3 | 4 | Bratunac Bde. ICTY convicted. Available for Drina Corps only. |
| `vrs_obrenovic` | Dragan Obrenović | 3 | 3 | 3 | 4 | Zvornik Bde deputy. Competent, would be 2nd choice for Drina. |
| `vrs_ninkovic` | Živomir Ninković | 3 | 2 | 3 | 4 | Air Force cdr. Not a ground commander but could serve in emergency. |
| `vrs_lizdek` | Vlado Lizdek | 3 | 3 | 4 | 4 | 1st Romanija Bde (~15,000 men). SRK only. |

**VRS Officer Pool Characteristics:**
- **Deep at start**: 16 replacement officers in pool (6 Tier A, 10 Tier B)
- **No regeneration**: No military academy, no training pipeline. Pool depletes only.
- **Brain drain**: After w40, 1 reserve officer removed per 20 turns (leaves for Serbia)
- **Belgrade dependency**: VRS officer pay and promotions came through 30th Personnel Centre in Belgrade
- **Tier A→B transition**: Tier A (staff/CoS) available immediately; Tier B (brigade commanders) need 2-turn delay to hand off brigade command

---

### 4.2 ARBiH (Army of the Republic of Bosnia and Herzegovina)

**Source:** ~20-30 former JNA officers (mostly captains/majors), TO reservists, Patriotic League organizers, Green Berets, civilians.
**Starting condition:** Catastrophic officer shortage. 90% of JNA officers were Serbs/Montenegrins.

#### Army-Level

| ID | Name | Comp | Agg | Def | Pol | Origin | From | Until | Notes |
|----|------|:----:|:---:|:---:|:---:|--------|------|-------|-------|
| `arbih_halilovic` | Sefer Halilović | 3 | 4 | 2 | 2 | JNA Major | 0 | w60 | Founded Patriotic League. Good organizer, poor strategist. Clashed with Izetbegović. ICTY acquitted. |
| `arbih_delic` | Rasim Delić | 4 | 3 | 4 | 5 | JNA Lt.Col | w60 | — | The consequential ARBiH commander. Artillery background. Prevented collapse during two-front war. Professionalized the army. |

#### Corps Commanders

| ID | Name | Corps | Comp | Agg | Def | Pol | Origin | From | Until | Notes |
|----|------|-------|:----:|:---:|:---:|:---:|--------|------|-------|-------|
| `arbih_talijan` | M. Hajrulahović "Talijan" | 1st | 3 | 4 | 4 | 4 | JNA Cpt | 0 | w68 | Natural combat leader. Popular. Improvised defense of Sarajevo. |
| `arbih_karavelic` | Vahid Karavelić | 1st | 4 | 2 | 5 | 4 | JNA/PL | w68 | — | Professional, methodical. 75,000-strong corps. Best defensive corps commander ARBiH had. |
| `arbih_knez` | Željko Knez | 2nd | 2 | 2 | 3 | 2 | JNA (Croat) | 0 | w44 | Multi-ethnic appointment. Removed for failing to relieve Srebrenica. |
| `arbih_sadic` | Hazim Šadić | 2nd | 3 | 3 | 3 | 4 | Military | w44 | w132 | Adequate. Commanded during critical 1993-94 period. |
| `arbih_s_delic` | Sead Delić | 2nd | 4 | 4 | 3 | 4 | Military | w132 | — | Aggressive. Operation Majevica. Led largest corps by zone. |
| `arbih_hadzihasanovic` | Enver Hadžihasanović | 3rd | 3 | 3 | 4 | 4 | JNA (Belg. academy) | w28 | w80 | Managed chaos of three-way fighting + mujahideen. |
| `arbih_alagic` | Mehmed Alagić | 7th→3rd | 5 | 4 | 3 | 3 | JNA (tanks) | w80 | w120 | Most tactically gifted ARBiH field cdr. Founded 7th Corps (w96), returned to 3rd (w105). Op Vlašić. Died 2003 before ICTY trial. |
| `arbih_jusic` | Kadir Jusić | 3rd | 3 | 3 | 3 | 3 | Military | w96 | w110 | Transitional 3rd Corps cdr (Feb–Sep 1994) while Alagić commanded 7th Corps. |
| `arbih_mahmuljin` | Sakib Mahmuljin | 3rd | 3 | 4 | 2 | 4 | Military | w110 | — | Battle of Vozuća. El Mujahid detachment under his command. |
| `arbih_pasalic` | Arif Pašalić | 4th | 4 | 3 | 4 | 5 | JNA (staff college) | w28 | w80 | Most senior JNA-trained corps cdr by education. First 4th Corps cdr (formed Jun 93). |
| `arbih_budakovic` | Sulejman Budaković "Tetak" | 4th | 3 | 4 | 3 | 3 | Military | w80 | w100 | Aggressive. Replaced Pašalić. Strong local ties in Herzegovina. |
| `arbih_drekovic` | Ramiz Dreković | 5th→4th | 3 | 3 | 3 | 4 | JNA Cpt | 0 | w140 | First 5th Corps cdr (w0–w80). Transferred to 4th Corps (~w100). |
| `arbih_polutak` | Mustafa Polutak | 4th | 3 | 3 | 4 | 4 | Military | w140 | — | Final 4th Corps cdr. Managed post-Washington Agreement operations. |
| `arbih_dudakovic` | Atif Dudaković | 5th | 5 | 5 | 5 | 4 | JNA Cpt 1st Cl | w80 | — | Best general of the Bosnian War (any side). Artillery expert. Former subordinate of Mladić. Defended Bihać, then broke out in 1995. CoS: Mirsad Šelmanov. |
| `arbih_gusic` | Salko Gušić | 6th | 3 | 3 | 3 | 4 | OG Igman | w60 | w100 | Short-lived 6th Corps (Jun 93–Mar 94). Deputy: Braco Fazlić. CoS: Dževad Tirak. |
| `arbih_alagic_7` | Mehmed Alagić | 7th | 5 | 4 | 3 | 3 | JNA | w96 | w105 | *(Same officer as `arbih_alagic`)* Formed and first commanded 7th Corps. Travnik base. |
| `arbih_planincic` | Rifet Planinčić | 7th | 3 | 3 | 3 | 3 | Military | w105 | w130 | Successor 7th Corps cdr after Alagić returned to 3rd Corps. |

**Pool (available as replacements):**

*Tier A — Deputy/CoS officers (immediate availability):*

| ID | Name | Comp | Agg | Def | Pol | Home | Compatible | Origin | Notes |
|----|------|:----:|:---:|:---:|:---:|------|------------|--------|-------|
| `arbih_ajnadzic` | Nedžad Ajnadžić | 3 | 3 | 4 | 4 | 1st | — | Military | Late-war 1st Corps cdr. Replaced Karavelić. |
| `arbih_cikotic` | Selmo Čikotić | 3 | 3 | 3 | 4 | 3rd | — | JNA (air def) | OG Zapad cdr. Young JNA-trained. Later Min of Defense. |
| `arbih_divjak` | Jovan Divjak | 3 | 2 | 3 | 4 | 1st | — | JNA Col (Serb) | Symbolic multi-ethnic. Limited operationally. Available early. |
| `arbih_siber` | Stjepan Šiber | 3 | 2 | 3 | 3 | — | 1st,3rd | JNA Col (Croat) | Multi-ethnic. Deputy Commander ABiH. Marginalized by 1993-94. |
| `arbih_cuskic` | Fikret Čuškić | 3 | 3 | 3 | 4 | 7th | 3rd | Military | 7th Corps deputy. Natural 7th Corps successor. |
| `arbih_selmanovic` | Mirsad Šelmanović | 4 | 4 | 3 | 4 | 5th | — | Military (Brig.) | 5th Corps CoS. Commanded OG North in Op Sana. Professional. |
| `arbih_fazlic` | Braco Fazlić | 3 | 3 | 3 | 3 | 6th | — | Military | 6th Corps deputy. Available after 6th Corps dissolved (w100). |

*Tier B — Distinguished brigade/division commanders (2-turn transition):*

| ID | Name | Comp | Agg | Def | Pol | Home | Compatible | Origin | Notes |
|----|------|:----:|:---:|:---:|:---:|------|------------|--------|-------|
| `arbih_oric` | Naser Orić | 3 | 5 | 4 | 3 | 2nd | — | JNA enlisted | Srebrenica/28th Div cdr. Autonomous by necessity. Cannot cmd mainland corps. |
| `arbih_lendo` | Refik Lendo | 4 | 4 | 3 | 4 | 2nd | — | Military | 25th Division cdr. Op Hurricane 95. Late-war professional. Available w120+. |
| `arbih_becirovic` | Ramiz Bećirović | 3 | 4 | 4 | 4 | 2nd | — | Military | 28th Div deputy (Srebrenica). Led column breakout Jul 95. Available late-war. |
| `arbih_imamovic` | Zaim Imamović | 4 | 4 | 3 | 4 | 2nd | — | Military | 14th Division cdr. KIA Oct 1995 (available_until ~w180). |
| `arbih_bahto` | Hamid Bahto | 3 | 3 | 4 | 4 | — | 2nd | Military | 81st Division (Goražde). Enclave defense specialist. |
| `arbih_s_delic` | Sead Delić | 4 | 4 | 3 | 4 | 2nd | — | Military | *(Promoted to corps — starts in pool, auto-assigned w132)* |
| `arbih_merdan` | Dževad Merdan | 3 | 3 | 3 | 4 | 3rd | — | Military | 3rd Corps deputy. Managed UNPROFOR liaison. |

*Tier C — Wartime-only / limited (restricted availability):*

| ID | Name | Comp | Agg | Def | Pol | Notes |
|----|------|:----:|:---:|:---:|:---:|-------|
| `arbih_nanic` | Izet Nanić | 4 | 5 | 3 | 3 | 505th Bde (Bihać). Legendary. KIA Aug 1995 (available_until ~w175). 5th Corps only. |
| `arbih_hujdur` | Midhad Hujdur "Hujka" | 3 | 5 | 3 | 3 | 41st Bde Mostar. KIA Jun 1993 (available_until ~w60). 4th Corps only. |
| `arbih_sehovic` | Enver Šehović | 3 | 4 | 3 | 3 | 1st Corps brigade cdr. KIA age 26 — shows officer shortage. Available briefly. |
| `arbih_hadzic` | Ismet Hadžić "Mutevelija" | 3 | 4 | 4 | 3 | Dobrinja defense cdr. 1st Corps only. Local hero. |

**ARBiH Officer Pool Characteristics:**
- **Tiny at start**: 7 usable officers in pool, most comp 2-3
- **Growing pool**: New officers generated over time (battle-hardened NCOs promoted)
  - Every 12 turns: 1 new officer added to pool with comp = 2 + floor(turn / 26)
  - Cap at comp 4 for generated officers (comp 5 reserved for historical)
- **Faction learning rate**: Generated officers improve faster (improvement_rate = 0.08 vs VRS 0.03)
- **The warlord tax**: Before w78 (Operation Trebević), ARBiH corps commanders may fail activation checks with higher probability (command friction from autonomous units)
- **Enclave restriction**: Orić, Bahto, Bećirović cannot command mainland corps until their enclave falls or column breaks out

---

### 4.3 HVO (Croatian Defence Council)

**Source:** Mix of JNA professionals, HV (Croatian Army) secondees, and local militia leaders.
**Zagreb control:** All major appointments required Zagreb's approval. Officers on Croatian Army payroll.

#### Army-Level

| ID | Name | Comp | Agg | Def | Pol | Origin | From | Until | Notes |
|----|------|:----:|:---:|:---:|:---:|--------|------|-------|-------|
| `hvo_petkovic` | Milivoj Petković | 4 | 3 | 4 | 4 | JNA | 0 | w64 | Built HVO from scratch. JNA academy. Methodical organizer. |
| `hvo_praljak` | Slobodan Praljak | 2 | 5 | 2 | 5 | Political (theatre director) | w64 | w80 | "The Praljak Problem" — political appointee with no military education. Aggressive escalation without competence. Suicide in ICTY courtroom. |
| `hvo_roso` | Ante Roso | 5 | 3 | 4 | 4 | French Foreign Legion + HV | w80 | w100 | Most competent HVO commander. Restructured entire HVO. Guards Brigades created. |
| `hvo_petkovic_2` | Milivoj Petković (2nd) | 4 | 3 | 4 | 4 | JNA | w100 | w120 | Returned for second tenure. |
| `hvo_blaskic_2` | Tihomir Blaškić (army) | 3 | 4 | 4 | 3 | JNA | w120 | — | Promoted from OZ Central Bosnia to overall HVO commander. |

#### OZ (Operational Zone) Commanders

| ID | Name | OZ | Comp | Agg | Def | Pol | Origin | From | Until | Notes |
|----|------|-----|:----:|:---:|:---:|:---:|--------|------|-------|-------|
| `hvo_blaskic` | Tihomir Blaškić | Central Bosnia | 3 | 4 | 4 | 3 | JNA | 0 | w120 | Held Vitez-Bušovača-Kiseljak enclaves while completely surrounded. ICTY: 45y→9y on appeal. |
| `hvo_tole` | Žarko Tole | NW Herzegovina | 3 | 3 | 3 | 4 | HV | 0 | w44 | First OZ NW Herz. cdr. Replaced by Šiljeg. |
| `hvo_siljeg` | Željko Šiljeg | NW Herzegovina | 3 | 4 | 3 | 5 | HV Brig.Gen | w44 | w96 | Largest OZ by area. Executed Praljak's orders. Kupres-Livno. Mladic's wedding kum (pol=5). |
| `hvo_skender` | Zvonimir Skender | NW Herzegovina | 4 | 4 | 4 | 4 | FFL | w96 | w120 | French Foreign Legion veteran. Highest-ranking Croat in FFL. Professional. |
| `hvo_glasnovic` | Željko Glasnović | NW Herzegovina | 4 | 4 | 3 | 4 | HV/foreign | w120 | — | Canadian Army → FFL → Gulf War veteran. International mil. experience. Post-war Croatian MP. |
| `hvo_lasic` | Miljenko Lasić | SE Herzegovina | 3 | 3 | 3 | 4 | Militia | 0 | — | No military academy. Businessman turned cdr. Managed Mostar siege. Deputy: Nedjeljko Obradović. |
| `hvo_matuzovic` | Đuro Matuzović | Posavina | 3 | 2 | 4 | 4 | Military | 0 | — | Outstanding defensive achievement: held isolated Orašje pocket for entire war (18km front). |

**Pool (available as replacements):**

*Tier A — OG commanders and deputies (immediate availability):*

| ID | Name | Comp | Agg | Def | Pol | Home | Compatible | Origin | Notes |
|----|------|:----:|:---:|:---:|:---:|------|------------|--------|-------|
| `hvo_rajic` | Ivica Rajić | 2 | 5 | 2 | 4 | Central | — | JNA | 2nd OG Central Bosnia (Kiseljak-Kreševo-Vareš). Stupni Do massacre. ICTY: pled guilty. |
| `hvo_nakic` | Franjo Nakić | 3 | 3 | 3 | 4 | Central | — | Military (Brig.) | OZ Central Bosnia CoS. Natural Blaškić successor. |
| `hvo_obradovic` | Nedjeljko Obradović | 3 | 3 | 3 | 4 | SE Herz | — | Military (Brig.) | 1st Knez Domagoj Bde → Mostar Zone cdr (1995). Natural Lasić successor. |
| `hvo_stefanek` | Vinko Štefanek | 3 | 3 | 3 | 5 | Posavina | — | HV Col | OG Eastern Posavina from HV side (Slavonian Field Cmd). Zagreb loyalist. |
| `hvo_cerni` | Josip Černi | 3 | 4 | 3 | 4 | NW Herz | — | Military | Op Cincar joint cdr. Kupres recapture. Available w120+. |

*Tier B — Distinguished brigade commanders (2-turn transition):*

| ID | Name | Comp | Agg | Def | Pol | Home | Compatible | Origin | Notes |
|----|------|:----:|:---:|:---:|:---:|------|------------|--------|-------|
| `hvo_cerkez` | Mario Čerkez | 3 | 4 | 4 | 3 | Central | — | Local | Vitešku Brigade cdr. Vitez enclave defense. ICTY: 15y. |
| `hvo_grubesic` | Duško Grubešić | 3 | 3 | 3 | 4 | Central | — | Military | N.Š. Zrinski Bde (Bušovača). Steady. |
| `hvo_bradara` | Mario Bradara | 3 | 3 | 3 | 3 | Central | — | Military | Jelačić Bde. Central Bosnia. |
| `hvo_lozancic` | Ivo Lozančić | 3 | 3 | 3 | 4 | Central | Posavina | Military (Gen.) | 111th Bde HVO Žepče + multi-OZ authority. Order of Ban Jelačić. |
| `hvo_naletlic` | Mladen Naletilić "Tuta" | 2 | 5 | 1 | 3 | SE Herz | — | Paramilitary | Convicts Battalion. Semi-autonomous warlord. Destabilizes command chain. |

**HVO Officer Pool Characteristics:**
- **Zagreb pipeline**: Every 20 turns, 1 new HV officer added to pool (comp 3, pol 5, origin 'hv')
- **Small pool**: 5-7 officers at any time (deeper than originally estimated due to HV crossover officers)
- **Political appointments**: High political_reliability officers preferred by bot AI; competence secondary
- **The Roso inflection**: After w80, existing HVO officers gain +1 competence (restructuring effect, one-time)
- **HV transfers**: Štefanek, Glasnović, Skender represent the Zagreb-to-frontline pipeline. These are professional soldiers, not political appointees.
- **FFL advantage**: Roso, Skender, and Glasnović all have French Foreign Legion or equivalent professional military background — the highest-quality officers in the HVO pool

---

## 5. Corps Sensitivity and Assignment Rules

### Home Corps

Every officer has a `home_corps_id` — their historical/natural command. When assigned to their home corps:
- **No penalty**
- Full ratings apply
- Morale bonus to subordinate brigades (+2 cohesion)

### Compatible Corps

Officers may also have `compatible_corps_ids` — corps in the same theater or with similar operational character:

| Officer | Home | Compatible | Rationale |
|---------|------|------------|-----------|
| Talić | 1KK | IBK | Both in the Krajina/Posavina area |
| Galić | SRK | — | SRK is unique (siege warfare) |
| Simić | IBK | — | Corridor defense specialist |
| Samardžija | 2KK | 1KK | Served in both corps (3 brigades, 2 corps) |
| Pandurević | Drina | — | Zvornik Bde only, no other corps experience |
| Andrić | Drina | IBK | Birčani origins, served in both areas |
| Dudaković | 5th | — | Bihać pocket is uniquely isolated |
| Hadžihasanović | 3rd | 7th | Central Bosnia zone, shared formations |
| Alagić | 3rd | 7th | Founded 7th, commanded 3rd. Both Central Bosnia. |
| Lendo | 2nd | — | 25th Division specialist |
| Selmanović | 5th | — | 5th Corps CoS, Bihać specialist |
| Blaškić | OZ Central | — | Enclave defense is unique |
| Skender | NW Herz | — | FFL background, professional but NW-specific |
| Glasnović | NW Herz | — | International experience but NW-specific |
| Černi | NW Herz | Central | Kupres operations crossed OZ boundaries |

When assigned to a compatible corps:
- **Small penalty**: -1 effective competence (learning the new AO)
- Penalty removed after 8 turns in command

### Incompatible Assignment

When assigned to any other corps:
- **Large penalty**: -2 effective competence for 12 turns
- -3 cohesion to subordinate brigades (unfamiliarity, resentment)
- Some assignments are **blocked entirely**:
  - Enclave commanders (Orić/Srebrenica) cannot command a mainland corps
  - Political appointees (Praljak, Kordić) cannot be reassigned outside their political base
  - HV-origin officers cannot command Posavina OZ (local politics)

### VRS Specific: Mladić Override

Mladić's centralized command style means he sometimes bypasses corps commanders:
- When VRS Main Staff issues a pre-planned operation, it uses army-level modifier instead of corps commander modifier
- Historically accurate: Mladić personally directed Srebrenica, Goražde, Corridor operations, bypassing Živanović/Krstić/Talić

### ARBiH Specific: Warlord Friction (pre-w78)

Before Operation Trebević (turn ~78, late October 1993):
- ARBiH corps commanders have an **activation penalty**: 15% chance per turn that one brigade ignores the corps directive and acts autonomously (defends its own neighborhood regardless of orders)
- After w78: penalty removed. Command friction drops to 0.
- Mechanical effect: one random brigade in the corps is forced into `defend` posture regardless of corps directive

### HVO Specific: Zagreb Approval

- Replacing an HVO commander requires "approval from Zagreb" — modeled as a 4-turn delay before a replacement takes effect
- Exception: If the commander is killed in combat, replacement is immediate (emergency appointment)
- Political officers (pol ≥ 4) take priority in auto-assignment by bot AI, even if less competent

---

## 6. Tier 2: Abstracted Brigade Officer Quality

This tier retains the design from `OFFICER_QUALITY_AND_GENERALS_PLAN.md` with refinements.

### Field

```typescript
// On FormationState
officer_quality?: number;  // [0.0 – 1.0]
```

### Initial Values (from OOB or faction defaults)

| Faction | Default Range | Rationale |
|---------|--------------|-----------|
| VRS | 0.65–0.80 | JNA-trained officers at all echelons |
| ARBiH | 0.10–0.25 | Almost no trained officers; TO remnants at best |
| HVO | 0.35–0.50 | Croatian military cadres, some HV officers embedded |

**Per-brigade OOB overrides:**

| Brigade | Override | Rationale |
|---------|----------|-----------|
| VRS Guards Bde (65th Protection) | 0.85 | Elite Main Staff unit |
| ARBiH Guards Brigade | 0.35 | Better-selected personnel, still forming |
| ARBiH 5th Corps brigades | 0.20 | Dudaković's influence + combat necessity |
| HVO Guards Brigades (post-Roso) | 0.55 | Full-time professional soldiers |
| Enclave militias | 0.05–0.10 | No training infrastructure whatsoever |

### Growth

| Source | Rate | Notes |
|--------|------|-------|
| Combat (battle resolved) | +0.01 × faction_learning_rate | Learning by doing |
| Frontline time (per turn on front) | +0.005 × faction_learning_rate | Passive professionalization |
| Faction learning rates | RBiH ×1.5, RS ×0.7, HRHB ×1.0 | ARBiH learns fastest; VRS already near ceiling |
| Corps commander bonus | competence ≥ 4: +0.002/turn to subordinates | Good commanders train their subordinates |

Growth cap: 0.90 (only historical elites reach higher via OOB override).

### Loss

```
On battle casualty:
  casualty_ratio = casualties / pre_battle_personnel
  officer_loss = casualty_ratio × OFFICER_CASUALTY_MULT × (1.0 - officer_quality × 0.3)
  officer_quality -= officer_loss
  officer_quality = max(0.05, officer_quality)
```

- `OFFICER_CASUALTY_MULT = 1.5` — officers 50% more likely to be casualties
- `(1.0 - officer_quality × 0.3)` — low-quality officer corps (poorly trained, expose themselves) loses officers faster. At quality 0.15 (ARBiH start): multiplier 0.955. At quality 0.80 (VRS peak): multiplier 0.76.
- Floor of 0.05 — some residual leadership always exists.

### VRS-Specific: No Replacement Pipeline

When a VRS brigade loses officers (quality drops), the growth rate is 0.7× base. The JNA officer corps is a **one-time endowment**. There's no military academy in wartime RS. Quality that's lost is largely gone forever.

Additionally, after turn 40:
```
vrs_brain_drain = 0.001 per turn  // Officers leaving for Serbia
officer_quality -= vrs_brain_drain
```

### ARBiH-Specific: Battlefield Promotion

ARBiH's 1.5× learning rate means a brigade that fights 10 battles gains:
- ARBiH: 10 × 0.01 × 1.5 = +0.15 officer quality
- VRS: 10 × 0.01 × 0.7 = +0.07 officer quality

This naturally produces the inversion: by w40, active ARBiH brigades have quality ~0.35-0.45, while VRS brigades that took heavy casualties have dropped to ~0.55-0.65.

### HVO-Specific: Croatian Cadre Injection

Every 20 turns, if HVO officer quality average is below 0.50, a small boost (+0.02) is applied to all HVO brigades — representing HV officers and trainers arriving from Croatia. This stops after w120 (Operation Storm draws HV focus elsewhere).

### Combat Effect

```
brigade_officer_modifier = 1.0 + (officer_quality - 0.30) × 0.4
```

| officer_quality | Modifier | Interpretation |
|----------------|----------|----------------|
| 0.10 (ARBiH enclave) | 0.92× | -8% combat power |
| 0.20 (ARBiH start) | 0.96× | -4% |
| 0.30 (baseline) | 1.00× | Neutral |
| 0.50 (ARBiH mid-war) | 1.08× | +8% |
| 0.70 (VRS start) | 1.16× | +16% |
| 0.80 (VRS peak) | 1.20× | +20% |

Total officer effect on a brigade = `brigade_officer_modifier × corps_commander_modifier`.

Max combined: 1.20 × 1.10 = 1.32× (+32% for a peak VRS brigade under Talić).
Min combined: 0.92 × 0.94 = 0.865× (-13.5% for an ARBiH enclave brigade under an incompetent commander).

---

## 7. Replacement and Succession

### Officer Death/Removal

Corps commanders can be removed by:

1. **Battle casualty**: When a corps commander's HQ settlement is in an OSID that suffers a battle, there's a `casualty_vulnerability × casualty_ratio × 0.5` chance of death
2. **Historical script**: Officers with `available_until_turn` depart at that turn (retirement, transfer, political removal)
3. **Player decision** (future): Player can request replacement (costs political capital)
4. **Bot AI decision**: If commander's effective competence (including assignment penalty) is below 2, bot may replace after 12 turns

### Replacement Cost

The cost of replacing a commander depends on faction officer pool depth:

```
replacement_delay = base_delay + pool_penalty

VRS base_delay:   2 turns (professional pool, quick succession)
ARBiH base_delay: 4 turns (officer shortage, slow succession)
HVO base_delay:   4 turns (Zagreb approval), 1 turn if emergency

pool_penalty = max(0, (3 - available_officers_in_pool) × 2)
```

During the replacement delay, the corps operates with a **temporary modifier of 0.92×** (acting commander penalty).

### Succession Priority

When a corps commander needs replacing, the bot AI picks from the pool:

1. **First**: Officer with `home_corps_id` matching the vacant corps
2. **Then**: Officer with the corps in `compatible_corps_ids`
3. **Then**: Highest-competence available officer
4. **If pool empty**: Generate a "generic" officer:

| Faction | Generic Officer Stats | Rationale |
|---------|----------------------|-----------|
| VRS (early) | Comp 3, Agg 3, Def 3, Pol 3 | JNA middle-grade officers |
| VRS (late, >w80) | Comp 2, Agg 2, Def 3, Pol 3 | Scraping the barrel |
| ARBiH (early) | Comp 1, Agg 2, Def 2, Pol 3 | Civilians with no training |
| ARBiH (late, >w60) | Comp 2, Agg 3, Def 3, Pol 4 | Battle-hardened NCOs |
| ARBiH (very late, >w120) | Comp 3, Agg 3, Def 3, Pol 4 | Professional generation |
| HVO | Comp 3, Agg 3, Def 3, Pol 4 | HV replacement from Zagreb |

### What "Replacement Cost" Means in AWWV

Unlike HoI4 (political power) or WitE2 (admin points), AWWV doesn't have a spendable currency for commander changes. Instead, the cost is paid in **time** (replacement delay) and **effectiveness** (temporary penalty + new commander may be worse). This is the Bosnian War reality: there was no clean way to replace a commander. You got whoever was available.

---

## 8. Combat and Bot AI Integration

### Combat Math (`combat_math.ts`)

Replace `getOfficerQualityMult(faction, turn)` with:

```typescript
function getOfficerCombatMod(
    formation: FormationState,
    state: GameState,
    role: 'attacker' | 'defender'
): number {
    // Tier 2: Brigade-level officer quality
    const quality = formation.officer_quality ?? getDefaultOfficerQuality(formation.faction);
    const brigadeMod = 1.0 + (quality - 0.30) * 0.4;

    // Tier 1: Corps commander modifier
    const corpsId = formation.corps_id;
    const corpsOfficer = corpsId ? getCorpsCommander(corpsId, state) : null;
    let corpsMod = 1.0;
    if (corpsOfficer && corpsOfficer.status === 'active') {
        const effectiveComp = getEffectiveCompetence(corpsOfficer);
        if (role === 'attacker') {
            corpsMod = 0.90 + effectiveComp * 0.03 + (corpsOfficer.aggressiveness ?? 3) * 0.01;
        } else {
            corpsMod = 0.90 + effectiveComp * 0.03 + (corpsOfficer.defensive_skill ?? 3) * 0.01;
        }
    }

    return brigadeMod * corpsMod;
}
```

### Bot Corps AI (`bot_corps_ai.ts`)

Corps commander's aggressiveness flows into directive generation:

```typescript
const officer = getCorpsCommander(corpsId, state);
const aggressionShift = officer ? (officer.aggressiveness - 3) * 0.05 : 0;
directive.aggression_modifier += aggressionShift;

// High-competence commanders lower min_attack_outcome threshold
if (officer && getEffectiveCompetence(officer) >= 4) {
    // Confident commander: willing to accept costly_victory outcomes
    if (directive.min_attack_outcome === 'victory') {
        directive.min_attack_outcome = 'costly_victory';
    }
}
```

### Formation Spawn (`formation_spawn.ts`)

New brigades receive `officer_quality` from:
1. OOB override (if `initial_officer_quality` field exists)
2. Faction default
3. Modified by current turn (later spawns get higher quality for ARBiH, lower for VRS)

```typescript
const baseQuality = oobEntry.initial_officer_quality ??
    getFactionDefaultOfficerQuality(faction, turn);

function getFactionDefaultOfficerQuality(faction: string, turn: number): number {
    switch (faction) {
        case 'RS': return Math.max(0.45, 0.75 - turn * 0.003);     // Degrades from 0.75
        case 'RBiH': return Math.min(0.50, 0.15 + turn * 0.004);   // Improves from 0.15
        case 'HRHB': return 0.40;                                    // Stable
        default: return 0.30;
    }
}
```

### Pipeline Step

New pipeline step `update-officer-quality` in `war_phases.ts` after combat resolution:

```
Phase II:
  ...existing steps...
  resolve-attacks
  update-officer-quality       ← NEW: growth from combat + frontline time
  evaluate-brigade-decorations
  ...existing steps...

Phase III:
  ...existing steps...
  officer-succession           ← NEW: check for killed/departed commanders, assign replacements
```

---

## 9. War Timeline Integration

Officer temporal data goes into `data/scenarios/timelines/apr1992.json`:

```json
{
    "officer_config": {
        "RS": {
            "default_brigade_quality": 0.75,
            "brigade_quality_decay_per_turn": 0.003,
            "brigade_quality_floor": 0.45,
            "learning_rate": 0.7,
            "brain_drain_start_turn": 40,
            "brain_drain_rate": 0.001,
            "generic_replacement_quality": [
                { "start_turn": 0, "end_turn": 80, "value": 3 },
                { "start_turn": 80, "end_turn": 200, "value": 2 }
            ]
        },
        "RBiH": {
            "default_brigade_quality": 0.15,
            "brigade_quality_growth_per_turn": 0.004,
            "brigade_quality_ceiling": 0.50,
            "learning_rate": 1.5,
            "warlord_friction_end_turn": 78,
            "generic_replacement_quality": [
                { "start_turn": 0, "end_turn": 60, "value": 1 },
                { "start_turn": 60, "end_turn": 120, "value": 2 },
                { "start_turn": 120, "end_turn": 200, "value": 3 }
            ]
        },
        "HRHB": {
            "default_brigade_quality": 0.40,
            "learning_rate": 1.0,
            "zagreb_cadre_interval": 20,
            "zagreb_cadre_boost": 0.02,
            "zagreb_cadre_end_turn": 120,
            "roso_restructuring_turn": 80,
            "roso_competence_boost": 1,
            "generic_replacement_quality": [
                { "start_turn": 0, "end_turn": 200, "value": 3 }
            ],
            "replacement_delay": 4
        }
    }
}
```

---

## 10. Design Patterns from Other Games

### What we take from each game:

| Game | Pattern | AWWV Adaptation |
|------|---------|-----------------|
| **HoI4** | 4-stat commander system (attack/defense/planning/logistics) | Simplified to 4 stats: competence, aggressiveness, defensive_skill, political_reliability |
| **HoI4** | Trait acquisition through combat | Officers with `can_improve: true` gain competence through victories |
| **Gary Grigsby WitE2** | Political cost of replacement (admin points) | Replacement cost = time delay + effectiveness penalty |
| **Gary Grigsby WitE2** | Chain-of-command check escalation | Corps commander quality flows down to brigade combat (multiplicative) |
| **AGEOD** | Activation / strategic rating | ARBiH warlord friction (pre-Trebević): corps activation penalty |
| **AGEOD** | Seniority penalty for promoting juniors | Assignment compatibility system (home/compatible/incompatible corps) |
| **Decisive Campaigns: Barbarossa** | Relationship snowball (good→better, bad→worse) | Corps commander competence affects subordinate brigade officer growth rate |
| **Decisive Campaigns: Barbarossa** | PP scarcity for political decisions | Replacement delay is the scarce resource |
| **Command Ops 2** | Order delay scaled by commander quality | Low competence commander adds 1 turn to operation planning phase |
| **Unity of Command 2** | CP as command bandwidth | Not adopted — too granular for weekly turns |

### What we explicitly reject:

| Pattern | Reason for rejection |
|---------|---------------------|
| Random skill allocation on level-up (HoI4) | Violates determinism |
| Thousands of hidden checks per turn (WitE2) | Too opaque, can't attribute outcomes |
| d6 activation roll (AGEOD) | Violates determinism (use fixed probability + deterministic hash) |
| Trait trees / unlockable abilities (Panzer Corps) | Over-engineering for AWWV's scope |
| Command point spending (UoC2) | Doesn't fit weekly turn scale |

---

## 11. Codebase Integration Points

### Files to Modify

| File | Change |
|------|--------|
| `src/state/game_state.ts` | Add `named_officers?: Record<string, NamedOfficerState>` to GameState; add `officer_quality?: number` to FormationState |
| `src/sim/combat/combat_math.ts` | Replace `getOfficerQualityMult()` with `getOfficerCombatMod()` using Tier 1 + Tier 2 |
| `src/sim/combat/bot_corps_ai.ts` | Read corps commander aggressiveness into directive generation |
| `src/sim/formation_spawn.ts` | Initialize `officer_quality` on new formations |
| `src/sim/turn_phases/war_phases.ts` | Add `update-officer-quality` and `officer-succession` pipeline steps |
| `src/scenario/scenario_types.ts` | Add `init_officers?: string` to Scenario |
| `src/state/war_timeline.ts` | Add `officer_config` to WarTimeline interface |
| `data/scenarios/timelines/apr1992.json` | Add officer temporal config |
| `data/source/oob_brigades.json` | Add `initial_officer_quality` override field per brigade |

### New Files

| File | Purpose |
|------|---------|
| `src/state/officer_types.ts` | `NamedOfficer`, `NamedOfficerState` interfaces |
| `src/sim/combat/officer_system.ts` | `getOfficerCombatMod()`, `updateBrigadeOfficerQuality()`, `processOfficerSuccession()`, `getCorpsCommander()`, `getEffectiveCompetence()` |
| `data/scenarios/officers/apr1992_officers.json` | Historical officer database for the April 1992 scenario |
| `tests/officer_system.test.ts` | Unit tests |

### Existing Systems That Interact

| System | Interaction |
|--------|-------------|
| `getOfficerQualityMult()` (combat_math.ts L137-160) | **Replaced** by new two-tier system |
| Commander casualty snap event (battle_resolution.ts L670-701) | **Enhanced**: named officer casualty check added to snap event |
| Cohesion floor/ceiling (faction_progression.ts) | **Unchanged**: officer quality is orthogonal to faction-level cohesion bounds |
| Decoration system (decoration_evaluator.ts) | **Unchanged**: decorations remain brigade-level; officers are separate |
| Elite loan (elite_loan.ts) | **Unchanged**: elite units don't interact with officer system |
| War timeline (war_timeline.ts) | **Extended**: officer config section added |

---

## 12. Implementation Phases

### Phase A: Brigade Officer Quality (Tier 2 only)

**Scope**: Add `officer_quality` to FormationState, wire into combat math, add growth/loss mechanics.
**Effort**: ~2 sessions
**Files**: game_state.ts, combat_math.ts, formation_spawn.ts, war_phases.ts, oob_brigades.json
**Test**: Verify arc emergence: VRS quality degrades, ARBiH quality improves over 40w run
**Calibration**: Tune `OFFICER_CASUALTY_MULT` and learning rates so n365 OSID match stays ≥86%

### Phase B: Named Officers + Corps Sensitivity (Tier 1)

**Scope**: Officer data file, officer state on GameState, corps commander modifier in combat, assignment rules.
**Effort**: ~3 sessions
**Files**: officer_types.ts, officer_system.ts, combat_math.ts, bot_corps_ai.ts, game_state.ts, apr1992_officers.json
**Test**: Verify named officers correctly assigned, modifiers applied, succession works
**Calibration**: Tune corps modifier range so per-corps combat differences match historical patterns

### Phase C: Bot AI Integration + Warlord Friction

**Scope**: Corps commander aggressiveness in directive generation, ARBiH warlord friction, HVO Zagreb delay.
**Effort**: ~1 session
**Files**: bot_corps_ai.ts, officer_system.ts
**Test**: Verify directive aggression varies by commander, ARBiH friction present pre-w78

### Phase D: War Timeline + Scenario Wiring

**Scope**: Officer config in timeline JSON, scenario init, OOB per-brigade overrides.
**Effort**: ~1 session
**Files**: war_timeline.ts, apr1992.json, scenario_runner.ts, oob_brigades.json
**Test**: Round-trip parity with hardcoded values

### Phase E: GUI Integration (future)

**Scope**: Officer info on formation detail panel, officer list in warroom, succession notifications.
**Effort**: Deferred to GUI Phase 4+

---

## 13. Determinism Checklist

- [ ] No Math.random() — all officer checks use deterministic functions
- [ ] Officer pool depletion is sequential (priority order, not random selection)
- [ ] Casualty vulnerability checks use `seededHash(turn, officerId)` for determinism
- [ ] Growth/loss rates are pure arithmetic
- [ ] JSON parse produces identical objects every time
- [ ] Assignment penalties are lookup-based, not randomized
- [ ] Warlord friction brigade selection uses `turn % brigadeCount` (deterministic)
- [ ] All temporal data comes from war_timeline (data-driven, not code)

---

## Appendix A: VRS Command Structure Reference

```
Ratko Mladić (Commander, Main Staff)
├── Manojlo Milovanović (Chief of Staff / Deputy)
├── Zdravko Tolimir (Intelligence & Security)
├── Milan Gvero (Morale/Legal)
├── Đorđe Đukić (Rear Services/Logistics)
├── Radivoje Miletić (Operations & Training)
├── 65th Protection Regiment
├── 10th Sabotage Detachment
│
├── 1st Krajina Corps (1KK) — Banja Luka — Talić — 60-72k
│   CoS: Boško Kelečević
│   OG Doboj: Slavko Lisica; OG Prijedor: Radmilo Željaja (14k)
│   Key Bde cdrs: Samardžija (3 bdes), Čolić (5th Kozara), Arsić (43rd Prijedor)
│
├── 2nd Krajina Corps (2KK) — Drvar — Borić→Tomanić (Nov 94) — 15k
│   Key Bde cdrs: Samardžija (also 2KK), Matić, Sovilj, Radulović
│
├── East Bosnia Corps (IBK) — Bijeljina — Simić — 26k
│   CoS: Budimir Gavrić (Col→MajGen 1994)
│   Key Bde cdrs: Savić "Mauzer" (Panthers), Kutlešić (1st Posavina/Brčko),
│                 Gavrilović (2nd Semberija), Despotović (Majevica, also SRK)
│
├── Sarajevo-Romanija Corps (SRK) — Lukavica — Šipčić→Galić→Milošević — 23k
│   CoS: Milošević (Mar 93–Aug 94), Sladoje (Aug 94+)
│   Key Bde cdrs: Stojanović (1st Mech), Radojčić (Ilidža), Lizdek (1st Romanija, 15k)
│
├── Drina Corps — Vlasenica — Živanović→Krstić — 15-18k
│   CoS: Krstić (Oct 94–Jul 95), Andrić (Jul 95+)
│   Key Bde cdrs: Pandurević (Zvornik, 5k), Blagojević (Bratunac),
│                 Kušić (Rogatica), Obrenović (Zvornik dep.)
│
├── Herzegovina Corps (HK) — Bileća — Grubač — 4.5k→24k
│   Key Bde cdrs: Gušić (8th Nevesinje), Lalović (1st Trebinje, 3rd Kalinovik),
│                 Vuković (18th Gacko — never lost a position)
│
└── Air Force & PVO — Živomir Ninković (MajGen), CoS: Božo Novak (Col)
    17,316 sorties (incl. 3,179 medevac). Grounded for fixed-wing after NATO no-fly (Apr 93).
```

## Appendix B: ARBiH Command Structure Reference

```
Phase 1 (Apr-Jun 93): Sefer Halilović (Chief of Staff)
Phase 2 (Jun 93-end):  Rasim Delić (Commander, Main Staff)

├── 1st Corps (Sarajevo) — Hajrulahović→Karavelić→Ajnadžić — up to 75k
│   Deputy: Ismet Dahić, Ismet Alija, Esad Pelko
│
├── 2nd Corps (Tuzla) — Knez→Šadić→S.Delić — largest zone
│   28th Div (Srebrenica): Naser Orić; 25th Div: Refik Lendo
│
├── 3rd Corps (Zenica) — Hadžihasanović→Jusić→Alagić→Mahmuljin — three-way fighting
│   Deputy: Dževad Merdan; OG Zapad: Čikotić
│
├── 4th Corps (Mostar) — Pašalić→Budaković→Dreković→Polutak — Herzegovina, anti-VRS+HVO
│   Notable Bde cdrs: Hujdur "Hujka" (41st, KIA), Kovačević (44th)
│
├── 5th Corps (Bihać) — Dreković→Dudaković — enclave, legendary breakout
│   CoS: Mirsad Šelmanović; OG North: Šelmanović
│   Notable: Izet Nanić (505th, KIA), Hamdo Abdić (502nd)
│
├── 6th Corps (Konjic) — Gušić — Jun 93-Mar 94 only
│   Deputy: Braco Fazlić; CoS: Dževad Tirak
│
└── 7th Corps (Travnik) — Alagić→Planinčić — formed Feb 94
    Deputy: Fikret Čuškić
```

## Appendix C: HVO Command Structure Reference

```
Army Commanders: Petković → Praljak → Roso → Petković → Blaškić

├── OZ Southeast Herzegovina (Mostar) — Lasić — 6-20k
│   Deputy: Nedjeljko Obradović (1st Knez Domagoj → Mostar Zone 1995)
│   Key units: 1st/2nd Mostar Bde, Convicts Bn (Naletilić "Tuta")
│
├── OZ Northwest Herzegovina (Tomislavgrad) — Tole→Šiljeg→Skender→Glasnović — 8-12k
│   Notable: Zdravko Sagolj (Herceg Stjepan Bde), Josip Černi (Op Cincar)
│   Brigades: Kralj Tomislav, Petar Krešimir IV, Ante Starčević, Eugen Kvaternik
│
├── OZ Central Bosnia (Vitez) — Blaškić — 10-12k
│   CoS: Franjo Nakić; 2nd OG: Ivica Rajić (Kiseljak-Kreševo)
│   Key Bde cdrs: Mario Čerkez (Viteška), Duško Grubešić (Zrinski),
│                 Mario Bradara (Jelačić), Ivo Lozančić (111th Žepče)
│   Paramilitaries: Darko Kraljević (Vitezovi), Vladimir Santić (Jokers)
│
└── OZ Posavina (Orašje) — Štefanek→Stipetić→Matuzović — 6k
    4th Guards "Sinovi Posavine", 3 Home Guard Regts

Guards Brigades (post-Roso reform):
  1st Gds "Ante Bruno Bušić" (founded by Roso), 2nd Gds Mech (Mostar),
  3rd Gds "Jastrebovi/Hawks" (Kiseljak), 4th Gds "Sinovi Posavine" (Orašje), 5th Gds

Zagreb control chain:
  Tuđman → Šušak (Min. Defence) → Bobetko (Chief of Staff) → HVO Main Staff
  HV officers in BiH: Praljak, Roso, Stipetić, Štefanek, Glasnović, Skender, Gotovina, Korade
```

## Appendix D: Officer Database Summary

| Faction | Army-level | Corps Commanders | Pool (Tier A) | Pool (Tier B) | Pool (Tier C) | Total |
|---------|:----------:|:----------------:|:-------------:|:-------------:|:-------------:|:-----:|
| VRS | 2 | 10 | 6 | 10 | 4 | **32** |
| ARBiH | 2 | 14 | 7 | 7 | 4 | **34** |
| HVO | 5 | 7 | 5 | 5 | 0 | **22** |
| **Total** | **9** | **31** | **18** | **22** | **8** | **88** |

Note: Some officers appear in multiple roles (e.g., Alagić as both 7th Corps and 3rd Corps commander). The total counts unique officer IDs.

---

## Appendix E: Sources

### Primary
- Balkan Battlegrounds: A Military History of the Yugoslav Conflict, Vols I & II (CIA, 2002)
- ICTY Trial Records: Mladić, Galić, Krstić, Blaškić, Prlić et al., Halilović, Hadžihasanović, Perišić
- IWPR Trial Monitoring Reports (Institute for War & Peace Reporting)

### Secondary
- Wikipedia biographies of all named officers (en, sr, hr, bs editions — cross-referenced with ICTY records)
- Serbian Wikipedia VRS brigade articles (133 named brigade commanders extracted)
- VRS brigade commander data from `data/derived/sr_wiki_vrs_brigade_report.md`
- AWWV knowledge base: `docs/knowledge/VRS_ORDER_OF_BATTLE_MASTER.md`, `ARBIH_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md`
- ICTY Perišić indictment (IBK CoS identification)
- Novica Gušić obituary (Frontal.ba, March 2020)

### Game Design
- Hearts of Iron 4 Wiki: Commander traits, command power
- Gary Grigsby's War in the East 2: Leader system rules
- AGEOD Civil War II: Army organization, activation, seniority
- Decisive Campaigns: Barbarossa: Political points, relationships
- Command Ops 2: Order delay, force delay mechanics
- Unity of Command 2: HQ system, CP, prestige economy
