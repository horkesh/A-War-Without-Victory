/**
 * Tactical-shell wrapper for the canonical Army HQ war summary content.
 *
 * The summary model and deep browsing rules live in `army_hq/WarSummaryContent`.
 * This modal should remain a thin presentation shell so the tactical map does
 * not grow a second strategic-summary owner with different truth standards.
 *
 * LANE-V094-MODAL-MIGRATION: migrated to shared `<Modal>` wrapper for
 * canonical ESC dismissal, focus management, aria contracts, and z-index.
 * Visible behavior preserved (backdrop click-out, panel structure, close
 * button); the wrapper centralizes prior bespoke handlers. No tutorial
 * `data-tutorial-step` anchors inside this modal.
 */
import type { SummaryFocusSection } from '../data/types';
import { WarSummaryContent } from './army_hq/WarSummaryContent';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';

interface WarSummaryModalProps {
    isOpen: boolean;
    focusSection?: SummaryFocusSection;
    onClose: () => void;
}

export function WarSummaryModal({ isOpen, focusSection = 'overview', onClose }: WarSummaryModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            zIndex={Z.MODAL_RAISED_2}
            ariaLabelledBy="war-summary-title"
            backdropClassName="bg-[rgba(0,0,0,0.55)]"
            panelClassName=""
            panelStyle={{
                background: 'rgba(26, 24, 21, 0.97)',
                border: '1px solid rgba(180, 160, 130, 0.22)',
                borderRadius: 8,
                padding: '18px 20px',
                width: 'min(1040px, 90vw)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                color: '#d5c9bc',
                fontFamily: 'inherit',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                    <div id="war-summary-title" style={{ fontSize: 13, fontWeight: 700, color: '#c4a35a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        War Summary
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: '#8a7d70', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                >
                    ×
                </button>
            </div>

            <WarSummaryContent focusSection={focusSection} />
        </Modal>
    );
}
