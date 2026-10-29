"""Diagnostic-only Windows SMTC owned-process negative-control adapter.

This module implements three narrow read/control helpers:

* count_matching_sessions: count only the exact diagnostic nonce.
* inspect_owned_process: validate the caller-supplied owned PID/executable.
* request_owned_zero_seek: after all preconditions, issue exactly one
  TryChangePlaybackPositionAsync(0) and observe its boolean completion.

It is not an acceptance checker and never claims audio quality, natural-loop
origin, OS/default MediaSession coverage, or playback success. The caller is
responsible for the trusted prelaunch state, assigning the exact nonce identity
to the owned Electron main process before any media/session is created, and
retaining the returned baseline/proof artifacts.

ABI sources:
https://raw.githubusercontent.com/microsoft/windows-rs/master/crates/libs/windows/src/Windows/Media/Control/mod.rs
https://raw.githubusercontent.com/microsoft/windows-rs/master/crates/libs/future/src/bindings.rs

This module imports the already-reviewed manager probe. Import is inert: no
DLL is loaded and no Runtime/process/session call occurs until an explicit
function is called with an explicit/default backend.
"""

from __future__ import annotations

import ctypes
import importlib.util
import math
import os
import re
import sys
import time
import uuid
from pathlib import Path

try:
    import native_smtc_capability_probe as _manager
except ImportError:
    _spec = importlib.util.spec_from_file_location(
        '_awwv_native_smtc_capability_probe',
        Path(__file__).with_name('native_smtc_capability_probe.py'),
    )
    _manager = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_manager)

HRESULT = _manager.HRESULT
UINT32 = _manager.UINT32
FUNCTYPE = _manager.FUNCTYPE
GUID = _manager.GUID
signed_hresult = _manager.signed_hresult
hresult_ok = _manager.hresult_ok
_vtable_slot = _manager._vtable_slot
_as_pointer = _manager._as_pointer
E_ACCESSDENIED = _manager.E_ACCESSDENIED
IID_MANAGER = _manager.IID_MANAGER
IID_STATICS = _manager.IID_STATICS
IID_ASYNC_INFO = _manager.IID_ASYNC_INFO
RUNTIME_CLASS = _manager.RUNTIME_CLASS
ASYNC_STATUS_STARTED = _manager.ASYNC_STATUS_STARTED
ASYNC_STATUS_COMPLETED = _manager.ASYNC_STATUS_COMPLETED
ASYNC_STATUS_CANCELED = _manager.ASYNC_STATUS_CANCELED
ASYNC_STATUS_ERROR = _manager.ASYNC_STATUS_ERROR

IID_IUNKNOWN = uuid.UUID('00000000-0000-0000-c000-000000000046')
SLOT_QUERY_INTERFACE = 0
SLOT_RELEASE = 2
SLOT_MANAGER_GET_SESSIONS = 7
SLOT_VECTOR_GET_AT = 6
SLOT_VECTOR_SIZE = 7
SLOT_SESSION_SOURCE_ID = 6
SLOT_SESSION_CHANGE_POSITION = 24

PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
STILL_ACTIVE = 259
MAX_TIMEOUT_SECONDS = 15.0
DEFAULT_TIMEOUT_SECONDS = 5.0
POLL_INTERVAL_SECONDS = 0.05
MAX_SESSIONS = 32
MAX_HSTRING_CODE_UNITS = 512
E_POINTER = -2147467261  # 0x80004003
E_INVALIDARG = -2147024809  # 0x80070057

NONCE_PATTERN = re.compile(r'^com\.awwv\.qa\.[0-9a-f]{32}$')


class FILETIME(ctypes.Structure):
    _fields_ = [
        ('dwLowDateTime', ctypes.c_uint32),
        ('dwHighDateTime', ctypes.c_uint32),
    ]


GET_SESSIONS_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))
VECTOR_SIZE_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(UINT32))
VECTOR_GET_AT_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, UINT32, ctypes.POINTER(ctypes.c_void_p))
SESSION_SOURCE_ID_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))
SESSION_POSITION_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.c_int64, ctypes.POINTER(ctypes.c_void_p))
BOOL_RESULTS_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_bool))


def valid_expected_id(value):
    return isinstance(value, str) and NONCE_PATTERN.fullmatch(value) is not None


def com_manager_get_sessions(manager):
    out = ctypes.c_void_p()
    hr = GET_SESSIONS_FN(_vtable_slot(manager, SLOT_MANAGER_GET_SESSIONS))(
        _as_pointer(manager), ctypes.byref(out)
    )
    return signed_hresult(hr), out.value or 0


def com_vector_size(vector):
    out = UINT32(0)
    hr = VECTOR_SIZE_FN(_vtable_slot(vector, SLOT_VECTOR_SIZE))(
        _as_pointer(vector), ctypes.byref(out)
    )
    return signed_hresult(hr), int(out.value)


def com_vector_get_at(vector, index):
    out = ctypes.c_void_p()
    hr = VECTOR_GET_AT_FN(_vtable_slot(vector, SLOT_VECTOR_GET_AT))(
        _as_pointer(vector), UINT32(index), ctypes.byref(out)
    )
    return signed_hresult(hr), out.value or 0


def com_session_source_id(session):
    out = ctypes.c_void_p()
    hr = SESSION_SOURCE_ID_FN(_vtable_slot(session, SLOT_SESSION_SOURCE_ID))(
        _as_pointer(session), ctypes.byref(out)
    )
    return signed_hresult(hr), out.value or 0


def com_session_try_change_position(session, ticks):
    out = ctypes.c_void_p()
    hr = SESSION_POSITION_FN(_vtable_slot(session, SLOT_SESSION_CHANGE_POSITION))(
        _as_pointer(session), ctypes.c_int64(ticks), ctypes.byref(out)
    )
    return signed_hresult(hr), out.value or 0


