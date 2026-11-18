/**
 * Every event catalog file reaches every surface that reads event definitions. A red-team note (2026-11-17) said DataLoader
 * skipped `war_1992_hrhb_summer.json`, so those five events' definitions would never reach the UI. On the current tree every
 * consumer lists it; this list-driven guard keeps it that way and makes a sixth file (or a dropped one) fail loudly.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { withoutComments } from '../helpers/sourceComments';

const EVENTS_DIR = 'data/scenarios/events';
const FILES = readdirSync(EVENTS_DIR).filter((name) => name.endsWith('.json')).sort();
const WAR_FILES = FILES.filter((name) => name.startsWith('war_'));

/** Consumers that must read every war_* catalog file (browser loaders, the Electron main process, and the read models). */
const WAR_CONSUMERS = [
    'src/ui/map/data/DataLoader.ts',
    'src/desktop/electron-main.cjs',
    'src/ui/map/data/GameStateAdapter.ts',
    'src/ui/map/data/eventDisplayCopy.ts',
    'src/ui/map/data/eventAudience.ts',
    'src/ui/map/data/verdictDecisions.ts',
    'src/ui/map/data/distanceFromHistory.ts',
    'src/ui/map/data/dilemmaSpine.ts',
    'src/sim/events/event_loader.ts',
] as const;

/** Consumers that must also read the consequence notices (csq_*), which fire as acknowledgement notices. */
const CONSEQUENCE_CONSUMERS = [
    'src/ui/map/data/DataLoader.ts',
    'src/desktop/electron-main.cjs',
    'src/ui/map/data/eventDisplayCopy.ts',
    'src/ui/map/data/eventAudience.ts',
    'src/ui/map/data/verdictDecisions.ts',
    'src/ui/map/data/distanceFromHistory.ts',
    'src/sim/events/event_loader.ts',
] as const;

const source = (path: string) => withoutComments(readFileSync(path, 'utf8'));

describe('event catalog files reach every consumer', () => {
    it('the catalog directory holds only the war_* files and consequences.json (a new file must be added to the consumers and this list)', () => {
        expect(FILES.filter((name) => !name.startsWith('war_') && name !== 'consequences.json')).toEqual([]);
        expect(WAR_FILES).toContain('war_1992_hrhb_summer.json');
        expect(WAR_FILES.length).toBeGreaterThanOrEqual(5);
    });

    for (const consumer of WAR_CONSUMERS) {
        it(`${consumer} reads every war_* event file, hrhb_summer included`, () => {
            const text = source(consumer);
            for (const file of WAR_FILES) expect(text, `${consumer} must reference ${file}`).toContain(file);
        });
    }

    for (const consumer of CONSEQUENCE_CONSUMERS) {
        it(`${consumer} reads consequences.json`, () => {
            expect(source(consumer), consumer).toContain('consequences.json');
        });
    }

    it('DataLoader lists the hrhb_summer file in BOTH of its event loaders (the trimmed view and the full catalog)', () => {
        const text = source('src/ui/map/data/DataLoader.ts');
        expect(text.split("'/data/scenarios/events/war_1992_hrhb_summer.json',").length - 1).toBe(2);
    });
});
