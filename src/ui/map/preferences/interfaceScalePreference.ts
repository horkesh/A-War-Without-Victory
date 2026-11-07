import { useSyncExternalStore } from 'react';

export const INTERFACE_SCALE_STORAGE_KEY = 'awwv.interfaceScale';
export type InterfaceScale = 100 | 125 | 150;
export const INTERFACE_SCALES = [100, 125, 150] as const;

function browserStorage(): Storage | undefined {
    try {
        return typeof window === 'undefined' ? undefined : window.localStorage;
    } catch {
        return undefined;
    }
}

function sanitize(value: unknown): InterfaceScale {
    return value === 125 || value === '125' ? 125 : value === 150 || value === '150' ? 150 : 100;
}
export function readInterfaceScale(storage: Pick<Storage, 'getItem'> | undefined = browserStorage()): InterfaceScale {
    try {
        return sanitize(storage?.getItem(INTERFACE_SCALE_STORAGE_KEY));
    }
    catch {
        return 100;
    }
}
let current = readInterfaceScale();
const listeners = new Set<() => void>();
export function setInterfaceScale(value: unknown, storage: Pick<Storage, 'setItem'> | undefined = browserStorage()): InterfaceScale {
    current = sanitize(value);
    try {
        storage?.setItem(INTERFACE_SCALE_STORAGE_KEY, String(current));
    }
    catch { /* Keep this session usable when storage is denied. */ }
    listeners.forEach(listener => listener());
    return current;
}
export function subscribeInterfaceScale(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function getInterfaceScale(): InterfaceScale { return current; }
export function useInterfaceScale(): InterfaceScale {
    return useSyncExternalStore(subscribeInterfaceScale, getInterfaceScale, () => 100);
}
