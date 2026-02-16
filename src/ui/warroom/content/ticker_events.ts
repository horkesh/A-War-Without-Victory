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
  category?: 'international' | 'military' | 'political' | 'humanitarian';
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
];
