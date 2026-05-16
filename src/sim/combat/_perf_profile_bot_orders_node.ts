import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { stableStringify } from '../../utils/stable_json.js';
import {
    buildBotOrdersPerfSnapshot,
    isBotOrdersPerfEnabled,
} from './_perf_profile_bot_orders.js';

export function defaultBotOrdersPerfProfilePath(): string {
    return join(process.cwd(), 'data', 'derived', '_debug', 'bot_orders_perf_profile.json');
}

export function dumpBotOrdersPerfProfile(outPath = defaultBotOrdersPerfProfilePath()): string | null {
    if (!isBotOrdersPerfEnabled()) return null;
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, stableStringify(buildBotOrdersPerfSnapshot(), 2) + '\n', 'utf8');
    return outPath;
}
