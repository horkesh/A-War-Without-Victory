/**
 * War Headline Templates — picks the best newspaper headline from TurnEvents.
 *
 * Used during Peace phase / War phase to generate faction-framed war communiques.
 * Priority ordering follows the TurnEvent priority field (lower = more important).
 *
 * Fog framing: own losses downplayed, enemy losses inflated,
 * own territorial losses euphemized as "tactical repositioning".
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import type { FactionId } from '../../../state/game_state.js';
import type { TurnEvent } from '../data/turn_event_generator.js';
import { turnToDateString } from '../components/warroom_utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WarHeadline {
    headline: string;
    subhead: string;
    body: string;
    photoCaption: string;
}

// ---------------------------------------------------------------------------
// Faction display helpers
// ---------------------------------------------------------------------------

const FACTION_SHORT_NAMES: Record<string, string> = {
    RBiH: 'Bosnian forces',
    RS: 'Serbian forces',
    HRHB: 'Croatian forces',
};

function ownLabel(_pf: FactionId): string {
    return 'our forces';
}

function factionShort(fid: FactionId): string {
    return FACTION_SHORT_NAMES[fid] ?? fid;
}

// ---------------------------------------------------------------------------
// Individual headline generators by event type
// ---------------------------------------------------------------------------

function headlineForMultiFlipSummary(event: TurnEvent, pf: FactionId): WarHeadline {
    const d = event.details as { ownGains: number; ownLosses: number; totalFlips: number };
    const { ownGains, ownLosses, totalFlips } = d;

    if (ownLosses > ownGains) {
        return {
            headline: 'ENEMY FORCES ADVANCE ON MULTIPLE FRONTS',
            subhead: `${totalFlips} positions change hands as fighting intensifies`,
            body: `Heavy fighting across multiple sectors has resulted in a significant shift in the front lines. `
                + `Our forces conducted tactical repositioning in ${ownLosses} areas while reclaiming ${ownGains} positions. `
                + `Command has ordered reinforcements to stabilize the situation.`,
            photoCaption: 'Soldiers take cover during an artillery exchange near the front line',
        };
    }
    return {
        headline: 'OUR FORCES LIBERATE MULTIPLE POSITIONS',
        subhead: `Successful operations across ${totalFlips} sectors`,
        body: `In a coordinated series of operations, ${ownLabel(pf)} have secured control of ${ownGains} positions. `
            + `Enemy resistance was overcome despite fierce opposition. `
            + `Military command reports that momentum remains with our side.`,
        photoCaption: 'Troops advance through recently secured territory',
    };
}

function headlineForCeasefire(_event: TurnEvent, _pf: FactionId): WarHeadline {
    return {
        headline: 'CEASEFIRE DECLARED BETWEEN ALLIED FORCES',
        subhead: 'Guns fall silent as diplomatic efforts yield result',
        body: `A ceasefire has been declared, halting hostilities between previously allied factions. `
            + `International mediators have brokered the agreement after weeks of negotiations. `
            + `Both sides have agreed to maintain current positions pending further talks.`,
        photoCaption: 'Negotiators shake hands following the ceasefire announcement',
    };
}

function headlineForWashington(_event: TurnEvent, _pf: FactionId): WarHeadline {
    return {
        headline: 'WASHINGTON AGREEMENT SIGNED',
        subhead: 'Historic accord reshapes the political landscape',
        body: `The Washington Agreement has been formally signed, establishing a new framework `
            + `for cooperation between Bosniak and Croat political leadership. `
            + `The agreement creates a federation structure intended to end hostilities between the two sides.`,
        photoCaption: 'Officials sign the Washington Agreement at the ceremony',
    };
}

function headlineForAllianceWar(_event: TurnEvent, _pf: FactionId): WarHeadline {
    return {
        headline: 'WAR BETWEEN ALLIES \u2014 ALLIANCE COLLAPSES',
        subhead: 'Former partners turn weapons on each other',
        body: `The alliance between Bosniak and Croat forces has collapsed entirely. `
            + `Armed clashes have erupted between previously cooperating units across shared territory. `
            + `This dramatic escalation opens a new front in an already devastating conflict.`,
        photoCaption: 'Smoke rises from positions along the newly formed front line',
    };
}

function headlineForBattleCasualties(event: TurnEvent, pf: FactionId): WarHeadline {
    const d = event.details as { deltaKilled: number; deltaWounded: number; totalKilled: number };
    const isOwn = event.faction === pf;

    if (isOwn) {
        return {
            headline: 'HEAVY FIGHTING REPORTED ALONG FRONT LINES',
            subhead: 'Our defenders hold firm despite enemy pressure',
            body: `Intense combat operations have been reported across active sectors. `
                + `Our forces sustained casualties during defensive operations but maintained all key positions. `
                + `Enemy forces suffered significantly heavier losses in their failed attempts to break through.`,
            photoCaption: 'Medics tend to wounded soldiers at a field hospital',
        };
    }
    return {
        headline: 'ENEMY SUFFERS SIGNIFICANT LOSSES IN COMBAT',
        subhead: `${factionShort(event.faction)} take heavy casualties in failed operations`,
        body: `Intelligence reports confirm that ${factionShort(event.faction)} have suffered ${d.deltaKilled} killed `
            + `and ${d.deltaWounded} wounded in recent engagements. `
            + `Our forces inflicted severe damage on attacking formations while maintaining defensive positions.`,
        photoCaption: 'Destroyed enemy equipment along the front line',
    };
}

function headlineForDisplacement(event: TurnEvent, pf: FactionId): WarHeadline {
    const munId = event.municipality ?? 'the region';
    const displayMun = munId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return {
        headline: `POPULATION DISPLACEMENT REPORTED IN ${displayMun.toUpperCase()}`,
        subhead: 'Civilian population forced to flee as control shifts',
        body: `Reports indicate significant population displacement in the ${displayMun} area `
            + `following changes in territorial control. Civilians are seeking safety in areas `
            + `under stable administration. Humanitarian organizations are responding to the crisis.`,
        photoCaption: 'Refugees move along a road with their belongings',
    };
}

function headlineForAllianceDeteriorating(_event: TurnEvent, _pf: FactionId): WarHeadline {
    return {
        headline: 'ALLIANCE UNDER STRAIN \u2014 TENSIONS ESCALATE',
        subhead: 'Relations between Bosniak and Croat leadership worsen',
        body: `The Bosniak-Croat alliance continues to deteriorate as mutual distrust grows. `
            + `Competing territorial claims and diverging war aims are driving a wedge between the partners. `
            + `Observers warn that a breakdown in cooperation could have devastating consequences.`,
        photoCaption: 'Political leaders leave negotiations without agreement',
    };
}

function headlineForExhaustion(event: TurnEvent, pf: FactionId): WarHeadline {
    const d = event.details as { milestone: number; level: number };
    const isOwn = event.faction === pf;
    const milestoneStr = `${d.milestone}%`;

    if (isOwn) {
        return {
            headline: `FORCES APPROACHING BREAKING POINT AT ${milestoneStr}`,
            subhead: 'Exhaustion mounts as the war grinds on',
            body: `Prolonged combat operations have pushed our forces to ${milestoneStr} exhaustion. `
                + `Reserves are stretched thin and replacement personnel are increasingly difficult to find. `
                + `Command urges discipline and endurance as the situation demands continued sacrifice.`,
            photoCaption: 'Exhausted soldiers rest between defensive rotations',
        };
    }
    return {
        headline: `ENEMY FORCES REACHING BREAKING POINT`,
        subhead: `${factionShort(event.faction)} exhaustion reaches critical levels`,
        body: `Intelligence confirms that ${factionShort(event.faction)} are experiencing severe exhaustion `
            + `with combat effectiveness at ${milestoneStr} degradation. `
            + `Desertion rates are climbing and morale is collapsing among enemy units.`,
        photoCaption: 'Abandoned enemy positions along the front',
    };
}

function headlineForSustainabilityCollapse(event: TurnEvent, pf: FactionId): WarHeadline {
    const munId = event.municipality ?? 'the region';
    const displayMun = munId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const isOwn = event.faction === pf;

    if (isOwn) {
        return {
            headline: `SUPPLY CRISIS IN ${displayMun.toUpperCase()}`,
            subhead: 'Local sustainability collapses under war pressure',
            body: `The municipality of ${displayMun} has reached a sustainability crisis. `
                + `Essential supplies have been exhausted and civilian infrastructure can no longer support the population. `
                + `Urgent relief measures are being organized to prevent a humanitarian catastrophe.`,
            photoCaption: 'Empty market stalls in the besieged municipality',
        };
    }
    return {
        headline: 'ENEMY SUPPLY LINES DISRUPTED',
        subhead: `Sustainability collapse reported in enemy-held ${displayMun}`,
        body: `Reports indicate that ${factionShort(event.faction)}-controlled ${displayMun} has experienced `
            + `a complete sustainability collapse. Enemy forces in the area face severe supply shortages. `
            + `Our operations have successfully degraded the enemy's ability to sustain their positions.`,
        photoCaption: 'Smoke rises from a disrupted supply route',
    };
}

function headlineForControlFlip(event: TurnEvent, pf: FactionId): WarHeadline {
    const d = event.details as { from: string | null; to: string | null; isOwnGain: boolean; isOwnLoss: boolean };

    if (d.isOwnLoss) {
        return {
            headline: 'TACTICAL REPOSITIONING ALONG FRONT LINE',
            subhead: 'Our forces consolidate to stronger positions',
            body: `Following a period of heavy fighting, our forces have executed a planned withdrawal `
                + `to more defensible positions. The repositioning was carried out in good order. `
                + `Command assures that overall strategic objectives remain on track.`,
            photoCaption: 'Troops reorganize at newly established defensive positions',
        };
    }
    if (d.isOwnGain) {
        return {
            headline: 'OUR FORCES SECURE KEY POSITION',
            subhead: 'Successful operation extends area of control',
            body: `In a decisive operation, ${ownLabel(pf)} have secured control of a strategically important position. `
                + `Enemy resistance was neutralized after sustained pressure. `
                + `The captured territory strengthens our overall defensive posture.`,
            photoCaption: 'Our flag raised over the newly secured position',
        };
    }
    // Third-party flip
    return {
        headline: 'FRONT LINE SHIFTS IN NEIGHBORING SECTOR',
        subhead: `${factionShort(d.to ?? 'Unknown')} advance against ${factionShort(d.from ?? 'Unknown')}`,
        body: `Fighting between other factions has resulted in territorial changes in a neighboring sector. `
            + `Our intelligence is monitoring the situation for potential implications to our positions. `
            + `Command advises vigilance along adjacent sectors.`,
        photoCaption: 'Observers monitor developments along the shifting front line',
    };
}

// ---------------------------------------------------------------------------
// Main entry points
// ---------------------------------------------------------------------------

/**
 * Pick the best war headline from turn events.
 *
 * Priority order (events arrive pre-sorted by priority):
 * P0: Multi-flip summary (3+ control flips) or ceasefire/washington/alliance-war
 * P1: Ceasefire/Washington
 * P2: Highest-casualty battle
 * P3: Hostile takeover displacement
 * P4: Alliance deteriorating
 * P5: Exhaustion milestone
 * P6: Sustainability collapse
 * P7: Generic fallback (handled by fallbackWarHeadline)
 *
 * The function iterates events in priority order and returns the first
 * headline it can generate. If no events match, returns null so the caller
 * can use fallbackWarHeadline.
 */