def com_async_operation_get_results_bool(operation):
    out = ctypes.c_bool(False)
    hr = BOOL_RESULTS_FN(_vtable_slot(operation, _manager.SLOT_ASYNC_GET_RESULTS))(
        _as_pointer(operation), ctypes.byref(out)
    )
    return signed_hresult(hr), bool(out.value)


def _hresult_from_win32(code):
    return signed_hresult(0x80070000 | (int(code) & 0xFFFF))


def _status_for_hr(hr):
    return 'access-denied' if hr == E_ACCESSDENIED else 'error'


def _normalize_timeout(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError('timeout must be positive and finite')
    timeout = float(value)
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError('timeout must be positive and finite')
    return min(timeout, MAX_TIMEOUT_SECONDS)


def _clock(monotonic):
    return {'monotonic': monotonic(), 'time': time.time()}


def _base_result(operation):
    return {
        'diagnosticOnly': True,
        'naturalOriginAdmitted': False,
        'operation': operation,
        'status': 'error',
        'phase': 'init',
        'hresult': None,
        'detail': None,
        'cleanup': {'counts': {}, 'errors': [], 'ok': True},
    }


def _set_hresult(result, hr):
    if isinstance(hr, int):
        result['hresult'] = signed_hresult(hr)
    else:
        result['hresult'] = None


def _cleanup_call(counts, errors, step, function):
    counts[step] = counts.get(step, 0) + 1
    try:
        value = function()
    except Exception as error:
        errors.append({'step': step, 'hresult': None, 'exception': type(error).__name__})
        return None
    if isinstance(value, tuple):
        value = value[0]
    if isinstance(value, int):
        hr = signed_hresult(value)
        if hr < 0:
            errors.append({'step': step, 'hresult': hr, 'exception': None})
        return hr
    return value


def _merge_cleanup(result, counts, errors):
    for key, value in counts.items():
        result['cleanup']['counts'][key] = result['cleanup'].get('counts', {}).get(key, 0) + value
    result['cleanup']['errors'].extend(errors)
    result['cleanup']['ok'] = not result['cleanup']['errors']


class SmtcWindowsBackend(_manager.WindowsBackend):
    """Small extension of the reviewed manager backend for session ABI calls."""

    name = 'windows-combase-ctypes-smtc-owned-seek'

    def get_sessions(self, manager):
        return com_manager_get_sessions(manager)

    def sessions_size(self, vector):
        return com_vector_size(vector)

    def sessions_get_at(self, vector, index):
        return com_vector_get_at(vector, index)

    def session_source_id(self, session):
        return com_session_source_id(session)

    def source_id_text(self, hstring):
        if not hstring:
            return E_POINTER, None
        api = self.api.combase
        function = getattr(self, '_windows_get_string_raw_buffer', None)
        if function is None:
            function = api.WindowsGetStringRawBuffer
            function.argtypes = [ctypes.c_void_p, ctypes.POINTER(UINT32)]
            function.restype = ctypes.c_void_p
            self._windows_get_string_raw_buffer = function
        length = UINT32(0)
        pointer = function(_as_pointer(hstring), ctypes.byref(length))
        if length.value > MAX_HSTRING_CODE_UNITS:
            return E_INVALIDARG, None
        if not pointer:
            if length.value == 0:
                return 0, ''
            return E_POINTER, None
        return 0, ctypes.wstring_at(pointer, length.value)

    def canonical_unknown(self, session):
        return _manager.com_query_interface(session, IID_IUNKNOWN)

    def session_try_change_position(self, session, ticks):
        return com_session_try_change_position(session, ticks)

    def async_get_results_bool(self, operation):
        return com_async_operation_get_results_bool(operation)


class WindowsProcessBackend:
    """Minimal kernel32 owned-process proof backend. Loads only when constructed."""

    name = 'windows-kernel32-process'

    def __init__(self, api=None):
        if api is None:
            if sys.platform != 'win32':
                raise _manager.UnsupportedPlatform('unsupported-platform')
            api = ctypes.WinDLL('kernel32', use_last_error=True)
        self.api = api
        self.api.OpenProcess.argtypes = [UINT32, ctypes.c_int, UINT32]
        self.api.OpenProcess.restype = ctypes.c_void_p
        self.api.QueryFullProcessImageNameW.argtypes = [
            ctypes.c_void_p, UINT32, ctypes.c_wchar_p, ctypes.POINTER(UINT32)
        ]
        self.api.QueryFullProcessImageNameW.restype = ctypes.c_int
        self.api.GetProcessTimes.argtypes = [
            ctypes.c_void_p, ctypes.POINTER(FILETIME), ctypes.POINTER(FILETIME),
            ctypes.POINTER(FILETIME), ctypes.POINTER(FILETIME),
        ]
        self.api.GetProcessTimes.restype = ctypes.c_int
        self.api.GetExitCodeProcess.argtypes = [ctypes.c_void_p, ctypes.POINTER(UINT32)]
        self.api.GetExitCodeProcess.restype = ctypes.c_int
        self.api.CloseHandle.argtypes = [ctypes.c_void_p]
        self.api.CloseHandle.restype = ctypes.c_int

    def _last_error(self):
        try:
            return ctypes.get_last_error()
        except Exception:
            return 0

    def open_process(self, pid):
        handle = self.api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return _hresult_from_win32(self._last_error()), 0
        return 0, handle

    def query_image_path(self, handle):
        buffer = ctypes.create_unicode_buffer(32768)
        size = UINT32(32768)
        ok = self.api.QueryFullProcessImageNameW(handle, 0, buffer, ctypes.byref(size))
        if not ok:
            return _hresult_from_win32(self._last_error()), None
        return 0, buffer.value

    def get_process_times(self, handle):
        creation = FILETIME()
        exited = FILETIME()
        kernel = FILETIME()
        user = FILETIME()
        ok = self.api.GetProcessTimes(
            handle, ctypes.byref(creation), ctypes.byref(exited),
            ctypes.byref(kernel), ctypes.byref(user),
        )
        if not ok:
            return _hresult_from_win32(self._last_error()), None
        ticks = (int(creation.dwHighDateTime) << 32) | int(creation.dwLowDateTime)
        return 0, ticks

    def get_exit_code(self, handle):
        code = UINT32(0)
        ok = self.api.GetExitCodeProcess(handle, ctypes.byref(code))
        if not ok:
            return _hresult_from_win32(self._last_error()), None
        return 0, int(code.value)

    def close_handle(self, handle):
        ok = self.api.CloseHandle(handle)
        if not ok:
            return _hresult_from_win32(self._last_error())
        return 0


class _ManagerFailure(Exception):
    def __init__(self, status, phase, hresult=None, detail=None):
        super().__init__(detail or status)
        self.status = status
        self.phase = phase
        self.hresult = hresult
        self.detail = detail


class _ManagerLease:
    def __init__(self, backend, timeout_seconds, monotonic, sleep):
        self.backend = backend
        self.timeout_seconds = timeout_seconds
        self.monotonic = monotonic
        self.sleep = sleep
        self.status = 'error'
        self.phase = 'initialize'
        self.hresult = None
        self.detail = None
        self.initialized = False
        self.hstring = 0
        self.factory = 0
        self.async_operation = 0
        self.async_info = 0
        self.manager = 0
        self.manager_validated = 0
        self.cancel_async = False
        self.cleanup_counts = {}
        self.cleanup_errors = []
        self.cleanup_done = False

    def _check(self, hr, phase):
        hr = signed_hresult(hr)
        if not hresult_ok(hr):
            raise _ManagerFailure(_status_for_hr(hr), phase, hr)
        return hr

    def acquire(self):
        try:
            self.phase = 'initialize'
            hr = self._check(self.backend.initialize(), 'initialize')
            self.initialized = True

            self.phase = 'create-string'
            hr, hstring = self.backend.create_string(RUNTIME_CLASS)
            self.hstring = hstring or 0
            self._check(hr, 'create-string')
            if not self.hstring:
                raise _ManagerFailure('error', 'create-string', None, 'null-hstring')

            self.phase = 'activation'
            hr, factory = self.backend.get_activation_factory(self.hstring, IID_STATICS)
            self.factory = factory or 0
            self._check(hr, 'activation')
            if not self.factory:
                raise _ManagerFailure('error', 'activation', None, 'null-factory')

            self.phase = 'request'
            hr, operation = self.backend.request_async(self.factory)
            self.async_operation = operation or 0
            self._check(hr, 'request')
            if not self.async_operation:
                raise _ManagerFailure('error', 'request', None, 'null-async-operation')

            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'release-factory',
                          lambda: self.backend.release(self.factory))
            self.factory = 0

            self.phase = 'async-info'
            hr, info = self.backend.async_query_info(self.async_operation)
            self.async_info = info or 0
            self._check(hr, 'async-info')
            if not self.async_info:
                raise _ManagerFailure('error', 'async-info', None, 'null-async-info')

            deadline = self.monotonic() + self.timeout_seconds
            polls = 0
            max_polls = int(math.ceil(self.timeout_seconds / POLL_INTERVAL_SECONDS)) + 2
            while True:
                polls += 1
                self.phase = 'acquire-await'
                hr, status = self.backend.async_status(self.async_info)
                self._check(hr, 'acquire-await')
                if status == ASYNC_STATUS_COMPLETED:
                    break
                if status == ASYNC_STATUS_CANCELED:
                    raise _ManagerFailure('canceled', 'acquire-await', None, 'canceled')
                if status == ASYNC_STATUS_ERROR:
                    hr, error_code = self.backend.async_error_code(self.async_info)
                    self._check(hr, 'acquire-await')
                    raise _ManagerFailure(_status_for_hr(error_code), 'acquire-error', error_code)
                if status != ASYNC_STATUS_STARTED:
                    raise _ManagerFailure('error', 'acquire-await', None, 'invalid-async-status')
                now = self.monotonic()
                remaining = deadline - now
                if remaining <= 0 or polls >= max_polls:
                    self.cancel_async = True
                    raise _ManagerFailure('timeout', 'acquire-await', None, 'timeout')
                self.sleep(min(POLL_INTERVAL_SECONDS, remaining))

            self.phase = 'acquire-results'
            hr, manager = self.backend.async_get_results(self.async_operation)
            self.manager = manager or 0
            self._check(hr, 'acquire-results')
            if not self.manager:
                raise _ManagerFailure('error', 'acquire-results', None, 'null-manager')

            self.phase = 'manager-validate'
            hr, validated = self.backend.manager_query(self.manager)
            self.manager_validated = validated or 0
            self._check(hr, 'manager-validate')
            if not self.manager_validated:
                raise _ManagerFailure('error', 'manager-validate', None, 'null-manager-qi')

            self.status = 'ok'
            self.phase = 'done'
            self.hresult = 0
            return True
        except _ManagerFailure as failure:
            self.status = failure.status
            self.phase = failure.phase
            self.hresult = failure.hresult
            self.detail = failure.detail
            return False
        except Exception as error:
            self.status = 'error'
            self.detail = type(error).__name__
            return False

    def cleanup(self):
        if self.cleanup_done:
            return self.cleanup_counts, self.cleanup_errors
        self.cleanup_done = True
        if self.async_info:
            if self.cancel_async:
                _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'async-cancel',
                              lambda: self.backend.async_cancel(self.async_info))
            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'async-close',
                          lambda: self.backend.async_close(self.async_info))
            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'release-async-info',
                          lambda: self.backend.release(self.async_info))
            self.async_info = 0
        if self.async_operation:
            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'release-async-operation',
                          lambda: self.backend.release(self.async_operation))
            self.async_operation = 0
        if self.manager_validated:
            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'release-manager-validated',
                          lambda: self.backend.release(self.manager_validated))
            self.manager_validated = 0
        if self.manager:
            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'release-manager',
                          lambda: self.backend.release(self.manager))
            self.manager = 0
        if self.factory:
            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'release-factory',
                          lambda: self.backend.release(self.factory))
            self.factory = 0
        if self.hstring:
            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'delete-string',
                          lambda: self.backend.delete_string(self.hstring))
            self.hstring = 0
        if self.initialized:
            _cleanup_call(self.cleanup_counts, self.cleanup_errors, 'ro-uninitialize',
                          lambda: self.backend.uninitialize())
        return self.cleanup_counts, self.cleanup_errors


