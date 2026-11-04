// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { formatReportedPersonnel, sumReportedPersonnel } from '../../src/ui/map/utils/reportedMetrics';
import * as formatters from '../../src/ui/map/utils/formatters';
import { setLocale } from '../../src/ui/map/i18n';
import { ArmyHQCorpsCard } from '../../src/ui/map/components/army_hq/ArmyHQCorpsCard';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import { BrigadeRow } from '../../src/ui/map/components/BrigadeRow';
import { SettlementDetailContent } from '../../src/ui/map/components/SettlementDetailContent';
import type { FormationView } from '../../src/ui/map/data/types';
const formation = { id: 'test', name: 'Long formation name', faction: 'RBiH', kind: 'brigade', readiness: 'ready', status: 'active', createdTurn: 0, tags: [] } as FormationView;
afterEach(() => { cleanup(); setLocale('en'); });
describe('player information numbers', () => {
 it.each([[0, '0'], [-1250, '-1.3k'], [999999, '1000.0k'], [1000000, '1.0M'], [-1211000, '-1.2M']])('compact personnel %s', (n, text) => expect(formatters.formatPersonnel(Number(n))).toBe(text));
 it.each([[-1250, '-1k'], [-1211000, '-1.2M'], [0, '0']])('signed summary %s', (n, text) => expect(formatters.fmtK(Number(n))).toBe(text));
 it('uses active locale for exact counts and compact decimal separators', () => {
   setLocale('bcs');
   expect(formatters.formatCount(1234567)).toBe('1.234.567');
   expect(formatters.formatPersonnel(1250)).toBe('1,3k');
 });
 it.each([undefined, null, NaN, Infinity])('reports invalid personnel as missing: %s', value => expect(formatters.formatPersonnel(value as number)).toBe('No staff report'));
 it('keeps zero distinct from an invalid exact count', () => {
   expect(formatters.formatCount(0)).toBe('0');
   expect(formatters.formatCount(NaN)).toBe('No staff report');
 });
});
describe('formation row reports', () => {
 it('shows nonfinite personnel as a staff gap instead of NaN', () => {
   render(createElement(BrigadeRow, { formation: { ...formation, personnel: NaN } }));
   expect(screen.queryByText('NaN')).toBeNull();
   expect(screen.getByRole('button').textContent).toContain('No staff report');
 });
 it('exposes an explanation on keyboard focus', () => {
   render(createElement(BrigadeRow, { formation, onClick: vi.fn() }));
   const row = screen.getByRole('button');
   fireEvent.focus(row);
   const description = document.getElementById(row.getAttribute('aria-describedby') ?? '');
   expect(description?.textContent).toContain('Supply:');
   expect(description?.textContent).toContain('Fatigue:');
 });
 it('keeps settlement inspection native and reports missing personnel explicitly', () => {
   const select = vi.fn();
   render(createElement(SettlementDetailContent, { osid: 'op:test:a', osidDisplayNames: { 'op:test:a': 'Test' }, osidPropertiesMap: {}, controlBySettlement: {}, formationsAtOsid: [formation], variant: 'panel', onFormationClick: select }));
   const row = screen.getByRole('button', { name: /Long formation name/ });
   expect(row.textContent).toContain('No staff report');
   fireEvent.click(row);
   expect(select).toHaveBeenCalledWith('test');
 });
});

describe('exact personnel aggregation presentation', () => {
 it('localizes reported and partial totals without altering aggregate missingness', () => {
   setLocale('bcs');
   const rows = Object.freeze([Object.freeze({ personnel: 1234567 }), Object.freeze({})]);
   const summary = sumReportedPersonnel(rows);
   const labels = { partial: (count: string) => `Partial: ${count}`, unreported: 'No staff report' };
   expect(formatReportedPersonnel(summary, labels)).toBe('Partial: 1.234.567');
   setLocale('en');
   expect(formatReportedPersonnel(summary, labels)).toBe('Partial: 1,234,567');
   expect(formatReportedPersonnel(sumReportedPersonnel([{ personnel: 0 }, {}]), labels)).toBe('No staff report');
   expect(formatReportedPersonnel(sumReportedPersonnel([{ personnel: 0 }]), labels)).toBe('0');
   expect(summary).toEqual({ reportedTotal: 1234567, reportedCount: 1, unreportedCount: 1, totalCount: 2 });
 });
});

describe('Army HQ keyboard explanations', () => {
 it('associates the focused corps card with its existing condition explanation', () => {
   const corps = { ...formation, id: 'corps', name: 'Test Corps', kind: 'corps' };
   const gameState = { label: 'Test', turn: 1, formations: [corps], controlBySettlement: {}, namedOfficerData: [] } as unknown as LoadedGameState;
   render(createElement(ArmyHQCorpsCard, {
     corps, brigades: [], sectors: [], operations: [], factionBattles: [], gameState,
     isExpanded: false, isCompressed: false, onToggleExpand: vi.fn(),
   }));
   const card = screen.getByTestId('army-hq-corps-card');
   fireEvent.focus(card);
   const description = document.getElementById(card.getAttribute('aria-describedby') ?? '');
   expect(description?.textContent).toContain('Assessment incomplete');
   expect(description?.textContent).toContain('Cohesion');
 });
});
