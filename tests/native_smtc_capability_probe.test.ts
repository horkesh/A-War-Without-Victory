import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from 'vitest';

/*
 * Focused contract tests for the read-only native SMTC capability probe.
 *
 * Every Python process below runs with -B and imports the utility through a
 * synthetic backend or fake COM vtables. No real Windows Runtime API, media
 * command, session enumeration, application identity or metadata read occurs.
 */

const PYTHON = 'C:/Python314/python.exe';

const HARNESS = String.raw`
import ctypes
import contextlib
import importlib.util
import io
import json
import math
import sys
import uuid
from pathlib import Path

_real_windll = ctypes.WinDLL

def _forbidden_windll(*args, **kwargs):
    raise AssertionError('ctypes.WinDLL was called during import')

ctypes.WinDLL = _forbidden_windll
try:
    spec = importlib.util.spec_from_file_location(
        'native_smtc_capability_probe',
        Path.cwd() / 'tools' / 'ui' / 'native_smtc_capability_probe.py',
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
finally:
    ctypes.WinDLL = _real_windll

CASES = {}

def case(fn):
    CASES[fn.__name__[5:]] = fn
    return fn

class ScriptedBackend:
    name = 'scripted'

    DEFAULTS = {
        'initialize': 0,
        'create_string': (0, 0x1001),
        'get_activation_factory': (0, 0x2001),
        'request_async': (0, 0x3001),
        'async_query_info': (0, 0x4001),
        'async_status': (0, 1),
        'async_error_code': (0, 0),
        'async_get_results': (0, 0x5001),
        'manager_query': (0, 0x6001),
        'async_cancel': 0,
        'async_close': 0,
        'release': 0,
        'delete_string': 0,
        'uninitialize': None,
    }

    def __init__(self, **responses):
        self.responses = dict(responses)
        self.calls = []
        self.counts = {}
        self.iids = []
        self.strings = []

    def _next(self, name):
        self.calls.append(name)
        self.counts[name] = self.counts.get(name, 0) + 1
        value = self.responses.get(name, self.DEFAULTS[name])
        if isinstance(value, list):
            if not value:
                raise AssertionError('response list exhausted for ' + name)
            value = value.pop(0)
        if callable(value):
            value = value()
        return value

    def initialize(self):
        return self._next('initialize')

    def create_string(self, text):
        self.strings.append(text)
        return self._next('create_string')

    def get_activation_factory(self, hstring, iid):
        self.iids.append(iid)
        return self._next('get_activation_factory')

    def request_async(self, factory):
        return self._next('request_async')

    def async_query_info(self, operation):
        return self._next('async_query_info')

    def async_status(self, info):
        return self._next('async_status')

    def async_error_code(self, info):
        return self._next('async_error_code')

    def async_get_results(self, operation):
        return self._next('async_get_results')

    def manager_query(self, manager):
        self.iids.append(mod.IID_MANAGER)
        return self._next('manager_query')

    def async_cancel(self, info):
        return self._next('async_cancel')

    def async_close(self, info):
        return self._next('async_close')

    def release(self, pointer):
        return self._next('release')

    def delete_string(self, hstring):
        return self._next('delete_string')

    def uninitialize(self):
        return self._next('uninitialize')

def make_vtable(callbacks):
    array = (ctypes.c_void_p * len(callbacks))(*[
        ctypes.cast(callback, ctypes.c_void_p).value for callback in callbacks
    ])
    object_memory = (ctypes.c_void_p * 1)(ctypes.cast(array, ctypes.c_void_p).value)
    pointer = ctypes.cast(object_memory, ctypes.c_void_p)
    return pointer, [array, object_memory] + list(callbacks)

@case
def test_abi():
    assert mod.RUNTIME_CLASS == 'Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager'
    assert str(mod.IID_STATICS) == '2050c4ee-11a0-57de-aed7-c97c70338245'
    assert str(mod.IID_MANAGER) == 'cace8eac-e86e-504a-ab31-5ff8ff1bce49'
    assert str(mod.IID_ASYNC_INFO) == '00000036-0000-0000-c000-000000000046'
    assert mod.SLOT_QUERY_INTERFACE == 0
    assert mod.SLOT_RELEASE == 2
    assert mod.SLOT_REQUEST_ASYNC == 6
    assert mod.SLOT_ASYNC_ID == 6
    assert mod.SLOT_ASYNC_STATUS == 7
    assert mod.SLOT_ASYNC_ERROR_CODE == 8
    assert mod.SLOT_ASYNC_CANCEL == 9
    assert mod.SLOT_ASYNC_CLOSE == 10
    assert mod.SLOT_ASYNC_GET_RESULTS == 8
    assert mod.RO_INIT_MULTITHREADED == 1
    assert mod.ASYNC_STATUS_STARTED == 0
    assert mod.ASYNC_STATUS_COMPLETED == 1
    assert mod.ASYNC_STATUS_CANCELED == 2
    assert mod.ASYNC_STATUS_ERROR == 3
    assert mod.E_ACCESSDENIED == -2147024891
    assert ctypes.sizeof(mod.HRESULT) == 4
    assert ctypes.sizeof(ctypes.c_void_p) == 8
    assert ctypes.sizeof(mod.GUID) == 16
    assert len(mod.IID_STATICS.bytes_le) == 16
    assert mod.HRESULT(0x80070005).value == -2147024891
    assert getattr(mod, '_DLL_LOADS', 0) == 0
    return {
        'slots': {
            'query': mod.SLOT_QUERY_INTERFACE,
            'release': mod.SLOT_RELEASE,
            'request_async': mod.SLOT_REQUEST_ASYNC,
            'async_status': mod.SLOT_ASYNC_STATUS,
            'async_error': mod.SLOT_ASYNC_ERROR_CODE,
            'async_cancel': mod.SLOT_ASYNC_CANCEL,
            'async_close': mod.SLOT_ASYNC_CLOSE,
            'async_get_results': mod.SLOT_ASYNC_GET_RESULTS,
        },
        'hresult_size': ctypes.sizeof(mod.HRESULT),
        'pointer_size': ctypes.sizeof(ctypes.c_void_p),
        'guid_size': ctypes.sizeof(mod.GUID),
        'dll_loads': getattr(mod, '_DLL_LOADS', 0),
    }

@case
def test_com_slots():
    calls = []
    holder = []
    QI = ctypes.WINFUNCTYPE(ctypes.c_int32, ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))
    REL = ctypes.WINFUNCTYPE(ctypes.c_uint32, ctypes.c_void_p)
    NOARG = ctypes.WINFUNCTYPE(ctypes.c_int32, ctypes.c_void_p)
    STAT = ctypes.WINFUNCTYPE(ctypes.c_int32, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int32))
    GET = ctypes.WINFUNCTYPE(ctypes.c_int32, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))

    def qi(this, iid, out):
        calls.append(('query', ctypes.string_at(iid, 16)))
        out[0] = ctypes.c_void_p(0x111)
        return 0

    def release(this):
        calls.append(('release', this))
        return 3

    def noarg(this):
        calls.append(('noarg', this))
        return 0

    def status(this, out):
        calls.append(('status', this))
        out[0] = ctypes.c_int32(1)
        return 0

    def error(this, out):
        calls.append(('error', this))
        out[0] = ctypes.c_int32(-2147024891)
        return 0

    def get_results(this, out):
        calls.append(('get_results', this))
        out[0] = ctypes.c_void_p(0x222)
        return 0

    def request(this, out):
        calls.append(('request', this))
        out[0] = ctypes.c_void_p(0x333)
        return 0

    cb_qi = QI(qi)
    cb_release = REL(release)
    cb_noarg = NOARG(noarg)
    cb_status = STAT(status)
    cb_error = STAT(error)
    cb_get = GET(get_results)
    cb_request = GET(request)
    info_callbacks = [cb_qi, cb_release, cb_release, cb_noarg, cb_noarg, cb_noarg, cb_noarg, cb_status, cb_error, cb_noarg, cb_noarg]
    info, info_holder = make_vtable(info_callbacks)
    operation_callbacks = [cb_qi, cb_release, cb_release, cb_noarg, cb_noarg, cb_noarg, cb_noarg, cb_noarg, cb_get]
    operation, operation_holder = make_vtable(operation_callbacks)
    statics_callbacks = [cb_qi, cb_release, cb_release, cb_noarg, cb_noarg, cb_noarg, cb_request]
    statics, statics_holder = make_vtable(statics_callbacks)
    holder.extend(info_holder + operation_holder + statics_holder)

    hr, out = mod.com_query_interface(info, mod.IID_MANAGER)
    assert hr == 0 and out == 0x111
    assert calls[-1] == ('query', mod.IID_MANAGER.bytes_le)
    assert mod.com_release(info) == 3
    hr, value = mod.com_async_info_status(info)
    assert (hr, value) == (0, 1)
    hr, value = mod.com_async_info_error_code(info)
    assert (hr, value) == (0, -2147024891)
    assert mod.com_async_info_cancel(info) == 0
    assert mod.com_async_info_close(info) == 0
    hr, out = mod.com_async_operation_get_results(operation)
    assert (hr, out) == (0, 0x222)
    hr, out = mod.com_request_async(statics)
    assert (hr, out) == (0, 0x333)
    return {'calls': [name for name, *_ in calls], 'query_iid_hex': calls[0][1].hex()}

@case
def test_success():
    results = []
    for init_hr in (0, 1):
        backend = ScriptedBackend(initialize=init_hr, async_status=[(0, 0), (0, 1)])
        result = mod.probe(backend=backend, timeout_seconds=1)
        assert result['status'] == 'available', result
        assert result['phase'] == 'done', result
        assert result['hresult'] == 0, result
        assert result['manager_available'] is True
        assert backend.counts.get('uninitialize', 0) == 1
        assert backend.counts.get('delete_string', 0) == 1
        assert backend.counts.get('async_close', 0) == 1
        assert backend.counts.get('async_cancel', 0) == 0
        assert backend.counts.get('release', 0) == 5
        assert backend.counts.get('async_get_results', 0) == 1
        assert backend.iids[0] == mod.IID_STATICS
        assert backend.iids[1] == mod.IID_MANAGER
        assert backend.strings == [mod.RUNTIME_CLASS]
        assert result['cleanup']['ok'] is True
        assert result['cleanup']['ro_uninitialized'] is True
        assert any('session' in call.lower() or 'media' in call.lower() or 'play' in call.lower() for call in backend.calls) is False
        results.append({
            'init_hr': init_hr,
            'status': result['status'],
            'hresult': result['hresult'],
            'manager_available': result['manager_available'],
            'counts': backend.counts,
        })
    return {'success': results}

@case
def test_denials():
    signed = mod.E_ACCESSDENIED
    unsigned = 0x80070005
    scenarios = [
        ('initialize-signed', {'initialize': signed}, 'initialize', 0),
        ('initialize-unsigned', {'initialize': unsigned}, 'initialize', 0),
        ('activation', {'get_activation_factory': (signed, 0)}, 'activation', 0),
        ('request', {'request_async': (unsigned, 0)}, 'request', 0),
        ('async-info', {'async_query_info': (signed, 0)}, 'async-info', 0),
        ('async-status', {'async_status': (signed, 0)}, 'async-status', 1),
        ('async-error', {'async_status': (0, 3), 'async_error_code': (0, unsigned)}, 'async-error', 1),
        ('results', {'async_get_results': (signed, 0)}, 'results', 1),
        ('manager-validate', {'manager_query': (signed, 0)}, 'manager-validate', 1),
    ]
    output = []
    for name, responses, phase, close_count in scenarios:
        backend = ScriptedBackend(**responses)
        result = mod.probe(backend=backend, timeout_seconds=1)
        assert result['status'] == 'access-denied', (name, result)
        assert result['phase'] == phase, (name, result)
        assert result['hresult'] == signed, (name, result)
        assert result['manager_available'] is False
        assert backend.counts.get('async_close', 0) == close_count, (name, backend.counts)
        if name.startswith('initialize'):
            assert backend.counts.get('uninitialize', 0) == 0, (name, backend.counts)
        else:
            assert backend.counts.get('uninitialize', 0) == 1, (name, backend.counts)
        output.append({
            'name': name,
            'status': result['status'],
            'phase': result['phase'],
            'hresult': result['hresult'],
            'counts': backend.counts,
        })
    return {'denials': output}

@case
def test_cancel_timeout():
    canceled_backend = ScriptedBackend(async_status=(0, 2))
    canceled = mod.probe(backend=canceled_backend, timeout_seconds=1)
    assert canceled['status'] == 'canceled'
    assert canceled['phase'] == 'await'
    assert canceled['hresult'] is None
    assert canceled_backend.counts.get('async_cancel', 0) == 0
    assert canceled_backend.counts.get('async_close', 0) == 1
    assert canceled_backend.counts.get('uninitialize', 0) == 1

    clock = {'now': 0.0, 'sleeps': []}
    def monotonic():
        return clock['now']
    def sleep(seconds):
        clock['sleeps'].append(seconds)
        clock['now'] += seconds
    timeout_backend = ScriptedBackend(async_status=lambda: (0, 0))
    timed = mod.probe(backend=timeout_backend, timeout_seconds=0.2, monotonic=monotonic, sleep=sleep)
    assert timed['status'] == 'timeout', timed
    assert timed['phase'] == 'await', timed
    assert timed['hresult'] is None
    assert timeout_backend.counts.get('async_cancel', 0) == 1
    assert timeout_backend.counts.get('async_close', 0) == 1
    assert timeout_backend.counts.get('async_get_results', 0) == 0
    assert timeout_backend.counts.get('uninitialize', 0) == 1
    assert clock['sleeps']
    assert max(clock['sleeps']) <= 0.05 + 1e-9
    return {
        'canceled': {'status': canceled['status'], 'counts': canceled_backend.counts},
        'timeout': {'status': timed['status'], 'counts': timeout_backend.counts, 'sleeps': clock['sleeps']},
    }

@case
def test_nulls():
    scenarios = [
        ('activation', {'get_activation_factory': (0, 0)}),
        ('request', {'request_async': (0, 0)}),
        ('async-info', {'async_query_info': (0, 0)}),
        ('results', {'async_get_results': (0, 0)}),
        ('manager-validate', {'manager_query': (0, 0)}),
    ]
    output = []
    for name, responses in scenarios:
        backend = ScriptedBackend(**responses)
        result = mod.probe(backend=backend, timeout_seconds=1)
        assert result['status'] == 'error', (name, result)
        assert result['phase'] == name, (name, result)
        assert result['hresult'] is None, (name, result)
        assert result['detail'] == 'null-pointer', (name, result)
        assert result['manager_available'] is False
        assert backend.counts.get('uninitialize', 0) == 1
        output.append({'name': name, 'status': result['status'], 'phase': result['phase'], 'counts': backend.counts})
    return {'nulls': output}

@case
def test_timeout_validation():
    backend = ScriptedBackend()
    invalid = []
    for value in (0, -1, '5', None, True, float('nan'), float('inf')):
        result = mod.probe(backend=backend, timeout_seconds=value)
        assert result['status'] == 'invalid-timeout', (value, result)
        assert result['phase'] == 'validate'
        assert result['hresult'] is None
        assert backend.calls == []
        invalid.append(type(value).__name__)
    clamped = mod.probe(
        backend=ScriptedBackend(async_status=(0, 2)),
        timeout_seconds=999,
    )
    assert clamped['timeout_seconds'] == 30.0, clamped
    return {'invalid': invalid, 'clamped': clamped['timeout_seconds']}

@case
def test_unsupported():
    original = mod.WindowsBackend
    class UnsupportedBackend:
        def __init__(self):
            raise mod.UnsupportedPlatform('unsupported-platform')
    class DllFailureBackend:
        def __init__(self):
            raise OSError('simulated dll load failure')
    try:
        mod.WindowsBackend = UnsupportedBackend
        unsupported = mod.probe()
        mod.WindowsBackend = DllFailureBackend
        dll = mod.probe()
    finally:
        mod.WindowsBackend = original
    assert unsupported['status'] == 'unsupported', unsupported
    assert unsupported['phase'] == 'construct'
    assert unsupported['detail'] == 'unsupported-platform'
    assert dll['status'] == 'unsupported', dll
    assert dll['phase'] == 'construct'
    assert dll['detail'] == 'dll-load-failed'
    return {
        'unsupported': {'status': unsupported['status'], 'detail': unsupported['detail']},
        'dll': {'status': dll['status'], 'detail': dll['detail']},
    }

@case
def test_cleanup_failure():
    primary = ScriptedBackend(
        initialize=0,
        get_activation_factory=(mod.E_ACCESSDENIED, 0),
        delete_string=-2147467259,
    )
    primary_result = mod.probe(backend=primary, timeout_seconds=1)
    assert primary_result['status'] == 'access-denied', primary_result
    assert primary_result['hresult'] == mod.E_ACCESSDENIED, primary_result
    assert primary_result['cleanup']['ok'] is False
    assert any(error['step'] == 'delete-string' for error in primary_result['cleanup_errors'])
    assert primary_result['cleanup']['hresult_preserved'] is True

    def boom():
        raise RuntimeError('boom')

    success = ScriptedBackend(initialize=0, async_status=[(0, 0), (0, 1)], uninitialize=boom)
    success_result = mod.probe(backend=success, timeout_seconds=1)
    assert success_result['status'] == 'available', success_result
    assert success_result['hresult'] == 0
    assert success_result['cleanup']['ok'] is False
    assert success_result['cleanup']['ro_initialized'] is True
    assert success_result['cleanup']['ro_uninitialized'] is False
    assert success_result['cleanup']['counts'].get('ro-uninitialize', 0) == 1
    assert any(error['step'] == 'ro-uninitialize' and error['exception'] == 'RuntimeError'
               for error in success_result['cleanup_errors'])
    return {
        'primary': {
            'status': primary_result['status'],
            'hresult': primary_result['hresult'],
            'cleanup': primary_result['cleanup'],
            'errors': primary_result['cleanup_errors'],
        },
        'success': {
            'status': success_result['status'],
            'hresult': success_result['hresult'],
            'cleanup': success_result['cleanup'],
            'errors': success_result['cleanup_errors'],
        },
    }

@case
def test_main_contract():
    original_probe = mod.probe
    outputs = []

    def run(stub):
        mod.probe = lambda timeout_seconds=5, **_: stub
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            code = mod.main([])
        return code, json.loads(buffer.getvalue())

    try:
        clean_code, clean = run({
            'status': 'available',
            'phase': 'done',
            'hresult': 0,
            'hresult_hex': '0x0',
            'manager_available': True,
            'cleanup': {'ok': True, 'ro_initialized': True, 'ro_uninitialized': True},
        })
        failed_code, failed = run({
            'status': 'available',
            'phase': 'done',
            'hresult': 0,
            'hresult_hex': '0x0',
            'manager_available': True,
            'cleanup': {'ok': False, 'ro_initialized': True, 'ro_uninitialized': False},
            'cleanup_errors': [{'step': 'ro-uninitialize', 'hresult': None, 'exception': 'RuntimeError'}],
        })
    finally:
        mod.probe = original_probe

    assert clean_code == 0, clean
    assert clean['status'] == 'available'
    assert clean['hresult'] == 0
    assert clean['cleanup']['ok'] is True

    assert failed_code != 0, failed
    assert failed['status'] == 'available'
    assert failed['hresult'] == 0
    assert failed['manager_available'] is True
    assert failed['cleanup']['ok'] is False
    assert failed['cleanup_errors'][0]['step'] == 'ro-uninitialize'

    return {
        'clean': {'exit': clean_code, 'json': clean},
        'cleanup_failure': {'exit': failed_code, 'json': failed},
    }

name = sys.argv[1]
if name not in CASES:
    raise SystemExit('unknown case ' + name)
try:
    output = CASES[name]()
except Exception as error:
    print(json.dumps({'case_error': type(error).__name__ + ': ' + str(error)}))
    raise
print(json.dumps(output, sort_keys=True))
`;