class _EnumerationFailure(Exception):
    def __init__(self, status, phase, hresult=None, detail=None):
        super().__init__(detail or status)
        self.status = status
        self.phase = phase
        self.hresult = hresult
        self.detail = detail


def _enumerate_sessions(backend, manager, expected_id, retain_match):
    cleanup_counts = {}
    cleanup_errors = []
    vector = 0
    sessions = []
    retained_session = 0
    retained_canonical = 0
    keep_retained = False
    matching = 0
    foreign = 0
    observed = 0
    vector_size = None
    outcome = None
    try:
        hr, vector = backend.get_sessions(manager)
        hr = signed_hresult(hr)
        if not hresult_ok(hr):
            raise _EnumerationFailure(_status_for_hr(hr), 'sessions', hr)
        if not vector:
            raise _EnumerationFailure('error', 'sessions', None, 'null-vector')

        hr, size = backend.sessions_size(vector)
        hr = signed_hresult(hr)
        if not hresult_ok(hr):
            raise _EnumerationFailure(_status_for_hr(hr), 'sessions-size', hr)
        vector_size = int(size)
        if vector_size > MAX_SESSIONS:
            raise _EnumerationFailure('vector-cap', 'sessions-size', None, 'vector-size-cap')

        for index in range(vector_size):
            hr, session = backend.sessions_get_at(vector, index)
            hr = signed_hresult(hr)
            if not hresult_ok(hr):
                raise _EnumerationFailure(_status_for_hr(hr), 'session-get', hr)
            if not session:
                raise _EnumerationFailure('error', 'session-get', None, 'null-session')
            observed += 1
            sessions.append(session)
            hstring = 0
            try:
                hr, hstring = backend.session_source_id(session)
                hr = signed_hresult(hr)
                if not hresult_ok(hr):
                    raise _EnumerationFailure(_status_for_hr(hr), 'source-id', hr)
                if not hstring:
                    raise _EnumerationFailure('error', 'source-id', None, 'null-source-hstring')
                hr, text = backend.source_id_text(hstring)
                hr = signed_hresult(hr)
                if not hresult_ok(hr):
                    raise _EnumerationFailure(_status_for_hr(hr), 'source-string', hr)
                if text == expected_id:
                    matching += 1
                    if retain_match and matching == 1:
                        hr, canonical = backend.canonical_unknown(session)
                        hr = signed_hresult(hr)
                        if not hresult_ok(hr):
                            raise _EnumerationFailure(_status_for_hr(hr), 'canonical-iunknown', hr)
                        if not canonical:
                            raise _EnumerationFailure('error', 'canonical-iunknown', None, 'null-canonical')
                        sessions.remove(session)
                        retained_session = session
                        retained_canonical = canonical
                else:
                    foreign += 1
            finally:
                if hstring:
                    _cleanup_call(cleanup_counts, cleanup_errors, 'delete-string',
                                  lambda: backend.delete_string(hstring))

        keep_retained = bool(retain_match and matching == 1 and retained_session)
        outcome = {
            'status': 'ok',
            'phase': 'done',
            'hresult': 0,
            'detail': None,
            'matchingCount': matching,
            'foreignIdCount': foreign,
            'sessionsObserved': observed,
            'vectorSize': vector_size,
            'complete': True,
            'valid': not cleanup_errors,
            'session': retained_session if keep_retained else 0,
            'canonical': retained_canonical if keep_retained else 0,
            'cleanupCounts': cleanup_counts,
            'cleanupErrors': cleanup_errors,
        }
    except _EnumerationFailure as failure:
        outcome = {
            'status': failure.status,
            'phase': failure.phase,
            'hresult': failure.hresult,
            'detail': failure.detail,
            'matchingCount': matching,
            'foreignIdCount': foreign,
            'sessionsObserved': observed,
            'vectorSize': vector_size,
            'complete': False,
            'valid': False,
            'session': 0,
            'canonical': 0,
            'cleanupCounts': cleanup_counts,
            'cleanupErrors': cleanup_errors,
        }
    except Exception as error:
        outcome = {
            'status': 'error',
            'phase': 'sessions',
            'hresult': None,
            'detail': type(error).__name__,
            'matchingCount': matching,
            'foreignIdCount': foreign,
            'sessionsObserved': observed,
            'vectorSize': vector_size,
            'complete': False,
            'valid': False,
            'session': 0,
            'canonical': 0,
            'cleanupCounts': cleanup_counts,
            'cleanupErrors': cleanup_errors,
        }
    finally:
        if retained_session and not keep_retained:
            _cleanup_call(cleanup_counts, cleanup_errors, 'release-retained-session',
                          lambda: backend.release(retained_session))
            if retained_canonical:
                _cleanup_call(cleanup_counts, cleanup_errors, 'release-retained-canonical',
                              lambda: backend.release(retained_canonical))
            retained_session = 0
            retained_canonical = 0
        for session in sessions:
            if session and session != retained_session:
                _cleanup_call(cleanup_counts, cleanup_errors, 'release-session',
                              lambda session=session: backend.release(session))
        if vector:
            _cleanup_call(cleanup_counts, cleanup_errors, 'release-vector',
                          lambda: backend.release(vector))
        if outcome is not None:
            if outcome['status'] == 'ok' and cleanup_errors:
                outcome['status'] = 'cleanup-failed'
                outcome['phase'] = 'cleanup'
                outcome['detail'] = 'cleanup-failed'
            outcome['valid'] = outcome['status'] == 'ok' and not cleanup_errors
            if keep_retained and not outcome['valid']:
                if retained_session:
                    _cleanup_call(cleanup_counts, cleanup_errors, 'release-retained-session',
                                  lambda: backend.release(retained_session))
                if retained_canonical:
                    _cleanup_call(cleanup_counts, cleanup_errors, 'release-retained-canonical',
                                  lambda: backend.release(retained_canonical))
                retained_session = 0
                retained_canonical = 0
                outcome['session'] = 0
                outcome['canonical'] = 0
                outcome['valid'] = False
            outcome['cleanupCounts'] = cleanup_counts
            outcome['cleanupErrors'] = cleanup_errors
    return outcome


