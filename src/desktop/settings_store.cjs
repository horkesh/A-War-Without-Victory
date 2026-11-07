/**
 * Settings persistence — reads/writes settings.json in Electron userData directory.
 * Deterministic defaults, no encryption — player-editable JSON file.
 */
const path = require('path');
const fs = require('fs');

const DEFAULT_SETTINGS = {
    turnConfirmation: true,
    fogOfWarDefault: true,
    mapQuality: 'medium',
    colorblindMode: false,
    masterVolume: 0.8,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    debugMode: false,
};

let settingsPath = null;

function getSettingsPath(app) {
    if (!settingsPath && app) {
        settingsPath = path.join(app.getPath('userData'), 'settings.json');
    }
    return settingsPath;
}

function loadSettings(app) {
    const filePath = getSettingsPath(app);
    if (!filePath) return { ...DEFAULT_SETTINGS };
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch {
        // Corrupted settings file — use defaults
    }
    return { ...DEFAULT_SETTINGS };
}

function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function saveSettings(app, settings, options) {
    const filePath = getSettingsPath(app);
    if (!filePath) return false;
    try {
        let next = settings;
        if (options?.merge === true) {
            if (!isRecord(settings)) return false;
            // Keep this read and write synchronous in main so separate windows share one merge.
            const current = loadSettings(app);
            next = { ...current, ...settings };
            if (isRecord(settings.audioPreferences)) {
                const existingAudio = isRecord(current.audioPreferences)
                    ? current.audioPreferences
                    : options.audioDefaults;
                next.audioPreferences = {
                    ...(isRecord(existingAudio) ? existingAudio : {}),
                    ...settings.audioPreferences,
                };
            }
        }
        fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf8');
        return true;
    } catch {
        return false;
    }
}

module.exports = { loadSettings, saveSettings, DEFAULT_SETTINGS };
