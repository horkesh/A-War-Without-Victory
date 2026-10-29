"""Read-only Windows Runtime capability probe for the native SMTC manager.

Source facts used for the generated ABI:
- https://raw.githubusercontent.com/microsoft/windows-rs/master/crates/libs/windows/src/Windows/Media/Control/mod.rs
  Runtime class: Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager
  Statics IID: 2050c4ee-11a0-57de-aed7-c97c70338245 (RequestAsync is slot 6)
  Manager IID: cace8eac-e86e-504a-ab31-5ff8ff1bce49
- https://raw.githubusercontent.com/microsoft/windows-rs/master/crates/libs/future/src/bindings.rs
  IAsyncInfo IID: 00000036-0000-0000-c000-000000000046
  IAsyncInfo slots: 6 Id, 7 Status, 8 ErrorCode, 9 Cancel, 10 Close
  IAsyncOperation slots after IInspectable: 6 SetCompleted, 7 Completed, 8 GetResults
  QueryInterface is slot 0 and Release is slot 2.

This module only proves manager availability. It does not read sessions,
application identities, media metadata, playback state, or issue controls.
The DLL is loaded only when the explicit Windows backend is constructed.
"""

from __future__ import annotations

import ctypes
import json
import math
import sys
import time
import uuid
from types import SimpleNamespace

RUNTIME_CLASS = "Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager"

IID_STATICS = uuid.UUID("2050c4ee-11a0-57de-aed7-c97c70338245")
IID_MANAGER = uuid.UUID("cace8eac-e86e-504a-ab31-5ff8ff1bce49")
IID_ASYNC_INFO = uuid.UUID("00000036-0000-0000-c000-000000000046")

# IInspectable occupies slots 0-5. QueryInterface is slot 0, Release slot 2.
SLOT_QUERY_INTERFACE = 0
SLOT_RELEASE = 2
SLOT_REQUEST_ASYNC = 6
SLOT_ASYNC_ID = 6
SLOT_ASYNC_STATUS = 7
SLOT_ASYNC_ERROR_CODE = 8
SLOT_ASYNC_CANCEL = 9
SLOT_ASYNC_CLOSE = 10
SLOT_ASYNC_GET_RESULTS = 8

RO_INIT_MULTITHREADED = 1
RO_INIT_APARTMENTTHREADED = 0

ASYNC_STATUS_STARTED = 0
ASYNC_STATUS_COMPLETED = 1
ASYNC_STATUS_CANCELED = 2
ASYNC_STATUS_ERROR = 3

S_OK = 0
S_FALSE = 1
E_ACCESSDENIED = -2147024891  # 0x80070005
RPC_E_CHANGED_MODE = -2147417850  # 0x80010106

MAX_TIMEOUT_SECONDS = 30.0
DEFAULT_TIMEOUT_SECONDS = 5.0
POLL_INTERVAL_SECONDS = 0.05

HRESULT = ctypes.c_int32
UINT32 = ctypes.c_uint32
FUNCTYPE = ctypes.WINFUNCTYPE if hasattr(ctypes, "WINFUNCTYPE") else ctypes.CFUNCTYPE

_DLL_LOADS = 0


class UnsupportedPlatform(Exception):
    """The active interpreter/platform cannot provide the Windows backend."""


class ProbeFailure(Exception):
    def __init__(self, status, phase, hresult=None, detail=None):
        super().__init__(detail or status)
        self.status = status
        self.phase = phase
        self.hresult = hresult
        self.detail = detail


class GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", ctypes.c_uint32),
        ("Data2", ctypes.c_uint16),
        ("Data3", ctypes.c_uint16),
        ("Data4", ctypes.c_ubyte * 8),
    ]


QUERY_INTERFACE_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(GUID), ctypes.POINTER(ctypes.c_void_p))
RELEASE_FN = FUNCTYPE(UINT32, ctypes.c_void_p)
STATUS_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int32))
NOARG_FN = FUNCTYPE(HRESULT, ctypes.c_void_p)
GET_RESULTS_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))
REQUEST_ASYNC_FN = FUNCTYPE(HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))


def signed_hresult(value):
    return ctypes.c_int32(int(value)).value


def hresult_ok(value):
    return isinstance(value, int) and value >= 0


