/**
 * Historical international events for the Phase 0 news ticker.
 * These are scripted events tied to specific turns, NOT procedurally generated.
 * They provide atmosphere and educational context about the Yugoslav dissolution.
 *
 * Turn 0 = Week 1 of September 1991
 * Each turn = 1 week
 */

export interface TickerEvent {
    /** Turn number when this event becomes visible. */
    turn: number;
    /** Short headline text for the scrolling ticker. */
    text: string;
    /** Optional category for styling/filtering. */
    category?: 'international' | 'military' | 'political' | 'humanitarian' | 'bih_international' | 'world' | 'regional';
    /** Live campaign event receipt required before this static historical row may be shown. */
    requiresEventId?: string;
    /** Live campaign rupture/cost receipt required before this static historical row may be shown. */
    requiresRuptureId?: string;
}

export interface TickerReceiptContext {
    firedEventIds?: readonly string[];
    ruptureIds?: readonly string[];
}

const MAX_VISIBLE_EVENTS = 8;

function hasReceipt(event: TickerEvent, context?: TickerReceiptContext): boolean {
    if (event.requiresEventId && !context?.firedEventIds?.includes(event.requiresEventId)) return false;
    if (event.requiresRuptureId && !context?.ruptureIds?.includes(event.requiresRuptureId)) return false;
    return true;
}

export function getTickerEventsForTurn(absoluteTurn: number, context?: TickerReceiptContext): TickerEvent[] {
    const eligible = PHASE0_TICKER_EVENTS.filter((event) =>
        event.turn <= absoluteTurn && hasReceipt(event, context)
    );

    eligible.sort((a, b) => {
        if (b.turn !== a.turn) return b.turn - a.turn;
        return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
    });

    return eligible.slice(0, MAX_VISIBLE_EVENTS);
}

