import { getInterfaceScale, setInterfaceScale, subscribeInterfaceScale } from './interfaceScalePreference';
interface SettingsBridge {
    getSettings: () => Promise<{
        ok: boolean;
        settings?: unknown;
    }>;
    saveSettings: (settings: unknown) => Promise<{
        ok: boolean;
    }>;
}
function settingsRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
/** Reuses the existing local-profile settings bridge across changing renderer origins. */
export function connectNativeInterfaceScale(bridge: SettingsBridge) {
    let disposed = false, hydrating = true, changed = false, applyingHydration = false;
    let tail = Promise.resolve();
    const persist = () => {
        const value = getInterfaceScale();
        tail = tail.then(async () => {
            if (disposed)
                return;
            try {
                const fresh = await bridge.getSettings();
                if (!disposed && fresh.ok && settingsRecord(fresh.settings))
                    await bridge.saveSettings({ ...fresh.settings, interfaceScale: value });
            }
            catch { /* Best effort: retain session/browser preference without replacing unknown native settings. */ }
        });
    };
    const unsubscribe = subscribeInterfaceScale(() => {
        if (applyingHydration || disposed) return;
        changed = true;
        if (!hydrating) persist();
    });
    const ready = (async () => {
        try {
            const result = await bridge.getSettings();
            if (!disposed && !changed && result.ok && settingsRecord(result.settings)) {
                applyingHydration = true;
                setInterfaceScale(result.settings.interfaceScale);
                applyingHydration = false;
            }
        }
        catch { /* Browser/session fallback survives an unavailable native profile. */ }
        finally {
            hydrating = false;
            if (!disposed && changed)
                persist();
        }
    })();
    return {
        ready,
        flush: async () => {
            await ready;
            await tail;
        },
        dispose: () => {
            disposed = true;
            unsubscribe();
        },
    };
}
