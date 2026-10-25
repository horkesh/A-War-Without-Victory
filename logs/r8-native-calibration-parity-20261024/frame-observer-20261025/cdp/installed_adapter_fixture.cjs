'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { chromium } = require('playwright');
const { startCdpNetworkCollection } = require('../../../../tools/ui/cdp_network_collector.cjs');

const evidenceDir = process.argv[2];
if (!evidenceDir) throw new Error('missing evidence directory');
const resultPath = path.join(evidenceDir, 'RESULT.json');
const asset = Buffer.from('awwv-frame-cdp-fixture-v1\n', 'utf8');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const assetSha256 = sha256(asset);
const serverWitnesses = [];

const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address()));
});
const closeServer = (server) => new Promise((resolve) => server.close(() => resolve()));
const projectEvent = (kind, event) => ({
  kind,
  request_id: event.requestId ?? null,
  frame_id: event.frameId ?? null,
  loader_id: event.loaderId ?? null,
  timestamp: Number.isFinite(event.timestamp) ? event.timestamp : null,
  type: event.type ?? null,
  url: event.request?.url ?? event.response?.url ?? null,
  method: event.request?.method ?? null,
  request_range: event.request?.headers?.Range ?? event.request?.headers?.range ?? null,
  status: event.response?.status ?? null,
  encoded_data_length: event.encodedDataLength ?? null,
  error_text: event.errorText ?? null,
});
const getTargetInfo = async (session) => {
  try {
    const value = await session.send('Target.getTargetInfo');
    return { ok: true, target_id: value.targetInfo?.targetId ?? null, type: value.targetInfo?.type ?? null, url: value.targetInfo?.url ?? null };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) };
  }
};

async function fakeMidflightNegative() {
  class FakeSession extends EventEmitter {
    sends = [];
    async send(method, params = {}) { this.sends.push({ method, params }); return {}; }
    async detach() {}
  }
  const session = new FakeSession();
  const collector = startCdpNetworkCollection({
    artifactIdentity: 'native23-cdp-failure-diagnosis/fake-midflight-negative.json',
    createSession: async () => session,
    closeTimeoutMs: 1000,
  });
  await collector.awaitReady();
  session.emit('Network.responseReceived', {
    requestId: 'fixture-midflight-request',
    timestamp: 2,
    type: 'Document',
    response: {
      url: 'http://127.0.0.1:1/index.html?embedded=1',
      status: 200,
      mimeType: 'text/html',
      protocol: 'http/1.1',
      headers: { 'Content-Length': '1' },
    },
  });
  const artifact = await collector.closeAndFlush();
  assert.equal(artifact.status, 'inconsistent');
  assert.deepEqual(artifact.summary.rows_by_kind, { request: 0, response: 1, failure: 0, finish: 0 });
  assert.equal(artifact.inconsistencies.length, 1);
  assert.equal(artifact.inconsistencies[0].code, 'response-without-request');
  return {
    pass: true,
    status: artifact.status,
    rows_by_kind: artifact.summary.rows_by_kind,
    inconsistency: artifact.inconsistencies[0],
    sends: session.sends,
  };
}

