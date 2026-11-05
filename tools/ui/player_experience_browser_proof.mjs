// Bounded real-renderer proof. No campaigns, desktop mutations or human listening claim.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const origin = option('--url', 'http://127.0.0.1:3298');
const out = option('--out', 'logs/player-experience-completion-20261105/browser-01');
const resumePath = option('--resume-shell-assets', null);
fs.mkdirSync(out, { recursive: true });
const result = { scope: 'Real mounted Settings and real HTMLAudioElement over local Vite renderer; external network blocked; direct bus probes explicitly identified; not packaged/native/human acceptance', cases: [], errors: [], remoteAttempts: [], checks: [] };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const browser = await chromium.launch({ headless: true });
let context;
try {
  context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
      result.remoteAttempts.push({ url: url.href, kind: route.request().resourceType() });
      return route.abort('internetdisconnected');
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.__audioProof = { elements: [], attempts: 0, successful: 0, rejected: 0 };
    window.Audio = function (...args) {
      const element = new NativeAudio(...args);
      window.__audioProof.elements.push(element);
      const play = element.play.bind(element);
      element.play = () => {
        window.__audioProof.attempts++;
        const promise = play();
        promise.then(() => {
          window.__audioProof.successful++;
          element.__audioProofSuccess = (element.__audioProofSuccess ?? 0) + 1;
        }, () => window.__audioProof.rejected++);
        return promise;
      };
      return element;
    };
    window.Audio.prototype = NativeAudio.prototype;
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => result.errors.push(error.message));
  const bus = action => page.evaluate(async action => {
    const url = performance.getEntriesByType('resource').map(row => row.name).find(name => name.includes('/audio/audio_engine.ts'));
    if (!url) throw new Error('Loaded production audio bus identity missing');
    const module = await import(url);
    if (action === 'state') return module.getAudioState();
    if (action === 'disable') module.setEnabled(false);
    if (action === 'enable') { module.setEnabled(true); module.setMasterVolume(0.5); }
    if (action === 'cue') await module.playCue('ui_click');
    if (action === 'ambient-on') { module.setAmbientPlaybackEnabled(true); await module.playAmbientBed('ambient_warroom'); }
    if (action === 'ambient-switch') await module.playAmbientBed('ambient_field');
    if (action === 'ambient-off') module.setAmbientPlaybackEnabled(false);
    return module.getAudioState();
  }, action);
  const media = () => page.evaluate(() => ({ attempts: window.__audioProof.attempts, successful: window.__audioProof.successful, rejected: window.__audioProof.rejected, elements: window.__audioProof.elements.map(e => ({ src: e.src, paused: e.paused, ended: e.ended, volume: e.volume, error: e.error?.code ?? null })) }));
  await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 45000 });
  if (!resumePath) {
  assert.equal((await media()).attempts, 0, 'Playback before gesture');
  assert.equal((await bus('state')).ambientPlaybackEnabled, false);
  await bus('cue');
  assert.equal((await media()).attempts, 0, 'Direct cue bypassed gesture gate');
  result.checks.push('No pre-gesture playback; ambience disabled by default');
  await page.keyboard.press('Enter');
  const opener = page.getByRole('button', { name: 'Settings', exact: true });
  await opener.waitFor({ state: 'visible' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await dialog.waitFor({ state: 'visible' });
  assert(await dialog.evaluate(e => e.contains(document.activeElement)), 'Settings did not receive focus');
  const audioTab = dialog.getByRole('button', { name: 'Audio', exact: true });
  await audioTab.click();
  const toggle = dialog.getByRole('button', { name: 'Toggle soundscape audio', exact: true });
  const slider = dialog.getByRole('slider', { name: 'Master volume', exact: true });
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  await page.waitForFunction(() => window.__audioProof.successful > 0, null, { timeout: 10000 });
  await slider.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  assert.equal(Number(await slider.inputValue()), 5);
  assert.equal((await bus('state')).volumes.master, 0.05);
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  const muted = await media();
  assert(muted.elements.every(e => e.paused), 'Mute left media playing');
  await bus('cue');
  assert.equal((await media()).attempts, muted.attempts, 'Muted cue attempted playback');
  // Actual keyboard closure and reopen must restore focus and persisted preferences.
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert(await opener.evaluate(e => document.activeElement === e), 'Opener focus not restored');
  await page.reload({ waitUntil: 'networkidle' });
  await page.keyboard.press('Enter');
  await opener.click();
  await dialog.waitFor({ state: 'visible' });
  await audioTab.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(Number(await slider.inputValue()), 5);
  assert.equal((await media()).attempts, 0, 'Reloaded muted preference produced audio');
  const musicToggle = dialog.getByRole('button', { name: 'Toggle background music', exact: true });
  const musicSlider = dialog.getByRole('slider', { name: 'Music volume', exact: true });
  assert.equal(await musicToggle.getAttribute('aria-pressed'), 'false', 'Music enabled without consent');
  result.checks.push('Real Settings keyboard entry/closure and opener focus; immediate mute; volume keyboard control; reload persistence');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 700, height: 560 }]) {
    await page.setViewportSize(viewport);
    const focusable = dialog.locator('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]').filter({ visible: true });
    assert(await focusable.count() > 1);
    await focusable.last().focus();
    await page.keyboard.press('Tab');
    assert(await focusable.first().evaluate(e => document.activeElement === e), 'Tab escaped Settings');
    await page.keyboard.press('Shift+Tab');
    assert(await focusable.last().evaluate(e => document.activeElement === e), 'Reverse Tab escaped Settings');
    const geometry = await dialog.evaluate(e => ({ width: e.scrollWidth, clientWidth: e.clientWidth, rect: { x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y, right: e.getBoundingClientRect().right, bottom: e.getBoundingClientRect().bottom } }));
    assert(geometry.width <= geometry.clientWidth + 1, 'Settings content overflows horizontally');
    assert(geometry.rect.x >= 0 && geometry.rect.y >= 0 && geometry.rect.right <= viewport.width + 1 && geometry.rect.bottom <= viewport.height + 1, 'Settings extends outside viewport');
    await page.screenshot({ path: path.join(out, `settings-${viewport.width}.png`) });
    result.cases.push({ viewport, geometry, focusTrap: true });
  }
  await dialog.getByRole('button', { name: 'Accessibility', exact: true }).click();
  const motion = dialog.getByRole('button', { name: 'Toggle reduce motion', exact: true });
  await motion.click();
  assert.equal(await page.locator('html').evaluate(e => e.classList.contains('user-reduce-motion')), (await motion.getAttribute('aria-pressed')) === 'true');
  result.checks.push('Affected controls labelled; reduced-motion preference works; forward/reverse Tab contained at both viewports');
  await audioTab.click();
  await toggle.click();
  await musicToggle.click();
  await page.waitForFunction(() => window.__audioProof.elements.some(e => e.src.includes('menu_original') && !e.paused), null, { timeout: 10000 });
  await musicSlider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  assert.equal(Number(await musicSlider.inputValue()), 5);
  const musicPlaying = (await media()).elements.find(e => e.src.includes('menu_original'));
  assert(musicPlaying && musicPlaying.volume > 0 && musicPlaying.volume < 0.01, 'Music level did not reach active element');
  await toggle.click();
  assert((await media()).elements.every(e => e.paused), 'Global mute left music playing');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal((await media()).attempts, 0, 'Persisted music bypassed mute or gesture');
  await page.keyboard.press('Enter'); await opener.click(); await audioTab.click();
  assert.equal(await musicToggle.getAttribute('aria-pressed'), 'true');
  assert.equal(Number(await musicSlider.inputValue()), 5);
  await musicToggle.click(); // Restore independent music off; bus probes below do not assert product music.
  await toggle.click();
  result.checks.push('Music independently opt-in, real playback, live level update, global mute and persisted music settings');
  // Direct bus probes, distinct from mounted product hooks. Use real media only.
  await bus('enable');
  await bus('ambient-on');
  await page.waitForFunction(() => window.__audioProof.elements.some(e => e.loop && !e.paused), null, { timeout: 10000 });
  const oldBed = (await media()).elements.find(e => e.src.includes('ambient_warroom'));
  assert(oldBed && !oldBed.paused);
  await bus('ambient-switch');
  await page.waitForFunction(() => window.__audioProof.elements.some(e => e.src.includes('ambient_field') && !e.paused), null, { timeout: 10000 });
  assert((await media()).elements.find(e => e.src.includes('ambient_warroom')).paused, 'Previous bed overlaps');
  await bus('disable');
  assert((await media()).elements.every(e => e.paused), 'Disable left media playing');
  await bus('ambient-off');
  result.checks.push('Direct real-media bus probe: explicit ambient opt-in, exclusive bed switching, disable pauses all; restored ambient gate off');
  } else {
    const previous = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
    assert.equal(previous.cases.length, 2, 'Missing prior viewport proofs');
    assert(previous.checks.length >= 4 && previous.errors.length === 0);
    result.reused = { path: resumePath, sha256: hash(fs.readFileSync(resumePath)), cases: previous.cases, checks: previous.checks.slice(0, 4), limit: 'Only completed Settings/music-control checks reused; prior run stopped on narrow hidden shell selector; current music asset decoded/played below' };
    await page.keyboard.press('Enter');
    await bus('disable');
    await bus('ambient-off');
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  // Actual shell navigation over an in-memory display fixture. Never advance or resolve.
  const fixturePath = 'docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/final-autosave.json';
  const fixtureBytes = fs.readFileSync(fixturePath);
  const fixture = JSON.parse(fixtureBytes);
  fixture.meta.tutorial_state = { dismissed: true, completed_steps: [] };
  fixture.military.pending_event_decisions = [];
  fixture.military.pending_event_notifications = [];
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => typeof window.handleManualSaveLoad === 'function');
  await page.evaluate(async state => window.handleManualSaveLoad(state), fixture);
  const continueButton = page.getByRole('button', { name: /^continue$/i });
  if (await continueButton.isVisible()) await continueButton.click();
  await page.getByTestId('toolbar-route-chronicle').waitFor({ state: 'visible' });
  const fingerprint = () => page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(row => row.name).find(name => name.includes('/store/gameStore.ts'));
    return (await import(url)).useGameStore.getState().lastLoadedStateFingerprint;
  });
  const beforeNavigation = await fingerprint();
  assert(beforeNavigation, 'Fixture fingerprint missing');
  assert.equal((await bus('state')).requestedAmbientId, 'ambient_field');
  await page.getByTestId('toolbar-route-chronicle').click();
  await page.waitForFunction(async () => {
    const url = performance.getEntriesByType('resource').map(row => row.name).find(name => name.includes('/store/gameStore.ts'));
    return (await import(url)).useGameStore.getState().chronicleOpen;
  });
  assert.equal((await bus('state')).requestedAmbientId, 'ambient_archive');
  assert.equal((await bus('state')).currentAmbientId, null);
  await page.screenshot({ path: path.join(out, 'archive-policy-off.png') });
  await page.keyboard.press('Escape');
  await page.getByTestId('toolbar-route-desk').click();
  await page.getByTestId('warroom-toolbar-faction').waitFor({ state: 'visible' });
  assert.equal((await bus('state')).requestedAmbientId, 'ambient_warroom');
  assert.equal((await bus('state')).currentAmbientId, null);
  assert.equal(await fingerprint(), beforeNavigation, 'Shell navigation changed fixture fingerprint');
  assert.equal(hash(fs.readFileSync(fixturePath)), hash(fixtureBytes));
  await page.screenshot({ path: path.join(out, 'warroom-policy-off.png') });
  result.fixture = { path: fixturePath, sha256: hash(fixtureBytes), beforeNavigation, unchanged: true, advances: 0 };
  result.checks.push('Real Map / Chronicle / Warroom routes select their beds while disabled; fixture file and loaded fingerprint preserved; no advances');
  const assets = await page.evaluate(async () => {
    const { AUDIO_ASSET_URLS } = await import('/audio/audioAssets.ts');
    const rows = [];
    for (const [cue, url] of Object.entries(AUDIO_ASSET_URLS)) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Audio fetch ${cue}: ${response.status}`);
      const bytes = await response.arrayBuffer();
      const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      const element = new Audio(url);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Decode timeout: ${cue}`)), 5000);
        element.addEventListener('loadeddata', () => { clearTimeout(timer); resolve(); }, { once: true });
        element.addEventListener('error', () => { clearTimeout(timer); reject(new Error(`Decode failed: ${cue}`)); }, { once: true });
        element.preload = 'auto'; element.load();
      });
      rows.push({ cue, url, sha256, duration: element.duration });
      element.pause(); element.removeAttribute('src'); element.load();
    }
    return rows;
  });
  const provenance = JSON.parse(fs.readFileSync('docs/audio/AUDIO_ASSET_PROVENANCE.json', 'utf8'));
  const provided = Object.entries(provenance.cues).filter(([, row]) => row.disposition === 'provided').map(([cue]) => cue).sort();
  assert.deepEqual(assets.map(row => row.cue).sort(), provided, 'Current imports differ from provided provenance');
  const assetSource = fs.readFileSync('src/ui/map/audio/audioAssets.ts', 'utf8');
  for (const row of assets) {
    const relative = provenance.cues[row.cue].file;
    assert(assetSource.includes(path.basename(relative)), 'Asset outside canonical URL imports');
    assert.equal(hash(fs.readFileSync(relative)), row.sha256, `Served audio hash mismatch: ${row.cue}`);
    assert(Number.isFinite(row.duration) && row.duration > 0);
  }
  result.assets = assets;
  // Cue-specific play-promise success cannot be supplied by another pending cue.
  const assetUrl = cue => new URL(assets.find(row => row.cue === cue).url, origin).href;
  const playedCount = cue => page.evaluate(src => window.__audioProof.elements.filter(e => e.src === src).reduce((sum, e) => sum + (e.__audioProofSuccess ?? 0), 0), assetUrl(cue));
  const waitPlayed = (cue, before) => page.waitForFunction(({ src, before }) => window.__audioProof.elements.filter(e => e.src === src).reduce((sum, e) => sum + (e.__audioProofSuccess ?? 0), 0) > before && window.__audioProof.elements.some(e => e.src === src && !e.paused && (e.__audioProofSuccess ?? 0) > 0), { src: assetUrl(cue), before }, { timeout: 10000 });
  let successful = await playedCount('menu_theme');
  await page.keyboard.press('Shift');
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(row => row.name).find(name => name.includes('/audio/audio_engine.ts'));
    const bus = await import(url);
    bus.setEnabled(true); bus.setMasterVolume(0.5); bus.setMusicVolume(0.5);
    bus.setMusicPlaybackEnabled(true); await bus.playMusic('menu_theme');
  });
  await waitPlayed('menu_theme', successful);
  successful = await playedCount('ambient_warroom');
  await bus('ambient-on');
  await waitPlayed('ambient_warroom', successful);
  successful = await playedCount('ambient_field');
  await bus('ambient-switch');
  await waitPlayed('ambient_field', successful);
  assert((await media()).elements.find(e => e.src.includes('ambient_warroom')).paused);
  await bus('disable');
  assert((await media()).elements.every(e => e.paused));
  await bus('ambient-off');
  result.checks.push('Current music and both explicit ambient probes resolved real play promises; exclusive switch and disable verified');
  result.media = await media();
  assert.equal(result.errors.length, 0, 'Unhandled renderer errors');
  assert.equal(result.remoteAttempts.filter(row => ['media', 'font'].includes(row.kind) || /\.(ogg|mp3|wav|woff2?)(\?|$)/i.test(row.url)).length, 0, 'Attempted external font/audio request');
  result.checks.push(`All${assets.length} canonical audio imports fetched byte-exact and decoded locally; no external font/audio attempts or unhandled errors`);
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failure = error.stack;
  const page = context?.pages()[0];
  if (page && !page.isClosed()) {
    result.failureRuntime = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 3000),
      audio: window.__audioProof ? {
        attempts: window.__audioProof.attempts,
        successful: window.__audioProof.successful,
        rejected: window.__audioProof.rejected,
        elements: window.__audioProof.elements.map(e => ({ src: e.src, paused: e.paused, volume: e.volume, error: e.error?.code ?? null })),
      } : null,
    })).catch(() => null);
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => undefined);
  }
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  await context?.close();
  await browser.close();
  console.log(JSON.stringify({ passed: result.passed, cases: result.cases.length, checks: result.checks.length, failure: result.failure, evidence: out }));
}