def _enumeration_summary(enumeration):
    return {
        'matchingCount': enumeration.get('matchingCount', 0),
        'foreignIdCount': enumeration.get('foreignIdCount', 0),
        'sessionsObserved': enumeration.get('sessionsObserved', 0),
        'vectorSize': enumeration.get('vectorSize'),
        'complete': bool(enumeration.get('complete')),
        'valid': bool(enumeration.get('valid')),
    }


def _count_result(expected_id, backend, timeout_seconds, monotonic, sleep):
    result = _base_result('count-matching-sessions')
    result['expectedId'] = expected_id if isinstance(expected_id, str) else None
    result['expectedIdValid'] = valid_expected_id(expected_id)
    result['matchingCount'] = 0
    result['foreignIdCount'] = 0
    result['sessionsObserved'] = 0
    result['vectorSize'] = None
    result['complete'] = False
    result['fresh'] = False
    result['valid'] = False
    result['baselineEligible'] = False
    result['controlEligible'] = False
    result['timeoutSeconds'] = timeout_seconds
    result['trustedDriverPreconditions'] = [
        'prelaunch-zero-matching-sessions',
        'exact-nonce-assigned-to-owned-main-process-before-media-creation',
        'exactly-one-matching-session-after-owned-media-creation',
    ]
    result['adapterInferredFromOS'] = False

    if not result['expectedIdValid']:
        result.update(status='invalid-id', phase='validate', detail='invalid-nonce')
        return result

    try:
        timeout = _normalize_timeout(timeout_seconds)
    except (TypeError, ValueError):
        result.update(status='invalid-timeout', phase='validate', detail='invalid-timeout')
        return result
    result['timeoutSeconds'] = timeout

    if backend is None:
        try:
            backend = SmtcWindowsBackend()
        except _manager.UnsupportedPlatform as error:
            result.update(status='unsupported', phase='construct', detail=str(error) or 'unsupported-platform')
            return result
        except OSError:
            result.update(status='unsupported', phase='construct', detail='dll-load-failed')
            return result
        except Exception:
            result.update(status='error', phase='construct', detail='backend-construction-failed')
            return result
    result['backend'] = getattr(backend, 'name', 'injected')

    lease = _ManagerLease(backend, timeout, monotonic, sleep)
    try:
        if not lease.acquire():
            result.update(status=lease.status, phase=lease.phase, detail=lease.detail)
            _set_hresult(result, lease.hresult)
            return result
        enumeration = _enumerate_sessions(backend, lease.manager, expected_id, False)
        _merge_cleanup(result, enumeration['cleanupCounts'], enumeration['cleanupErrors'])
        result.update(
            status=enumeration['status'],
            phase=enumeration['phase'],
            detail=enumeration['detail'],
            matchingCount=enumeration['matchingCount'],
            foreignIdCount=enumeration['foreignIdCount'],
            sessionsObserved=enumeration['sessionsObserved'],
            vectorSize=enumeration['vectorSize'],
            complete=enumeration['complete'],
        )
        _set_hresult(result, enumeration['hresult'])
    finally:
        counts, errors = lease.cleanup()
        _merge_cleanup(result, counts, errors)

    result['fresh'] = result['status'] == 'ok' and result['complete']
    result['valid'] = result['status'] == 'ok' and result['complete'] and result['cleanup']['ok']
    result['baselineEligible'] = result['valid'] and result['matchingCount'] == 0
    result['controlEligible'] = result['valid'] and result['matchingCount'] == 1
    return result


