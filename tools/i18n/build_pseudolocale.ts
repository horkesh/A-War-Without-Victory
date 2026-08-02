#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { enMessages, type MessageKey } from '../../src/ui/map/i18n/messages.en.js';
import {
    buildPseudolocaleDictionary,
    getPseudolocaleExpansionProfile,
    pseudolocalizeMessage,
} from '../../src/ui/map/i18n/pseudolocalize.js';

export { getPseudolocaleExpansionProfile, pseudolocalizeMessage };

export function buildPseudolocale(
    messages: Readonly<Record<string, string>>,
): Record<string, string> {
    return buildPseudolocaleDictionary(messages);
}

export function serializePseudolocaleModule(messages: Readonly<Record<string, string>>): string {
    const ordered = buildPseudolocaleDictionary(messages);
    return [
        "import type { MessageKey } from './messages.en';",
        '',
        '// Deterministic generated preview. Run: tsx tools/i18n/build_pseudolocale.ts',
        `export const qpsMessages: Record<MessageKey, string> = ${JSON.stringify(ordered, null, 4)};`,
        '',
    ].join('\n');
}

function isMainModule(): boolean {
    const entry = process.argv[1];
    return entry != null && resolve(entry) === resolve(fileURLToPath(import.meta.url));
}

if (isMainModule()) {
    process.stdout.write(serializePseudolocaleModule(enMessages as Record<MessageKey, string>));
}