export function pickBestWarHeadline(
    events: TurnEvent[],
    playerFaction: FactionId,
    turn: number,
): WarHeadline | null {
    if (events.length === 0) return null;

    // Events are already sorted by priority (lower = more important).
    // Walk through and return the first match.
    for (const ev of events) {
        switch (ev.type) {
            case 'control_flip': {
                const d = ev.details as Record<string, unknown>;
                if (d.summary === true) {
                    return headlineForMultiFlipSummary(ev, playerFaction);
                }
                // Individual control flips are lower priority; skip if something better exists
                // We'll handle them in a second pass below
                break;
            }
            case 'ceasefire_started':
                return headlineForCeasefire(ev, playerFaction);
            case 'washington_signed':
                return headlineForWashington(ev, playerFaction);
            case 'alliance_change': {
                const d = ev.details as Record<string, unknown>;
                if (d.allianceWar === true) {
                    return headlineForAllianceWar(ev, playerFaction);
                }
                if (d.direction === 'deteriorating') {
                    return headlineForAllianceDeteriorating(ev, playerFaction);
                }
                break;
            }
            case 'battle_casualties':
                return headlineForBattleCasualties(ev, playerFaction);
            case 'displacement':
                return headlineForDisplacement(ev, playerFaction);
            case 'exhaustion_milestone':
                return headlineForExhaustion(ev, playerFaction);
            case 'sustainability_collapse':
                return headlineForSustainabilityCollapse(ev, playerFaction);
            default:
                // formation_created, civilian_casualties, encirclement — not headline-worthy on their own
                break;
        }
    }

    // Second pass: individual control flips (lower priority than everything above)
    for (const ev of events) {
        if (ev.type === 'control_flip') {
            const d = ev.details as Record<string, unknown>;
            if (d.summary !== true) {
                return headlineForControlFlip(ev, playerFaction);
            }
        }
    }

    return null;
}

/**
 * Fallback headline when no TurnEvents produce a match.
 * Used for quiet turns with no significant events.
 */
export function fallbackWarHeadline(turn: number, playerFaction: FactionId): WarHeadline {
    const dateLabel = turnToDateString(turn);
    return {
        headline: 'FRONT LINES HOLD \u2014 WAR OF ATTRITION CONTINUES',
        subhead: `No major changes reported along the front as of ${dateLabel}`,
        body: `The general military situation remains largely unchanged this week. `
            + `Sporadic exchanges of fire continue along established positions but no significant `
            + `territorial shifts have occurred. Both sides are consolidating and resupplying.`,
        photoCaption: 'Sentries maintain watch along the quiet front line',
    };
}
