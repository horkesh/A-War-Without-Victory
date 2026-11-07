import { getInterfaceScale, setInterfaceScale, subscribeInterfaceScale } from './interfaceScalePreference';
import { settingsRecord, type SettingsBridge } from './nativeSettings';
/** Reuses the existing local-profile settings bridge across changing renderer origins. */
export function connectNativeInterfaceScale(bridge: SettingsBridge) {
    let disposed = false, hydrating = true, changed = false, applyingHydration = false;
    let tail = Promise.resolve();
    const persist = () => {
        const value = getInterfaceScale();
        tail = tail.then(async () => {
            if (!disposed) await bridge.saveSettings({ interfaceScale: value }, { merge: true });
        }).catch(() => { /* Keep the browser/session choice on failure. */ });
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