function runCase(name: string): any {
    const child = spawnSync(PYTHON, ['-B', '-c', HARNESS, name], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
        timeout: 30_000,
    });
    if (child.error) throw child.error;
    const stdout = String(child.stdout ?? '').trim();
    const stderr = String(child.stderr ?? '').trim();
    if (child.status !== 0) {
        throw new Error(`python case ${name} failed with exit ${child.status}\n${stderr || stdout}`);
    }
    const line = stdout.split(/\r?\n/).pop() ?? '';
    const parsed = JSON.parse(line);
    if (parsed.case_error) throw new Error(`${name}: ${parsed.case_error}`);
    return parsed;
}

test('utility import is inert and exposes the exact Windows ABI constants and sizes', () => {
    const output = runCase('abi');
    expect(output.dll_loads).toBe(0);
    expect(output.hresult_size).toBe(4);
    expect(output.pointer_size).toBe(8);
    expect(output.guid_size).toBe(16);
    expect(output.slots).toEqual({
        query: 0,
        release: 2,
        request_async: 6,
        async_status: 7,
        async_error: 8,
        async_cancel: 9,
        async_close: 10,
        async_get_results: 8,
    });
});

test('low-level ctypes callbacks hit the exact COM vtable slots and GUID bytes', () => {
    const output = runCase('com_slots');
    expect(output.query_iid_hex).toBe('ac8ececa6ee84a50ab315ff8ff1bce49');
    expect(output.calls).toContain('query');
    expect(output.calls).toContain('release');
    expect(output.calls).toContain('status');
    expect(output.calls).toContain('error');
    expect(output.calls).toContain('get_results');
    expect(output.calls).toContain('request');
});

