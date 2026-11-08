import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import blocking from './room-blocking.json';
import arrival from './dayton-arrival-v1.png';
import room from './dayton-conference-room-4k.webp';
import './scene.css';

type View = 'folder' | 'draft' | 'map' | 'binder' | 'review' | 'result' | 'verdict';
type Offer = Readonly<{ revision: 2 | 3; authority: string; approval: string }>;
type Outcome = { status: 'signed'; offer: Offer } | { status: 'declined' };
const counteroffer: Offer = { revision: 2, authority: 'Joint authority', approval: 'Both parties must approve' };
const revised: Offer = { revision: 3, authority: 'Joint authority with independent review', approval: 'Both parties approve; an independent panel reviews disputes' };
const clause = 'C-01 · Crossing and customs';

function MapView({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <section aria-label="Fictional settlement map">
      <div className="map-figure" data-selected={selected}>
        <svg viewBox="0 0 480 210" aria-hidden="true">
          <defs><pattern id="transfer-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v6" stroke="#e7ce8d" strokeWidth="3" /></pattern></defs>
          <path className="west" d="M35 90 91 42 176 46 249 27 270 74 225 130 190 177 126 188 63 158Z" />
          <path className="east" d="M249 27 326 39 406 60 447 113 405 167 338 182 274 170 190 177 225 130 270 74Z" />
          <path className="changed" d="M249 27 270 74 225 130 206 130 252 72 235 31Z" />
          <path className="prior" d="M249 27 270 74 225 130 190 177" />
        </svg>
        <button type="button" aria-pressed={selected} onClick={onSelect}>North crossing</button>
      </div>
      <p><strong>North crossing</strong> · Western Authority → Eastern Authority</p>
      <p className="map-key">Dashed line: wartime division. Hatched outline: proposed or agreed transfer.</p>
    </section>
  );
}

function Powers({ offer, onSelect, selected }: { offer: Offer; onSelect: () => void; selected: boolean }) {
  return (
    <table>
      <caption>Division of powers</caption>
      <thead><tr><th scope="col">Power</th><th scope="col">Opening position</th><th scope="col">Settlement</th></tr></thead>
      <tbody><tr>
        <th scope="row"><button type="button" aria-pressed={selected} onClick={onSelect}>Crossing customs</button></th>
        <td>Western Authority</td><td>{offer.authority}<small>{offer.approval}</small></td>
      </tr></tbody>
    </table>
  );
}

