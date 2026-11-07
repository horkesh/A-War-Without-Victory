import React, { type ReactNode } from 'react';
import { useInterfaceScale } from './interfaceScalePreference';

/** A physical pixel island inside logical UI; cumulative transform is identity. */
export function PhysicalRendererSurface({ children }: { children?: ReactNode }) {
    const factor = useInterfaceScale() / 100;
    return (
        <div
            data-testid="physical-renderer-surface"
            data-physical-renderer-surface="true"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `calc(100% * ${factor})`,
                height: `calc(100% * ${factor})`,
                transform: `scale(${1 / factor})`,
                transformOrigin: 'top left',
            }}
        >
            {children}
        </div>
    );
}
