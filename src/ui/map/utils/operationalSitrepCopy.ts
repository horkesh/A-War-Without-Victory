import type { OperationalSitrepCopyToken } from '../../shared/operational_sitrep_views.js';
import { t, type MessageKey } from '../i18n';

export function localizedOperationalSitrepCopy(
    token: OperationalSitrepCopyToken | undefined,
    fallback: string,
    params?: Record<string, string | number>,
): string {
    const localizedParams = Object.fromEntries(
        Object.entries(token?.paramKeys ?? {}).map(([name, key]) => [name, t(key as MessageKey)]),
    );
    return token ? t(token.key as MessageKey, { ...token.params, ...localizedParams, ...params }) : fallback;
}
