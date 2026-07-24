/**
 * OfficerDossierPanel — read-only "Officer Dossier" overlay (Phase 2 "back the officer").
 *
 * Composes the full dossier for one named officer so the player can inspect WHO they
 * are backing before approving an operation: identity + aptitudes + combat record +
 * war-crimes badge (via OfficerProfile, non-compact), command status, and the authored
 * bio prose (bio_short / command_style / known_for).
 *
 * Pure read-model: every field is already present on the NamedOfficerView projection
 * (GameStateAdapter). No state mutation, no IPC, no new save fields. Keyboard-accessible
 * and dismissible (Escape / backdrop click) via the shared GlassPanel overlay.
 *
 * Sensitive-history gate: the war-crimes badge renders the stored record fields VERBATIM
 * through WarCrimesBadge. No new sensitive prose is authored here.
 */
import type { NamedOfficerView } from '../data/types';
import { GlassPanel } from './GlassPanel';
import { OfficerProfile } from './OfficerProfile';
import { formatTenure } from '../utils/officerCharacter';
import { t, type MessageKey } from '../i18n';
import { getPlayerSafeCorpsName } from '../utils/playerSafeText';

export interface OfficerDossierPanelProps {
    officer: NamedOfficerView;
    onClose: () => void;
}

const OFFICER_STATUS_KEY: Record<string, MessageKey> = {
    active: 'officerDossier.status.active',
    reserve: 'officerDossier.status.reserve',
    retired: 'officerDossier.status.retired',
    killed: 'officerDossier.status.killed',
    captured: 'officerDossier.status.captured',
};

function officerStatusLabel(status: string): string {
    return t(OFFICER_STATUS_KEY[status] ?? 'officerDossier.status.unknown');
}

function corpsDisplayName(corpsId: string | null): string {
    if (!corpsId) return '';
    return getPlayerSafeCorpsName(corpsId, corpsId, t('officerDossier.assignedCorpsUnknown'));
}

export function OfficerDossierPanel({ officer, onClose }: OfficerDossierPanelProps) {
    const assignedCorps = corpsDisplayName(officer.assigned_corps_id);
    const hasBio = Boolean(officer.bio_short || officer.command_style || officer.known_for);

    return (
        <GlassPanel position="overlay" title={t('officerDossier.title')} width="360px" onClose={onClose}>
            <div className="space-y-2">
                {/* Identity + aptitudes + combat record + war-crimes (full profile). */}
                <OfficerProfile officer={officer} label={t('officerDossier.identity')} compact={false} showWarCrimesRecord />

                {/* Command status. */}
                <div className="p-2 bg-black/20 rounded border border-panel-border/30 space-y-1">
                    <div className="text-xs uppercase text-text-secondary tracking-wider font-semibold">
                        {t('officerDossier.commandStatus')}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-text-secondary w-[62px] shrink-0">{t('officerDossier.statusLabel')}</span>
                        <span className="font-mono text-text-primary tracking-wide">{officerStatusLabel(officer.status)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-text-secondary w-[62px] shrink-0">{t('officerDossier.assignedCorps')}</span>
                        <span className="text-text-primary truncate">
                            {assignedCorps || t('officerDossier.unassigned')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-text-secondary w-[62px] shrink-0">{t('officerDossier.tenure')}</span>
                        <span className="text-text-primary">{formatTenure(officer.turns_in_command)}</span>
                    </div>
                </div>

                {/* Authored bio prose (player-safe; rendered verbatim from stored fields). */}
                {hasBio && (
                    <div className="p-2 bg-black/20 rounded border border-panel-border/30 space-y-1.5">
                        <div className="text-xs uppercase text-text-secondary tracking-wider font-semibold">
                            {t('officerDossier.bio')}
                        </div>
                        {officer.bio_short && (
                            <p className="text-xs text-text-primary leading-snug">{officer.bio_short}</p>
                        )}
                        {officer.command_style && (
                            <div className="text-xs">
                                <span className="text-text-secondary font-semibold">{t('officerDossier.commandStyleLabel')}: </span>
                                <span className="text-text-primary">{officer.command_style}</span>
                            </div>
                        )}
                        {officer.known_for && (
                            <div className="text-xs">
                                <span className="text-text-secondary font-semibold">{t('officerDossier.knownForLabel')}: </span>
                                <span className="text-text-primary">{officer.known_for}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GlassPanel>
    );
}

export default OfficerDossierPanel;