export const PHASE0_TICKER_EVENTS: readonly TickerEvent[] = [
    // September 1991 (Turns 0-3)
    { turn: 0, text: 'FIGHTING INTENSIFIES IN CROATIA AS JNA BACKS SERBIAN REBELS', category: 'military' },
    { turn: 0, text: 'EC PEACE CONFERENCE OPENS IN THE HAGUE', category: 'international' },
    { turn: 1, text: 'SIEGE OF VUKOVAR ENTERS THIRD MONTH', category: 'military' },
    { turn: 2, text: 'UN SECURITY COUNCIL IMPOSES ARMS EMBARGO ON ALL OF YUGOSLAVIA', category: 'international' },
    { turn: 3, text: 'JNA NAVAL BLOCKADE OF CROATIAN COAST TIGHTENS', category: 'military' },

    // October 1991 (Turns 4-7)
    { turn: 4, text: 'BOSNIAN PARLIAMENT DEBATES SOVEREIGNTY DECLARATION', category: 'political' },
    { turn: 4, text: 'JNA ATTACKS DUBROVNIK — WORLD CONDEMNS SHELLING OF HISTORIC CITY', category: 'military' },
    { turn: 5, text: 'SDS DEPUTIES WALK OUT OF BOSNIAN PARLIAMENT OVER SOVEREIGNTY VOTE', category: 'political' },
    { turn: 6, text: 'BOSNIAN PARLIAMENT ADOPTS SOVEREIGNTY MEMORANDUM', category: 'political' },
    { turn: 7, text: 'RADOVAN KARADZIC WARNS: THIS ROAD LEADS BOSNIA TO HELL', category: 'political' },

    // November 1991 (Turns 8-11)
    { turn: 8, text: 'VUKOVAR FALLS AFTER 87-DAY SIEGE — MASSIVE CIVILIAN CASUALTIES REPORTED', category: 'military' },
    { turn: 8, text: 'UN ENVOY CYRUS VANCE VISITS BELGRADE TO NEGOTIATE CEASEFIRE', category: 'international' },
    { turn: 9, text: 'SERB AUTONOMOUS REGIONS DECLARED IN BOSNIA', category: 'political' },
    { turn: 10, text: 'SDS ORGANIZES PLEBISCITE ON REMAINING IN YUGOSLAVIA', category: 'political' },
    { turn: 11, text: 'EC BADINTER COMMISSION RULES ON YUGOSLAV SUCCESSION', category: 'international' },

    // December 1991 (Turns 12-15)
    { turn: 12, text: 'BOSNIAN PRESIDENCY REQUESTS EC RECOGNITION AS INDEPENDENT STATE', category: 'political' },
    { turn: 13, text: 'GERMANY RECOGNIZES CROATIA AND SLOVENIA — DIPLOMATIC EARTHQUAKE', category: 'international' },
    { turn: 13, text: 'VANCE PLAN FOR CROATIA PROPOSED — UNPROFOR DEPLOYMENT PLANNED', category: 'international' },
    { turn: 14, text: 'JNA BEGINS REDEPLOYMENT FROM CROATIA TO BOSNIA', category: 'military' },
    { turn: 15, text: 'SERB REPUBLIC OF BOSNIA-HERZEGOVINA PROCLAIMED BY SDS', category: 'political' },

    // January 1992 (Turns 16-19)
    { turn: 16, text: 'EC RECOGNIZES CROATIA AND SLOVENIA ON JANUARY 15', category: 'international' },
    { turn: 17, text: 'UNPROFOR ESTABLISHED BY UN SECURITY COUNCIL RESOLUTION 743', category: 'international' },
    { turn: 17, text: 'SDS BOYCOTTS SOVEREIGNTY VOTE — CALLS IT ILLEGAL', category: 'political' },
    { turn: 18, text: 'WEAPONS DISTRIBUTED TO SDS-LOYAL POLICE AND PARAMILITARIES', category: 'military' },
    { turn: 19, text: 'EC REQUESTS BOSNIA HOLD INDEPENDENCE REFERENDUM', category: 'international' },

    // February 1992 (Turns 20-23)
    { turn: 20, text: 'LISBON AGREEMENT PROPOSED — ETHNIC CANTONIZATION OF BOSNIA', category: 'international' },
    { turn: 21, text: 'ALL THREE BOSNIAN PARTIES INITIALLY ACCEPT LISBON PLAN', category: 'political' },
    { turn: 22, text: 'INDEPENDENCE REFERENDUM SCHEDULED FOR 29 FEBRUARY AND 1 MARCH', category: 'political' },
    { turn: 22, text: 'BARRICADES APPEAR AT KEY INTERSECTIONS IN SARAJEVO', category: 'military' },
    { turn: 23, text: 'IZETBEGOVIC WITHDRAWS SIGNATURE FROM LISBON AGREEMENT', category: 'political' },

    // March 1992 (Turns 24-27)
    { turn: 24, text: 'FIGHTING ERUPTS IN BOSANSKI BROD — FIRST ARMED CLASHES IN BOSNIA', category: 'military' },
    { turn: 25, text: 'SERB PARAMILITARIES SET UP ROADBLOCKS ACROSS NORTHERN BOSNIA', category: 'military' },
    { turn: 26, text: 'REFERENDUM: 99.7% VOTE FOR INDEPENDENCE — SERBS BOYCOTT', category: 'political' },
    { turn: 26, text: 'SDS BARRICADES GO UP ACROSS SARAJEVO AFTER REFERENDUM', category: 'military' },
    { turn: 27, text: 'SNIPER KILLS WEDDING GUEST IN SARAJEVO — TENSIONS PEAK', category: 'military' },

    // April 1992 (Turns 28-31)
    { turn: 28, text: 'FIRST SHOTS IN BIJELJINA — ARKANS TIGERS ATTACK', category: 'military' },
    { turn: 28, text: 'EC RECOGNIZES BOSNIA AND HERZEGOVINA ON 6 APRIL', category: 'international' },
    { turn: 29, text: 'FIGHTING SPREADS TO ZVORNIK, FOCA, AND VISEGRAD', category: 'military' },
    { turn: 29, text: 'UNITED STATES RECOGNIZES BOSNIA AND HERZEGOVINA', category: 'international' },
    { turn: 30, text: 'SIEGE OF SARAJEVO BEGINS — JNA SHELLS CITY FROM SURROUNDING HILLS', category: 'military' },
    { turn: 30, text: 'BOSNIAN GOVERNMENT DECLARES STATE OF EMERGENCY', category: 'political' },
    { turn: 31, text: 'JNA OFFICIALLY WITHDRAWS FROM BOSNIA — EQUIPMENT TRANSFERRED TO VRS', category: 'military' },

    // =========================================================================
    // WAR-PHASE EVENTS (May 1992 — December 1995)
    // Turn 32+ = war has started; these play alongside dynamic TurnEvents.
    // Categories: international, bih_international, military, political,
    //             humanitarian, world, regional
    // =========================================================================

    // May 1992 (Turns 32-35)
    { turn: 32, text: 'BOSNIA ADMITTED TO THE UNITED NATIONS', category: 'international' },
    { turn: 32, text: 'BREAD LINE MASSACRE IN SARAJEVO — 16 KILLED', category: 'humanitarian' },
    { turn: 33, text: 'UN DEMANDS JNA WITHDRAWAL FROM BOSNIA', category: 'bih_international' },
    { turn: 33, text: 'JOHNNY CARSON HOSTS FINAL TONIGHT SHOW AFTER 30 YEARS', category: 'world' },
    { turn: 34, text: 'UNPROFOR HEADQUARTERS ESTABLISHED IN SARAJEVO', category: 'bih_international' },
    { turn: 35, text: 'UN SECURITY COUNCIL IMPOSES SANCTIONS ON SERBIA AND MONTENEGRO', category: 'international' },

    // June 1992 (Turns 36-39)
    { turn: 36, text: 'SARAJEVO AIRPORT REOPENED UNDER UN CONTROL FOR AID DELIVERIES', category: 'bih_international' },
    { turn: 36, text: 'CHICAGO BULLS WIN SECOND NBA TITLE — JORDAN DOMINATES TRAIL BLAZERS', category: 'world' },
    { turn: 37, text: 'ETHNIC CLEANSING IN PRIJEDOR REGION — MASS EXPULSIONS REPORTED', category: 'humanitarian' },
    { turn: 38, text: 'UNPROFOR TAKES CONTROL OF SARAJEVO AIRPORT', category: 'bih_international' },
    { turn: 38, text: 'DENMARK STUNS FOOTBALL WORLD — WINS EURO 92 IN SWEDEN', category: 'world' },
    { turn: 39, text: 'EC FOREIGN MINISTERS CALL FOR MILITARY INTERVENTION IN BOSNIA', category: 'international' },

    // July 1992 (Turns 40-43)
    { turn: 40, text: 'DISCOVERY OF SERB-RUN CONCENTRATION CAMPS SHOCKS WORLD', category: 'humanitarian' },
    { turn: 40, text: 'BARCELONA OLYMPICS OPENING CEREMONY — DREAM TEAM ARRIVES', category: 'world' },
    { turn: 41, text: 'OMARSKA AND TRNOPOLJE CAMPS EXPOSED BY BRITISH JOURNALISTS', category: 'humanitarian' },
    { turn: 41, text: 'US DREAM TEAM CRUSHES OPPONENTS IN OLYMPIC BASKETBALL', category: 'world' },
    { turn: 42, text: 'LONDON CONFERENCE ON BOSNIA CONVENES', category: 'international' },
    { turn: 43, text: 'UN AUTHORIZES USE OF FORCE TO DELIVER HUMANITARIAN AID', category: 'bih_international' },

    // August 1992 (Turns 44-47)
    { turn: 44, text: 'UN COMMISSION CONFIRMS WIDESPREAD DETENTION CAMPS IN BOSNIA', category: 'humanitarian' },
    { turn: 44, text: 'HURRICANE ANDREW DEVASTATES SOUTH FLORIDA — BILLIONS IN DAMAGE', category: 'world' },
    { turn: 45, text: 'LONDON CONFERENCE DEMANDS END TO ETHNIC CLEANSING', category: 'international' },
    { turn: 46, text: 'CROATIAN FORCES INTERVENE IN POSAVINA CORRIDOR', category: 'regional' },
    { turn: 47, text: 'BARCELONA OLYMPICS CONCLUDE — UNIFIED TEAM TAKES GOLD', category: 'world' },

    // September 1992 (Turns 48-51)
    { turn: 48, text: 'ITALIAN AID PLANE SHOT DOWN NEAR SARAJEVO', category: 'bih_international' },
    { turn: 49, text: 'YUGOSLAVIA (SERBIA-MONTENEGRO) EXPELLED FROM UN GENERAL ASSEMBLY', category: 'international' },
    { turn: 50, text: 'ICFY PEACE NEGOTIATIONS BEGIN IN GENEVA', category: 'international' },
    { turn: 50, text: 'SINEAD O\'CONNOR TEARS UP PHOTO OF POPE ON SATURDAY NIGHT LIVE', category: 'world' },
    { turn: 51, text: 'NO-FLY ZONE DECLARED OVER BOSNIA — UNSCR 781', category: 'bih_international' },

    // October 1992 (Turns 52-55)
    { turn: 52, text: 'JAJCE FALLS TO VRS AFTER PROLONGED SIEGE', category: 'military' },
    { turn: 52, text: 'TORONTO BLUE JAYS WIN WORLD SERIES — FIRST NON-US TEAM', category: 'world' },
    { turn: 53, text: 'VANCE-OWEN PEACE PLAN PROPOSED — 10 SEMI-AUTONOMOUS PROVINCES', category: 'international' },
    { turn: 54, text: 'UN ESTABLISHES WAR CRIMES COMMISSION FOR YUGOSLAVIA', category: 'international' },
    { turn: 55, text: 'HUMANITARIAN CORRIDOR TO EASTERN BOSNIA DEMANDED BY UN', category: 'bih_international' },

    // November 1992 (Turns 56-59)
    { turn: 56, text: 'BILL CLINTON ELECTED US PRESIDENT — PROMISES ACTION ON BOSNIA', category: 'international' },
    { turn: 57, text: 'FIGHTING INTENSIFIES IN CENTRAL BOSNIA — HVO-ARBIH TENSIONS GROW', category: 'military' },
    { turn: 57, text: 'WHITNEY HOUSTON\'S BODYGUARD TOPS US BOX OFFICE', category: 'world' },
    { turn: 58, text: 'UN REPORT DOCUMENTS SYSTEMATIC RAPE AS WEAPON OF WAR', category: 'humanitarian' },
    { turn: 59, text: 'SREBRENICA UNDER SIEGE — REFUGEES FLOOD INTO ENCLAVE', category: 'humanitarian' },

    // December 1992 (Turns 60-63)
    { turn: 60, text: 'BUSH WARNS SERBIA OF MILITARY ACTION IF CONFLICT SPREADS TO KOSOVO', category: 'international' },
    { turn: 60, text: 'PRINCESS DIANA AND PRINCE CHARLES ANNOUNCE SEPARATION', category: 'world' },
    { turn: 61, text: 'EC SUMMIT DEMANDS CLOSURE OF DETENTION CAMPS', category: 'international' },
    { turn: 62, text: 'UNHCR REPORTS 1 MILLION BOSNIAN REFUGEES', category: 'humanitarian' },
    { turn: 63, text: 'VANCE-OWEN PLAN NEGOTIATIONS CONTINUE IN GENEVA', category: 'international' },

    // January 1993 (Turns 64-67)
    { turn: 64, text: 'DEPUTY PM HAKIJA TURAJLIC KILLED AT UN CHECKPOINT IN SARAJEVO', category: 'political' },
    { turn: 64, text: 'DALLAS COWBOYS WIN SUPER BOWL XXVII — ROUT BUFFALO BILLS 52-17', category: 'world' },
    { turn: 65, text: 'VANCE-OWEN PLAN MAPS PRESENTED — ALL SIDES OBJECT', category: 'international' },
    { turn: 66, text: 'INAUGURATION OF PRESIDENT CLINTON — PLEDGES ROBUST BOSNIA POLICY', category: 'international' },
    { turn: 67, text: 'NATO PLANS ENFORCEMENT OF NO-FLY ZONE OVER BOSNIA', category: 'bih_international' },
    { turn: 67, text: 'AUDREY HEPBURN DIES AT 63 — WORLD MOURNS SCREEN ICON', category: 'world' },

    // February 1993 (Turns 68-71)
    { turn: 68, text: 'UN WAR CRIMES TRIBUNAL FOR YUGOSLAVIA ESTABLISHED — UNSCR 808', category: 'international' },
    { turn: 68, text: 'WORLD TRADE CENTER BOMBED IN NEW YORK — 6 KILLED', category: 'world' },
    { turn: 69, text: 'US BEGINS HUMANITARIAN AIRDROPS TO EASTERN BOSNIA', category: 'bih_international' },
    { turn: 70, text: 'CERSKA ENCLAVE IN EASTERN BOSNIA OVERRUN BY VRS', category: 'military' },
    { turn: 71, text: 'FIGHTING BETWEEN HVO AND ARBIH ERUPTS IN GORNJI VAKUF', category: 'military' },

    // March 1993 (Turns 72-75)
    { turn: 72, text: 'SREBRENICA OFFENSIVE — VRS ADVANCES ON ENCLAVE', category: 'military' },
    { turn: 72, text: 'UNFORGIVEN WINS BEST PICTURE AT ACADEMY AWARDS', category: 'world' },
    { turn: 73, text: 'BOSNIAN PRESIDENT IZETBEGOVIC SIGNS VANCE-OWEN PLAN', category: 'political' },
    { turn: 74, text: 'GENERAL MORILLON ENTERS SREBRENICA — PROMISES PROTECTION', category: 'bih_international' },
    { turn: 74, text: 'DEPECHE MODE RELEASES SONGS OF FAITH AND DEVOTION — TOPS CHARTS', category: 'world' },
    { turn: 75, text: 'BOSNIAN CROAT-BOSNIAK WAR INTENSIFIES IN CENTRAL BOSNIA', category: 'military' },

    // April 1993 (Turns 76-79)
    { turn: 76, text: 'NATO BEGINS ENFORCING NO-FLY ZONE — OPERATION DENY FLIGHT', category: 'bih_international' },
    { turn: 77, text: 'SREBRENICA DECLARED SAFE AREA BY UN — UNSCR 819', category: 'bih_international' },
    { turn: 78, text: 'AHMICI MASSACRE — HVO KILLS BOSNIAK CIVILIANS IN CENTRAL BOSNIA', category: 'humanitarian' },
    { turn: 79, text: 'BOSNIAN SERB ASSEMBLY REJECTS VANCE-OWEN PLAN', category: 'political' },

    // May 1993 (Turns 80-83)
    { turn: 80, text: 'FIVE MORE SAFE AREAS DECLARED — SARAJEVO, TUZLA, ZEPA, GORAZDE, BIHAC', category: 'bih_international' },
    { turn: 81, text: 'BOSNIAN SERB REFERENDUM REJECTS VANCE-OWEN PLAN', category: 'political' },
    { turn: 82, text: 'JOINT ACTION PROGRAMME PROPOSED — LIFT AND STRIKE DEBATED', category: 'international' },
    { turn: 82, text: 'MARSEILLE WINS FIRST CHAMPIONS LEAGUE TITLE IN MUNICH', category: 'world' },
    { turn: 83, text: 'MOSTAR BRIDGE SHELLED — OLD BRIDGE STILL STANDING', category: 'military' },

    // June 1993 (Turns 84-87)
    { turn: 84, text: 'OWEN-STOLTENBERG PLAN PROPOSED — UNION OF THREE REPUBLICS', category: 'international' },
    { turn: 84, text: 'JURASSIC PARK OPENS IN CINEMAS — SHATTERS BOX OFFICE RECORDS', category: 'world' },
    { turn: 85, text: 'FIGHTING IN MOSTAR — HVO BESIEGES EAST MOSTAR', category: 'military' },
    { turn: 85, text: 'CHICAGO BULLS WIN THIRD STRAIGHT NBA TITLE — JORDAN THREE-PEAT', category: 'world' },
    { turn: 86, text: 'UNPROFOR MANDATE EXTENDED — SAFE AREA PROTECTION REMAINS WEAK', category: 'bih_international' },
    { turn: 87, text: 'CROATIAN COMMUNITY OF HERCEG-BOSNA DECLARES ITSELF A REPUBLIC', category: 'political' },

    // July 1993 (Turns 88-91)
    { turn: 88, text: 'VRS OFFENSIVE ON MOUNT IGMAN ABOVE SARAJEVO', category: 'military' },
    { turn: 89, text: 'NATO THREATENS AIR STRIKES IF VRS DOES NOT WITHDRAW FROM IGMAN', category: 'bih_international' },
    { turn: 90, text: 'OWEN-STOLTENBERG NEGOTIATIONS ON HMS INVINCIBLE', category: 'international' },
    { turn: 91, text: 'VRS WITHDRAWS FROM IGMAN AND BJELASNICA UNDER NATO PRESSURE', category: 'military' },
    { turn: 91, text: 'MIGUEL INDURAIN WINS THIRD CONSECUTIVE TOUR DE FRANCE', category: 'world' },

    // August 1993 (Turns 92-95)
    { turn: 92, text: 'OWEN-STOLTENBERG PLAN REJECTED BY BOSNIAN PARLIAMENT', category: 'political' },
    { turn: 93, text: 'SIEGE OF EAST MOSTAR BY HVO CONTINUES — HUMANITARIAN CRISIS', category: 'humanitarian' },
    { turn: 94, text: 'MT IGMAN ROAD UNDER UN CONTROL — SOLE LINK TO SARAJEVO', category: 'bih_international' },
    { turn: 95, text: 'EU ACTION PLAN FOR BOSNIA PROPOSED', category: 'international' },

    // September 1993 (Turns 96-99)
    { turn: 96, text: 'CROAT-BOSNIAK FIGHTING INTENSIFIES — CENTRAL BOSNIA A WAR ZONE', category: 'military' },
    { turn: 96, text: 'NIRVANA RELEASES IN UTERO — GRUNGE DOMINATES AIRWAVES', category: 'world' },
    { turn: 97, text: 'NEGOTIATIONS AT GENEVA CONTINUE — EU-UN JOINT MEDIATION', category: 'international' },
    { turn: 98, text: 'VITEZ AND TRAVNIK SEE HEAVY FIGHTING BETWEEN HVO AND ARBIH', category: 'military' },
    { turn: 99, text: 'UN SECURITY COUNCIL EXTENDS SANCTIONS ON SERBIA', category: 'international' },

    // October 1993 (Turns 100-103)
    { turn: 100, text: 'STUPNI DO MASSACRE — HVO KILLS BOSNIAK CIVILIANS', category: 'humanitarian' },
    { turn: 100, text: 'TORONTO BLUE JAYS WIN SECOND STRAIGHT WORLD SERIES', category: 'world' },
    { turn: 101, text: 'VARDARSKI BRIDGE DESTRUCTION — FIGHTING IN MOSTAR', category: 'military' },
    { turn: 102, text: 'US SENATE VOTES TO LIFT ARMS EMBARGO ON BOSNIA', category: 'international' },
    { turn: 102, text: 'MICHAEL JORDAN ANNOUNCES RETIREMENT FROM BASKETBALL', category: 'world' },
    { turn: 103, text: 'EU ACTION PLAN NEGOTIATIONS STALL', category: 'international' },

    // November 1993 (Turns 104-107)
    { turn: 104, text: 'STARI MOST (OLD BRIDGE) IN MOSTAR DESTROYED BY HVO SHELLING', category: 'humanitarian' },
    { turn: 105, text: 'INTERNATIONAL CRIMINAL TRIBUNAL FOR YUGOSLAVIA BEGINS WORK', category: 'international' },
    { turn: 106, text: 'ARBIH OFFENSIVE IN CENTRAL BOSNIA — CAPTURES VARES', category: 'military' },
    { turn: 106, text: 'SCHINDLER\'S LIST PREMIERES — SPIELBERG FILM ON HOLOCAUST', category: 'world' },
    { turn: 107, text: 'EUROPEAN UNION FORMALLY ESTABLISHED — MAASTRICHT TREATY TAKES EFFECT', category: 'world' },

    // December 1993 (Turns 108-111)
    { turn: 108, text: 'CHRISTMAS CEASEFIRE PROPOSED — LIMITED COMPLIANCE', category: 'bih_international' },
    { turn: 108, text: 'DOOM VIDEO GAME RELEASED — SPARKS CONTROVERSY AND CRAZE', category: 'world' },
    { turn: 109, text: 'NATO REAFFIRMS COMMITMENT TO ENFORCE NO-FLY ZONE', category: 'bih_international' },
    { turn: 110, text: 'HUMANITARIAN AGENCIES WARN OF WINTER CRISIS IN BOSNIA', category: 'humanitarian' },
    { turn: 111, text: 'US PUSHES FOR STRONGER NATO ROLE IN BOSNIA', category: 'international' },

    // January 1994 (Turns 112-115)
    { turn: 112, text: 'NATO SUMMIT ISSUES ULTIMATUM — THREATENS AIR STRIKES', category: 'bih_international' },
    { turn: 112, text: 'DALLAS COWBOYS WIN SECOND STRAIGHT SUPER BOWL — BEAT BILLS AGAIN', category: 'world' },
    { turn: 113, text: 'US-RUSSIA DIPLOMATIC PUSH FOR BOSNIAN PEACE SETTLEMENT', category: 'international' },
    { turn: 113, text: 'NANCY KERRIGAN ATTACKED AT US FIGURE SKATING CHAMPIONSHIPS', category: 'world' },
    { turn: 114, text: 'LILLEHAMMER WINTER OLYMPICS OPEN IN NORWAY', category: 'world' },
    { turn: 115, text: 'GROWING INTERNATIONAL PRESSURE FOR CROAT-BOSNIAK RECONCILIATION', category: 'international' },
    { turn: 115, text: 'TONYA HARDING DRAMA DOMINATES LILLEHAMMER — KERRIGAN TAKES SILVER', category: 'world' },

    // February 1994 (Turns 116-119)
    { turn: 116, text: 'MARKALE MARKETPLACE MASSACRE — 68 KILLED IN SARAJEVO', category: 'humanitarian' },
    { turn: 117, text: 'NATO ULTIMATUM: VRS MUST WITHDRAW HEAVY WEAPONS FROM SARAJEVO OR FACE AIR STRIKES', category: 'bih_international' },
    { turn: 118, text: 'FIRST NATO COMBAT ACTION — 4 VRS AIRCRAFT SHOT DOWN OVER BANJA LUKA', category: 'bih_international' },
    { turn: 119, text: 'VRS BEGINS HEAVY WEAPON WITHDRAWAL FROM SARAJEVO EXCLUSION ZONE', category: 'military' },

    // March 1994 (Turns 120-123)
    { turn: 120, text: 'WASHINGTON AGREEMENT SIGNED — CROAT-BOSNIAK FEDERATION ESTABLISHED', category: 'international' },
    { turn: 120, text: 'SCHINDLER\'S LIST WINS 7 ACADEMY AWARDS INCLUDING BEST PICTURE', category: 'world' },
    { turn: 121, text: 'HVO-ARBIH CEASEFIRE TAKES EFFECT — JOINT COMMAND STRUCTURES PLANNED', category: 'military' },
    { turn: 122, text: 'FEDERATION OF BOSNIA AND HERZEGOVINA FORMALLY CONSTITUTED', category: 'political' },
    { turn: 122, text: 'MICHAEL JORDAN ANNOUNCES BASEBALL CAREER — JOINS MINOR LEAGUES', category: 'world' },
    { turn: 123, text: 'GORAZDE COMES UNDER VRS ATTACK — SAFE AREA THREATENED', category: 'military' },

    // April 1994 (Turns 124-127)
    { turn: 124, text: 'VRS OFFENSIVE ON GORAZDE INTENSIFIES — UNPROFOR PERSONNEL TAKEN HOSTAGE', category: 'military' },
    { turn: 124, text: 'KURT COBAIN FOUND DEAD IN SEATTLE — NIRVANA FRONTMAN WAS 27', category: 'world' },
    { turn: 125, text: 'NATO LAUNCHES LIMITED AIR STRIKES NEAR GORAZDE', category: 'bih_international' },
    { turn: 126, text: 'RWANDAN GENOCIDE BEGINS — WORLD ATTENTION DIVERTED', category: 'world' },
    { turn: 126, text: 'AYRTON SENNA KILLED IN CRASH AT IMOLA GRAND PRIX', category: 'world' },
    { turn: 127, text: 'CONTACT GROUP FORMED — US, UK, FRANCE, GERMANY, RUSSIA', category: 'international' },

    // May 1994 (Turns 128-131)
    { turn: 128, text: 'CONTACT GROUP PRESENTS MAP DIVIDING BOSNIA 51-49', category: 'international' },
    { turn: 128, text: 'CHANNEL TUNNEL OPENS — BRITAIN AND FRANCE LINKED BY RAIL', category: 'world' },
    { turn: 129, text: 'NELSON MANDELA INAUGURATED AS PRESIDENT OF SOUTH AFRICA', category: 'world' },
    { turn: 130, text: 'FEDERATION FORCES BEGIN JOINT OPERATIONS IN CENTRAL BOSNIA', category: 'military' },
    { turn: 130, text: 'SEINFELD SEASON FINALE DRAWS 35 MILLION VIEWERS', category: 'world' },
    { turn: 131, text: 'UNPROFOR REINFORCEMENTS DEPLOY TO SAFE AREAS', category: 'bih_international' },

    // June 1994 (Turns 132-135)
    { turn: 132, text: 'CONTACT GROUP PLAN PRESENTED TO WARRING PARTIES', category: 'international' },
    { turn: 132, text: 'HOUSTON ROCKETS WIN NBA CHAMPIONSHIP — OLAJUWON NAMED MVP', category: 'world' },
    { turn: 133, text: 'FEDERATION ACCEPTS CONTACT GROUP MAP', category: 'political' },
    { turn: 133, text: 'O.J. SIMPSON SLOW-SPEED CHASE WATCHED BY 95 MILLION', category: 'world' },
    { turn: 134, text: 'USA HOSTS WORLD CUP — OPENING CEREMONIES IN CHICAGO', category: 'world' },
    { turn: 135, text: 'VRS DELAYS RESPONSE TO CONTACT GROUP PLAN', category: 'political' },

    // July 1994 (Turns 136-139)
    { turn: 136, text: 'BOSNIAN SERBS REJECT CONTACT GROUP PLAN', category: 'political' },
    { turn: 137, text: 'MILOSEVIC BREAKS WITH PALE — IMPOSES BLOCKADE ON REPUBLIKA SRPSKA', category: 'international' },
    { turn: 137, text: 'WOODSTOCK \'94 FESTIVAL DRAWS 350,000 — MARKS 25TH ANNIVERSARY', category: 'world' },
    { turn: 138, text: 'SERBIA CLOSES BORDER WITH RS — INTERNATIONAL MONITORS DEPLOYED', category: 'international' },
    { turn: 139, text: 'WORLD CUP FINAL: BRAZIL DEFEATS ITALY ON PENALTIES', category: 'world' },
    { turn: 139, text: 'MIGUEL INDURAIN WINS FOURTH STRAIGHT TOUR DE FRANCE', category: 'world' },

    // August 1994 (Turns 140-143)
    { turn: 140, text: 'SERBIA-RS BORDER CLOSURE PROVES POROUS — SMUGGLING CONTINUES', category: 'international' },
    { turn: 140, text: 'MAJOR LEAGUE BASEBALL PLAYERS GO ON STRIKE — SEASON IN DOUBT', category: 'world' },
    { turn: 141, text: 'ARBIH 5TH CORPS LAUNCHES OFFENSIVE FROM BIHAC POCKET', category: 'military' },
    { turn: 142, text: 'REPUBLIKA SRPSKA KRAJINA FORCES AID VRS IN BIHAC REGION', category: 'regional' },
    { turn: 143, text: 'NATO WARNS AGAINST CROSS-BORDER AGGRESSION FROM RSK INTO BIHAC', category: 'bih_international' },

    // September 1994 (Turns 144-147)
    { turn: 144, text: 'FIGHTING AROUND BIHAC POCKET INTENSIFIES', category: 'military' },
    { turn: 144, text: 'FRIENDS PREMIERES ON NBC — NEW YORK SITCOM DEBUTS', category: 'world' },
    { turn: 145, text: 'UN EASES SOME SANCTIONS ON SERBIA IN EXCHANGE FOR BORDER MONITORING', category: 'international' },
    { turn: 145, text: 'WORLD SERIES CANCELLED FOR FIRST TIME IN 90 YEARS — BASEBALL STRIKE CONTINUES', category: 'world' },
    { turn: 146, text: 'JIMMY CARTER VISITS PALE — NEGOTIATES WITH KARADZIC', category: 'international' },
    { turn: 147, text: 'CESSATION OF HOSTILITIES AGREEMENT SIGNED — 4-MONTH TRUCE', category: 'bih_international' },

    // October 1994 (Turns 148-151)
    { turn: 148, text: 'CEASEFIRE LARGELY HOLDS — SOME VIOLATIONS REPORTED', category: 'military' },
    { turn: 148, text: 'PULP FICTION PREMIERES — TARANTINO FILM TAKES PALME D\'OR', category: 'world' },
    { turn: 149, text: 'ARBIH 5TH CORPS CONTINUES PROBING ATTACKS FROM BIHAC', category: 'military' },
    { turn: 150, text: 'CONTACT GROUP CONSIDERS NEXT STEPS IF PEACE FAILS', category: 'international' },
    { turn: 151, text: 'US MID-TERM ELECTIONS — REPUBLICAN CONGRESS PRESSURES CLINTON ON BOSNIA', category: 'international' },

    // November 1994 (Turns 152-155)
    { turn: 152, text: 'BIHAC CRISIS — VRS AND RSK FORCES COUNTERATTACK 5TH CORPS', category: 'military' },
    { turn: 153, text: 'NATO STRIKES UDBINA AIRFIELD IN RSK KRAJINA', category: 'bih_international' },
    { turn: 153, text: 'SONY PLAYSTATION LAUNCHES IN JAPAN — NEW ERA OF GAMING', category: 'world' },
    { turn: 154, text: 'NATO STRIKES VRS AIR DEFENSES AROUND BIHAC', category: 'bih_international' },
    { turn: 155, text: 'VRS TAKES UNPROFOR HOSTAGES IN RESPONSE TO NATO STRIKES', category: 'bih_international' },
    { turn: 155, text: 'THE LION KING BECOMES HIGHEST-GROSSING ANIMATED FILM EVER', category: 'world' },

    // December 1994 (Turns 156-159)
    { turn: 156, text: 'JIMMY CARTER BROKERS CESSATION OF HOSTILITIES IN SARAJEVO', category: 'international' },
    { turn: 157, text: 'FOUR-MONTH CEASEFIRE TAKES EFFECT ON 1 JANUARY', category: 'bih_international' },
    { turn: 158, text: 'FIRST CHECHEN WAR BEGINS — RUSSIA INVADES CHECHNYA', category: 'world' },
    { turn: 159, text: 'RELIEF AGENCIES DELIVER AID TO BIHAC POCKET', category: 'humanitarian' },

    // January 1995 (Turns 160-163)
    { turn: 160, text: 'CARTER CEASEFIRE HOLDS — FRAGILE PEACE IN BOSNIA', category: 'bih_international' },
    { turn: 160, text: 'SAN FRANCISCO 49ERS WIN SUPER BOWL XXIX — STEVE YOUNG MVP', category: 'world' },
    { turn: 161, text: 'US DIPLOMAT RICHARD HOLBROOKE BEGINS SHUTTLE DIPLOMACY', category: 'international' },
    { turn: 162, text: 'EARTHQUAKE STRIKES KOBE JAPAN — OVER 6000 DEAD', category: 'world' },
    { turn: 163, text: 'CONTACT GROUP SEEKS FRAMEWORK FOR COMPREHENSIVE SETTLEMENT', category: 'international' },
    { turn: 163, text: 'MICHAEL JORDAN ANNOUNCES RETURN TO BASKETBALL — WEARS NUMBER 45', category: 'world' },

    // February 1995 (Turns 164-167)
    { turn: 164, text: 'UN PROTECTION FORCE MANDATE RENEWED — UNSCR 982', category: 'bih_international' },
    { turn: 165, text: 'CEASEFIRE VIOLATIONS INCREASE — BOTH SIDES REARM', category: 'military' },
    { turn: 166, text: 'NATO SECRETARY GENERAL WARNS OF RENEWED HOSTILITIES', category: 'international' },
    { turn: 167, text: 'RAPID REACTION FORCE CONCEPT PROPOSED FOR UNPROFOR', category: 'bih_international' },

    // March 1995 (Turns 168-171)
    { turn: 168, text: 'CARTER CEASEFIRE EXPIRES — FIGHTING RESUMES ACROSS BOSNIA', category: 'military' },
    { turn: 168, text: 'FORREST GUMP WINS 6 ACADEMY AWARDS INCLUDING BEST PICTURE', category: 'world' },
    { turn: 169, text: 'ARBIH LAUNCHES SPRING OFFENSIVES IN CENTRAL AND NE BOSNIA', category: 'military' },
    { turn: 170, text: 'FEDERATION FORCES COOPERATE IN OPERATIONS AGAINST VRS', category: 'military' },
    { turn: 170, text: 'MICHAEL JORDAN SCORES 55 IN FIFTH GAME BACK — I\'M BACK', category: 'world' },
    { turn: 171, text: 'SARIN GAS ATTACK ON TOKYO SUBWAY — AUM SHINRIKYO', category: 'world' },

    // April 1995 (Turns 172-175)
    { turn: 172, text: 'FIGHTING AROUND SARAJEVO RESUMES — SNIPING AND SHELLING', category: 'military' },
    { turn: 173, text: 'ALFRED P. MURRAH BUILDING BOMBING IN OKLAHOMA CITY', category: 'world' },
    { turn: 174, text: 'VRS SHELLS SAFE AREA OF TUZLA — 71 YOUNG PEOPLE KILLED', category: 'humanitarian' },
    { turn: 175, text: 'NATO AIR STRIKES ON VRS AMMUNITION DEPOT NEAR PALE', category: 'bih_international' },

    // May 1995 (Turns 176-179)
    { turn: 176, text: 'NATO STRIKES VRS TARGETS — VRS TAKES 370 UNPROFOR HOSTAGES', category: 'bih_international' },
    { turn: 177, text: 'UNPROFOR PEACEKEEPERS CHAINED TO MILITARY TARGETS AS HUMAN SHIELDS', category: 'bih_international' },
    { turn: 178, text: 'CROATIAN ARMY LAUNCHES OPERATION FLASH — RETAKES WESTERN SLAVONIA', category: 'regional' },
    { turn: 178, text: 'HOUSTON ROCKETS REPEAT AS NBA CHAMPIONS — SWEEP ORLANDO MAGIC', category: 'world' },
    { turn: 179, text: 'RAPID REACTION FORCE AUTHORIZED FOR BOSNIA — UNSCR 998', category: 'bih_international' },
    { turn: 179, text: 'BRAVEHEART PREMIERES — MEL GIBSON EPIC SET IN SCOTLAND', category: 'world' },

    // June 1995 (Turns 180-183)
    { turn: 180, text: 'HOSTAGE CRISIS ENDS — UNPROFOR PERSONNEL RELEASED', category: 'bih_international' },
    { turn: 181, text: 'RAPID REACTION FORCE DEPLOYS TO MOUNT IGMAN', category: 'bih_international' },
    { turn: 181, text: 'AJAX AMSTERDAM WINS CHAMPIONS LEAGUE — DUTCH FOOTBALL TRIUMPH', category: 'world' },
    { turn: 182, text: 'US CONTRIBUTES AC-130 GUNSHIPS TO RAPID REACTION FORCE', category: 'bih_international' },
    { turn: 183, text: 'VRS PREPARES OFFENSIVE OPERATIONS IN EASTERN BOSNIA', category: 'military' },
    { turn: 183, text: 'WINDOWS 95 HYPE BUILDS — MICROSOFT PREVIEWS NEW OPERATING SYSTEM', category: 'world' },

    // July 1995 (Turns 184-187)
    { turn: 184, text: 'VRS OVERRUNS SREBRENICA SAFE AREA — DUTCH BATTALION UNABLE TO RESIST', category: 'military', requiresEventId: 'srebrenica_falls_1995' },
    { turn: 185, text: 'SREBRENICA MASSACRE — OVER 8000 BOSNIAK MEN AND BOYS EXECUTED', category: 'humanitarian', requiresRuptureId: 'srebrenica_genocide_1995' },
    { turn: 186, text: 'VRS ATTACKS ZEPA SAFE AREA — ENCLAVE FALLS', category: 'military', requiresEventId: 'zepa_falls_1995' },
    { turn: 186, text: 'MIGUEL INDURAIN WINS FIFTH CONSECUTIVE TOUR DE FRANCE', category: 'world' },
    { turn: 187, text: 'LONDON CONFERENCE — NATO DRAWS LINE AT GORAZDE', category: 'bih_international' },

    // August 1995 (Turns 188-191)
    { turn: 188, text: 'OPERATION STORM — CROATIAN ARMY RETAKES SERBIAN KRAJINA IN 3 DAYS', category: 'regional' },
    { turn: 188, text: 'WINDOWS 95 LAUNCHES WORLDWIDE — ROLLING STONES SOUNDTRACK', category: 'world' },
    { turn: 189, text: '200,000 KRAJINA SERBS FLEE — LARGEST REFUGEE COLUMN IN EUROPE', category: 'regional' },
    { turn: 189, text: 'GRATEFUL DEAD FRONTMAN JERRY GARCIA DIES AT 53', category: 'world' },
    { turn: 190, text: 'SECOND MARKALE MASSACRE — 43 KILLED IN SARAJEVO MARKET', category: 'humanitarian' },
    { turn: 191, text: 'OPERATION DELIBERATE FORCE — NATO BEGINS SUSTAINED AIR CAMPAIGN AGAINST VRS', category: 'bih_international' },

    // September 1995 (Turns 192-195)
    { turn: 192, text: 'NATO BOMBING CONTINUES — VRS AIR DEFENSES DESTROYED', category: 'bih_international' },
    { turn: 192, text: 'EBAY FOUNDED — ONLINE AUCTION SITE LAUNCHES', category: 'world' },
    { turn: 193, text: 'FEDERATION AND HV FORCES LAUNCH GROUND OFFENSIVE IN WESTERN BOSNIA', category: 'military' },
    { turn: 194, text: 'VRS AGREES TO CONDITIONS — NATO HALTS BOMBING', category: 'bih_international' },
    { turn: 194, text: 'CAL RIPKEN JR. BREAKS LOU GEHRIG\'S CONSECUTIVE GAMES RECORD', category: 'world' },
    { turn: 195, text: 'FURTHER AGREED PRINCIPLES FOR PEACE SIGNED IN NEW YORK', category: 'international' },

    // October 1995 (Turns 196-199)
    { turn: 196, text: 'CEASEFIRE TAKES EFFECT ACROSS BOSNIA ON 12 OCTOBER', category: 'bih_international' },
    { turn: 196, text: 'O.J. SIMPSON FOUND NOT GUILTY — 150 MILLION WATCH VERDICT', category: 'world' },
    { turn: 197, text: 'FEDERATION OFFENSIVE HALTED AT 51% TERRITORY LINE', category: 'military' },
    { turn: 197, text: 'ATLANTA BRAVES WIN WORLD SERIES — FIRST TITLE SINCE 1957', category: 'world' },
    { turn: 198, text: 'PROXIMITY TALKS ANNOUNCED — DAYTON, OHIO', category: 'international' },
    { turn: 199, text: 'PARTIES PREPARE FOR PEACE NEGOTIATIONS', category: 'political' },

    // November 1995 (Turns 200-203)
    { turn: 200, text: 'DAYTON PEACE TALKS BEGIN — WRIGHT-PATTERSON AIR FORCE BASE', category: 'international' },
    { turn: 200, text: 'TOY STORY PREMIERES — FIRST FULLY COMPUTER-ANIMATED FEATURE FILM', category: 'world' },
    { turn: 201, text: 'INTENSE NEGOTIATIONS — HOLBROOKE PUSHES FOR AGREEMENT', category: 'international' },
    { turn: 202, text: 'TERRITORIAL DISPUTES AND SARAJEVO STATUS DOMINATE DAYTON TALKS', category: 'international' },
    { turn: 202, text: 'BEATLES RELEASE FREE AS A BIRD — FIRST NEW SINGLE IN 25 YEARS', category: 'world' },
    { turn: 203, text: 'DAYTON AGREEMENT REACHED ON 21 NOVEMBER — WAR ENDS', category: 'international' },

    // December 1995 (Turns 204-207)
    { turn: 204, text: 'DAYTON AGREEMENT FORMALLY SIGNED IN PARIS ON 14 DECEMBER', category: 'international' },
    { turn: 205, text: 'NATO DEPLOYS IFOR — 60,000 TROOPS TO ENFORCE PEACE', category: 'bih_international' },
    { turn: 205, text: 'GOLDENEYE OPENS IN CINEMAS — BOND IS BACK', category: 'world' },
    { turn: 206, text: 'UNPROFOR MANDATE ENDS — REPLACED BY NATO IFOR', category: 'bih_international' },
    { turn: 207, text: 'DEMILITARIZED ZONES ESTABLISHED ALONG ENTITY BOUNDARIES', category: 'military' },
    { turn: 207, text: 'CHICAGO BULLS BEGIN RECORD-BREAKING 72-WIN SEASON', category: 'world' },
];
