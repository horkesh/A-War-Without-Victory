export interface G2ForecastProps {
    friendlyPersonnel: number;
    friendlyTanks: number;
    friendlyArty: number;

    enemyPersonnel: number;
    enemyTanks: number;
    enemyArty: number;

    tempo: 'methodical' | 'standard' | 'all_out' | string;
    tolerance: 'decisive_victory' | 'victory' | 'costly_victory' | 'repulsed' | string;
    artilleryPrep: boolean;
    objectivesCount: number;

    commanderCompetence?: number; // 0 to 5
    commanderAggressiveness?: number; // 0 to 5
}

export interface G2ForecastResult {
    successOdds: number; // 0 to 100
    expectedCasualties: number; // raw number
    durationWeeks: number;
    supplyWarning: boolean;
    descriptor: string;
}

export function calculateG2Forecast(props: G2ForecastProps): G2ForecastResult {
    const fPower = props.friendlyPersonnel + (props.friendlyTanks * 60) + (props.friendlyArty * 40);
    // Base entrenched defensive multiplier is 1.5, assuming defenders have an advantage
    const ePower = (props.enemyPersonnel + (props.enemyTanks * 60) + (props.enemyArty * 40)) * 1.5;

    // Minimum power to avoid divide by zero
    const fPowerSafe = Math.max(1, fPower);
    const ePowerSafe = Math.max(1, ePower);

    let ratio = fPowerSafe / ePowerSafe;
    if (props.enemyPersonnel === 0) ratio = 10; // Unopposed

    if (props.artilleryPrep) {
        ratio *= 1.25; // arty prep gives 25% power boost to odds
    }

    let successOdds = 0;
    if (ratio >= 3) successOdds = 95;
    else if (ratio >= 2) successOdds = 80;
    else if (ratio >= 1.5) successOdds = 60;
    else if (ratio >= 1) successOdds = 40;
    else if (ratio >= 0.5) successOdds = 15;
    else successOdds = 5;

    // Adjust odds based on tempo
    if (props.tempo === 'all_out') successOdds = Math.min(99, successOdds + 15);
    if (props.tempo === 'methodical') successOdds = Math.max(1, successOdds - 10);

    // Casualties (base 2% of involved per objective, modified by tempo and tolerance)
    let casMod = 0.02 * props.objectivesCount;
    if (props.tempo === 'all_out') casMod *= 1.8;
    if (props.tempo === 'methodical') casMod *= 0.6;

    if (props.tolerance === 'repulsed') casMod *= 1.5; // willing to fight to the last
    if (props.tolerance === 'decisive_victory') casMod *= 0.5; // pull back early if failing

    // Commander Aggressiveness impacts casualties
    if (props.commanderAggressiveness !== undefined) {
        // High aggressiveness (5) = +30% casualties. Low aggressiveness (1) = -10% casualties
        casMod *= (1 + (props.commanderAggressiveness - 3) * 0.15);
    }

    const expectedCasualties = Math.round(props.friendlyPersonnel * casMod);

    // Duration
    // Base 1 week per objective
    let weeks = props.objectivesCount;
    if (props.tempo === 'all_out') weeks *= 0.6;
    if (props.tempo === 'methodical') weeks *= 1.5;
    if (props.artilleryPrep) weeks += 0.5; // takes time to prep

    // Commander Aggressiveness shrinks duration
    if (props.commanderAggressiveness !== undefined) {
        // Aggressive (5) cuts duration by 20%. Methodical (1) adds 20%.
        weeks *= (1 - (props.commanderAggressiveness - 3) * 0.1);
    }

    const durationWeeks = Math.max(1, Math.ceil(weeks));

    const supplyWarning = props.tempo === 'all_out' && props.friendlyPersonnel > 5000;

    let descriptor = 'Even Match';
    if (successOdds > 85) descriptor = 'Overwhelming';
    else if (successOdds > 65) descriptor = 'Favorable';
    else if (successOdds < 25) descriptor = 'Highly Risky';
    else if (successOdds < 45) descriptor = 'Disadvantageous';

    if (props.enemyPersonnel === 0 && props.objectivesCount > 0) {
        descriptor = 'Unopposed Advance';
    } else if (props.objectivesCount === 0) {
        descriptor = 'No Objectives';
        successOdds = 0;
    } else if (props.friendlyPersonnel === 0) {
        descriptor = 'No Forces Assigned';
        successOdds = 0;
    }

    return {
        successOdds,
        expectedCasualties,
        durationWeeks,
        supplyWarning,
        descriptor
    };
}
