'use strict';

const crypto = require('node:crypto');

const NETWORK_EVENTS = [
  'Network.requestWillBeSent',
  'Network.responseReceived',
  'Network.loadingFailed',
  'Network.loadingFinished',
];

const DEFAULT_CAPS = Object.freeze({
  eventRows: 4096,
  liveRequestIds: 128,
  targetGenerations: 16,
  bodyAttempts: 16,
  bodyBytes: 1024 * 1024,
  errorChars: 400,
  idChars: 256,
  valueChars: 256,
  pathComponentChars: 256,
  pathComponents: 64,
  urlProjectionChars: 2048,
  dynamicChars: 400,
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) freezeDeep(nested);
  return value;
}

function startCdpNetworkCollection(options) {
  if (!options || typeof options.createSession !== 'function') throw new Error('CDP collection requires createSession');
  if (typeof options.artifactIdentity !== 'string' || options.artifactIdentity.length === 0 || options.artifactIdentity.length > 400) {
    throw new Error('CDP collection requires a bounded artifact identity');
  }

  const caps = {
    ...DEFAULT_CAPS,
    ...(Number.isSafeInteger(options.maxEvents) ? { eventRows: options.maxEvents } : {}),
    ...(Number.isSafeInteger(options.maxLiveRequestIds) ? { liveRequestIds: options.maxLiveRequestIds } : {}),
    ...(Number.isSafeInteger(options.maxTargetGenerations) ? { targetGenerations: options.maxTargetGenerations } : {}),
    ...(Number.isSafeInteger(options.maxBodyAttempts) ? { bodyAttempts: options.maxBodyAttempts } : {}),
    ...(Number.isSafeInteger(options.maxBodyBytes) ? { bodyBytes: options.maxBodyBytes } : {}),
  };
  for (const [name, value] of Object.entries(caps)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid CDP collection cap: ${name}`);
  }
  const closeTimeoutMs = Number.isSafeInteger(options.closeTimeoutMs) && options.closeTimeoutMs > 0
    ? options.closeTimeoutMs
    : 5000;
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const observerSessionId = `cdp-observer-${sha256(`awwv.r8-warroom.cdp-network-collection.v3\0${options.artifactIdentity}`).slice(0, 24)}`;
  const artifact = {
    schema: 'awwv.r8-warroom.cdp-network-collection.v3',
    status: 'initializing',
    non_admitting: true,
    session: {
      observer_session_id: observerSessionId,
      producer: 'playwright-public-context-newCDPSession',
      domain: 'CDP Network',
      network_enable_parameters: {},
      body_method: 'Network.getResponseBody',
      cross_stream_mapping: 'none',
    },
    caps: { ...caps, closeTimeoutMs },
    setup: { state: 'pending', primary_error: null, cleanup_error: null },
    events: [],
    body_attempts: [],
    inconsistencies: [],
    overflow_receipts: [],
    observation_stopped_at_sequence: null,
    summary: null,
    flush: { state: 'open', pending_at_deadline: 0, detach: 'not-started' },
  };

  let sequence = 0;
  let session = null;
  let sessionOwned = false;
  let setupCancelled = false;
  let closed = false;
  let acceptingSettlements = true;
  let snapshot = null;
  let closePromise = null;
  let activeCloseDeadline = null;
  let detachStarted = false;
  const installed = [];
  const requests = new Map();
  const chains = new Map();
  const pending = new Set();

  const nextSequence = () => ++sequence;
  const boundedError = (error) => {
    const value = String(error?.message ?? error);
    return `redacted-error:${sha256(value).slice(0, 24)}:chars=${Math.min(value.length, caps.errorChars)}`;
  };

  function privacySafeProtocol(value) {
    const bounded = exactBoundedString(value, caps.valueChars, 'response-protocol');
    if (!bounded.ok) return null;
    return /^(?:http\/(?:0\.9|1\.0|1\.1)|h2|h3|quic)$/i.test(bounded.value) ? bounded.value : '[redacted]';
  }

  function privacySafeFailure(value) {
    const bounded = exactBoundedString(value, caps.dynamicChars, 'failure-error');
    if (!bounded.ok) return null;
    return bounded.value === 'net::ERR_ABORTED' ? bounded.value : '[redacted]';
  }

  function privacySafeBlockedReason(value) {
    const bounded = exactBoundedString(value, caps.dynamicChars, 'blocked-reason');
    if (!bounded.ok) return null;
    const known = new Set([
      'other', 'csp', 'mixed-content', 'origin', 'inspector', 'subresource-filter', 'content-type',
      'coep-frame-resource-needs-coep-header', 'coop-sandboxed-iframe-cannot-navigate-to-coop-page',
      'corp-not-same-origin', 'corp-not-same-origin-after-defaulted-to-same-origin-by-coep', 'corp-not-same-site',
    ]);
    return known.has(bounded.value) ? bounded.value : '[redacted]';
  }

  function removeListeners() {
    if (!session) return;
    while (installed.length > 0) {
      const { event, handler } = installed.pop();
      try {
        session.off(event, handler);
      } catch (error) {
        if (!artifact.setup.cleanup_error) artifact.setup.cleanup_error = boundedError(error);
      }
    }
  }

  async function detachOnce(deadline = Infinity) {
    if (!sessionOwned || !session || detachStarted) return;
    detachStarted = true;
    artifact.flush.detach = 'pending';
    const remaining = deadline - now();
    if (!(remaining > 0)) {
      artifact.flush.detach = 'detach-timeout';
      return;
    }
    const result = await settleWithin(Promise.resolve().then(() => session.detach()), remaining);
    if (result.timedOut) artifact.flush.detach = 'detach-timeout';
    else if (result.error) artifact.flush.detach = 'detach-error';
    else artifact.flush.detach = 'detached';
    if (result.error && !artifact.setup.cleanup_error) artifact.setup.cleanup_error = boundedError(result.error);
  }

  function stopForOverflow(code, limit, observed) {
    if (artifact.status === 'over-cap') return;
    artifact.status = 'over-cap';
    const overflowSequence = nextSequence();
    artifact.overflow_receipts.push({
      observer_session_id: observerSessionId,
      sequence: overflowSequence,
      code,
      limit,
      observed,
    });
    artifact.observation_stopped_at_sequence = overflowSequence;
    removeListeners();
  }

  function exactBoundedString(value, limit, overflowCode) {
    if (typeof value !== 'string') return { ok: false, reason: 'non-string' };
    if (value.length > limit) {
      stopForOverflow(overflowCode, limit, value.length);
      return { ok: false, reason: 'over-cap' };
    }
    return { ok: true, value };
  }

  function projectUrl(raw) {
    const boundedRaw = exactBoundedString(raw, 16384, 'url-input');
    if (!boundedRaw.ok) return { ok: false, projection: { status: boundedRaw.reason } };
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return { ok: false, projection: { status: 'invalid' } };
    }
    const protocol = exactBoundedString(parsed.protocol, caps.valueChars, 'url-protocol');
    const hostname = exactBoundedString(parsed.hostname, caps.valueChars, 'url-hostname');
    const port = exactBoundedString(parsed.port, caps.valueChars, 'url-port');
    const components = parsed.pathname.split('/');
    if (components.length > caps.pathComponents) {
      stopForOverflow('url-path-components', caps.pathComponents, components.length);
      return { ok: false, projection: { status: 'over-cap' } };
    }
    const path = [];
    for (const component of components) {
      const bounded = exactBoundedString(component, caps.pathComponentChars, 'url-path-component');
      if (!bounded.ok) return { ok: false, projection: { status: bounded.reason } };
      path.push(bounded.value);
    }
    if (!protocol.ok || !hostname.ok || !port.ok) return { ok: false, projection: { status: 'over-cap' } };
    const projection = {
      status: 'present',
      protocol: protocol.value,
      hostname: hostname.value,
      port: port.value,
      path,
      had_userinfo: parsed.username.length > 0 || parsed.password.length > 0,
      had_query: parsed.search.length > 0,
      had_fragment: parsed.hash.length > 0,
    };
    if (JSON.stringify(projection).length > caps.urlProjectionChars) {
      stopForOverflow('url-projection', caps.urlProjectionChars, JSON.stringify(projection).length);
      return { ok: false, projection: { status: 'over-cap' } };
    }
    return {
      ok: true,
      projection,
      facts: {
        isHttp: parsed.protocol === 'http:',
        isLoopback: parsed.hostname === '127.0.0.1',
        validPort: Boolean(parsed.port) && /^\d+$/.test(parsed.port) && Number(parsed.port) >= 1 && Number(parsed.port) <= 65535,
        ambientPath: /^\/assets\/ambient_(?:warroom|field|archive)-[A-Za-z0-9_-]+\.ogg$/.test(parsed.pathname),
        hadUserinfo: projection.had_userinfo,
        hadQuery: projection.had_query,
        hadFragment: projection.had_fragment,
      },
    };
  }

  function compactHeader(headers, name) {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return { status: 'invalid', value: null, error_code: 'non-object' };
    const entries = Object.entries(headers).filter(([key]) => key.toLowerCase() === name.toLowerCase());
    if (entries.length === 0) return { status: 'absent', value: null };
    if (entries.length !== 1) return { status: 'invalid', value: null, error_code: 'ambiguous-case-duplicate' };
    const value = exactBoundedString(entries[0][1], caps.valueChars, `${name.toLowerCase()}-header`);
    if (!value.ok) return { status: 'invalid', value: null, error_code: value.reason };
    return { status: 'present', value: value.value };
  }

  function compactScalar(value, code, limit = caps.dynamicChars) {
    const bounded = exactBoundedString(value, limit, code);
    return bounded.ok ? bounded.value : null;
  }

  function pushInconsistency(code, requestId = null) {
    if (artifact.status === 'over-cap') return;
    if (artifact.inconsistencies.length >= caps.eventRows) {
      stopForOverflow('inconsistencies', caps.eventRows, artifact.inconsistencies.length + 1);
      return;
    }
    artifact.inconsistencies.push({ sequence: nextSequence(), code, request_id: requestId });
    if (artifact.status === 'collecting' || artifact.status === 'initializing') artifact.status = 'inconsistent';
  }

  function pushEvent(row) {
    if (closed || artifact.status === 'over-cap') return false;
    if (artifact.events.length >= caps.eventRows) {
      stopForOverflow('event-rows', caps.eventRows, artifact.events.length + 1);
      return false;
    }
    artifact.events.push({ observer_session_id: observerSessionId, sequence: nextSequence(), ...row });
    return true;
  }

  function getRequestId(event) {
    const bounded = exactBoundedString(event?.requestId, caps.idChars, 'request-id');
    return bounded.ok ? bounded.value : null;
  }

  function onRequest(event) {
    const requestId = getRequestId(event);
    if (!requestId || artifact.status === 'over-cap') return;
    const existing = requests.get(requestId);
    const priorChain = chains.get(requestId);
    const redirectPresent = event?.redirectResponse != null;
    const generation = (priorChain?.generation ?? 0) + 1;
    const chainTainted = Boolean(priorChain?.chainTainted || redirectPresent || (priorChain && !redirectPresent));
    if (priorChain && !redirectPresent) pushInconsistency('reused-id-without-redirect', requestId);
    if (!existing && requests.size >= caps.liveRequestIds) {
      stopForOverflow('live-request-ids', caps.liveRequestIds, requests.size + 1);
      return;
    }
    if (!priorChain && chains.size >= caps.eventRows) {
      stopForOverflow('request-id-histories', caps.eventRows, chains.size + 1);
      return;
    }
    const request = event?.request ?? {};
    const url = projectUrl(request.url);
    const method = compactScalar(request.method, 'request-method');
    const resourceType = compactScalar(event?.type, 'resource-type');
    const frameId = compactScalar(event?.frameId, 'frame-id', caps.idChars);
    const loaderId = compactScalar(event?.loaderId, 'loader-id', caps.idChars);
    const actualRange = compactHeader(request.headers, 'range');
    if (artifact.status === 'over-cap') return;
    const state = {
      requestId,
      generation,
      chainTainted,
      requestCount: 1,
      responseCount: 0,
      requestTimestampFinite: Number.isFinite(event?.timestamp),
      responseTimestampFinite: false,
      terminal: false,
      url,
      method,
      resourceType,
      actualRange,
    };
    chains.set(requestId, { generation, chainTainted });
    requests.set(requestId, state);
    pushEvent({
      kind: 'request',
      request_id: requestId,
      generation,
      timestamp: Number.isFinite(event?.timestamp) ? event.timestamp : null,
      url: url.projection,
      method,
      resource_type: resourceType,
      frame_id: frameId,
      loader_id: loaderId,
      redirect_present: redirectPresent,
      chain_tainted: chainTainted,
      actual_range: actualRange,
    });
  }

  function onResponse(event) {
    const requestId = getRequestId(event);
    if (!requestId || artifact.status === 'over-cap') return;
    const state = requests.get(requestId);
    if (!state) pushInconsistency('response-without-request', requestId);
    else {
      state.responseCount += 1;
      state.responseTimestampFinite = Number.isFinite(event?.timestamp);
    }
    if (state?.responseCount > 1) pushInconsistency('duplicate-response', requestId);
    const response = event?.response ?? {};
    const url = projectUrl(response.url);
    const row = {
      kind: 'response',
      request_id: requestId,
      generation: state?.generation ?? 0,
      timestamp: Number.isFinite(event?.timestamp) ? event.timestamp : null,
      url: url.projection,
      status: Number.isFinite(response.status) ? response.status : null,
      mime_type: compactScalar(response.mimeType, 'mime-type', caps.valueChars),
      protocol: privacySafeProtocol(response.protocol),
      from_disk_cache: response.fromDiskCache === true,
      from_service_worker: response.fromServiceWorker === true,
      content_range: compactHeader(response.headers, 'content-range'),
      content_length: compactHeader(response.headers, 'content-length'),
      accept_ranges: compactHeader(response.headers, 'accept-ranges'),
      chain_tainted: state?.chainTainted ?? false,
    };
    if (artifact.status !== 'over-cap') pushEvent(row);
  }

  function candidateReasons(state, event) {
    const reasons = [];
    if (!state) return ['missing-request'];
    const facts = state.url?.facts;
    if (!state.url?.ok) reasons.push('invalid-url');
    else {
      if (!facts.isHttp) reasons.push('wrong-protocol');
      if (!facts.isLoopback) reasons.push('wrong-hostname');
      if (!facts.validPort) reasons.push('invalid-port');
      if (!facts.ambientPath) reasons.push('wrong-path');
      if (facts.hadQuery) reasons.push('query-present');
      if (facts.hadFragment) reasons.push('fragment-present');
      if (facts.hadUserinfo) reasons.push('userinfo-present');
    }
    if (state.method !== 'GET') reasons.push('wrong-method');
    if (state.resourceType !== 'Media') reasons.push('wrong-resource-type');
    if (state.actualRange.status !== 'present' || state.actualRange.value !== 'bytes=0-') reasons.push('wrong-range');
    if (event?.errorText !== 'net::ERR_ABORTED') reasons.push('wrong-error');
    if (state.chainTainted) reasons.push('redirect-chain-tainted');
    if (state.requestCount !== 1) reasons.push('request-count');
    if (state.responseCount !== 1) reasons.push('response-count');
    if (!state.requestTimestampFinite) reasons.push('missing-request-timestamp');
    if (!state.responseTimestampFinite) reasons.push('missing-response-timestamp');
    if (!Number.isFinite(event?.timestamp)) reasons.push('missing-failure-timestamp');
    return reasons;
  }

  function decodeBody(result) {
    if (!result || typeof result.body !== 'string') throw new Error('Network.getResponseBody returned no string body');
    if (result.base64Encoded === true) {
      if (result.body.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(result.body)) {
        throw new Error('Network.getResponseBody returned malformed base64');
      }
      return Buffer.from(result.body, 'base64');
    }
    if (result.base64Encoded !== false) throw new Error('Network.getResponseBody omitted base64Encoded');
    return Buffer.from(result.body, 'utf8');
  }

  function beginBodyAttempt(state, triggerSequence) {
    if (artifact.body_attempts.length >= caps.bodyAttempts) {
      stopForOverflow('body-attempts', caps.bodyAttempts, artifact.body_attempts.length + 1);
      return;
    }
    const attempt = {
      observer_session_id: observerSessionId,
      request_id: state.requestId,
      generation: state.generation,
      trigger_sequence: triggerSequence,
      settled_sequence: null,
      provenance: 'direct-Network.getResponseBody',
      state: 'pending',
      byte_count: null,
      sha256: null,
      error: null,
    };
    artifact.body_attempts.push(attempt);
    const promise = Promise.resolve()
      .then(() => session.send('Network.getResponseBody', { requestId: state.requestId }))
      .then((result) => {
        if (!acceptingSettlements || attempt.state !== 'pending') return;
        let bytes;
        try {
          bytes = decodeBody(result);
        } catch (error) {
          attempt.state = result && !Object.prototype.hasOwnProperty.call(result, 'body') ? 'unavailable' : 'error';
          attempt.error = boundedError(error);
          attempt.settled_sequence = nextSequence();
          return;
        }
        attempt.byte_count = bytes.length;
        if (bytes.length > caps.bodyBytes) {
          attempt.state = 'truncated';
          attempt.settled_sequence = nextSequence();
          return;
        }
        attempt.state = 'captured';
        attempt.sha256 = sha256(bytes);
        attempt.settled_sequence = nextSequence();
      }, (error) => {
        if (!acceptingSettlements || attempt.state !== 'pending') return;
        attempt.state = 'error';
        attempt.error = boundedError(error);
        attempt.settled_sequence = nextSequence();
      });
    pending.add(promise);
    promise.then(() => pending.delete(promise), () => pending.delete(promise));
  }

  function onFailure(event) {
    const requestId = getRequestId(event);
    if (!requestId || artifact.status === 'over-cap') return;
    const state = requests.get(requestId);
    if (!state) pushInconsistency('failure-without-request', requestId);
    else if (state.terminal) pushInconsistency('terminal-after-terminal', requestId);
    else if (state.responseCount === 0) pushInconsistency('failure-without-response', requestId);
    const rawErrorText = event?.errorText;
    const errorText = privacySafeFailure(rawErrorText);
    const blockedReason = event?.blockedReason == null ? null : privacySafeBlockedReason(event.blockedReason);
    const reasons = candidateReasons(state, { timestamp: event?.timestamp, errorText: rawErrorText });
    if (artifact.status === 'over-cap') return;
    const inserted = pushEvent({
      kind: 'failure',
      request_id: requestId,
      generation: state?.generation ?? 0,
      timestamp: Number.isFinite(event?.timestamp) ? event.timestamp : null,
      error_text: errorText,
      canceled: event?.canceled === true,
      blocked_reason: blockedReason,
      candidate: reasons.length === 0,
      disqualification_reasons: reasons,
      chain_tainted: state?.chainTainted ?? false,
    });
    if (!inserted) return;
    const triggerSequence = artifact.events.at(-1).sequence;
    if (state) state.terminal = true;
    requests.delete(requestId);
    if (reasons.length === 0) {
      if (artifact.summaryTargetCount == null) artifact.summaryTargetCount = 0;
      artifact.summaryTargetCount += 1;
      if (artifact.summaryTargetCount > caps.targetGenerations) {
        stopForOverflow('target-generations', caps.targetGenerations, artifact.summaryTargetCount);
        return;
      }
      beginBodyAttempt(state, triggerSequence);
    }
  }

  function onFinished(event) {
    const requestId = getRequestId(event);
    if (!requestId || artifact.status === 'over-cap') return;
    const state = requests.get(requestId);
    if (!state) pushInconsistency('finish-without-request', requestId);
    else if (state.terminal) pushInconsistency('terminal-after-terminal', requestId);
    pushEvent({
      kind: 'finish',
      request_id: requestId,
      generation: state?.generation ?? 0,
      timestamp: Number.isFinite(event?.timestamp) ? event.timestamp : null,
      encoded_data_length: Number.isFinite(event?.encodedDataLength) ? event.encodedDataLength : null,
      chain_tainted: state?.chainTainted ?? false,
    });
    if (state) state.terminal = true;
    requests.delete(requestId);
  }

  const handlers = {
    'Network.requestWillBeSent': (event) => guardHandler(() => onRequest(event)),
    'Network.responseReceived': (event) => guardHandler(() => onResponse(event)),
    'Network.loadingFailed': (event) => guardHandler(() => onFailure(event)),
    'Network.loadingFinished': (event) => guardHandler(() => onFinished(event)),
  };

  function guardHandler(action) {
    if (closed || artifact.status === 'over-cap') return;
    try {
      action();
    } catch (error) {
      artifact.status = 'runtime-error';
      artifact.inconsistencies.push({ sequence: nextSequence(), code: 'listener-error', error: boundedError(error) });
      removeListeners();
    }
  }

  async function cleanupAfterSetupFailure() {
    removeListeners();
    await detachOnce(activeCloseDeadline ?? now() + closeTimeoutMs);
  }

  const setupPromise = Promise.resolve()
    .then(() => options.createSession())
    .then(async (createdSession) => {
      session = createdSession;
      sessionOwned = true;
      if (setupCancelled) {
        await detachOnce(activeCloseDeadline ?? now() + closeTimeoutMs);
        throw new Error('CDP collection setup completed after cancellation');
      }
      for (const event of NETWORK_EVENTS) {
        session.on(event, handlers[event]);
        installed.push({ event, handler: handlers[event] });
      }
      await session.send('Network.enable', {});
      if (setupCancelled) throw new Error('CDP collection setup canceled');
      artifact.setup.state = 'ready';
      if (artifact.status === 'initializing') artifact.status = 'collecting';
    })
    .catch(async (error) => {
      artifact.setup.state = 'error';
      artifact.setup.primary_error = boundedError(error);
      artifact.status = 'setup-error';
      await cleanupAfterSetupFailure();
      throw new Error(`CDP collection setup failed: ${boundedError(error)}`);
    });

  async function awaitReady() {
    const result = await settleWithin(setupPromise, closeTimeoutMs);
    if (result.timedOut) {
      setupCancelled = true;
      artifact.setup.state = 'timeout';
      artifact.setup.primary_error = 'CDP collection setup timed out';
      artifact.status = 'setup-error';
      throw new Error(artifact.setup.primary_error);
    }
    if (result.error) throw result.error;
  }

  async function closeAndFlush() {
    if (closePromise) return closePromise;
    closePromise = (async () => {
      closed = true;
      removeListeners();
      const deadline = now() + closeTimeoutMs;
      activeCloseDeadline = deadline;
      const setupResult = await settleUntil(setupPromise, deadline, now);
      if (setupResult.timedOut) {
        setupCancelled = true;
        if (artifact.status !== 'over-cap' && artifact.status !== 'setup-error') artifact.status = 'flush-timeout';
      }
      removeListeners();
      const pendingResult = await settleUntil(Promise.allSettled([...pending]), deadline, now);
      if (pendingResult.timedOut) {
        artifact.flush.pending_at_deadline = [...artifact.body_attempts].filter((row) => row.state === 'pending').length;
        for (const attempt of artifact.body_attempts) {
          if (attempt.state === 'pending') attempt.settled_sequence = nextSequence();
        }
        if (artifact.status !== 'over-cap' && artifact.status !== 'setup-error') artifact.status = 'flush-timeout';
      }
      acceptingSettlements = false;
      await detachOnce(deadline);
      if (artifact.flush.detach === 'detach-timeout' && artifact.status !== 'over-cap' && artifact.status !== 'setup-error') artifact.status = 'flush-timeout';
      if (artifact.flush.detach === 'detach-error' && artifact.status !== 'over-cap' && artifact.status !== 'setup-error') artifact.status = 'runtime-error';
      if (artifact.status === 'collecting' || artifact.status === 'initializing') artifact.status = 'complete';
      artifact.flush.state = 'closed';
      artifact.summary = {
        rows_by_kind: Object.fromEntries(NETWORK_EVENTS.map((event) => {
          const kind = event.slice('Network.'.length).replace('requestWillBeSent', 'request').replace('responseReceived', 'response').replace('loadingFailed', 'failure').replace('loadingFinished', 'finish');
          return [kind, artifact.events.filter((row) => row.kind === kind).length];
        })),
        target_like_failures: artifact.summaryTargetCount ?? 0,
        body_attempts_by_state: Object.fromEntries(['captured', 'unavailable', 'error', 'pending', 'truncated'].map((state) => [state, artifact.body_attempts.filter((row) => row.state === state).length])),
        inconsistencies: artifact.inconsistencies.length,
        cap_violations: artifact.overflow_receipts.length,
        pending_at_flush: artifact.body_attempts.filter((row) => row.state === 'pending').length,
        complete_through_stop_only: artifact.status === 'over-cap',
      };
      delete artifact.summaryTargetCount;
      snapshot = freezeDeep(JSON.parse(JSON.stringify(artifact)));
      return snapshot;
    })();
    return closePromise;
  }

  return { awaitReady, closeAndFlush };
}

function settleWithin(promise, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve({ timedOut: true, value: null, error: null });
    }, Math.max(0, timeoutMs));
    Promise.resolve(promise).then((value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ timedOut: false, value, error: null });
    }, (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ timedOut: false, value: null, error });
    });
  });
}

function settleUntil(promise, deadline, now) {
  return settleWithin(promise, Math.max(0, deadline - now()));
}

module.exports = { startCdpNetworkCollection };
