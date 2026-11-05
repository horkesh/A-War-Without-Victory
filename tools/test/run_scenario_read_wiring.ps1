<#
.SYNOPSIS
  Windows Job Object containment runner for the scenario-read wiring checks (proposal 108 / authority 109).

.DESCRIPTION
  Executes ONLY the frozen commands below, each inside its own unnamed Job Object (KILL_ON_JOB_CLOSE,
  no breakaway flags): the child is created suspended, assigned to the job (a failed assignment STOPS),
  then resumed. After every command the job's ActiveProcesses is queried; descendants are terminated
  and quiescence (zero active processes) is verified before any cleanup or the next command/case.
  A Vitest timeout is never the execution boundary.

  Modes (no arbitrary command text is accepted):
    SelfTest   synthetic success / first-failure-no-next-case / child+grandchild timeout self-tests
    Cheap      the cheap gate/scan/determinism vitest command
    Startup    at most THREE separately contained initialStateOnly cases: off, on, failing (zero turns)
    Typecheck  tsc --noEmit -p tsconfig.json

  Exit codes: 0 pass; 1 a check/assertion failed (outputs retained); 2 helper or containment failure
  (outputs retained, nothing cleaned up); 97 refused to overwrite existing evidence.

  Evidence: exclusive 120-integration-* files under -EvidenceDir (never overwritten).
