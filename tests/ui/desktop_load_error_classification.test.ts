/**
 * Proof tests for desktop load error classification.
 *
 * Verifies that the classifyLoadError helper in electron-main.cjs
 * produces player-facing error messages for common failure modes.
 *
 * Since classifyLoadError is embedded in a CJS Electron entry point,
 * we replicate its logic here rather than requiring the Electron module.
 * The source of truth is src/desktop/electron-main.cjs — if the
 * classification logic changes there, these tests must be updated.
 */

import { describe, it, expect } from 'vitest';

// Replicate classifyLoadError from electron-main.cjs for testability.
// This is a deliberate inline copy — the alternative is requiring the
// Electron main process module, which needs the Electron runtime.
function classifyLoadError(e: { message?: string } | string): string {
    const raw = typeof e === 'string' ? e : (e.message || String(e));
    if (raw.includes('Unexpected token') || raw.includes('JSON')) {
        return 'Save file is damaged or not valid JSON. ' + raw;
    }
    if (raw.includes('shape validation failed') || raw.includes('unexpected top-level key')) {
        return 'Save file structure is incompatible with this version. ' + raw;
    }
    if (raw.includes('missing meta') || raw.includes('meta.turn')) {
        return 'Save file is missing required game data (no meta block). ' + raw;
    }
    if (raw.includes('Unsupported schema_version')) {
        return 'Save file was created by a newer version and cannot be loaded. ' + raw;
    }
    if (raw.includes('missing military block')) {
        return 'Save file is missing required military data. ' + raw;
    }
    if (raw.includes('validation') || raw.includes('error')) {
        return 'Save file failed validation. ' + raw;
    }
    return 'Failed to load save file. ' + raw;
}

describe('classifyLoadError — player-facing error messages', () => {

    it('classifies JSON parse errors', () => {
        const result = classifyLoadError({ message: 'Unexpected token < in JSON at position 0' });
        expect(result).toMatch(/^Save file is damaged or not valid JSON\./);
        expect(result).toContain('Unexpected token');
    });

    it('classifies shape validation errors', () => {
        const result = classifyLoadError({ message: 'serializeGameState: shape validation failed: foo' });
        expect(result).toMatch(/^Save file structure is incompatible/);
    });

    it('classifies unexpected top-level key errors', () => {
        const result = classifyLoadError({ message: 'serializeGameState: unexpected top-level key "state"' });
        expect(result).toMatch(/^Save file structure is incompatible/);
    });

    it('classifies missing meta errors', () => {
        const result = classifyLoadError({ message: 'Invalid game state: missing meta.' });
        expect(result).toMatch(/^Save file is missing required game data/);
    });

    it('classifies meta.turn errors', () => {
        const result = classifyLoadError({ message: 'Invalid game state: meta.turn must be a number' });
        expect(result).toMatch(/^Save file is missing required game data/);
    });

    it('classifies unsupported schema version', () => {
        const result = classifyLoadError({ message: 'Unsupported schema_version 999' });
        expect(result).toMatch(/^Save file was created by a newer version/);
    });

    it('classifies missing military block', () => {
        const result = classifyLoadError({ message: 'Cannot migrate: missing military block' });
        expect(result).toMatch(/^Save file is missing required military data/);
    });

    it('classifies generic validation errors', () => {
        const result = classifyLoadError({ message: 'State failed validation after deserialize: some error details' });
        expect(result).toMatch(/^Save file failed validation\./);
    });

    it('falls back to generic message for unknown errors', () => {
        const result = classifyLoadError({ message: 'ENOENT: no such file' });
        expect(result).toMatch(/^Failed to load save file\./);
        expect(result).toContain('ENOENT');
    });

    it('preserves the raw error message for debugging', () => {
        const raw = 'Unexpected token x in JSON at position 42';
        const result = classifyLoadError({ message: raw });
        expect(result).toContain(raw);
    });
});
