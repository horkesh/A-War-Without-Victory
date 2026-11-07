// Summarise runtime01 + relaunch01 receipts into one compact JSON (no raw logs).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dir = __dirname;
const rt = JSON.parse(fs.readFileSync(path.join(dir, 'runtime01', 'receipt.json'), 'utf8'));
const rl = JSON.parse(fs.readFileSync(path.join(dir, 'relaunch01', 'receipt.json'), 'utf8'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const isRemote = (u) => /^https?:/i.test(u) && !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(u).hostname);
const playing = [...new Set(rt.snapshots.flatMap((s) => s.events).filter((e) => e.type === 'playing').map((e) => path.basename(new URL(e.src).pathname)))].sort();
const out = {
  source_commit: rt.commit,
  package_identity: rt.packageIdentity.map((p) => ({ file: path.basename(p.file), sha256: p.sha256 })),
  ogg_files_packaged: rt.assetIdentity.packaged.length,
  ogg_hashes_match_source: JSON.stringify(rt.assetIdentity.packaged.map((a) => a.sha256).sort()) === JSON.stringify(rt.assetIdentity.source.map((a) => a.sha256).sort()),
  frame_origin: new URL(rt.frameUrl).origin,
  runtime: {
    pass: rt.pass,
    checks: rt.checks.map((c) => c.name),
    campaign_track: rt.checks.find((c) => c.track)?.track ?? null,
    sounds_heard_playing: playing,
    page_errors: rt.errors.length,
    console_warnings_errors: rt.console.length,
    request_failures: rt.requestFailures.length,
    renderer_requests: rt.requests.length,
    renderer_remote_requests: rt.requests.filter((r) => isRemote(r.url)).length,
    proxy_denied_requests: rt.deniedProxy.length,
    node_denied_requests: (rt.nodeDenied || []).length,
    netlog: { total_events: rt.netlog.totalEvents, local_ogg_urls: rt.netlog.localOgg.length, remote_urls: rt.netlog.remote.length, remote_ogg_urls: rt.netlog.remoteOgg.length, sha256: sha(path.join(dir, 'runtime01', 'chromium-netlog.json')) },
    turn0_save_sha256: rt.save.sha256,
    exit: rt.exit,
    forced_cleanup: !!rt.forcedCleanup,
  },
  relaunch: {
    pass: rl.pass,
    previous_origin: rl.previousOrigin,
    new_origin: rl.newOrigin,
    expected: rl.expected,
    observed: rl.observed,
    save_preserved: rl.savePreserved,
    proxy_denied_requests: rl.deniedProxy.length,
    netlog_remote_urls: (() => {
      const net = JSON.parse(fs.readFileSync(path.join(dir, 'relaunch01', 'chromium-netlog.json'), 'utf8'));
      const urls = [...new Set(net.events.flatMap((e) => (typeof e.params?.url === 'string' ? [e.params.url] : [])))];
      return urls.filter(isRemote).length;
    })(),
    exit: rl.exit,
    forced_cleanup: !!rl.forcedCleanup,
  },
};
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
