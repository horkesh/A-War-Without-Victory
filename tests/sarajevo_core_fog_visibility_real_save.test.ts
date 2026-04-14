import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter';

const ROOT = process.cwd();
const FINAL_SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const SARAJEVO_CORE_OSID = 'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo';

describe('Sarajevo core fog visibility from real save', () => {
    it('keeps Sarajevo Dio - Novi Grad Sarajevo visible for RS player view when it is a live frontline settlement', () => {
        const state = JSON.parse(fs.readFileSync(FINAL_SAVE_PATH, 'utf8')) as Record<string, unknown>;
        const meta = (state.meta ?? {}) as Record<string, unknown>;
        state.meta = { ...meta, player_faction: 'RS' };

        const loaded = parseGameState(state);

        expect(loaded.player_faction).toBe('RS');
        expect(loaded.fogOfWar?.visibleEnemyOsids ?? []).toContain(SARAJEVO_CORE_OSID);
    });
});