async function run() {
  let browser = null;
  const outerServer = http.createServer();
  const frameServer = http.createServer();
  const output = {
    schema: 'awwv.native23-cdp-installed-adapter-fixture.v1',
    command: process.argv.slice(0),
    playwright_version: require('playwright/package.json').version,
    browser_executable: chromium.executablePath().replaceAll('\\', '/'),
    asset: { bytes: asset.length, sha256: assetSha256, range: 'bytes=0-' },
    launch_count: 0,
    adapter: null,
    midflight_negative: null,
    pass: false,
  };
  try {
    const frameAddress = await listen(frameServer);
    const frameBase = `http://127.0.0.1:${frameAddress.port}`;
    frameServer.on('request', (request, response) => {
      serverWitnesses.push({ server: 'frame', method: request.method, url: request.url, range: request.headers.range ?? null });
      if (request.url === '/frame.html') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('<!doctype html><script>window.issueFixtureRequest=async()=>{const r=await fetch("/asset.bin",{headers:{Range:"bytes=0-"}});const b=await r.arrayBuffer();const h=await crypto.subtle.digest("SHA-256",b);return {status:r.status,bytes:b.byteLength,sha256:[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}}</script>');
        return;
      }
      if (request.url === '/asset.bin') {
        response.writeHead(206, {
          'Content-Type': 'application/octet-stream',
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes 0-${asset.length - 1}/${asset.length}`,
          'Content-Length': String(asset.length),
        });
        response.end(asset);
        return;
      }
      response.writeHead(404); response.end();
    });

    const outerAddress = await listen(outerServer);
    const outerBase = `http://localhost:${outerAddress.port}`;
    outerServer.on('request', (request, response) => {
      serverWitnesses.push({ server: 'outer', method: request.method, url: request.url, range: request.headers.range ?? null });
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(`<!doctype html><iframe id="game" src="${frameBase}/frame.html"></iframe>`);
    });

    output.launch_count = 1;
    browser = await chromium.launch({ headless: true, args: ['--site-per-process'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${outerBase}/outer.html`, { waitUntil: 'load', timeout: 10000 });
    const frame = page.frames().find((candidate) => candidate.url() === `${frameBase}/frame.html`);
    assert.ok(frame, 'cross-origin embedded frame was not found');

    const outerSession = await context.newCDPSession(page);
    const frameSession = await context.newCDPSession(frame);
    const streams = { outer: [], frame: [] };
    for (const [name, session] of [['outer', outerSession], ['frame', frameSession]]) {
      for (const eventName of ['Network.requestWillBeSent', 'Network.responseReceived', 'Network.loadingFinished', 'Network.loadingFailed']) {
        session.on(eventName, (event) => streams[name].push(projectEvent(eventName, event)));
      }
      await session.send('Network.enable', {});
    }
    const targetInfo = { outer: await getTargetInfo(outerSession), frame: await getTargetInfo(frameSession) };
    const browserResult = await frame.evaluate(() => window.issueFixtureRequest());
    await page.waitForTimeout(100);

    const assetUrl = `${frameBase}/asset.bin`;
    const filtered = Object.fromEntries(Object.entries(streams).map(([name, rows]) => [name, rows.filter((row) => row.url === assetUrl)]));
    const frameRequest = filtered.frame.find((row) => row.kind === 'Network.requestWillBeSent');
    const frameResponse = filtered.frame.find((row) => row.kind === 'Network.responseReceived' && row.request_id === frameRequest?.request_id);
    const frameFinish = filtered.frame.find((row) => row.kind === 'Network.loadingFinished' && row.request_id === frameRequest?.request_id);
    const frameFailure = filtered.frame.find((row) => row.kind === 'Network.loadingFailed' && row.request_id === frameRequest?.request_id);
    let directBody = null;
    if (frameFinish) {
      const body = await frameSession.send('Network.getResponseBody', { requestId: frameRequest.request_id });
      const bytes = body.base64Encoded ? Buffer.from(body.body, 'base64') : Buffer.from(body.body, 'utf8');
      directBody = { bytes: bytes.length, sha256: sha256(bytes), base64_encoded: body.base64Encoded === true };
    }
    await frameSession.detach();
    await outerSession.detach();

    const framePass = Boolean(frameRequest && frameResponse && frameFinish && !frameFailure)
      && frameRequest.request_range === 'bytes=0-'
      && frameResponse.status === 206
      && browserResult.bytes === asset.length
      && browserResult.sha256 === assetSha256
      && directBody?.bytes === asset.length
      && directBody?.sha256 === assetSha256;
    output.adapter = {
      pass: framePass,
      outer_url: page.url(),
      frame_url: frame.url(),
      page_frame_count: page.frames().length,
      target_info: targetInfo,
      browser_result: browserResult,
      direct_same_session_body: directBody,
      event_counts: {
        outer: Object.fromEntries(['Network.requestWillBeSent', 'Network.responseReceived', 'Network.loadingFinished', 'Network.loadingFailed'].map((kind) => [kind, filtered.outer.filter((row) => row.kind === kind).length])),
        frame: Object.fromEntries(['Network.requestWillBeSent', 'Network.responseReceived', 'Network.loadingFinished', 'Network.loadingFailed'].map((kind) => [kind, filtered.frame.filter((row) => row.kind === kind).length])),
      },
      events: filtered,
      server_witnesses: serverWitnesses,
    };
    output.midflight_negative = await fakeMidflightNegative();
    output.pass = output.adapter.pass && output.midflight_negative.pass;
    assert.equal(output.pass, true, 'fixture acceptance failed');
  } catch (error) {
    output.error = String(error?.stack ?? error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await closeServer(outerServer).catch(() => {});
    await closeServer(frameServer).catch(() => {});
    fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
  }
}

run();

