// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { InterfaceScaleLayer } from '../../src/ui/map/preferences/InterfaceScale';
import { PhysicalRendererSurface } from '../../src/ui/map/preferences/PhysicalRendererSurface';
import { setInterfaceScale } from '../../src/ui/map/preferences/interfaceScalePreference';
import { OnboardingOverlay } from '../../src/ui/map/components/onboarding/OnboardingOverlay';

afterEach(() => { cleanup(); setInterfaceScale(100); document.querySelector('[data-tutorial-step="map-container"]')?.remove(); });

it('converts physical tutorial geometry into the owning logical viewport and remeasures on preset change', () => {
    const target = document.createElement('div');
    target.dataset.tutorialStep = 'map-container';
    target.getBoundingClientRect = () => ({ left: 150, top: 150, width: 600, height: 300, right: 750, bottom: 450, x: 150, y: 150, toJSON: () => ({}) });
    document.body.append(target);
    setInterfaceScale(150);
    const view = render(React.createElement(InterfaceScaleLayer, {}, React.createElement(OnboardingOverlay, {
        tutorialState: { dismissed: false, completed_steps: ['01_welcome'] }, ipc: null,
    })));
    const spotlight = view.getByTestId('onboarding-spotlight');
    expect(spotlight.style.left).toBe('88px');
    expect(spotlight.style.width).toBe('424px');
    act(() => setInterfaceScale(125));
    expect(spotlight.style.left).toBe('108px');
    expect(spotlight.style.width).toBe('504px');
});

it('cancels the interface transform only around physical renderers without remounting canvas', () => {
    const view = render(React.createElement(InterfaceScaleLayer, {}, React.createElement(PhysicalRendererSurface, {}, React.createElement('canvas', { 'data-testid': 'nested-map' }))));
    const canvas = view.getByTestId('nested-map');
    act(() => setInterfaceScale(150));
    const surface = view.getByTestId('physical-renderer-surface');
    expect(surface.style.transform).toBe(`scale(${1 / 1.5})`);
    expect(surface.style.width).toBe('calc(150%)');
    expect(view.getByTestId('nested-map')).toBe(canvas);
    act(() => setInterfaceScale(100));
    expect(surface.style.transform).toBe('scale(1)');
});