def count_matching_sessions(expected_id, backend=None, timeout_seconds=DEFAULT_TIMEOUT_SECONDS,
                            monotonic=time.monotonic, sleep=time.sleep):
    """Count only exact `com.awwv.qa.<32hex>` matches, suppressing foreign IDs."""
    return _count_result(expected_id, backend, timeout_seconds, monotonic, sleep)


def _canonical_path(path):
    try:
        return os.path.normcase(os.path.abspath(path))
    except Exception:
        return None


def inspect_owned_process(pid, expected_executable, process_backend=None):
    """Read-only owned PID/path/creation/live proof via OpenProcess only."""
    result = _base_result('inspect-owned-process')
    result.update({
        'pid': pid if isinstance(pid, int) and not isinstance(pid, bool) else None,
        'expectedExecutable': expected_executable if isinstance(expected_executable, str) else None,
        'imagePath': None,
        'creationTime': None,
        'exitCode': None,
        'live': False,
    })
    if not isinstance(pid, int) or isinstance(pid, bool) or pid <= 0:
        result.update(status='invalid-pid', phase='validate')
        return result
    if not isinstance(expected_executable, str) or not expected_executable:
        result.update(status='invalid-executable', phase='validate')
        return result
    if process_backend is None:
        try:
            process_backend = WindowsProcessBackend()
        except _manager.UnsupportedPlatform as error:
            result.update(status='unsupported', phase='construct', detail=str(error) or 'unsupported-platform')
            return result
        except OSError:
            result.update(status='unsupported', phase='construct', detail='dll-load-failed')
            return result
        except Exception:
            result.update(status='error', phase='construct', detail='backend-construction-failed')
            return result

    counts = {}
    errors = []
    handle = 0
    try:
        hr, handle = process_backend.open_process(pid)
        hr = signed_hresult(hr)
        if not hresult_ok(hr):
            result.update(status=_status_for_hr(hr), phase='open-process')
            _set_hresult(result, hr)
            return result
        if not handle:
            result.update(status='error', phase='open-process', detail='null-handle')
            return result

        hr, path = process_backend.query_image_path(handle)
        hr = signed_hresult(hr)
        if not hresult_ok(hr):
            result.update(status=_status_for_hr(hr), phase='image-path')
            _set_hresult(result, hr)
            return result
        result['imagePath'] = path

        hr, creation = process_backend.get_process_times(handle)
        hr = signed_hresult(hr)
        if not hresult_ok(hr):
            result.update(status=_status_for_hr(hr), phase='creation-time')
            _set_hresult(result, hr)
            return result
        result['creationTime'] = creation

        hr, exit_code = process_backend.get_exit_code(handle)
        hr = signed_hresult(hr)
        if not hresult_ok(hr):
            result.update(status=_status_for_hr(hr), phase='exit-code')
            _set_hresult(result, hr)
            return result
        result['exitCode'] = exit_code
        result['live'] = exit_code == STILL_ACTIVE

        expected_path = _canonical_path(expected_executable)
        actual_path = _canonical_path(path) if isinstance(path, str) else None
        if not expected_path or not actual_path or expected_path != actual_path:
            result.update(status='wrong-executable', phase='image-path', detail='path-mismatch')
            return result
        if not result['live']:
            result.update(status='dead', phase='exit-code', detail='not-still-active')
            return result

        result.update(status='ok', phase='done')
        return result
    except Exception as error:
        result.update(status='error', phase='process-proof', detail=type(error).__name__)
        return result
    finally:
        if handle:
            _cleanup_call(counts, errors, 'close-handle', lambda: process_backend.close_handle(handle))
        _merge_cleanup(result, counts, errors)


