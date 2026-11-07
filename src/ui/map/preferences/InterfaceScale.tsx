import React, { useEffect, type CSSProperties, type ReactNode } from 'react';
import { INTERFACE_SCALES, setInterfaceScale, useInterfaceScale } from './interfaceScalePreference';
import { t, useLocale } from '../i18n';
import { useIPC } from '../desktop/useIPC';
import { connectNativeInterfaceScale } from './nativeInterfaceScale';
import { Z } from '../../shared/zIndex';
/** The retained map/Deck/minimap owner must remain a sibling outside this layer. */
export function InterfaceScaleLayer({ children }: {
    children?: ReactNode;
}) {
    const scale = useInterfaceScale() / 100;
    const ipc = useIPC();
    useEffect(() => {
        if (!ipc.isAvailable) return;
        const connection = connectNativeInterfaceScale(ipc);
        return connection.dispose;
    }, [ipc]);

    const style = {
        zIndex: Z.TOOLBAR,
        transform: `scale(${scale})`,
        width: `calc(100% / ${scale})`,
        height: `calc(100% / ${scale})`,
        '--interface-scale': scale,
        '--interface-viewport-height': `calc(100vh / ${scale})`,
        '--interface-viewport-width': `calc(100vw / ${scale})`,
    } as CSSProperties;

    return (
        <div data-testid="interface-scale-layer" className="interface-scale-layer" style={style}>
            {children}
            <div data-interface-portal-root="" />
        </div>
    );
}
export function InterfaceScaleSettings() {
    useLocale();
    const scale = useInterfaceScale();
    return (
        <div className="interface-scale-settings">
            <label htmlFor="interface-scale-select">{t('interfaceScale.label')}</label>
            <p>{t('interfaceScale.description')}</p>
            <div className="flex flex-wrap gap-2">
                <select
                    id="interface-scale-select"
                    aria-label={t('interfaceScale.label')}
                    value={scale}
                    onChange={event => setInterfaceScale(event.target.value)}
                >
                    {INTERFACE_SCALES.map(value => <option key={value} value={value}>{value}%</option>)}
                </select>
                <button type="button" onClick={() => setInterfaceScale(100)}>
                    {t('interfaceScale.reset')}
                </button>
            </div>
        </div>
    );
}