def _as_pointer(value):
    if isinstance(value, ctypes.c_void_p):
        return value
    return ctypes.c_void_p(int(value))


def _vtable_slot(pointer, slot):
    if not pointer:
        raise ValueError("null COM pointer")
    raw = _as_pointer(pointer)
    vtable = ctypes.cast(raw, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
    address = vtable[slot]
    if not address:
        raise ValueError("null COM vtable slot")
    return address


def _guid(iid):
    if isinstance(iid, uuid.UUID):
        return GUID.from_buffer_copy(iid.bytes_le)
    raise TypeError("IID must be a uuid.UUID")


def com_query_interface(pointer, iid):
    """QueryInterface (vtable slot 0), returning (hr, owned out pointer)."""
    raw = _as_pointer(pointer)
    guid = _guid(iid)
    out = ctypes.c_void_p()
    hr = QUERY_INTERFACE_FN(_vtable_slot(pointer, SLOT_QUERY_INTERFACE))(
        raw, ctypes.byref(guid), ctypes.byref(out)
    )
    return signed_hresult(hr), out.value or 0


def com_release(pointer):
    """Release (vtable slot 2)."""
    raw = _as_pointer(pointer)
    return int(RELEASE_FN(_vtable_slot(pointer, SLOT_RELEASE))(raw))


def com_async_info_status(info):
    out = ctypes.c_int32(0)
    hr = STATUS_FN(_vtable_slot(info, SLOT_ASYNC_STATUS))( _as_pointer(info), ctypes.byref(out))
    return signed_hresult(hr), int(out.value)


def com_async_info_error_code(info):
    out = ctypes.c_int32(0)
    hr = STATUS_FN(_vtable_slot(info, SLOT_ASYNC_ERROR_CODE))(_as_pointer(info), ctypes.byref(out))
    return signed_hresult(hr), signed_hresult(out.value)


def com_async_info_cancel(info):
    hr = NOARG_FN(_vtable_slot(info, SLOT_ASYNC_CANCEL))(_as_pointer(info))
    return signed_hresult(hr)


def com_async_info_close(info):
    hr = NOARG_FN(_vtable_slot(info, SLOT_ASYNC_CLOSE))(_as_pointer(info))
    return signed_hresult(hr)


def com_async_operation_get_results(operation):
    out = ctypes.c_void_p()
    hr = GET_RESULTS_FN(_vtable_slot(operation, SLOT_ASYNC_GET_RESULTS))(
        _as_pointer(operation), ctypes.byref(out)
    )
    return signed_hresult(hr), out.value or 0


def com_request_async(factory):
    out = ctypes.c_void_p()
    hr = REQUEST_ASYNC_FN(_vtable_slot(factory, SLOT_REQUEST_ASYNC))(
        _as_pointer(factory), ctypes.byref(out)
    )
    return signed_hresult(hr), out.value or 0


class WindowsApi:
    """Loads combase only when the Windows backend is explicitly constructed."""

    def __init__(self):
        global _DLL_LOADS
        _DLL_LOADS += 1
        if not hasattr(ctypes, "WinDLL"):
            raise UnsupportedPlatform("unsupported-platform")
        self.combase = ctypes.WinDLL("combase.dll")

        self.ro_initialize = self.combase.RoInitialize
        self.ro_initialize.argtypes = [ctypes.c_int32]
        self.ro_initialize.restype = HRESULT

        self.windows_create_string = self.combase.WindowsCreateString
        self.windows_create_string.argtypes = [ctypes.c_wchar_p, ctypes.c_uint32, ctypes.POINTER(ctypes.c_void_p)]
        self.windows_create_string.restype = HRESULT

        self.ro_get_activation_factory = self.combase.RoGetActivationFactory
        self.ro_get_activation_factory.argtypes = [ctypes.c_void_p, ctypes.POINTER(GUID), ctypes.POINTER(ctypes.c_void_p)]
        self.ro_get_activation_factory.restype = HRESULT

        self.windows_delete_string = self.combase.WindowsDeleteString
        self.windows_delete_string.argtypes = [ctypes.c_void_p]
        self.windows_delete_string.restype = HRESULT

        self.ro_uninitialize = self.combase.RoUninitialize
        self.ro_uninitialize.argtypes = []
        self.ro_uninitialize.restype = None


class WindowsBackend:
    """Small explicit backend over the documented com introduction ABI."""

    name = "windows-combase-ctypes"

    def __init__(self, api=None):
        if api is None and sys.platform != "win32":
            raise UnsupportedPlatform("unsupported-platform")
        self.api = api if api is not None else WindowsApi()

    def initialize(self):
        return signed_hresult(self.api.ro_initialize(RO_INIT_MULTITHREADED))

    def create_string(self, text):
        out = ctypes.c_void_p()
        hr = self.api.windows_create_string(text, len(text), ctypes.byref(out))
        return signed_hresult(hr), out.value or 0

    def get_activation_factory(self, hstring, iid):
        guid = _guid(iid)
        out = ctypes.c_void_p()
        hr = self.api.ro_get_activation_factory(
            _as_pointer(hstring), ctypes.byref(guid), ctypes.byref(out)
        )
        return signed_hresult(hr), out.value or 0

    def request_async(self, factory):
        return com_request_async(factory)

    def async_query_info(self, operation):
        return com_query_interface(operation, IID_ASYNC_INFO)

    def async_status(self, info):
        return com_async_info_status(info)

    def async_error_code(self, info):
        return com_async_info_error_code(info)

    def async_cancel(self, info):
        return com_async_info_cancel(info)

    def async_close(self, info):
        return com_async_info_close(info)

    def async_get_results(self, operation):
        return com_async_operation_get_results(operation)

    def manager_query(self, manager):
        return com_query_interface(manager, IID_MANAGER)

    def release(self, pointer):
        return com_release(pointer)

    def delete_string(self, hstring):
        return signed_hresult(self.api.windows_delete_string(_as_pointer(hstring)))

    def uninitialize(self):
        self.api.ro_uninitialize()


def normalize_timeout(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("timeout must be a positive finite number")
    timeout = float(value)
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError("timeout must be a positive finite number")
    return min(timeout, MAX_TIMEOUT_SECONDS)


def _status_for_hresult(hr):
    return "access-denied" if hr == E_ACCESSDENIED else "error"


def _base_result():
    return {
        "probe": "native-smtc-capability",
        "status": "error",
        "phase": "init",
        "hresult": None,
        "hresult_hex": None,
        "detail": None,
        "manager_available": False,
        "timeout_seconds": None,
        "backend": None,
        "cleanup": {
            "ro_initialized": False,
            "ro_uninitialized": False,
            "hresult_preserved": True,
            "counts": {},
            "ok": True,
        },
        "cleanup_errors": [],
    }


def _set_hresult(result, hr):
    if isinstance(hr, int):
        result["hresult"] = signed_hresult(hr)
        result["hresult_hex"] = hex(signed_hresult(hr) & 0xFFFFFFFF)
    else:
        result["hresult"] = None
        result["hresult_hex"] = None


def _cleanup_call(counts, errors, step, function):
    counts[step] = counts.get(step, 0) + 1
    try:
        value = function()
    except Exception as error:  # cleanup must never mask the primary result
        errors.append({"step": step, "hresult": None, "exception": type(error).__name__})
        return None
    if isinstance(value, tuple):
        value = value[0]
    if isinstance(value, int):
        normalized = signed_hresult(value)
        if normalized < 0:
            errors.append({"step": step, "hresult": normalized, "exception": None})
        return normalized
    return value


def probe(
    backend=None,
    timeout_seconds=DEFAULT_TIMEOUT_SECONDS,
    monotonic=time.monotonic,
    sleep=time.sleep,
):
    """Probe only whether the SMTC session manager is available.

    Returns a JSON-ready dict. It never enumerates sessions, reads metadata,
    issues playback/seek controls, writes files, or retries after denial.
    """
    result = _base_result()

    try:
        timeout = normalize_timeout(timeout_seconds)
    except (TypeError, ValueError):
        result.update(status="invalid-timeout", phase="validate", detail="invalid-timeout")
        return result
    result["timeout_seconds"] = timeout

    if backend is None:
        try:
            if sys.platform != "win32":
                raise UnsupportedPlatform("unsupported-platform")
            backend = WindowsBackend()
        except UnsupportedPlatform as error:
            result.update(status="unsupported", phase="construct", detail=str(error) or "unsupported-platform")
            return result
        except OSError:
            result.update(status="unsupported", phase="construct", detail="dll-load-failed")
            return result
        except Exception:
            result.update(status="error", phase="construct", detail="backend-construction-failed")
            return result

    result["backend"] = getattr(backend, "name", "injected")

    state = {
        "initialized": False,
        "hstring": 0,
        "factory": 0,
        "async_operation": 0,
        "async_info": 0,
        "manager": 0,
        "manager_validated": 0,
    }
    cancel_async = False
    phase = "init"
    cleanup_counts = {}
    cleanup_errors = []
    primary_hresult = None

    try:
        phase = "initialize"
        hr = signed_hresult(backend.initialize())
        if not hresult_ok(hr):
            raise ProbeFailure(_status_for_hresult(hr), "initialize", hr)
        state["initialized"] = True

        phase = "create-string"
        hr, hstring = backend.create_string(RUNTIME_CLASS)
        hr = signed_hresult(hr)
        state["hstring"] = hstring or 0
        if not hresult_ok(hr):
            raise ProbeFailure(_status_for_hresult(hr), "create-string", hr)
        if not state["hstring"]:
            raise ProbeFailure("error", "create-string", None, "null-pointer")

        phase = "activation"
        hr, factory = backend.get_activation_factory(state["hstring"], IID_STATICS)
        hr = signed_hresult(hr)
        state["factory"] = factory or 0
        if not hresult_ok(hr):
            raise ProbeFailure(_status_for_hresult(hr), "activation", hr)
        if not state["factory"]:
            raise ProbeFailure("error", "activation", None, "null-pointer")

        phase = "request"
        hr, operation = backend.request_async(state["factory"])
        hr = signed_hresult(hr)
        state["async_operation"] = operation or 0
        if not hresult_ok(hr):
            raise ProbeFailure(_status_for_hresult(hr), "request", hr)
        if not state["async_operation"]:
            raise ProbeFailure("error", "request", None, "null-pointer")

        _cleanup_call(cleanup_counts, cleanup_errors, "release-factory", lambda: backend.release(state["factory"]))
        state["factory"] = 0

        phase = "async-info"
        hr, info = backend.async_query_info(state["async_operation"])
        hr = signed_hresult(hr)
        state["async_info"] = info or 0
        if not hresult_ok(hr):
            raise ProbeFailure(_status_for_hresult(hr), "async-info", hr)
        if not state["async_info"]:
            raise ProbeFailure("error", "async-info", None, "null-pointer")

        deadline_at = monotonic() + timeout
        max_polls = int(math.ceil(timeout / POLL_INTERVAL_SECONDS)) + 2
        poll_count = 0
        while True:
            poll_count += 1
            phase = "async-status"
            hr, status = backend.async_status(state["async_info"])
            hr = signed_hresult(hr)
            if not hresult_ok(hr):
                raise ProbeFailure(_status_for_hresult(hr), "async-status", hr)
            if not isinstance(status, int):
                raise ProbeFailure("error", "async-status", None, "invalid-async-status")

            if status == ASYNC_STATUS_COMPLETED:
                phase = "results"
                hr, manager = backend.async_get_results(state["async_operation"])
                hr = signed_hresult(hr)
                state["manager"] = manager or 0
                if not hresult_ok(hr):
                    raise ProbeFailure(_status_for_hresult(hr), "results", hr)
                if not state["manager"]:
                    raise ProbeFailure("error", "results", None, "null-pointer")

                phase = "manager-validate"
                hr, validated = backend.manager_query(state["manager"])
                hr = signed_hresult(hr)
                state["manager_validated"] = validated or 0
                if not hresult_ok(hr):
                    raise ProbeFailure(_status_for_hresult(hr), "manager-validate", hr)
                if not state["manager_validated"]:
                    raise ProbeFailure("error", "manager-validate", None, "null-pointer")

                result.update(status="available", phase="done", manager_available=True)
                _set_hresult(result, S_OK)
                break

            if status == ASYNC_STATUS_CANCELED:
                result.update(status="canceled", phase="await", manager_available=False)
                _set_hresult(result, None)
                break

            if status == ASYNC_STATUS_ERROR:
                phase = "async-error"
                hr, error_code = backend.async_error_code(state["async_info"])
                hr = signed_hresult(hr)
                if not hresult_ok(hr):
                    raise ProbeFailure(_status_for_hresult(hr), "async-error", hr)
                error_code = signed_hresult(error_code)
                raise ProbeFailure(_status_for_hresult(error_code), "async-error", error_code)

            if status != ASYNC_STATUS_STARTED:
                raise ProbeFailure("error", "async-status", None, "invalid-async-status")

            now = monotonic()
            remaining = deadline_at - now
            if remaining <= 0 or poll_count >= max_polls:
                cancel_async = True
                result.update(status="timeout", phase="await", manager_available=False)
                _set_hresult(result, None)
                break
            sleep(min(POLL_INTERVAL_SECONDS, remaining))

    except ProbeFailure as failure:
        result.update(
            status=failure.status,
            phase=failure.phase,
            manager_available=False,
            detail=failure.detail,
        )
        _set_hresult(result, failure.hresult)
    except Exception as error:
        result.update(status="error", phase=phase, manager_available=False, detail=type(error).__name__)
        _set_hresult(result, None)
    finally:
        primary_hresult = result["hresult"]

        if state["async_info"]:
            if cancel_async:
                _cleanup_call(cleanup_counts, cleanup_errors, "async-cancel", lambda: backend.async_cancel(state["async_info"]))
            _cleanup_call(cleanup_counts, cleanup_errors, "async-close", lambda: backend.async_close(state["async_info"]))
            _cleanup_call(cleanup_counts, cleanup_errors, "release-async-info", lambda: backend.release(state["async_info"]))
            state["async_info"] = 0
        if state["async_operation"]:
            _cleanup_call(cleanup_counts, cleanup_errors, "release-async-operation", lambda: backend.release(state["async_operation"]))
            state["async_operation"] = 0
        if state["manager_validated"]:
            _cleanup_call(cleanup_counts, cleanup_errors, "release-manager-validated", lambda: backend.release(state["manager_validated"]))
            state["manager_validated"] = 0
        if state["manager"]:
            _cleanup_call(cleanup_counts, cleanup_errors, "release-manager", lambda: backend.release(state["manager"]))
            state["manager"] = 0
        if state["factory"]:
            _cleanup_call(cleanup_counts, cleanup_errors, "release-factory", lambda: backend.release(state["factory"]))
            state["factory"] = 0
        if state["hstring"]:
            _cleanup_call(cleanup_counts, cleanup_errors, "delete-string", lambda: backend.delete_string(state["hstring"]))
            state["hstring"] = 0
        if state["initialized"]:
            errors_before_uninitialize = len(cleanup_errors)
            _cleanup_call(cleanup_counts, cleanup_errors, "ro-uninitialize", lambda: backend.uninitialize())
            if len(cleanup_errors) == errors_before_uninitialize:
                result["cleanup"]["ro_uninitialized"] = True

        result["cleanup_errors"] = cleanup_errors
        result["cleanup"]["ro_initialized"] = state["initialized"]
        result["cleanup"]["counts"] = cleanup_counts
        result["cleanup"]["ok"] = not cleanup_errors
        result["cleanup"]["hresult_preserved"] = result["hresult"] == primary_hresult

    return result


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    timeout = DEFAULT_TIMEOUT_SECONDS
    if args:
        if len(args) == 2 and args[0] == "--timeout":
            try:
                timeout = float(args[1])
            except ValueError:
                print(json.dumps({
                    "probe": "native-smtc-capability",
                    "status": "invalid-timeout",
                    "phase": "cli",
                    "hresult": None,
                }, sort_keys=True))
                return 1
        else:
            print(json.dumps({
                "probe": "native-smtc-capability",
                "status": "error",
                "phase": "cli",
                "hresult": None,
            }, sort_keys=True))
            return 2
    try:
        result = probe(timeout_seconds=timeout)
    except Exception:
        result = {
            "probe": "native-smtc-capability",
            "status": "error",
            "phase": "cli",
            "hresult": None,
        }
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    cleanup_ok = isinstance(result.get("cleanup"), dict) and result["cleanup"].get("ok") is True
    return 0 if result.get("status") == "available" and cleanup_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