test('probe success handles S_OK and S_FALSE with exactly-once cleanup', () => {
    const output = runCase('success');
    for (const result of output.success) {
        expect(result.status).toBe('available');
        expect(result.hresult).toBe(0);
        expect(result.manager_available).toBe(true);
        expect(result.counts.release).toBe(5);
        expect(result.counts.delete_string).toBe(1);
        expect(result.counts.uninitialize).toBe(1);
        expect(result.counts.async_close).toBe(1);
        expect(result.counts.async_cancel ?? 0).toBe(0);
    }
});

test('signed and unsigned HRESULT denials stop at the correct phase', () => {
    const output = runCase('denials');
    expect(output.denials).toHaveLength(9);
    for (const denial of output.denials) {
        expect(denial.status).toBe('access-denied');
        expect(denial.hresult).toBe(-2147024891);
        expect(denial.counts.async_close ?? 0).toBeLessThanOrEqual(1);
    }
});

test('canceled and timed-out operations cancel/close and never fetch results', () => {
    const output = runCase('cancel_timeout');
    expect(output.canceled.status).toBe('canceled');
    expect(output.canceled.counts.async_cancel ?? 0).toBe(0);
    expect(output.canceled.counts.async_close).toBe(1);
    expect(output.timeout.status).toBe('timeout');
    expect(output.timeout.counts.async_cancel).toBe(1);
    expect(output.timeout.counts.async_close).toBe(1);
    expect(output.timeout.counts.async_get_results ?? 0).toBe(0);
    expect(Math.max(...output.timeout.sleeps)).toBeLessThanOrEqual(0.05 + 1e-9);
});

