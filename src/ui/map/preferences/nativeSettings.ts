export interface SettingsSaveOptions {
    merge: true;
    audioDefaults?: Record<string, unknown>;
}

export interface SettingsBridge {
    getSettings: () => Promise<{ ok: boolean; settings?: unknown }>;
    saveSettings: (settings: unknown, options?: SettingsSaveOptions) => Promise<{ ok: boolean }>;
}

export function settingsRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
