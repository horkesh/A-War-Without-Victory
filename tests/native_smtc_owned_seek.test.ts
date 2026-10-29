import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from 'vitest';

/*
 * Focused tests for the Windows SMTC owned-seek negative-control adapter.
 *
 * Every case runs the real Python functions with -B against synthetic backends
 * or fake COM vtables. No Windows runtime, process, network, media command or
 * real session is touched.
 */

const PYTHON = 'C:/Python314/python.exe';

const HARNESS = String.raw`
import ctypes
import importlib.util
import json
import os
import sys
import uuid
from pathlib import Path

_real_windll = ctypes.WinDLL

def _forbidden_windll(*args, **kwargs):
    raise AssertionError('ctypes.WinDLL was called during import')

ctypes.WinDLL = _forbidden_windll
try:
    spec = importlib.util.spec_from_file_location(
        'native_smtc_owned_seek',
        Path.cwd() / 'tools' / 'ui' / 'native_smtc_owned_seek.py',
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
finally:
    ctypes.WinDLL = _real_windll

CASES = {}

def case(fn):
    CASES[fn.__name__[5:]] = fn
    return fn

def nonce(seed='a'):
    return 'com.awwv.qa.' + (seed * 32)[:32].lower()

EXE = r'C:\Program Files\AWWV\electron.exe'

class ScriptedBackend:
    name = 'scripted'

    def __init__(self, enumerations=None, statuses=None, position_result=True,
                 position_hr=0, position_operation=0x6001,
                 manager_error=None, source_error_hr=None, dispatch_error_hr=None,
                 async_info_hr=0, fail_release_all=False, fail_release_pointers=None,
                 fail_delete=False, size_override=None, image_path=None):
        self.enumerations = [list(row) for row in (enumerations or [[]])]
        self.statuses = list(statuses or [(0, 1)])
        self.position_result = position_result
        self.position_hr = position_hr
        self.position_operation = position_operation
        self.manager_error = manager_error
        self.source_error_hr = source_error_hr
        self.dispatch_error_hr = dispatch_error_hr
        self.async_info_hr = async_info_hr
        self.fail_release_all = fail_release_all
        self.fail_release_pointers = set(fail_release_pointers or ())
        self.fail_delete = fail_delete
        self.size_override = size_override
        self.calls = []
        self.counts = {}
        self.released = []
        self.deleted = []
        self.position_calls = []
        self.status_index = 0
        self.enum_index = 0
        self.info_index = 0
        self.vectors = {}
        self.sessions = {}
        self.hstrings = {}
        self.session_hstrings = {}
        self.manager_ptr = 0x5001
        self.validated_ptr = 0x5002
        self.vector_ptr = 0x7000
        self.session_ptr = 0x7100
        self.hstring_ptr = 0x7200

    def _call(self, name):
        self.calls.append(name)
        self.counts[name] = self.counts.get(name, 0) + 1

    def initialize(self):
        self._call('initialize')
        return 0

    def create_string(self, text):
        self._call('create_string')
        return 0, 0x1001

    def get_activation_factory(self, hstring, iid):
        self._call('get_activation_factory')
        return 0, 0x2001

    def request_async(self, factory):
        self._call('request_async')
        return 0, 0x3001

    def async_query_info(self, operation):
        self._call('async_query_info')
        self.info_index += 1
        if self.async_info_hr:
            return self.async_info_hr, 0
        return 0, 0x4000 + self.info_index

    def async_status(self, info):
        self._call('async_status')
        value = self.statuses[self.status_index] if self.status_index < len(self.statuses) else (0, 1)
        self.status_index += 1
        return value

    def async_error_code(self, info):
        self._call('async_error_code')
        return 0, self.dispatch_error_hr if self.dispatch_error_hr is not None else 0

    def async_cancel(self, info):
        self._call('async_cancel')
        return 0

    def async_close(self, info):
        self._call('async_close')
        return 0

    def async_get_results(self, operation):
        self._call('async_get_results')
        if self.manager_error is not None:
            return self.manager_error, 0
        return 0, self.manager_ptr

    def manager_query(self, manager):
        self._call('manager_query')
        return 0, self.validated_ptr

    def get_sessions(self, manager):
        self._call('get_sessions')
        if self.enum_index >= len(self.enumerations):
            raise AssertionError('no enumeration scripted')
        records = self.enumerations[self.enum_index]
        self.enum_index += 1
        vector = self.vector_ptr + self.enum_index
        sessions = []
        for index, record in enumerate(records):
            session = self.session_ptr + index + ((self.enum_index - 1) * 0x100)
            hstring = self.hstring_ptr + index + ((self.enum_index - 1) * 0x100)
            self.sessions[session] = record
            self.hstrings[hstring] = record
            self.session_hstrings[session] = hstring
            sessions.append(session)
        self.vectors[vector] = sessions
        return 0, vector

    def sessions_size(self, vector):
        self._call('sessions_size')
        if self.size_override is not None:
            return 0, self.size_override
        return 0, len(self.vectors.get(vector, []))

    def sessions_get_at(self, vector, index):
        self._call('sessions_get_at')
        sessions = self.vectors.get(vector, [])
        if index >= len(sessions):
            return -2147467259, 0
        return 0, sessions[index]

    def session_source_id(self, session):
        self._call('session_source_id')
        record = self.sessions.get(session, {})
        if self.source_error_hr is not None:
            return self.source_error_hr, 0
        if record.get('source_hr') is not None:
            return record['source_hr'], 0
        return 0, self.session_hstrings.get(session, self.hstring_ptr)

    def source_id_text(self, hstring):
        self._call('source_id_text')
        record = self.hstrings.get(hstring)
        if record is None:
            return -2147467259, None
        if record.get('text_hr') is not None:
            return record['text_hr'], None
        return 0, record.get('id', '')

    def canonical_unknown(self, session):
        self._call('canonical_unknown')
        record = self.sessions.get(session, {})
        return 0, record.get('canonical', session)

    def session_try_change_position(self, session, ticks):
        self._call('session_try_change_position')
        self.position_calls.append((session, ticks))
        if self.position_hr:
            return self.position_hr, 0
        return 0, self.position_operation

    def async_get_results_bool(self, operation):
        self._call('async_get_results_bool')
        return 0, self.position_result

    def release(self, pointer):
        self._call('release')
        self.released.append(pointer)
        if self.fail_release_all or pointer in self.fail_release_pointers:
            return -2147024891
        return 0

    def delete_string(self, hstring):
        self._call('delete_string')
        self.deleted.append(hstring)
        return -2147024891 if self.fail_delete else 0

    def uninitialize(self):
        self._call('uninitialize')


class ScriptedProcessBackend:
    def __init__(self, image_path=EXE, creation=123456789, exit_code=259,
                 open_hr=0, close_hr=0):
        self.image_path = image_path
        self.creation = creation
        self.exit_code = exit_code
        self.open_hr = open_hr
        self.close_hr = close_hr
        self.calls = []
        self.closed = []
        self.handle = 0x9001

    def open_process(self, pid):
        self.calls.append(('open_process', pid))
        if self.open_hr:
            return self.open_hr, 0
        return 0, self.handle

    def query_image_path(self, handle):
        self.calls.append(('query_image_path', handle))
        return 0, self.image_path

    def get_process_times(self, handle):
        self.calls.append(('get_process_times', handle))
        return 0, self.creation

    def get_exit_code(self, handle):
        self.calls.append(('get_exit_code', handle))
        return 0, self.exit_code

    def close_handle(self, handle):
        self.calls.append(('close_handle', handle))
        self.closed.append(handle)
        return self.close_hr


def make_vtable(callbacks):
    array = (ctypes.c_void_p * len(callbacks))(*[
        ctypes.cast(callback, ctypes.c_void_p).value for callback in callbacks
    ])
    memory = (ctypes.c_void_p * 1)(ctypes.cast(array, ctypes.c_void_p).value)
    pointer = ctypes.cast(memory, ctypes.c_void_p)
    return pointer, [array, memory] + list(callbacks)


def baseline_for(expected, backend=None):
    backend = backend or ScriptedBackend(enumerations=[[]])
    return mod.count_matching_sessions(expected, backend=backend, timeout_seconds=1), backend


def owner_proof_for(backend=None):
    backend = backend or ScriptedProcessBackend()
    return mod.inspect_owned_process(1234, EXE, process_backend=backend), backend


def request_backend(first, second, **kwargs):
    return ScriptedBackend(enumerations=[first, second], statuses=kwargs.pop('statuses', [(0, 1), (0, 1)]), **kwargs)


@case
def test_abi():
    assert mod.SLOT_QUERY_INTERFACE == 0
    assert mod.SLOT_RELEASE == 2
    assert mod.SLOT_MANAGER_GET_SESSIONS == 7
    assert mod.SLOT_VECTOR_GET_AT == 6
    assert mod.SLOT_VECTOR_SIZE == 7
    assert mod.SLOT_SESSION_SOURCE_ID == 6
    assert mod.SLOT_SESSION_CHANGE_POSITION == 24
    assert mod.PROCESS_QUERY_LIMITED_INFORMATION == 0x1000
    assert mod.STILL_ACTIVE == 259
    assert mod.IID_IUNKNOWN == uuid.UUID('00000000-0000-0000-c000-000000000046')
    assert ctypes.sizeof(mod.FILETIME) == 8
    assert not hasattr(mod, 'enumerate_processes')
    assert mod.valid_expected_id('com.awwv.qa.' + 'a' * 32)
    assert not mod.valid_expected_id('com.awwv.desktop')
    assert not mod.valid_expected_id('com.awwv.qa.' + 'A' * 32)
    return {
        'sizes': {'fileread': ctypes.sizeof(mod.FILETIME), 'pointer': ctypes.sizeof(ctypes.c_void_p)},
        'slots': {
            'manager_sessions': mod.SLOT_MANAGER_GET_SESSIONS,
            'vector_get_at': mod.SLOT_VECTOR_GET_AT,
            'vector_size': mod.SLOT_VECTOR_SIZE,
            'session_source': mod.SLOT_SESSION_SOURCE_ID,
            'session_position': mod.SLOT_SESSION_CHANGE_POSITION,
        },
    }

@case
def test_com_boundaries():
    calls = []
    holder = []
    HRESULT = ctypes.c_int32
    QI = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))
    REL = ctypes.WINFUNCTYPE(ctypes.c_uint32, ctypes.c_void_p)
    GETPTR = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))
    UINT = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32))
    GETAT = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.c_uint32, ctypes.POINTER(ctypes.c_void_p))
    POSITION = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.c_int64, ctypes.POINTER(ctypes.c_void_p))
    BOOLGET = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_bool))

    def qi(this, iid, out):
        calls.append(('query', ctypes.string_at(iid, 16)))
        out[0] = ctypes.c_void_p(0x1111)
        return 0

    def release(this):
        calls.append(('release', this))
        return 1

    def get_sessions(this, out):
        calls.append(('get_sessions', this))
        out[0] = ctypes.c_void_p(0x2222)
        return 0

    def vector_size(this, out):
        calls.append(('vector_size', this))
        out[0] = ctypes.c_uint32(1)
        return 0

    def vector_get_at(this, index, out):
        calls.append(('vector_get_at', this, index))
        out[0] = ctypes.c_void_p(0x3333)
        return 0

    def source_id(this, out):
        calls.append(('source_id', this))
        out[0] = ctypes.c_void_p(0x4444)
        return 0

    def position(this, ticks, out):
        calls.append(('position', this, ticks))
        out[0] = ctypes.c_void_p(0x5555)
        return 0

    def bool_result(this, out):
        calls.append(('bool_result', this))
        out[0] = ctypes.c_bool(True)
        return 0

    cb_qi, cb_release = QI(qi), REL(release)
    cb_get_sessions = GETPTR(get_sessions)
    cb_size, cb_get_at = UINT(vector_size), GETAT(vector_get_at)
    cb_source = GETPTR(source_id)
    cb_position = POSITION(position)
    cb_bool = BOOLGET(bool_result)
    manager, mh = make_vtable([cb_qi, cb_release, cb_release, cb_release, cb_release, cb_release, cb_release, cb_get_sessions])
    vector, vh = make_vtable([cb_qi, cb_release, cb_release, cb_release, cb_release, cb_release, cb_get_at, cb_size])
    session, sh = make_vtable([
        cb_qi, cb_release, cb_release, cb_release, cb_release, cb_release, cb_source,
        cb_release, cb_release, cb_release, cb_release, cb_release, cb_release, cb_release,
        cb_release, cb_release, cb_release, cb_release, cb_release, cb_release, cb_release,
        cb_release, cb_release, cb_release, cb_position,
    ])
    operation, oh = make_vtable([
        cb_qi, cb_release, cb_release, cb_release, cb_release, cb_release, cb_release,
        cb_release, cb_bool,
    ])
    holder.extend(mh + vh + sh + oh)

    hr, vector_out = mod.com_manager_get_sessions(manager)
    assert (hr, vector_out) == (0, 0x2222)
    hr, size = mod.com_vector_size(vector)
    assert (hr, size) == (0, 1)
    hr, session_out = mod.com_vector_get_at(vector, 0)
    assert (hr, session_out) == (0, 0x3333)
    hr, hstring = mod.com_session_source_id(session)
    assert (hr, hstring) == (0, 0x4444)
    hr, operation_out = mod.com_session_try_change_position(session, 0)
    assert (hr, operation_out) == (0, 0x5555)
    hr, result = mod.com_async_operation_get_results_bool(operation)
    assert (hr, result) == (0, True)
    assert ('position', session.value, 0) in calls
    assert ('vector_get_at', vector.value, 0) in calls
    return {'calls': calls, 'bool_result': result}

@case
def test_count_matching():
    expected = nonce('a')
    foreign = 'foreign.app.media'
    zero_backend = ScriptedBackend(enumerations=[[{'id': foreign, 'canonical': 0x11}]])
    zero = mod.count_matching_sessions(expected, backend=zero_backend, timeout_seconds=1)
    assert zero['status'] == 'ok', zero
    assert zero['matchingCount'] == 0
    assert zero['baselineEligible'] is True
    assert zero['valid'] is True and zero['fresh'] is True
    assert foreign not in json.dumps(zero)
    assert zero['cleanup']['ok'] is True

    one_backend = ScriptedBackend(enumerations=[[{'id': expected, 'canonical': 0x22}]])
    one = mod.count_matching_sessions(expected, backend=one_backend, timeout_seconds=1)
    assert one['matchingCount'] == 1 and one['controlEligible'] is True
    assert one['baselineEligible'] is False

    two_backend = ScriptedBackend(enumerations=[[
        {'id': expected, 'canonical': 0x31},
        {'id': expected, 'canonical': 0x32},
    ]])
    two = mod.count_matching_sessions(expected, backend=two_backend, timeout_seconds=1)
    assert two['matchingCount'] == 2
    assert two['valid'] is True
    assert two['baselineEligible'] is False and two['controlEligible'] is False

    invalid_backend = ScriptedBackend()
    invalid = mod.count_matching_sessions('com.awwv.desktop', backend=invalid_backend, timeout_seconds=1)
    assert invalid['status'] == 'invalid-id'
    missing_id = mod.count_matching_sessions(None, backend=invalid_backend, timeout_seconds=1)
    assert missing_id['status'] == 'invalid-id'
    assert invalid_backend.calls == []

    cap_backend = ScriptedBackend(enumerations=[[{'id': expected, 'canonical': 0x41}]], size_override=33)
    cap = mod.count_matching_sessions(expected, backend=cap_backend, timeout_seconds=1)
    assert cap['status'] == 'vector-cap'
    assert cap['valid'] is False and cap['complete'] is False

    error_backend = ScriptedBackend(enumerations=[[{'id': expected, 'canonical': 0x51, 'source_hr': mod.E_ACCESSDENIED}]])
    error = mod.count_matching_sessions(expected, backend=error_backend, timeout_seconds=1)
    assert error['status'] == 'access-denied', error
    assert error['valid'] is False
    assert error['cleanup']['ok'] is True
    assert error_backend.counts.get('release', 0) > 0

    string_error_backend = ScriptedBackend(enumerations=[[{'id': expected, 'canonical': 0x52, 'text_hr': mod.E_ACCESSDENIED}]])
    string_error = mod.count_matching_sessions(expected, backend=string_error_backend, timeout_seconds=1)
    assert string_error['status'] == 'access-denied', string_error
    assert string_error['valid'] is False

    return {
        'zero': {'matching': zero['matchingCount'], 'baseline': zero['baselineEligible']},
        'one': {'matching': one['matchingCount'], 'control': one['controlEligible']},
        'two': {'matching': two['matchingCount']},
        'cap': cap['status'],
        'error': error['status'],
    }

@case
def test_process_proof():
    proof_backend = ScriptedProcessBackend()
    proof = mod.inspect_owned_process(1234, EXE, process_backend=proof_backend)
    assert proof['status'] == 'ok', proof
    assert proof['live'] is True
    assert proof['creationTime'] == 123456789
    assert proof['imagePath'] == EXE
    assert proof_backend.closed == [0x9001]

    wrong_backend = ScriptedProcessBackend(image_path=r'C:\Other\app.exe')
    wrong = mod.inspect_owned_process(1234, EXE, process_backend=wrong_backend)
    assert wrong['status'] == 'wrong-executable', wrong

    dead_backend = ScriptedProcessBackend(exit_code=0)
    dead = mod.inspect_owned_process(1234, EXE, process_backend=dead_backend)
    assert dead['status'] == 'dead', dead

    denied_backend = ScriptedProcessBackend(open_hr=mod.E_ACCESSDENIED)
    denied = mod.inspect_owned_process(1234, EXE, process_backend=denied_backend)
    assert denied['status'] == 'access-denied', denied
    assert denied['cleanup']['ok'] is True

    close_backend = ScriptedProcessBackend(image_path=r'C:\Other\app.exe', close_hr=mod.E_ACCESSDENIED)
    close = mod.inspect_owned_process(1234, EXE, process_backend=close_backend)
    assert close['status'] == 'wrong-executable', close
    assert close['cleanup']['ok'] is False
    assert close['cleanup']['errors']

    return {
        'ok': {'status': proof['status'], 'live': proof['live']},
        'wrong': wrong['status'],
        'dead': dead['status'],
        'denied': denied['status'],
    }

@case
def test_request_success():
    expected = nonce('b')
    baseline, _ = baseline_for(expected)
    proof, proof_backend = owner_proof_for()
    backend = request_backend(
        [{'id': expected, 'canonical': 0x1111}],
        [{'id': expected, 'canonical': 0x1111}],
    )
    result = mod.request_owned_zero_seek(
        expected, baseline, proof,
        backend=backend, process_backend=proof_backend, timeout_seconds=1,
    )
    assert result['status'] == 'completed-true', result
    assert result['checks']['baselineZero'] is True
    assert result['checks']['exactlyOneSessionFirst'] is True
    assert result['checks']['exactlyOneSessionSecond'] is True
    assert result['checks']['canonicalStable'] is True
    assert result['checks']['ownerFresh'] is True
    assert result['checks']['controlDispatchAllowed'] is True
    assert result['dispatch']['attempted'] is True
    assert result['dispatch']['attemptCount'] == 1
    assert result['dispatch']['tickPosition'] == 0
    assert result['dispatch']['operationBool'] is True
    assert backend.position_calls == [(0x7100, 0)]
    assert result['rendererSeekCallbackRequired'] is True
    assert result['apiTrueIsProof'] is False
    assert result['playbackSuccessClaimed'] is False
    assert result['diagnosticOnly'] is True
    assert result['naturalOriginAdmitted'] is False
    assert result['expectedId'] == expected
    assert result['ownerPid'] == 1234
    assert backend.counts.get('session_try_change_position', 0) == 1
    assert result['cleanup']['ok'] is True
    assert 'foreign.app.media' not in json.dumps(result)
    return {'status': result['status'], 'dispatch': result['dispatch'], 'checks': result['checks']}

@case
def test_request_preconditions():
    expected = nonce('c')
    baseline, _ = baseline_for(expected)
    proof, proof_backend = owner_proof_for()

    bad_baseline = dict(baseline)
    bad_baseline['matchingCount'] = 1
    backend = request_backend([{'id': expected, 'canonical': 0x2111}], [{'id': expected, 'canonical': 0x2111}])
    result = mod.request_owned_zero_seek(expected, bad_baseline, proof, backend=backend, process_backend=proof_backend, timeout_seconds=1)
    assert result['status'] == 'invalid-baseline'
    bad_baseline_result = result
    assert backend.position_calls == []

    missing_baseline = mod.request_owned_zero_seek(expected, None, proof, backend=backend, process_backend=proof_backend, timeout_seconds=1)
    assert missing_baseline['status'] == 'invalid-baseline'
    wrong_baseline = dict(baseline)
    wrong_baseline['expectedId'] = nonce('e')
    wrong_id_baseline = mod.request_owned_zero_seek(expected, wrong_baseline, proof, backend=backend, process_backend=proof_backend, timeout_seconds=1)
    assert wrong_id_baseline['status'] == 'invalid-baseline'

    bad_owner = {'status': 'error', 'pid': 1234}
    result = mod.request_owned_zero_seek(expected, baseline, bad_owner, backend=backend, process_backend=proof_backend, timeout_seconds=1)
    assert result['status'] == 'invalid-owner-proof'

    missing_backend = request_backend([], [])
    missing = mod.request_owned_zero_seek(expected, baseline, proof, backend=missing_backend, process_backend=proof_backend, timeout_seconds=1)
    assert missing['status'] == 'session-missing'
    assert missing['dispatch']['attemptCount'] == 0

    duplicate_backend = request_backend(
        [{'id': expected, 'canonical': 0x2211}, {'id': expected, 'canonical': 0x2212}],
        [],
    )
    duplicate = mod.request_owned_zero_seek(expected, baseline, proof, backend=duplicate_backend, process_backend=proof_backend, timeout_seconds=1)
    assert duplicate['status'] == 'session-duplicate'
    assert duplicate_backend.position_calls == []

    replaced_backend = request_backend(
        [{'id': expected, 'canonical': 0x2311}],
        [{'id': expected, 'canonical': 0x2312}],
    )
    replaced = mod.request_owned_zero_seek(expected, baseline, proof, backend=replaced_backend, process_backend=proof_backend, timeout_seconds=1)
    assert replaced['status'] == 'identity-changed'
    assert replaced_backend.position_calls == []

    vanished_backend = request_backend(
        [{'id': expected, 'canonical': 0x2411}],
        [],
    )
    vanished = mod.request_owned_zero_seek(expected, baseline, proof, backend=vanished_backend, process_backend=proof_backend, timeout_seconds=1)
    assert vanished['status'] == 'session-missing'

    second_duplicate = request_backend(
        [{'id': expected, 'canonical': 0x2511}],
        [{'id': expected, 'canonical': 0x2511}, {'id': expected, 'canonical': 0x2512}],
    )
    second_dup = mod.request_owned_zero_seek(expected, baseline, proof, backend=second_duplicate, process_backend=proof_backend, timeout_seconds=1)
    assert second_dup['status'] == 'session-duplicate'

    dead_proof_backend = ScriptedProcessBackend()
    dead_proof = mod.inspect_owned_process(1234, EXE, process_backend=dead_proof_backend)
    dead_proof_backend.exit_code = 0
    dead_request = request_backend([{'id': expected, 'canonical': 0x2611}], [{'id': expected, 'canonical': 0x2611}])
    dead = mod.request_owned_zero_seek(expected, baseline, dead_proof, backend=dead_request, process_backend=dead_proof_backend, timeout_seconds=1)
    assert dead['status'] == 'owner-dead', dead
    assert dead_request.position_calls == []

    wrong_path_backend = ScriptedProcessBackend()
    wrong_path_proof = mod.inspect_owned_process(1234, EXE, process_backend=wrong_path_backend)
    wrong_path_backend.image_path = r'C:\Other\app.exe'
    wrong_request = request_backend([{'id': expected, 'canonical': 0x2711}], [{'id': expected, 'canonical': 0x2711}])
    wrong = mod.request_owned_zero_seek(expected, baseline, wrong_path_proof, backend=wrong_request, process_backend=wrong_path_backend, timeout_seconds=1)
    assert wrong['status'] == 'owner-wrong-executable', wrong

    creation_backend = ScriptedProcessBackend()
    creation_proof = mod.inspect_owned_process(1234, EXE, process_backend=creation_backend)
    creation_backend.creation += 1
    creation_request = request_backend([{'id': expected, 'canonical': 0x2811}], [{'id': expected, 'canonical': 0x2811}])
    creation = mod.request_owned_zero_seek(expected, baseline, creation_proof, backend=creation_request, process_backend=creation_backend, timeout_seconds=1)
    assert creation['status'] == 'owner-identity-changed', creation

    denied_process_backend = ScriptedProcessBackend()
    denied_proof = mod.inspect_owned_process(1234, EXE, process_backend=denied_process_backend)
    denied_process_backend.open_hr = mod.E_ACCESSDENIED
    denied_request = request_backend([{'id': expected, 'canonical': 0x2911}], [{'id': expected, 'canonical': 0x2911}])
    denied = mod.request_owned_zero_seek(expected, baseline, denied_proof, backend=denied_request, process_backend=denied_process_backend, timeout_seconds=1)
    assert denied['status'] == 'owner-access-denied', denied
    assert denied_request.position_calls == []

    return {
        'invalid_baseline': bad_baseline_result['status'],
        'missing': missing['status'],
        'duplicate': duplicate['status'],
        'replaced': replaced['status'],
        'vanished': vanished['status'],
        'second_duplicate': second_dup['status'],
        'dead': dead['status'],
        'wrong_path': wrong['status'],
        'creation': creation['status'],
    }

@case
def test_request_results():
    expected = nonce('d')
    baseline, _ = baseline_for(expected)
    proof, proof_backend = owner_proof_for()

    false_backend = request_backend(
        [{'id': expected, 'canonical': 0x3111}],
        [{'id': expected, 'canonical': 0x3111}],
        position_result=False,
    )
    false_result = mod.request_owned_zero_seek(expected, baseline, proof, backend=false_backend, process_backend=proof_backend, timeout_seconds=1)
    assert false_result['status'] == 'completed-false', false_result
    assert false_result['dispatch']['operationBool'] is False
    assert false_backend.counts.get('session_try_change_position', 0) == 1

    error_backend = request_backend(
        [{'id': expected, 'canonical': 0x3211}],
        [{'id': expected, 'canonical': 0x3211}],
        statuses=[(0, 1), (0, 3)],
        dispatch_error_hr=mod.E_ACCESSDENIED,
    )
    error_result = mod.request_owned_zero_seek(expected, baseline, proof, backend=error_backend, process_backend=proof_backend, timeout_seconds=1)
    assert error_result['status'] == 'access-denied', error_result
    assert error_result['hresult'] == mod.E_ACCESSDENIED
    assert error_backend.counts.get('session_try_change_position', 0) == 1

    clock = {'now': 0.0, 'sleeps': []}
    def monotonic():
        return clock['now']
    def sleep(seconds):
        clock['sleeps'].append(seconds)
        clock['now'] += seconds
    timeout_backend = request_backend(
        [{'id': expected, 'canonical': 0x3311}],
        [{'id': expected, 'canonical': 0x3311}],
        statuses=[(0, 1)] + [(0, 0)] * 100,
    )
    timeout_result = mod.request_owned_zero_seek(
        expected, baseline, proof, backend=timeout_backend, process_backend=proof_backend,
        timeout_seconds=0.2, monotonic=monotonic, sleep=sleep,
    )
    assert timeout_result['status'] == 'timeout', timeout_result
    assert timeout_result['dispatch']['attemptCount'] == 1
    assert timeout_backend.counts.get('session_try_change_position', 0) == 1
    assert timeout_backend.counts.get('async_cancel', 0) >= 1
    assert timeout_backend.counts.get('async_close', 0) >= 1

    null_operation_backend = request_backend(
        [{'id': expected, 'canonical': 0x3411}],
        [{'id': expected, 'canonical': 0x3411}],
        position_operation=0,
    )
    null_operation = mod.request_owned_zero_seek(expected, baseline, proof, backend=null_operation_backend, process_backend=proof_backend, timeout_seconds=1)
    assert null_operation['status'] == 'uncertain', null_operation
    assert null_operation['dispatch']['attemptCount'] == 1

    cleanup_backend = request_backend(
        [{'id': expected, 'canonical': 0x3511}],
        [{'id': expected, 'canonical': 0x3511}],
        fail_release_pointers={0x5001},
    )
    cleanup_result = mod.request_owned_zero_seek(expected, baseline, proof, backend=cleanup_backend, process_backend=proof_backend, timeout_seconds=1)
    assert cleanup_result['status'] == 'completed-true', cleanup_result
    assert cleanup_result['cleanup']['ok'] is False
    assert cleanup_result['cleanup']['errors']

    return {
        'false': false_result['status'],
        'error': error_result['status'],
        'timeout': timeout_result['status'],
        'uncertain': null_operation['status'],
        'cleanup': cleanup_result['cleanup'],
    }

@case
def test_cleanup_dispatch_gates():
    expected = nonce('f')
    baseline, _ = baseline_for(expected)
    proof, proof_backend = owner_proof_for()

    vector_backend = request_backend(
        [{'id': expected, 'canonical': 0x4111}],
        [{'id': expected, 'canonical': 0x4111}],
        fail_release_pointers={0x7001},
    )
    vector = mod.request_owned_zero_seek(
        expected, baseline, proof, backend=vector_backend,
        process_backend=proof_backend, timeout_seconds=1,
    )
    assert vector['status'] == 'cleanup-failed', vector
    assert vector['dispatch']['attempted'] is False
    assert vector['dispatch']['attemptCount'] == 0
    assert vector['dispatch']['tickPosition'] is None
    assert vector_backend.position_calls == []
    assert vector['cleanup']['ok'] is False
    assert vector['checks']['cleanupCleared'] is False
    assert vector['checks']['controlDispatchAllowed'] is False
    assert vector_backend.released.count(0x7001) == 1
    assert vector_backend.released.count(0x7100) == 1
    assert vector_backend.released.count(0x4111) == 1
    assert any(error['step'] == 'release-vector' for error in vector['cleanup']['errors'])

    close_backend = ScriptedProcessBackend()
    close_proof = mod.inspect_owned_process(1234, EXE, process_backend=close_backend)
    assert close_proof['cleanup']['ok'] is True
    close_backend.close_hr = mod.E_ACCESSDENIED
    close_request = request_backend(
        [{'id': expected, 'canonical': 0x4211}],
        [{'id': expected, 'canonical': 0x4211}],
    )
    close = mod.request_owned_zero_seek(
        expected, baseline, close_proof, backend=close_request,
        process_backend=close_backend, timeout_seconds=1,
    )
    assert close['status'] == 'cleanup-failed', close
    assert close['dispatch']['attempted'] is False
    assert close['dispatch']['attemptCount'] == 0
    assert close_request.position_calls == []
    assert close['cleanup']['ok'] is False
    assert close['checks']['ownerFresh'] is True
    assert close['checks']['ownerLive'] is True
    assert close['checks']['ownerPathMatched'] is True
    assert close['checks']['ownerCreationMatched'] is True
    assert close['checks']['ownerCleanupOk'] is False
    assert close['checks']['cleanupCleared'] is False
    assert close['checks']['controlDispatchAllowed'] is False
    assert any(error['step'] == 'close-handle' for error in close['cleanup']['errors'])

    factory_backend = request_backend(
        [{'id': expected, 'canonical': 0x4311}],
        [{'id': expected, 'canonical': 0x4311}],
        fail_release_pointers={0x2001},
    )
    factory = mod.request_owned_zero_seek(
        expected, baseline, proof, backend=factory_backend,
        process_backend=proof_backend, timeout_seconds=1,
    )
    assert factory['status'] == 'cleanup-failed', factory
    assert factory['dispatch']['attempted'] is False
    assert factory['dispatch']['attemptCount'] == 0
    assert factory_backend.position_calls == []
    assert factory['cleanup']['ok'] is False
    assert factory['checks']['ownerFresh'] is True
    assert factory['checks']['cleanupCleared'] is False
    assert factory['checks']['controlDispatchAllowed'] is False
    assert factory['cleanup']['counts'].get('release-factory') == 1
    assert any(error['step'] == 'release-factory' for error in factory['cleanup']['errors'])

    primary_backend = request_backend(
        [{'id': expected, 'canonical': 0x4411, 'source_hr': mod.E_ACCESSDENIED}],
        [],
        fail_release_pointers={0x7001},
    )
    primary = mod.request_owned_zero_seek(
        expected, baseline, proof, backend=primary_backend,
        process_backend=proof_backend, timeout_seconds=1,
    )
    assert primary['status'] == 'access-denied', primary
    assert primary['hresult'] == mod.E_ACCESSDENIED
    assert primary['cleanup']['ok'] is False
    assert primary_backend.position_calls == []
    assert any(error['step'] == 'release-vector' for error in primary['cleanup']['errors'])

    return {
        'vector': {'status': vector['status'], 'calls': len(vector_backend.position_calls)},
        'close': {'status': close['status'], 'calls': len(close_request.position_calls)},
        'factory': {'status': factory['status'], 'calls': len(factory_backend.position_calls)},
        'primary': {'status': primary['status'], 'hresult': primary['hresult']},
    }

@case
def test_retained_ref_release():
    expected = nonce('e')
    baseline, _ = baseline_for(expected)
    proof, proof_backend = owner_proof_for()

    first_backend = request_backend(
        [{'id': expected, 'canonical': 0x4511}],
        [{'id': expected, 'canonical': 0x4511}],
        fail_release_pointers={0x7001},
    )
    first = mod.request_owned_zero_seek(
        expected, baseline, proof, backend=first_backend,
        process_backend=proof_backend, timeout_seconds=1,
    )
    assert first['status'] == 'cleanup-failed', first
    assert first['dispatch']['attemptCount'] == 0
    assert first_backend.position_calls == []
    assert first_backend.released.count(0x7100) == 1
    assert first_backend.released.count(0x4511) == 1
    assert len(first_backend.released) == len(set(first_backend.released))

    second_backend = request_backend(
        [{'id': expected, 'canonical': 0x4611}],
        [{'id': expected, 'canonical': 0x4711}],
        fail_release_pointers={0x7002},
    )
    second = mod.request_owned_zero_seek(
        expected, baseline, proof, backend=second_backend,
        process_backend=proof_backend, timeout_seconds=1,
    )
    assert second['status'] == 'cleanup-failed', second
    assert second['dispatch']['attemptCount'] == 0
    assert second_backend.position_calls == []
    assert second_backend.released.count(0x7100) == 1
    assert second_backend.released.count(0x4611) == 1
    assert second_backend.released.count(0x7200) == 1
    assert second_backend.released.count(0x4711) == 1
    assert len(second_backend.released) == len(set(second_backend.released))

    return {
        'first': {
            'status': first['status'],
            'calls': len(first_backend.position_calls),
            'released': len(first_backend.released),
        },
        'second': {
            'status': second['status'],
            'calls': len(second_backend.position_calls),
            'released': len(second_backend.released),
        },
    }

@case
def test_deadline_precheck():
    expected = nonce('9')
    baseline, _ = baseline_for(expected)
    proof, proof_backend = owner_proof_for()

    clock = {'now': 0.0}
    def monotonic():
        value = clock['now']
        clock['now'] += 0.5
        return value

    backend = request_backend(
        [{'id': expected, 'canonical': 0x4811}],
        [{'id': expected, 'canonical': 0x4811}],
    )
    result = mod.request_owned_zero_seek(
        expected, baseline, proof, backend=backend,
        process_backend=proof_backend, timeout_seconds=1.0,
        monotonic=monotonic, sleep=lambda seconds: None,
    )
    assert result['status'] == 'timeout', result
    assert result['dispatch']['attempted'] is False
    assert result['dispatch']['attemptCount'] == 0
    assert result['dispatch']['tickPosition'] is None
    assert result['dispatch']['operationBool'] is None
    assert backend.position_calls == []
    assert backend.counts.get('session_try_change_position', 0) == 0
    return {
        'status': result['status'],
        'attempted': result['dispatch']['attempted'],
        'attemptCount': result['dispatch']['attemptCount'],
        'tickPosition': result['dispatch']['tickPosition'],
        'positionCalls': len(backend.position_calls),
        'clock': clock['now'],
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
    const child = spawnSync(PYTHON, ['-B', '-', name], {
        cwd: process.cwd(),
        encoding: 'utf8',
        input: HARNESS,
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

test('exposes exact SMTC process/COM ABI constants and import is inert', () => {
    const output = runCase('abi');
    expect(output.sizes.fileread).toBe(8);
    expect(output.slots).toEqual({
        manager_sessions: 7,
        vector_get_at: 6,
        vector_size: 7,
        session_source: 6,
        session_position: 24,
    });
});

test('low-level fake COM callbacks hit manager/vector/session slots and bool GetResults', () => {
    const output = runCase('com_boundaries');
    expect(output.bool_result).toBe(true);
    expect(output.calls.some((call: any[]) => call[0] === 'position' && call[2] === 0)).toBe(true);
    expect(output.calls.some((call: any[]) => call[0] === 'vector_get_at' && call[2] === 0)).toBe(true);
    expect(output.calls.some((call: any[]) => call[0] === 'get_sessions')).toBe(true);
});

test('counts 0/1/2 matching sessions, suppresses foreign IDs, caps vectors and reports source errors', () => {
    const output = runCase('count_matching');
    expect(output.zero).toEqual({ matching: 0, baseline: true });
    expect(output.one).toEqual({ matching: 1, control: true });
    expect(output.two.matching).toBe(2);
    expect(output.cap).toBe('vector-cap');
    expect(output.error).toBe('access-denied');
});

test('validates owned process path/creation/live state and preserves cleanup failures', () => {
    const output = runCase('process_proof');
    expect(output.ok).toEqual({ status: 'ok', live: true });
    expect(output.wrong).toBe('wrong-executable');
    expect(output.dead).toBe('dead');
    expect(output.denied).toBe('access-denied');
});

test('request dispatches exactly one zero-tick position call after all checks', () => {
    const output = runCase('request_success');
    expect(output.status).toBe('completed-true');
    expect(output.dispatch.attemptCount).toBe(1);
    expect(output.dispatch.tickPosition).toBe(0);
    expect(output.dispatch.operationBool).toBe(true);
    expect(output.checks.canonicalStable).toBe(true);
    expect(output.checks.controlDispatchAllowed).toBe(true);
});

test('request rejects baseline, owner, missing, duplicate, replaced and vanished sessions without dispatch', () => {
    const output = runCase('request_preconditions');
    expect(output.invalid_baseline).toBe('invalid-baseline');
    expect(output.missing).toBe('session-missing');
    expect(output.duplicate).toBe('session-duplicate');
    expect(output.replaced).toBe('identity-changed');
    expect(output.vanished).toBe('session-missing');
    expect(output.second_duplicate).toBe('session-duplicate');
    expect(output.dead).toBe('owner-dead');
    expect(output.wrong_path).toBe('owner-wrong-executable');
    expect(output.creation).toBe('owner-identity-changed');
});

test('request reports false/error/timeout/uncertain without retry and preserves cleanup errors', () => {
    const output = runCase('request_results');
    expect(output.false).toBe('completed-false');
    expect(output.error).toBe('access-denied');
    expect(output.timeout).toBe('timeout');
    expect(output.uncertain).toBe('uncertain');
    expect(output.cleanup.ok).toBe(false);
    expect(output.cleanup.errors.length).toBeGreaterThan(0);
});

test('completed predispatch cleanup failures gate dispatch, including vector, fresh handle and acquisition cleanup', () => {
    const output = runCase('cleanup_dispatch_gates');
    expect(output.vector).toEqual({ status: 'cleanup-failed', calls: 0 });
    expect(output.close).toEqual({ status: 'cleanup-failed', calls: 0 });
    expect(output.factory).toEqual({ status: 'cleanup-failed', calls: 0 });
    expect(output.primary).toEqual({ status: 'access-denied', hresult: -2147024891 });
});

test('failed first or second enumeration releases retained session and canonical refs exactly once', () => {
    const output = runCase('retained_ref_release');
    expect(output.first.status).toBe('cleanup-failed');
    expect(output.first.calls).toBe(0);
    expect(output.second.status).toBe('cleanup-failed');
    expect(output.second.calls).toBe(0);
});

test('rechecks the whole request deadline immediately before dispatch and never calls position', () => {
    const output = runCase('deadline_precheck');
    expect(output.status).toBe('timeout');
    expect(output.attempted).toBe(false);
    expect(output.attemptCount).toBe(0);
    expect(output.tickPosition).toBeNull();
    expect(output.positionCalls).toBe(0);
});

test('the adapter import does not create a pycache artifact', () => {
    const pycache = join(process.cwd(), 'tools', 'ui', '__pycache__');
    if (!existsSync(pycache)) return;
    const artifacts = require('node:fs').readdirSync(pycache).filter((name: string) =>
        name.startsWith('native_smtc_owned_seek') && name.endsWith('.pyc'));
    expect(artifacts).toEqual([]);
});