function App() {
  const [arrived, setArrived] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [offer, setOffer] = useState(counteroffer);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [selected, setSelected] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const originView = useRef<View | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const roomHeading = useRef<HTMLHeadingElement>(null);
  const bounds = new URLSearchParams(window.location.search).has('showBounds');

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (view && panel) {
      if (!panel.open) panel.showModal();
      heading.current?.focus();
    } else if (panel?.open) {
      panel.close();
      if (opener.current?.isConnected) opener.current.focus();
      else roomHeading.current?.focus();
    }
  }, [view, offer.revision]);

  useLayoutEffect(() => {
    if (arrived) roomHeading.current?.focus();
  }, [arrived]);

  function open(target: View, event: MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    originView.current = target;
    setSelected(false);
    setView(target);
  }

  function decide(status: Outcome['status']) {
    if (outcome) return;
    setOutcome(status === 'signed' ? { status, offer } : { status });
    setView('result');
  }

  function replay() {
    setOffer(counteroffer);
    setOutcome(null);
    setSelected(false);
    setView(null);
  }

  if (!arrived) {
    return (
      <main className="arrival" style={{ backgroundImage: 'url(' + arrival + ')' }}>
        <div>
          <p className="eyebrow">Dayton conference · November 1995</p>
          <h1>Wright-Patterson Air Force Base</h1>
          <p>Follow the Peace Walk to the Hope Hotel.</p>
          <button type="button" onClick={() => setArrived(true)}>Skip arrival</button>
          <button type="button" onClick={() => setArrived(true)}>Enter conference room</button>
        </div>
      </main>
    );
  }

  const displayed = outcome?.status === 'signed' ? outcome.offer : offer;
  const titles: Record<View, string> = {
    folder: 'Delegation folder', draft: 'Treaty draft', map: 'Settlement map', binder: 'Treaty binder',
    review: 'Review fixture agreement', result: outcome?.status === 'signed' ? 'Agreement signed' : 'Declined offer', verdict: 'Signed agreement',
  };
  const current = outcome ? outcome.status === 'signed' ? 'verdict' : 'result' : 'draft';
  const labels = blocking.hotspots;
  const destination = (id: string) => id === 'draft' ? current : id as 'folder' | 'map' | 'binder';

  return (
    <main className="conference">
      <header>
        <p className="eyebrow">Dayton conference · Dev-only fictional fixture · DAYTON-F01</p>
        <h1 ref={roomHeading} tabIndex={-1}>Hope Hotel conference room</h1>
        <p aria-live="polite">{outcome ? 'Round closed' : offer.revision === 2 ? 'Round 1 · New counteroffer · Your delegation to respond' : 'Round 1 · Revised draft · Your delegation to respond'}</p>
      </header>
      <div className="room-window">
        <div className="room-frame" data-bounds={bounds}>
          <img src={room} alt="Conference table, delegation folder, draft papers, wall board and treaty binder" />
          {labels.map(({ id, label, center, outline }) => {
            const xs = outline.map(([x]) => x);
            const ys = outline.map(([, y]) => y);
            const left = Math.min(...xs);
            const top = Math.min(...ys);
            const width = Math.max(...xs) - left;
            const height = Math.max(...ys) - top;
            const polygon = outline.map(([x, y]) => [((x - left) / width) * 100, ((y - top) / height) * 100]);
            const style: CSSProperties = {
              left: left / blocking.width * 100 + '%',
              top: top / blocking.height * 100 + '%',
              width: width / blocking.width * 100 + '%',
              height: height / blocking.height * 100 + '%',
              clipPath: 'polygon(' + polygon.map(([x, y]) => x + '% ' + y + '%').join(', ') + ')',
            };
            const labelPosition = {
              left: (center[0] - left) / width * 100 + '%',
              top: (center[1] - top) / height * 100 + '%',
            };
            return (
              <button key={id} type="button" className="hotspot" style={style} onClick={event => open(destination(id), event)}>
                <svg viewBox={`${left} ${top} ${width} ${height}`} aria-hidden="true">
                  <polygon points={outline.map(point => point.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />
                </svg>
                <span style={labelPosition}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <nav aria-label="Conference objects">
        {labels.map(({ id, label }) => (
          <button key={id} type="button" onClick={event => open(destination(id), event)}>
            {id === 'draft' && !outcome && offer.revision === 2 ? 'Read new counteroffer' : label}
          </button>
        ))}
        {outcome?.status === 'signed' && <button type="button" onClick={event => open('verdict', event)}>Open agreement from Verdict</button>}
      </nav>

      <dialog ref={dialog} aria-labelledby="conference-panel-title" onCancel={event => { event.preventDefault(); setView(null); }}>
        {view && (
          <>
            <header className="panel-heading">
              <h2 ref={heading} tabIndex={-1} id="conference-panel-title">{titles[view]}</h2>
              <button type="button" onClick={() => setView(null)}>Return to room</button>
            </header>
            {view === 'folder' && <>
              <p><strong>Mandate</strong> · Protect civilian passage while retaining a say in customs enforcement.</p>
              <p><strong>Mediator’s message</strong> · The crossing transfer and shared customs authority must travel together.</p>
            </>}
            {view === 'draft' && <>
              <p className="eyebrow" aria-live="polite">{offer.revision === 2 ? 'Counteroffer revision 2' : 'Draft revision 3'}</p>
              <p><strong>Opening position</strong> · The Western Authority keeps the crossing and administers customs alone.</p>
              <p><strong>Mediator’s proposal</strong> · Transfer the North crossing to the Eastern Authority in exchange for shared control of customs. Both terms are conditional on one another.</p>
              <p><strong>Customs</strong> · {offer.authority}. {offer.approval}.</p>
              <div className="actions">
                <button type="button" onClick={() => { setSelected(true); setView('map'); }}>Inspect territory</button>
                <button type="button" onClick={() => { setSelected(true); setView('binder'); }}>Inspect institutions</button>
                {offer.revision === 2 && <button type="button" onClick={() => setOffer(revised)}>Revise oversight</button>}
                <button type="button" onClick={() => setView('review')}>Review draft</button>
                <button type="button" onClick={() => decide('declined')}>Decline fixture offer</button>
              </div>
            </>}
            {(view === 'map' || view === 'binder' || view === 'review' || view === 'verdict') && <>
              <p className="eyebrow">{outcome?.status === 'signed' ? 'Signed' : outcome?.status === 'declined' ? 'Declined · unsigned' : 'Draft · provisional'} · Revision {displayed.revision}</p>
              <div className="viewer">
                {view !== 'binder' && <MapView selected={selected} onSelect={() => setSelected(true)} />}
                {view !== 'map' && <Powers offer={displayed} selected={selected} onSelect={() => setSelected(true)} />}
              </div>
              {selected && <section className="clause" aria-label="Source clause">
                <h3>{clause}</h3>
                <p>The Eastern Authority receives the crossing, conditional on both parties sharing authority over customs. {displayed.approval}.</p>
              </section>}
              <div className="actions">
                {view === 'map' && <button type="button" onClick={() => setView('binder')}>Inspect institutions</button>}
                {view === 'binder' && <button type="button" onClick={() => setView('map')}>Inspect territory</button>}
                {(view === 'map' || view === 'binder') && originView.current === 'draft' && <button type="button" onClick={() => setView('draft')}>Back to draft</button>}
                {view === 'review' && <button type="button" onClick={() => decide('signed')}>Sign fixture agreement</button>}
                {view === 'verdict' && <button type="button" onClick={replay}>Replay starting offer</button>}
              </div>
            </>}
            {view === 'result' && (outcome?.status === 'signed'
              ? <><p>Fixture agreement signed. The final map and institutions are frozen at revision {outcome.offer.revision}.</p><button type="button" onClick={() => setView('verdict')}>Open agreement from Verdict</button></>
              : <><p>No agreement was signed.</p><button type="button" onClick={replay}>Replay starting offer</button></>)}
          </>
        )}
      </dialog>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