def _valid_baseline(value, expected_id):
    return (
        isinstance(value, dict)
        and value.get('diagnosticOnly') is True
        and value.get('operation') == 'count-matching-sessions'
        and value.get('expectedId') == expected_id
        and value.get('matchingCount') == 0
        and value.get('valid') is True
        and value.get('fresh') is True
    )


def _valid_owner_proof(value):
    return (
        isinstance(value, dict)
        and value.get('diagnosticOnly') is True
        and value.get('status') == 'ok'
        and value.get('live') is True
        and isinstance(value.get('pid'), int)
        and not isinstance(value.get('pid'), bool)
        and value.get('pid') > 0
        and isinstance(value.get('creationTime'), int)
        and isinstance(value.get('expectedExecutable'), str)
        and bool(value.get('expectedExecutable'))
        and isinstance(value.get('imagePath'), str)
        and bool(value.get('imagePath'))
        and isinstance(value.get('cleanup'), dict)
        and value['cleanup'].get('ok') is True
    )


def request_owned_zero_seek(expected_id, baseline, owner_proof, backend=None,
                            process_backend=None, timeout_seconds=DEFAULT_TIMEOUT_SECONDS,
                            monotonic=time.monotonic, sleep=time.sleep):
    """After all trusted preconditions, dispatch ONE owned zero-position request."""
    result = _base_result('request-owned-zero-seek')
    result.update({
        'expectedId': expected_id if isinstance(expected_id, str) else None,
        'ownerPid': owner_proof.get('pid') if isinstance(owner_proof, dict) else None,
        'baseline': {
            'expectedId': baseline.get('expectedId') if isinstance(baseline, dict) else None,
            'matchingCount': baseline.get('matchingCount') if isinstance(baseline, dict) else None,
            'valid': baseline.get('valid') if isinstance(baseline, dict) else None,
            'fresh': baseline.get('fresh') if isinstance(baseline, dict) else None,
        },
        'checks': {
            'baselineZero': False,
            'exactlyOneSessionFirst': False,
            'exactlyOneSessionSecond': False,
            'canonicalStable': False,
            'ownerFresh': False,
            'ownerPathMatched': False,
            'ownerCreationMatched': False,
            'ownerLive': False,
            'ownerCleanupOk': False,
            'cleanupCleared': False,
            'controlDispatchAllowed': False,
        },
        'firstEnumeration': None,
        'secondEnumeration': None,
        'dispatch': {
            'attempted': False,
            'attemptCount': 0,
            'tickPosition': None,
            'dispatchClocks': None,
            'completionClocks': None,
            'operationBool': None,
            'asyncStatus': None,
            'error': None,
        },
        'rendererSeekCallbackRequired': True,
        'apiTrueIsProof': False,
        'playbackSuccessClaimed': False,
        'trustedDriverPreconditions': [
            'caller-obtained-zero-match-baseline-before-launch',
            'exact-nonce-assigned-to-owned-main-process-before-media-creation',
            'exactly-one-matching-session-before-this-request',
        ],
        'adapterInferredFromOS': False,
    })

    if not valid_expected_id(expected_id):
        result.update(status='invalid-id', phase='validate', detail='invalid-nonce')
        return result
    try:
        timeout = _normalize_timeout(timeout_seconds)
    except (TypeError, ValueError):
        result.update(status='invalid-timeout', phase='validate', detail='invalid-timeout')
        return result
    result['timeoutSeconds'] = timeout
    request_deadline = monotonic() + timeout

    result['checks']['baselineZero'] = _valid_baseline(baseline, expected_id)
    if not result['checks']['baselineZero']:
        result.update(status='invalid-baseline', phase='validate', detail='baseline-not-zero-valid-fresh')
        return result
    if not _valid_owner_proof(owner_proof):
        result.update(status='invalid-owner-proof', phase='validate', detail='owner-proof-invalid')
        return result

    if backend is None:
        try:
            backend = SmtcWindowsBackend()
        except _manager.UnsupportedPlatform as error:
            result.update(status='unsupported', phase='construct', detail=str(error) or 'unsupported-platform')
            return result
        except OSError:
            result.update(status='unsupported', phase='construct', detail='dll-load-failed')
            return result
        except Exception:
            result.update(status='error', phase='construct', detail='backend-construction-failed')
            return result
    result['backend'] = getattr(backend, 'name', 'injected')

    lease = _ManagerLease(backend, max(0.001, request_deadline - monotonic()), monotonic, sleep)
    first_session = 0
    first_canonical = 0
    second_session = 0
    second_canonical = 0
    try:
        if not lease.acquire():
            result.update(status=lease.status, phase=lease.phase, detail=lease.detail)
            _set_hresult(result, lease.hresult)
            return result

        first = _enumerate_sessions(backend, lease.manager, expected_id, True)
        _merge_cleanup(result, first['cleanupCounts'], first['cleanupErrors'])
        result['firstEnumeration'] = _enumeration_summary(first)
        result['checks']['exactlyOneSessionFirst'] = first['valid'] and first['matchingCount'] == 1
        if not first['valid']:
            result.update(status=first['status'], phase=first['phase'], detail=first['detail'])
            _set_hresult(result, first['hresult'])
            return result
        if first['matchingCount'] == 0:
            result.update(status='session-missing', phase='first-enumeration')
            return result
        if first['matchingCount'] != 1:
            result.update(status='session-duplicate', phase='first-enumeration')
            return result
        first_session = first['session']
        first_canonical = first['canonical']
        if not first_session or not first_canonical:
            result.update(status='uncertain', phase='first-enumeration', detail='missing-owned-refs')
            return result

        second = _enumerate_sessions(backend, lease.manager, expected_id, True)
        _merge_cleanup(result, second['cleanupCounts'], second['cleanupErrors'])
        result['secondEnumeration'] = _enumeration_summary(second)
        result['checks']['exactlyOneSessionSecond'] = second['valid'] and second['matchingCount'] == 1
        if not second['valid']:
            result.update(status=second['status'], phase=second['phase'], detail=second['detail'])
            _set_hresult(result, second['hresult'])
            return result
        if second['matchingCount'] == 0:
            result.update(status='session-missing', phase='second-enumeration')
            return result
        if second['matchingCount'] != 1:
            result.update(status='session-duplicate', phase='second-enumeration')
            return result
        second_session = second['session']
        second_canonical = second['canonical']
        if not second_session or not second_canonical:
            result.update(status='uncertain', phase='second-enumeration', detail='missing-second-refs')
            return result
        result['checks']['canonicalStable'] = second_canonical == first_canonical
        if not result['checks']['canonicalStable']:
            result.update(status='identity-changed', phase='second-enumeration', detail='canonical-iunknown-changed')
            return result

        if process_backend is None:
            try:
                process_backend = WindowsProcessBackend()
            except _manager.UnsupportedPlatform as error:
                result.update(status='unsupported', phase='process-backend', detail=str(error) or 'unsupported-platform')
                return result
            except OSError:
                result.update(status='unsupported', phase='process-backend', detail='dll-load-failed')
                return result
            except Exception:
                result.update(status='error', phase='process-backend', detail='backend-construction-failed')
                return result

        fresh = inspect_owned_process(owner_proof['pid'], owner_proof['expectedExecutable'],
                                      process_backend=process_backend)
        _merge_cleanup(result, fresh['cleanup']['counts'], fresh['cleanup']['errors'])
        result['checks']['ownerFresh'] = fresh['status'] == 'ok'
        result['checks']['ownerLive'] = fresh.get('live') is True
        result['checks']['ownerPathMatched'] = (
            isinstance(fresh.get('imagePath'), str)
            and _canonical_path(fresh['imagePath']) == _canonical_path(owner_proof['imagePath'])
        )
        result['checks']['ownerCreationMatched'] = fresh.get('creationTime') == owner_proof['creationTime']
        result['checks']['ownerCleanupOk'] = fresh.get('cleanup', {}).get('ok') is True
        result['checks']['cleanupCleared'] = bool(result['cleanup']['ok']) and not lease.cleanup_errors
        result['checks']['controlDispatchAllowed'] = (
            result['checks']['baselineZero']
            and result['checks']['exactlyOneSessionFirst']
            and result['checks']['exactlyOneSessionSecond']
            and result['checks']['canonicalStable']
            and result['checks']['ownerFresh']
            and result['checks']['ownerLive']
            and result['checks']['ownerPathMatched']
            and result['checks']['ownerCreationMatched']
            and result['checks']['ownerCleanupOk']
            and result['checks']['cleanupCleared']
        )
        if not result['checks']['controlDispatchAllowed']:
            if fresh['status'] == 'access-denied':
                result.update(status='owner-access-denied', phase='owner-proof', detail='owner-access-denied')
            elif fresh['status'] == 'dead':
                result.update(status='owner-dead', phase='owner-proof', detail='owner-not-live')
            elif fresh['status'] == 'wrong-executable' or not result['checks']['ownerPathMatched']:
                result.update(status='owner-wrong-executable', phase='owner-proof', detail='owner-path-mismatch')
            elif fresh.get('creationTime') != owner_proof['creationTime']:
                result.update(status='owner-identity-changed', phase='owner-proof', detail='owner-creation-mismatch')
            elif fresh['status'] != 'ok':
                result.update(status='owner-' + fresh['status'], phase='owner-proof', detail=fresh.get('detail'))
            elif not result['checks']['cleanupCleared']:
                result.update(status='cleanup-failed', phase='pre-dispatch-cleanup', detail='cleanup-failed')
            else:
                result.update(status='owner-identity-changed', phase='owner-proof', detail='owner-check-failed')
            return result

        if monotonic() >= request_deadline:
            result.update(status='timeout', phase='pre-dispatch', detail='request-deadline-exhausted')
            result['dispatch']['error'] = 'timeout'
            return result

        dispatch_clock = _clock(monotonic)
        result['dispatch'].update({
            'attempted': True,
            'attemptCount': 1,
            'tickPosition': 0,
            'dispatchClocks': dispatch_clock,
        })
        hr, operation = backend.session_try_change_position(first_session, 0)
        hr = signed_hresult(hr)
        if not hresult_ok(hr):
            result.update(status=_status_for_hr(hr), phase='dispatch', detail='position-call-failed')
            _set_hresult(result, hr)
            result['dispatch']['error'] = 'position-call-failed'
            return result
        if not operation:
            result.update(status='uncertain', phase='dispatch', detail='null-async-operation')
            result['dispatch']['error'] = 'null-async-operation'
            return result

        dispatch_info = 0
        dispatch_cancel = False
        try:
            hr, dispatch_info = backend.async_query_info(operation)
            hr = signed_hresult(hr)
            if not hresult_ok(hr):
                result.update(status=_status_for_hr(hr), phase='dispatch-async-info', detail='async-info-failed')
                _set_hresult(result, hr)
                result['dispatch']['error'] = 'async-info-failed'
                return result
            if not dispatch_info:
                result.update(status='uncertain', phase='dispatch-async-info', detail='null-async-info')
                result['dispatch']['error'] = 'null-async-info'
                return result

            deadline = request_deadline
            polls = 0
            max_polls = int(math.ceil(timeout / POLL_INTERVAL_SECONDS)) + 2
            while True:
                polls += 1
                hr, status = backend.async_status(dispatch_info)
                hr = signed_hresult(hr)
                result['dispatch']['asyncStatus'] = status if isinstance(status, int) else None
                if not hresult_ok(hr):
                    result.update(status=_status_for_hr(hr), phase='dispatch-await', detail='async-status-failed')
                    _set_hresult(result, hr)
                    result['dispatch']['error'] = 'async-status-failed'
                    return result
                if status == ASYNC_STATUS_COMPLETED:
                    hr, value = backend.async_get_results_bool(operation)
                    hr = signed_hresult(hr)
                    if not hresult_ok(hr):
                        result.update(status=_status_for_hr(hr), phase='dispatch-results', detail='bool-results-failed')
                        _set_hresult(result, hr)
                        result['dispatch']['error'] = 'bool-results-failed'
                        return result
                    result['dispatch']['operationBool'] = bool(value)
                    result['dispatch']['completionClocks'] = _clock(monotonic)
                    result.update(
                        status='completed-true' if value else 'completed-false',
                        phase='done' if value else 'dispatch-complete-false',
                    )
                    _set_hresult(result, 0)
                    return result
                if status == ASYNC_STATUS_CANCELED:
                    result.update(status='canceled', phase='dispatch-await')
                    result['dispatch']['completionClocks'] = _clock(monotonic)
                    return result
                if status == ASYNC_STATUS_ERROR:
                    hr, error_code = backend.async_error_code(dispatch_info)
                    hr = signed_hresult(hr)
                    if not hresult_ok(hr):
                        result.update(status=_status_for_hr(hr), phase='dispatch-error', detail='async-error-code-failed')
                        _set_hresult(result, hr)
                        result['dispatch']['error'] = 'async-error-code-failed'
                        return result
                    result.update(status=_status_for_hr(error_code), phase='dispatch-error', detail='async-error')
                    _set_hresult(result, error_code)
                    result['dispatch']['error'] = 'async-error'
                    result['dispatch']['completionClocks'] = _clock(monotonic)
                    return result
                if status != ASYNC_STATUS_STARTED:
                    result.update(status='uncertain', phase='dispatch-await', detail='invalid-async-status')
                    result['dispatch']['error'] = 'invalid-async-status'
                    return result
                now = monotonic()
                remaining = deadline - now
                if remaining <= 0 or polls >= max_polls:
                    dispatch_cancel = True
                    result.update(status='timeout', phase='dispatch-await', detail='timeout')
                    result['dispatch']['completionClocks'] = _clock(monotonic)
                    result['dispatch']['error'] = 'timeout'
                    return result
                sleep(min(POLL_INTERVAL_SECONDS, remaining))
        finally:
            dispatch_counts = {}
            dispatch_errors = []
            if dispatch_info:
                if dispatch_cancel:
                    _cleanup_call(dispatch_counts, dispatch_errors, 'async-cancel',
                                  lambda: backend.async_cancel(dispatch_info))
                _cleanup_call(dispatch_counts, dispatch_errors, 'async-close',
                              lambda: backend.async_close(dispatch_info))
                _cleanup_call(dispatch_counts, dispatch_errors, 'release-async-info',
                              lambda: backend.release(dispatch_info))
            if operation:
                _cleanup_call(dispatch_counts, dispatch_errors, 'release-async-operation',
                              lambda: backend.release(operation))
            _merge_cleanup(result, dispatch_counts, dispatch_errors)
    finally:
        if result['dispatch']['attempted'] and result['dispatch']['completionClocks'] is None:
            result['dispatch']['completionClocks'] = _clock(monotonic)
        if second_session:
            _cleanup_call(result['cleanup']['counts'], result['cleanup']['errors'],
                          'release-second-session', lambda: backend.release(second_session))
        if second_canonical:
            _cleanup_call(result['cleanup']['counts'], result['cleanup']['errors'],
                          'release-second-canonical', lambda: backend.release(second_canonical))
        if first_session:
            _cleanup_call(result['cleanup']['counts'], result['cleanup']['errors'],
                          'release-first-session', lambda: backend.release(first_session))
        if first_canonical:
            _cleanup_call(result['cleanup']['counts'], result['cleanup']['errors'],
                          'release-first-canonical', lambda: backend.release(first_canonical))
        counts, errors = lease.cleanup()
        _merge_cleanup(result, counts, errors)
        result['cleanup']['ok'] = not result['cleanup']['errors']
    return result
