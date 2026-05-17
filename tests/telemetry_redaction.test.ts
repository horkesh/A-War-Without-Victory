import { describe, expect, it } from 'vitest';
import { redactCrashDiagnosticText } from '../src/ui/map/services/telemetry/telemetryRedaction';

describe('telemetry crash diagnostic redaction', () => {
    it('redacts local usernames and home paths from stack traces deterministically', () => {
        const rawStack = [
            'Error: failed',
            '    at loadSave (C:\\Users\\Ana Player\\Documents\\AWWV\\save.json:12:4)',
            '    at boot (file:///C:/Users/Ana Player/AppData/Local/AWWV/app.asar/main.js:2:1)',
            '    at render (/home/ana/awwv/src/ui/map/App.tsx:4:2)',
        ].join('\n');

        const once = redactCrashDiagnosticText(rawStack);
        const twice = redactCrashDiagnosticText(rawStack);

        expect(once).toBe(twice);
        expect(once).not.toContain('Ana Player');
        expect(once).not.toContain('/home/ana');
        expect(once).not.toContain('C:\\Users');
        expect(once).toContain('<redacted-user-path>');
    });

    it('removes raw save and scenario dump payload markers from diagnostic text', () => {
        const rawText = 'payload={"meta":{"scenario_id":"apr1992"},"political_controllers":{"S1":"RS"}} save_data={...}';

        const redacted = redactCrashDiagnosticText(rawText);

        expect(redacted).not.toContain('apr1992');
        expect(redacted).not.toContain('political_controllers');
        expect(redacted).toContain('<redacted-structured-payload>');
    });
});