#>
param(
    [Parameter(Mandatory = $true)][ValidateSet('SelfTest', 'Cheap', 'Startup', 'Typecheck')][string]$Mode,
    [Parameter(Mandatory = $true)][string]$EvidenceDir
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$ThisScript = Join-Path $PSScriptRoot 'run_scenario_read_wiring.ps1'
$FixtureScript = Join-Path $PSScriptRoot 'scenario_read_wiring_process_fixture.mjs'
$NodeExe = (Get-Command node.exe -ErrorAction Stop).Source

# ---- frozen commands (never built from caller text) -------------------------------------------
$FrozenCheap = @('node_modules/vitest/vitest.mjs', 'run',
    'tests/scenario_runner_read_context_gate.test.ts',
    'tests/run_provenance_input_surface_scan.test.ts',
    'tests/determinism_static_scan_r1_5.test.ts', 'tests/test_discovery_contract.test.ts', '--bail=1')
$FrozenStartup = @('node_modules/vitest/vitest.mjs', 'run',
    'tests/scenario_runner_read_context_wiring.test.ts',
    '--pool=threads', '--maxWorkers=1', '--minWorkers=1', '--bail=1')
$FrozenTypecheck = @('node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.json')
$StartupCases = @('off', 'on', 'failing')

# ---- ceilings (milliseconds) ---------------------------------------------------------------------
$SelfTestCeilingMs = 60000
$CheapCeilingMs = 120000
$StartupCaseCeilingMs = 150000
$TypecheckCeilingMs = 180000
$TerminateWaitMs = 10000
$NaturalDrainWaitMs = 2000
$OuterCeilingSeconds = 1200
# Original validation window (earliest 113 prerequisite start 04:46:04Z + 20 min); never extended.
$AbsoluteStopUtc = [DateTime]::SpecifyKind([DateTime]::ParseExact('2026-10-06T08:11:06.7728998', 'yyyy-MM-ddTHH:mm:ss.fffffff', [Globalization.CultureInfo]::InvariantCulture), [DateTimeKind]::Utc)

$InteropSource = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class AwwvJob
{
    [StructLayout(LayoutKind.Sequential)]
    struct SECURITY_ATTRIBUTES { public int nLength; public IntPtr lpSecurityDescriptor; public int bInheritHandle; }

    [StructLayout(LayoutKind.Sequential)]
    struct STARTUPINFO
    {
        public int cb; public IntPtr lpReserved; public IntPtr lpDesktop; public IntPtr lpTitle;
        public int dwX; public int dwY; public int dwXSize; public int dwYSize;
        public int dwXCountChars; public int dwYCountChars; public int dwFillAttribute; public int dwFlags;
        public short wShowWindow; public short cbReserved2; public IntPtr lpReserved2;
        public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit; public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize; public uint ActiveProcessLimit;
        public UIntPtr Affinity; public uint PriorityClass; public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct IO_COUNTERS
    {
        public ulong ReadOperationCount; public ulong WriteOperationCount; public ulong OtherOperationCount;
        public ulong ReadTransferCount; public ulong WriteTransferCount; public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation; public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_ACCOUNTING_INFORMATION
    {
        public long TotalUserTime; public long TotalKernelTime; public long ThisPeriodTotalUserTime; public long ThisPeriodTotalKernelTime;
        public uint TotalPageFaultCount; public uint TotalProcesses; public uint ActiveProcesses; public uint TotalTerminatedProcesses;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr CreateJobObjectW(IntPtr lpJobAttributes, string lpName);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpInfo, uint cbInfo);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool QueryInformationJobObject(IntPtr hJob, int infoClass, out JOBOBJECT_BASIC_ACCOUNTING_INFORMATION lpInfo, uint cbInfo, IntPtr lpReturnLength);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool CreateProcessW(string lpApplicationName, StringBuilder lpCommandLine, IntPtr lpProcessAttributes, IntPtr lpThreadAttributes, bool bInheritHandles, uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFO lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint ResumeThread(IntPtr hThread);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool GetExitCodeProcess(IntPtr hProcess, out uint lpExitCode);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool TerminateProcess(IntPtr hProcess, uint uExitCode);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr hObject);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr CreateFileW(string lpFileName, uint dwDesiredAccess, uint dwShareMode, ref SECURITY_ATTRIBUTES lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
    const int JobObjectExtendedLimitInformation = 9;
    const int JobObjectBasicAccountingInformation = 1;
    const uint CREATE_SUSPENDED = 0x4;
    const uint CREATE_NO_WINDOW = 0x08000000;
    const int STARTF_USESTDHANDLES = 0x100;
    const uint GENERIC_READ = 0x80000000;
    const uint GENERIC_WRITE = 0x40000000;
    const uint FILE_SHARE_READ = 0x1;
    const uint FILE_SHARE_WRITE = 0x2;
    const uint CREATE_NEW = 1;
    const uint OPEN_EXISTING = 3;
    const uint FILE_ATTRIBUTE_NORMAL = 0x80;
    static readonly IntPtr INVALID_HANDLE_VALUE = new IntPtr(-1);

    // Unnamed job: KILL_ON_JOB_CLOSE only. No BREAKAWAY_OK / SILENT_BREAKAWAY flags are ever set.
    public static IntPtr CreateJob()
    {
        IntPtr job = CreateJobObjectW(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Exception("CreateJobObject failed: " + Marshal.GetLastWin32Error());
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int size = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr buffer = Marshal.AllocHGlobal(size);
        try
        {
            Marshal.StructureToPtr(info, buffer, false);
            if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, buffer, (uint)size))
                throw new Exception("SetInformationJobObject failed: " + Marshal.GetLastWin32Error());
        }
        finally { Marshal.FreeHGlobal(buffer); }
        return job;
    }

    static IntPtr OpenInheritable(string path, uint access, uint disposition, out int error)
    {
        SECURITY_ATTRIBUTES sa = new SECURITY_ATTRIBUTES();
        sa.nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
        sa.lpSecurityDescriptor = IntPtr.Zero;
        sa.bInheritHandle = 1;
        IntPtr handle = CreateFileW(path, access, FILE_SHARE_READ | FILE_SHARE_WRITE, ref sa, disposition, FILE_ATTRIBUTE_NORMAL, IntPtr.Zero);
        error = handle == INVALID_HANDLE_VALUE ? Marshal.GetLastWin32Error() : 0;
        return handle;
    }

    // Create the child SUSPENDED, assign it to the job (failure => child terminated, STOP), then resume.
    // The job handle is not inheritable. stdout/stderr go to exclusive (CREATE_NEW) files; stdin is NUL.
    public static string Launch(IntPtr job, string appPath, string commandLine, string workDir, string stdoutPath, string stderrPath, out IntPtr hProcess, out int pid)
    {
        hProcess = IntPtr.Zero; pid = 0;
        int error;
        IntPtr hOut = OpenInheritable(stdoutPath, GENERIC_WRITE, CREATE_NEW, out error);
        if (hOut == INVALID_HANDLE_VALUE) return "open_stdout_failed:" + error;
        IntPtr hErr = OpenInheritable(stderrPath, GENERIC_WRITE, CREATE_NEW, out error);
        if (hErr == INVALID_HANDLE_VALUE) { CloseHandle(hOut); return "open_stderr_failed:" + error; }
        IntPtr hIn = OpenInheritable("NUL", GENERIC_READ, OPEN_EXISTING, out error);
        if (hIn == INVALID_HANDLE_VALUE) { CloseHandle(hOut); CloseHandle(hErr); return "open_stdin_failed:" + error; }
        STARTUPINFO si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(typeof(STARTUPINFO));
        si.dwFlags = STARTF_USESTDHANDLES;
        si.hStdInput = hIn; si.hStdOutput = hOut; si.hStdError = hErr;
        PROCESS_INFORMATION pi;
        StringBuilder cmd = new StringBuilder(commandLine);
        string result = "";
        bool created = CreateProcessW(appPath, cmd, IntPtr.Zero, IntPtr.Zero, true, CREATE_SUSPENDED | CREATE_NO_WINDOW, IntPtr.Zero, workDir, ref si, out pi);
        if (!created) { result = "create_process_failed:" + Marshal.GetLastWin32Error(); }
        else
        {
            if (!AssignProcessToJobObject(job, pi.hProcess))
            {
                int assignError = Marshal.GetLastWin32Error();
                TerminateProcess(pi.hProcess, 1);
                CloseHandle(pi.hThread); CloseHandle(pi.hProcess);
                result = "assign_to_job_failed:" + assignError;
            }
            else
            {
                uint resumed = ResumeThread(pi.hThread);
                CloseHandle(pi.hThread);
                if (resumed == 0xFFFFFFFF)
                {
                    int resumeError = Marshal.GetLastWin32Error();
                    TerminateJobObject(job, 1);
                    CloseHandle(pi.hProcess);
                    result = "resume_failed:" + resumeError;
                }
                else { hProcess = pi.hProcess; pid = pi.dwProcessId; }
            }
        }
        CloseHandle(hIn); CloseHandle(hOut); CloseHandle(hErr);
        return result;
    }

    public static int Active(IntPtr job)
    {
        JOBOBJECT_BASIC_ACCOUNTING_INFORMATION info;
        if (!QueryInformationJobObject(job, JobObjectBasicAccountingInformation, out info, (uint)Marshal.SizeOf(typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION)), IntPtr.Zero)) return -1;
        return (int)info.ActiveProcesses;
    }

    public static bool BytesEqual(byte[] a, byte[] b)
    {
        if (a == null || b == null || a.Length != b.Length) return false;
        for (int i = 0; i < a.Length; i++) { if (a[i] != b[i]) return false; }
        return true;
    }

    public static uint WaitMs(IntPtr handle, uint milliseconds) { return WaitForSingleObject(handle, milliseconds); }
    public static uint ExitCodeOf(IntPtr handle) { uint code; if (!GetExitCodeProcess(handle, out code)) return 0xFFFFFFFE; return code; }
    public static bool TerminateJob(IntPtr job) { return TerminateJobObject(job, 1); }
    public static void Close(IntPtr handle) { if (handle != IntPtr.Zero) CloseHandle(handle); }
}
'@

Add-Type -TypeDefinition $InteropSource -Language CSharp

# ---- evidence helpers ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $EvidenceDir)) { New-Item -ItemType Directory -Path $EvidenceDir | Out-Null }
$EvidenceDir = (Resolve-Path -LiteralPath $EvidenceDir).Path
$ReceiptSuffixes = @('command.txt', 'stdout.log', 'stderr.log', 'exit.txt', 'elapsed.txt', 'result.json')

function Get-EvidencePath([string]$Name, [string]$Suffix) {
    return (Join-Path $EvidenceDir ('120-integration-{0}.{1}' -f $Name, $Suffix))
}

function Assert-FreshReceipts([string]$Name) {
    foreach ($suffix in $ReceiptSuffixes) {
        $path = Get-EvidencePath $Name $suffix
        if (Test-Path -LiteralPath $path) {
            [Console]::Error.WriteLine(("REFUSING to overwrite existing evidence: {0}" -f $path))
            exit 97
        }
    }
}

function Write-EvidenceText([string]$Name, [string]$Suffix, [string]$Text) {
    $path = Get-EvidencePath $Name $Suffix
    $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
    try {
        $bytes = (New-Object System.Text.UTF8Encoding($false)).GetBytes($Text)
        $stream.Write($bytes, 0, $bytes.Length)
    } finally { $stream.Dispose() }
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-PriorElapsedSeconds {
    $total = 0.0
    foreach ($name in @('SelfTest', 'Cheap', 'Startup', 'Typecheck')) {
        if ($name -eq $Mode) { continue }
        $path = Get-EvidencePath ('mode-{0}' -f $name) 'elapsed.txt'
        if (Test-Path -LiteralPath $path) { $total += [double](Get-Content -LiteralPath $path -Raw).Trim() }
    }
    return $total
}

# ---- containment ---------------------------------------------------------------------------------
function Format-CommandLine([string]$Exe, [string[]]$Arguments) {
    $parts = @('"' + $Exe + '"')
    foreach ($a in $Arguments) {
        if ($a -match '[\s"]') { $parts += ('"' + ($a -replace '"', '\"') + '"') } else { $parts += $a }
    }
    return ($parts -join ' ')
}

# Run ONE command inside its own job. Returns a result object; never cleans up anything.
function Invoke-Contained {
    param(
        [string]$Name,
        [string[]]$NodeArguments,
        [int]$DeadlineMs,
        [hashtable]$ChildEnvironment = @{}
    )
    Assert-FreshReceipts $Name
    # Original validation window: every child wait is capped to its ceiling AND the time left before
    # the absolute stop, with BOTH natural drain and termination verification reserved.
    $remainingMs = ($AbsoluteStopUtc - [DateTime]::UtcNow).TotalMilliseconds - $NaturalDrainWaitMs - $TerminateWaitMs
    if ($remainingMs -lt 1000) { throw ("refusing launch of {0}: insufficient time before absolute stop {1:o}" -f $Name, $AbsoluteStopUtc) }
    $requestedDeadlineMs = $DeadlineMs
    $DeadlineMs = [int][math]::Min($DeadlineMs, $remainingMs)
    $commandLine = Format-CommandLine $NodeExe $NodeArguments
    Write-EvidenceText $Name 'command.txt' ($commandLine + "`r`n")
    $stdoutPath = Get-EvidencePath $Name 'stdout.log'
    $stderrPath = Get-EvidencePath $Name 'stderr.log'

    $saved = @{}
    foreach ($key in $ChildEnvironment.Keys) {
        $saved[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, [string]$ChildEnvironment[$key], 'Process')
    }
    $job = [IntPtr]::Zero
    $hProcess = [IntPtr]::Zero
    $childPid = 0
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    $result = [ordered]@{
        name = $Name; command = $commandLine; assigned = $false; launch_error = ''
        exit_code = $null; timed_out = $false; elapsed_ms = 0
        active_initial = -1; drain_wait_ms = 0; deadline_ms_requested = $requestedDeadlineMs; deadline_ms_effective = $DeadlineMs
        active_after_exit = -1; terminated_job = $false; active_after_terminate = -1; quiescent = $false
    }
    try {
        $job = [AwwvJob]::CreateJob()
        $launch = [AwwvJob]::Launch($job, $NodeExe, $commandLine, $RepoRoot, $stdoutPath, $stderrPath, [ref]$hProcess, [ref]$childPid)
        if ($launch -ne '') {
            $result.launch_error = $launch
        } else {
            $result.assigned = $true
            $wait = [AwwvJob]::WaitMs($hProcess, [uint32]$DeadlineMs)
            if ($wait -eq 0x102) {
                $result.timed_out = $true
            } else {
                $result.exit_code = [int][AwwvJob]::ExitCodeOf($hProcess)
            }
            # ORIGINAL initial count is kept separately. A bounded natural-drain requery (<= 2 s) runs
            # BEFORE the final after-exit snapshot and any termination; only a verified zero passes.
            $result.active_initial = [AwwvJob]::Active($job)
            $result.active_after_exit = $result.active_initial
            if ((-not $result.timed_out) -and $result.active_initial -ne 0) {
                $drainWatch = [System.Diagnostics.Stopwatch]::StartNew()
                while ($drainWatch.ElapsedMilliseconds -lt $NaturalDrainWaitMs) {
                    Start-Sleep -Milliseconds 50
                    $result.active_after_exit = [AwwvJob]::Active($job)
                    if ($result.active_after_exit -eq 0) { break }
                }
                $result.drain_wait_ms = [int]$drainWatch.ElapsedMilliseconds
            }
            if ($result.timed_out -or $result.active_after_exit -ne 0) {
                [void][AwwvJob]::TerminateJob($job)
                $result.terminated_job = $true
                $deadline = [DateTime]::UtcNow.AddMilliseconds($TerminateWaitMs)
                do {
                    $result.active_after_terminate = [AwwvJob]::Active($job)
                    if ($result.active_after_terminate -eq 0) { break }
                    Start-Sleep -Milliseconds 100
                } while ([DateTime]::UtcNow -lt $deadline)
                $result.quiescent = ($result.active_after_terminate -eq 0)
            } else {
                $result.quiescent = $true
            }
        }
    } finally {
        $watch.Stop()
        $result.elapsed_ms = [int]$watch.ElapsedMilliseconds
        [AwwvJob]::Close($hProcess)
        [AwwvJob]::Close($job)
        foreach ($key in $ChildEnvironment.Keys) {
            [Environment]::SetEnvironmentVariable($key, $saved[$key], 'Process')
        }
    }
    $exitText = if ($null -ne $result.exit_code) { [string]$result.exit_code } else { 'none' }
    Write-EvidenceText $Name 'exit.txt' ($exitText + "`r`n")
    Write-EvidenceText $Name 'elapsed.txt' (([string][math]::Round($result.elapsed_ms / 1000.0, 3)) + "`r`n")
    Write-EvidenceText $Name 'result.json' (([pscustomobject]$result | ConvertTo-Json -Depth 4) + "`r`n")
    # Preserve the raw containment result before rejecting a late completion. No next case/cleanup.
    Assert-AbsoluteStop
    return [pscustomobject]$result
}

function Test-CommandPassed($Result) {
    return ($Result.assigned -and (-not $Result.timed_out) -and ($Result.exit_code -eq 0) -and $Result.quiescent -and ($Result.active_after_exit -eq 0))
}

# Sequence: stop at the first failed case; later cases are never started.
function Invoke-Sequence([object[]]$Cases) {
    $ran = @()
    foreach ($case in $Cases) {
        $res = Invoke-Contained -Name $case.Name -NodeArguments $case.Arguments -DeadlineMs $case.DeadlineMs -ChildEnvironment $case.Environment
        $ran += $res
        if (-not (Test-CommandPassed $res)) {
            return [pscustomobject]@{ stopped_after_failure = $true; ran = $ran }
        }
    }
    return [pscustomobject]@{ stopped_after_failure = $false; ran = $ran }
}

function Write-ModeElapsed([string]$ModeName, [double]$Seconds) {
    Write-EvidenceText ('mode-{0}' -f $ModeName) 'elapsed.txt' (([string][math]::Round($Seconds, 3)) + "`r`n")
}

function Assert-AbsoluteStop {
    if ([DateTime]::UtcNow -ge $AbsoluteStopUtc) {
        throw ("absolute validation stop reached: {0:o}" -f $AbsoluteStopUtc)
    }
}

function Assert-OuterCeiling([System.Diagnostics.Stopwatch]$ModeWatch) {
    Assert-AbsoluteStop
    $total = (Get-PriorElapsedSeconds) + $ModeWatch.Elapsed.TotalSeconds
    if ($total -gt $OuterCeilingSeconds) {
        throw ("outer ceiling exceeded: {0:N1}s > {1}s" -f $total, $OuterCeilingSeconds)
    }
}

function Test-SafeDescendant([string]$Root, [string]$Candidate) {
    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
    $candFull = [System.IO.Path]::GetFullPath($Candidate).TrimEnd('\')
    if (-not $candFull.StartsWith($rootFull + '\', [System.StringComparison]::OrdinalIgnoreCase)) { return $false }
    $probe = $candFull
    while ($probe.Length -gt $rootFull.Length) {
        if (Test-Path -LiteralPath $probe) {
            $item = Get-Item -LiteralPath $probe -Force
            if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { return $false }
        }
        $probe = [System.IO.Path]::GetDirectoryName($probe)
        if ($null -eq $probe) { return $false }
    }
    return $true
}

function Remove-OwnedTree([string]$Root, [string]$Target) {
    Assert-AbsoluteStop
    if (-not (Test-SafeDescendant $Root $Target)) { throw ("refusing to delete non-descendant or reparse path: {0}" -f $Target) }
    if (Test-Path -LiteralPath $Target) { Assert-AbsoluteStop; Remove-Item -LiteralPath $Target -Recurse -Force }
}

function New-OwnedRoot([string]$Prefix) {
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
    $leaf = $Prefix + [guid]::NewGuid().ToString('N').Substring(0, 8)
    $root = Join-Path $tempRoot $leaf
    New-Item -ItemType Directory -Path $root | Out-Null
    return $root
}

function Remove-OwnedRoot([string]$Root, [string]$Prefix) {
    Assert-AbsoluteStop
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
    $full = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
    if (([System.IO.Path]::GetDirectoryName($full)) -ne $tempRoot) { throw 'owned root is not directly under the OS temp directory' }
    if (-not ([System.IO.Path]::GetFileName($full)).StartsWith($Prefix)) { throw 'owned root prefix mismatch' }
    $item = Get-Item -LiteralPath $full -Force
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'owned root is a reparse point' }
    Assert-AbsoluteStop
    Remove-Item -LiteralPath $full -Recurse -Force
}

function Write-PassFile([string]$ModeName, [hashtable]$Extra) {
    Assert-AbsoluteStop
    $payload = [ordered]@{
        mode = $ModeName
        pass = $true
        helper_sha256 = (Get-Sha256 $ThisScript)
        fixture_sha256 = (Get-Sha256 $FixtureScript)
    }
    foreach ($key in $Extra.Keys) { $payload[$key] = $Extra[$key] }
    Assert-AbsoluteStop
    Write-EvidenceText ('mode-{0}' -f $ModeName) 'pass.json' (([pscustomobject]$payload | ConvertTo-Json -Depth 4) + "`r`n")
}

function Assert-PriorPass([string]$ModeName) {
    $path = Get-EvidencePath ('mode-{0}' -f $ModeName) 'pass.json'
    if (-not (Test-Path -LiteralPath $path)) { throw ("prerequisite not passed: missing {0}" -f $path) }
    $record = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if (-not $record.pass) { throw ("prerequisite not passed: {0}" -f $ModeName) }
    if ($record.helper_sha256 -ne (Get-Sha256 $ThisScript)) { throw ("helper changed since {0} passed" -f $ModeName) }
    if ($record.fixture_sha256 -ne (Get-Sha256 $FixtureScript)) { throw ("fixture changed since {0} passed" -f $ModeName) }
}

# ---- prerequisites (before ANY child): native cmdlets, hashes, zone marker, receipt ability ---------
function Assert-Prerequisites {
    $needed = @('Get-FileHash', 'Get-Content', 'Set-Content', 'Test-Path', 'Get-Item', 'Resolve-Path', 'Join-Path',
        'ConvertTo-Json', 'ConvertFrom-Json', 'Start-Sleep', 'Add-Type', 'Remove-Item', 'New-Item', 'Get-ChildItem')
    $missing = @($needed | Where-Object { $null -eq (Get-Command $_ -ErrorAction SilentlyContinue) })
    if ($missing.Count -gt 0) { throw ('prerequisite: cmdlets not resolvable: ' + ($missing -join ',')) }
    foreach ($file in @($ThisScript, $FixtureScript)) {
        $streams = @(Get-Item -LiteralPath $file -Stream * | ForEach-Object { $_.Stream })
        if ($streams -contains 'Zone.Identifier') { throw ('prerequisite: Zone.Identifier present on ' + $file) }
    }
    $record = [ordered]@{ helper_sha256 = (Get-Sha256 $ThisScript); fixture_sha256 = (Get-Sha256 $FixtureScript); cmdlets_resolved = $needed.Count; zone_marker = $false; psmodulepath = $env:PSModulePath }
    Write-EvidenceText ('prereq-{0}' -f $Mode) 'result.json' (([pscustomobject]$record | ConvertTo-Json -Depth 3) + "`r`n")
}

# ====================================================================================================
$modeWatch = [System.Diagnostics.Stopwatch]::StartNew()
$exitCode = 0
try {
    Assert-Prerequisites
    if ($Mode -eq 'SelfTest') {
        $failures = New-Object System.Collections.Generic.List[string]
        function Add-Failure([string]$Message) { $failures.Add($Message) }
        # An unexpected S1/S2 failure ends the WHOLE mode at once: the summary and elapsed file are
        # written, no later stage launches, and nothing is cleaned up (the marker root is retained).
        # An expected S2 exit 3 is not a failure here; only the gate checks above add failures.
        function Stop-SelfTestOnFailure([string]$Stage) {
            if ($failures.Count -eq 0) { return }
            $modeWatch.Stop()
            $summary = [ordered]@{
                mode = 'SelfTest'; pass = $false; failures = @($failures); stopped_after_stage = $Stage
                elapsed_seconds = [math]::Round($modeWatch.Elapsed.TotalSeconds, 3)
            }
            Write-EvidenceText 'selftest-summary' 'result.json' (([pscustomobject]$summary | ConvertTo-Json -Depth 5) + "`r`n")
            Write-ModeElapsed 'SelfTest' $modeWatch.Elapsed.TotalSeconds
            Write-Output ('SELFTEST FAIL: ' + ($failures -join '; '))
            exit 1
        }
        $markerRoot = New-OwnedRoot 'awwv-read-wiring-selftest-'
        $fixtureArgs = { param($mode, $dir, $arg) $a = @($FixtureScript, $mode, $dir); if ($arg) { $a += $arg }; return $a }

        # S1: success
        $s1Dir = Join-Path $markerRoot 's1'
        $s1 = Invoke-Contained -Name 'selftest-success' -NodeArguments (& $fixtureArgs 'success' $s1Dir $null) -DeadlineMs 15000
        if (-not (Test-CommandPassed $s1)) { Add-Failure 'S1 success case did not pass containment/exit gates' }
        if (-not (Test-Path -LiteralPath (Join-Path $s1Dir 'success.txt'))) { Add-Failure 'S1 success marker missing' }
        Stop-SelfTestOnFailure 'S1'

        # S2: first failure stops the sequence; the next case must never start
        $s2Dir = Join-Path $markerRoot 's2'
        $seq = Invoke-Sequence @(
            @{ Name = 'selftest-fail'; Arguments = (& $fixtureArgs 'fail' $s2Dir $null); DeadlineMs = 15000; Environment = @{} },
            @{ Name = 'selftest-nextcase'; Arguments = (& $fixtureArgs 'marker' $s2Dir 'must-not-exist.txt'); DeadlineMs = 15000; Environment = @{} }
        )
        $failRes = $seq.ran | Select-Object -First 1
        if (-not $seq.stopped_after_failure) { Add-Failure 'S2 sequence did not stop after the failing case' }
        if ($failRes.exit_code -ne 3) { Add-Failure ('S2 failing case exit code was {0}, expected 3' -f $failRes.exit_code) }
        if (-not $failRes.quiescent) { Add-Failure 'S2 failing case did not reach quiescence' }
        if (-not $failRes.assigned) { Add-Failure 'S2 failing case was not assigned to the job' }
        if ($failRes.launch_error -ne '') { Add-Failure ('S2 launch_error: ' + $failRes.launch_error) }
        if ($failRes.timed_out) { Add-Failure 'S2 failing case timed out' }
        if ($failRes.active_after_exit -ne 0) { Add-Failure ('S2 active_after_exit was {0} (initial {1}, drain {2} ms), required 0' -f $failRes.active_after_exit, $failRes.active_initial, $failRes.drain_wait_ms) }
        if (Test-Path -LiteralPath (Join-Path $s2Dir 'must-not-exist.txt')) { Add-Failure 'S2 next case ran after a failure' }
        if (@($seq.ran).Count -ne 1) { Add-Failure ('S2 ran {0} cases, expected exactly 1' -f @($seq.ran).Count) }
        Stop-SelfTestOnFailure 'S2'

        # S3: child + grandchild timeout; termination, quiescence and no late writes
        $s3Dir = Join-Path $markerRoot 's3'
        $launchedAt = [DateTime]::UtcNow
        $s3 = Invoke-Contained -Name 'selftest-timeout' -NodeArguments (& $fixtureArgs 'tree' $s3Dir '6000') -DeadlineMs 3000
        if (-not $s3.timed_out) { Add-Failure 'S3 did not time out as designed' }
        if (-not $s3.terminated_job) { Add-Failure 'S3 job was not terminated' }
        if (-not $s3.quiescent) { Add-Failure 'S3 did not reach zero active processes' }
        if (-not (Test-Path -LiteralPath (Join-Path $s3Dir 'grandchild-started.txt'))) { Add-Failure 'S3 grandchild never started (test is vacuous)' }
        $remainingMs = 9000 - ([DateTime]::UtcNow - $launchedAt).TotalMilliseconds
        if ($remainingMs -gt 0) { Start-Sleep -Milliseconds ([int]$remainingMs) }
        if (Test-Path -LiteralPath (Join-Path $s3Dir 'late.txt')) { Add-Failure 'S3 late write occurred after quiescence' }

        # ALL gates (including ceilings) are evaluated BEFORE any summary or pass certificate.
        $modeWatch.Stop()
        if ($modeWatch.Elapsed.TotalMilliseconds -gt $SelfTestCeilingMs) { Add-Failure 'SelfTest exceeded its 60 s ceiling' }
        if ([DateTime]::UtcNow -gt $AbsoluteStopUtc) { Add-Failure 'SelfTest finished after the absolute stop' }
        $summary = [ordered]@{
            mode = 'SelfTest'; pass = ($failures.Count -eq 0); failures = @($failures)
            inner_exits = [ordered]@{ success = $s1.exit_code; fail = $failRes.exit_code; timeout = $s3.exit_code; timeout_timed_out = $s3.timed_out }
            active_counts = [ordered]@{
                s1 = [ordered]@{ initial = $s1.active_initial; after_exit = $s1.active_after_exit; drain_wait_ms = $s1.drain_wait_ms }
                s2 = [ordered]@{ initial = $failRes.active_initial; after_exit = $failRes.active_after_exit; drain_wait_ms = $failRes.drain_wait_ms; after_terminate = $failRes.active_after_terminate }
                s3 = [ordered]@{ initial = $s3.active_initial; after_terminate = $s3.active_after_terminate }
            }
            elapsed_seconds = [math]::Round($modeWatch.Elapsed.TotalSeconds, 3)
        }
        Write-EvidenceText 'selftest-summary' 'result.json' (([pscustomobject]$summary | ConvertTo-Json -Depth 5) + "`r`n")
        Write-ModeElapsed 'SelfTest' $modeWatch.Elapsed.TotalSeconds
        if ($failures.Count -eq 0) {
            Write-PassFile 'SelfTest' @{}
            Remove-OwnedRoot $markerRoot 'awwv-read-wiring-selftest-'
            Write-Output 'SELFTEST PASS'
        } else {
            Write-Output ('SELFTEST FAIL: ' + ($failures -join '; '))
            $exitCode = 1
        }
    }
    elseif ($Mode -eq 'Cheap') {
        Assert-PriorPass 'SelfTest'
        $res = Invoke-Contained -Name 'cheap' -NodeArguments $FrozenCheap -DeadlineMs $CheapCeilingMs
        $modeWatch.Stop()
        Write-ModeElapsed 'Cheap' $modeWatch.Elapsed.TotalSeconds
        Assert-OuterCeiling $modeWatch
        if (Test-CommandPassed $res) { Write-PassFile 'Cheap' @{}; Write-Output 'CHEAP PASS' }
        else { Write-Output ('CHEAP FAIL exit={0} timed_out={1} quiescent={2}' -f $res.exit_code, $res.timed_out, $res.quiescent); $exitCode = 1 }
    }
    elseif ($Mode -eq 'Typecheck') {
        Assert-PriorPass 'SelfTest'
        Assert-PriorPass 'Cheap'
        $res = Invoke-Contained -Name 'typecheck' -NodeArguments $FrozenTypecheck -DeadlineMs $TypecheckCeilingMs
        $modeWatch.Stop()
        Write-ModeElapsed 'Typecheck' $modeWatch.Elapsed.TotalSeconds
        Assert-OuterCeiling $modeWatch
        if (Test-CommandPassed $res) { Write-PassFile 'Typecheck' @{}; Write-Output 'TYPECHECK PASS' }
        else { Write-Output ('TYPECHECK FAIL exit={0} timed_out={1} quiescent={2}' -f $res.exit_code, $res.timed_out, $res.quiescent); $exitCode = 1 }
    }
    elseif ($Mode -eq 'Startup') {
        Assert-PriorPass 'SelfTest'
        Assert-PriorPass 'Cheap'
        Assert-PriorPass 'Typecheck'
        $prefix = 'awwv-read-wiring-'
        $root = New-OwnedRoot $prefix
        $outBase = Join-Path $root 'out'
        $captured = @{}
        $failed = $false
        foreach ($case in $StartupCases) {
            Assert-OuterCeiling $modeWatch
            $resultFile = Join-Path $root ($case + '.result.json')
            $childEnv = @{
                AWWV_READ_WIRING_CASE = $case
                AWWV_READ_WIRING_OUT_BASE = $outBase
                AWWV_READ_WIRING_RESULT_FILE = $resultFile
            }
            $res = Invoke-Contained -Name ('startup-' + $case) -NodeArguments $FrozenStartup -DeadlineMs $StartupCaseCeilingMs -ChildEnvironment $childEnv
            if (-not (Test-CommandPassed $res)) { $failed = $true; Write-Output ('STARTUP CASE {0} FAILED exit={1} timed_out={2} quiescent={3}' -f $case, $res.exit_code, $res.timed_out, $res.quiescent); break }
            if (-not (Test-Path -LiteralPath $resultFile)) { $failed = $true; Write-Output ('STARTUP CASE {0}: child wrote no result file' -f $case); break }
            $childResult = Get-Content -LiteralPath $resultFile -Raw | ConvertFrom-Json
            $runDir = [string]$childResult.outDir
            if (-not (Test-SafeDescendant $root $runDir)) { $failed = $true; Write-Output ('STARTUP CASE {0}: run dir is not a safe descendant of the owned root' -f $case); break }
            $metaPath = Join-Path $runDir 'run_meta.json'
            $savePath = Join-Path $runDir 'initial_save.json'
            if (-not ((Test-Path -LiteralPath $metaPath) -and (Test-Path -LiteralPath $savePath))) { $failed = $true; Write-Output ('STARTUP CASE {0}: run_meta.json or initial_save.json missing' -f $case); break }
            # Capture raw artifacts BEFORE guarded cleanup; evidence copies are exclusive.
            $metaCopy = Get-EvidencePath ('startup-{0}' -f $case) 'run_meta.json.copy'
            $saveCopy = Get-EvidencePath ('startup-{0}' -f $case) 'initial_save.json.copy'
            [System.IO.File]::Copy($metaPath, $metaCopy, $false)
            [System.IO.File]::Copy($savePath, $saveCopy, $false)
            $captured[$case] = [pscustomobject]@{
                meta_text = [System.IO.File]::ReadAllText($metaCopy)
                save_bytes = [System.IO.File]::ReadAllBytes($saveCopy)
                final_state_hash = [string]$childResult.final_state_hash
                selected_count = [int]$childResult.selected_path_count
                selected_paths = @($childResult.selected_paths)
                result = $childResult
            }
            Remove-OwnedTree $root $runDir
        }
        $comparison = [ordered]@{ cases_completed = @($captured.Keys | Sort-Object); equal_metadata_text = $null; equal_initial_save_bytes = $null; equal_state_hash = $null; equal_selected_paths = $null }
        if (-not $failed -and $captured.Count -eq 3) {
            $off = $captured['off']
            $comparison.equal_metadata_text = ($captured['on'].meta_text -ceq $off.meta_text) -and ($captured['failing'].meta_text -ceq $off.meta_text)
            $comparison.equal_initial_save_bytes = ([AwwvJob]::BytesEqual([byte[]]$captured['on'].save_bytes, [byte[]]$off.save_bytes)) -and ([AwwvJob]::BytesEqual([byte[]]$captured['failing'].save_bytes, [byte[]]$off.save_bytes))
            $comparison.equal_state_hash = ($captured['on'].final_state_hash -ceq $off.final_state_hash) -and ($captured['failing'].final_state_hash -ceq $off.final_state_hash)
            $comparison.equal_selected_paths = (($captured['on'].selected_paths -join '|') -ceq ($off.selected_paths -join '|')) -and (($captured['failing'].selected_paths -join '|') -ceq ($off.selected_paths -join '|'))
            $comparison.selected_path_count = $off.selected_count
            $comparison.final_state_hash = $off.final_state_hash
            $comparison.run_meta_bytes = $off.meta_text.Length
            $comparison.initial_save_bytes = $off.save_bytes.Length
            if (-not ($comparison.equal_metadata_text -and $comparison.equal_initial_save_bytes -and $comparison.equal_state_hash -and $comparison.equal_selected_paths)) { $failed = $true }
        } else { $failed = $true }
        $modeWatch.Stop()
        Assert-OuterCeiling $modeWatch
        $comparison.pass = (-not $failed)
        Write-EvidenceText 'startup-summary' 'result.json' (([pscustomobject]$comparison | ConvertTo-Json -Depth 5) + "`r`n")
        Write-ModeElapsed 'Startup' $modeWatch.Elapsed.TotalSeconds
        Assert-OuterCeiling $modeWatch
        if (-not $failed) {
            Remove-OwnedRoot $root $prefix
            Write-Output 'STARTUP PASS'
        } else {
            Write-Output ('STARTUP FAIL; owned outputs retained under {0}' -f $root)
            $exitCode = 1
        }
    }
}
catch {
    Write-Output ('HELPER/CONTAINMENT FAILURE: ' + $_.Exception.Message)
    $exitCode = 2
}
exit $exitCode
