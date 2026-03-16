/**
 * Scenario registry: metadata for all available scenarios.
 * Used by the scenario selection UI and scenario runner.
 */

export type FactionDifficulty = 'easy' | 'medium' | 'hard';

export interface ScenarioEntry {
    /** Unique key matching scenario_id. */
    key: string;
    /** Human-readable name. */
    name: string;
    /** Short description for selection screen. */
    description: string;
    /** Historical start date string (e.g. "September 1991"). */
    startDate: string;
    /** Absolute week offset from the simulation epoch (week 0 = April 1992). */
    startWeek: number;
    /** Total weeks the scenario runs. */
    durationWeeks: number;
    /** Difficulty rating per faction. */
    difficulty: Record<string, FactionDifficulty>;
    /** Path to scenario JSON file relative to data/scenarios/. */
    scenarioFile: string;
    /** Whether the scenario is playable (false = coming soon / blocked on painted maps). */
    available: boolean;
}

/**
 * All registered scenarios in chronological order.
 */
export const SCENARIO_REGISTRY: ScenarioEntry[] = [
    {
        key: 'sep1991_to_dayton',
        name: 'Peace to War',
        description: 'Begin in the tense peace of late 1991. Navigate the political crisis, referendum, and JNA withdrawal before the war erupts in April 1992. Full campaign to Dayton.',
        startDate: 'September 1991',
        startWeek: -30,
        durationWeeks: 218,
        difficulty: { RBiH: 'hard', RS: 'medium', HRHB: 'hard' },
        scenarioFile: 'sep1991_to_dayton.json',
        available: true,
    },
    {
        key: 'apr1992_definitive_52w',
        name: 'The War Begins',
        description: 'April 1992: war erupts across Bosnia. Command your faction through the critical first year as front lines form, ethnic cleansing unfolds, and the international community watches.',
        startDate: 'April 1992',
        startWeek: 0,
        durationWeeks: 52,
        difficulty: { RBiH: 'hard', RS: 'easy', HRHB: 'medium' },
        scenarioFile: 'apr1992_definitive_52w.json',
        available: true,
    },
    {
        key: 'apr1992_definitive_40w',
        name: 'First 40 Weeks',
        description: 'Calibration scenario: the decisive opening 40 weeks of the war. Shorter format for testing strategies and learning the systems.',
        startDate: 'April 1992',
        startWeek: 0,
        durationWeeks: 40,
        difficulty: { RBiH: 'hard', RS: 'easy', HRHB: 'medium' },
        scenarioFile: 'apr1992_definitive_40w.json',
        available: true,
    },
    {
        key: 'jan1993_to_dayton',
        name: 'Mid-War: Shifting Alliances',
        description: 'January 1993: the front lines have stabilized. The RBiH-HVO alliance fractures, enclaves are besieged, and international pressure mounts. Navigate the war to Dayton.',
        startDate: 'January 1993',
        startWeek: 39,
        durationWeeks: 149,
        difficulty: { RBiH: 'hard', RS: 'medium', HRHB: 'hard' },
        scenarioFile: 'jan1993_to_dayton.json',
        available: true,
    },
    {
        key: 'mar1994_washington_to_dayton',
        name: 'Washington to Dayton',
        description: 'March 1994: the Washington Agreement unites RBiH and HRHB against RS. Can the Federation turn the tide? Requires painted control maps.',
        startDate: 'March 1994',
        startWeek: 100,
        durationWeeks: 88,
        difficulty: { RBiH: 'medium', RS: 'hard', HRHB: 'medium' },
        scenarioFile: '',
        available: false,
    },
    {
        key: 'jan1995_endgame',
        name: 'Endgame: 1995',
        description: 'January 1995: Srebrenica looms, Operation Storm approaches, and NATO intervention is imminent. The final act of the war. Requires painted control maps.',
        startDate: 'January 1995',
        startWeek: 144,
        durationWeeks: 44,
        difficulty: { RBiH: 'medium', RS: 'hard', HRHB: 'easy' },
        scenarioFile: '',
        available: false,
    },
];

/** Look up a scenario entry by key. */
export function getScenarioEntry(key: string): ScenarioEntry | undefined {
    return SCENARIO_REGISTRY.find(e => e.key === key);
}

/** Get all available (playable) scenarios. */
export function getAvailableScenarios(): ScenarioEntry[] {
    return SCENARIO_REGISTRY.filter(e => e.available);
}
