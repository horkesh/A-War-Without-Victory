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

function saveSettings(app, settings) {
    const filePath = getSettingsPath(app);
    if (!filePath) return false;
    try {
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch {
        return false;
    }
}

module.exports = { loadSettings, saveSettings, DEFAULT_SETTINGS };