test('null pointers fail closed at each phase without continuing', () => {
    const output = runCase('nulls');
    expect(output.nulls).toHaveLength(5);
    for (const row of output.nulls) {
        expect(row.status).toBe('error');
        expect(row.phase).toBe(row.name);
        expect(row.counts.uninitialize).toBe(1);
    }
});

test('invalid timeouts are rejected without touching the backend and large timeouts clamp', () => {
    const output = runCase('timeout_validation');
    expect(output.invalid).toHaveLength(7);
    expect(output.clamped).toBe(30);
});

test('unsupported platform and DLL construction are reported without activation', () => {
    const output = runCase('unsupported');
    expect(output.unsupported).toEqual({ status: 'unsupported', detail: 'unsupported-platform' });
    expect(output.dll).toEqual({ status: 'unsupported', detail: 'dll-load-failed' });
});

test('cleanup failures are reported while the original result is preserved', () => {
    const output = runCase('cleanup_failure');
    expect(output.primary.status).toBe('access-denied');
    expect(output.primary.hresult).toBe(-2147024891);
    expect(output.primary.cleanup.ok).toBe(false);
    expect(output.primary.cleanup.hresult_preserved).toBe(true);
    expect(output.primary.errors.some((error: any) => error.step === 'delete-string')).toBe(true);
    expect(output.success.status).toBe('available');
    expect(output.success.hresult).toBe(0);
    expect(output.success.cleanup.ok).toBe(false);
    expect(output.success.cleanup.ro_initialized).toBe(true);
    expect(output.success.cleanup.ro_uninitialized).toBe(false);
    expect(output.success.errors.some((error: any) => error.step === 'ro-uninitialize')).toBe(true);
});

test('CLI exits zero only for available with clean cleanup while retaining factual JSON', () => {
    const output = runCase('main_contract');
    expect(output.clean.exit).toBe(0);
    expect(output.clean.json.status).toBe('available');
    expect(output.clean.json.hresult).toBe(0);
    expect(output.clean.json.cleanup.ok).toBe(true);

    expect(output.cleanup_failure.exit).not.toBe(0);
    expect(output.cleanup_failure.json.status).toBe('available');
    expect(output.cleanup_failure.json.hresult).toBe(0);
    expect(output.cleanup_failure.json.manager_available).toBe(true);
    expect(output.cleanup_failure.json.cleanup.ok).toBe(false);
    expect(output.cleanup_failure.json.cleanup_errors[0].step).toBe('ro-uninitialize');
});

test('the utility import does not create a pycache artifact', () => {
    const pycache = join(process.cwd(), 'tools', 'ui', '__pycache__');
    if (!existsSync(pycache)) return;
    const artifacts = readdirSync(pycache).filter((name) =>
        name.startsWith('native_smtc_capability_probe') && name.endsWith('.pyc'));
    expect(artifacts).toEqual([]);
});
