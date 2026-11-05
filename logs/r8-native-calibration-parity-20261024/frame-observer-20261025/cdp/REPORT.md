# Native turn-23 CDP collection failure diagnosis

Date: 2026-10-25  
Observer source HEAD: `bff97de7af9406dc2cb907674e2463fccb43052a`  
Qualified gameplay/package source: `fd061e898ad3de942d62c016547a5e453ddd9422`  
Scope: retained evidence and source tracing only. No source, classifier, reader, package, gameplay, baseline, or acceptance change; no Electron/native/campaign rerun.

## Verdict

The turn-23 attempt is **FAILED and non-qualifying**. The immediate failure is the v3 collector's truthful `status:"inconsistent"`: it retained exactly one `Network.responseReceived` row for `http://127.0.0.1:51038/index.html?embedded=1`, request ID `F6B04AC5BC1F8B21B100B0982335E0EB`, with no preceding request row. The collector correctly records `response-without-request`; the harness correctly makes every non-`complete` collector status fatal. The sidecar is unchanged at SHA-256 `27d7242504e68aac9e407bc4ecd71521fd844739b8794d74dafcc7c462adbab8`.

The specific boundary is the harness's attachment and target choice:

1. Electron launches and starts outer-window navigation before the harness can obtain the Playwright page (`paradox_local_qa.cjs:7318-7326`; `electron-main.cjs:1213-1247`).
2. `waitForGamePage` waits for that page's `domcontentloaded` and only then returns (`paradox_local_qa.cjs:2684-2692`).
3. Only afterward does the harness create one public CDP session on `page`, install listeners, and enable `Network` (`paradox_local_qa.cjs:7356-7374`; `cdp_network_collector.cjs:529-545`). CDP does not replay the earlier `requestWillBeSent`, so a still-arriving response becomes an orphan. The independent NetLog shows an HTTP subframe request for the same projected URL starting at monotonic time `293213515`; the retained CDP response timestamp is `293213.536378`. These streams have no shared identity and are not joined, but their independent chronology is consistent with a late observer attachment.
4. The actual game runs in an embedded HTTP frame under the outer `awwv://warroom` page (`warroom.ts:904-920`). The single CDP session stays scoped to the outer page target. NetLog later contains hundreds of embedded-frame tile/media URL events, Playwright sees seven attributed tile aborts and 114 ambient lifecycle signals, but the CDP sidecar sees no later request, response, failure, or finish rows. This localizes the remaining loss to the page-target versus embedded-frame target boundary. The retained evidence does not include `Target.*` metadata, so calling the frame OOPIF is an inference; the already-reviewed contract explicitly records this exact OOPIF/target-coverage residual. It is not evidence that no ambient request occurred.

This is not a benign-orphan classification and does not justify reconstructing the missing request. The response remains an inconsistency, and the zero later CDP rows remain **coverage not established**.

## Pipeline findings

- **Launch / attach:** collector setup itself succeeds (`setup.state:"ready"`), with no setup or cleanup error. The defect occurs before the collector's usable observation window: page discovery waits for DOM readiness, then attaches to the outer page target.
- **Collection:** one response row, zero request/failure/finish rows, zero body attempts, one inconsistency, zero cap violations, clean detach. There is no evidence of listener overflow, runtime exception, flush timeout, or body-read failure.
- **Independent consumers:** the Playwright arrays contain zero console messages, page errors, raw unmatched network failures, or remaining network failures. Seven tile aborts are separately attributed; 114 ambient lifecycle signals are retained. NetLog is 4,299,294 bytes and records substantial child-frame traffic. No Playwright/CDP/NetLog request identity join is claimed.
- **Finalization:** `playTurns` and the save/load route completed before CDP finalization. Final, manual-quicksave, and live autosave bytes are exact at SHA-256 `f9ce535068c8ba374068995c8f43a620cda313567f3052d22ec621034331b237`. All 23 provisional and 23 settled archives remain present. Finalization then throws at `paradox_local_qa.cjs:7491-7494`, before normal entry/evidence-manifest construction. The failure entry intentionally omits `playtest` and `evidenceManifest` (`:7539-7564`). Those missing result fields are a capture gap; this report does not reconstruct them from raw files.
- **Wrapper:** child `1`, wrapper `1`, no timeout/signal/spawn error, artifact contract pass. The wrapper attempt contains six exact files. This differs from the prior native-703 attempt's wrapper-capture defect.
- **Gameplay gate:** the raw settled turn-23 save is diagnostic only. Bukvik Gornji and Obadi are RBiH; Kolovarice and Tosici remain RS. The agreed turn-23 gameplay condition requiring RBiH control of Kolovarice and Tosici is therefore unmet independently of the collector failure. Gameplay cause analysis belongs to the separate core task.
- **Prior failure retained:** the earlier native-703 attempt remains a separate strict runtime NO-GO: one unclassified ambient `net::ERR_ABORTED`, child `1` / wrapper `126`. Nothing here reclassifies or waives it. Its selected raw evidence is bound in `RAW_INVENTORY.json`.

## Reached and unreached gates

Reached: fresh profile and evidence roots; explicit visible `always_allow` receipt; normal UI 0→23 execution; 23 provisional and settled archives; final save/load evidence; Playwright/page/main-process capture; NetLog; CDP close/detach and exclusive sidecar write; final failed JSON; wrapper receipt and artifact-contract check.

Failed: CDP completeness (`inconsistent`), child/wrapper exit (`1/1`), and the raw turn-23 Kolovarice/Tosici gameplay condition.

Unreached because finalization threw: normal faction entry assembly, evidence manifest, final runtime-diagnostics verdict block, postcheck/17-gate auditor, any qualification result, any later checkpoint, any package/build/baseline/campaign gate. Passing saves, zero Playwright failure arrays, or wrapper artifact preservation do not substitute for those gates.

## Smallest next diagnostic and contract decision

Do not amend the collector to ignore the orphan and do not infer a request row. First add one bounded adapter fixture, outside the game campaign, that uses the installed Playwright/Electron adapter with an outer page and a loopback HTTP iframe. Attach separate public CDP sessions to the outer `Page` and embedded `Frame`, then issue one synthetic post-attach request from the frame.

Pass condition: the frame-scoped session retains an ordered request/response/terminal chain for the synthetic request; the outer session's absence is explicit; each sidecar has its own observer namespace; no ID or body is joined across sessions. Also retain a fake-session attach-midflight negative proving a response-only stream remains `inconsistent` and fatal.

Expected cost: under 30 seconds for the adapter probe and under 10 seconds for the fake collector negative. Stop on the first setup error, orphan, duplicate terminal, or unexpected cross-target event; inspect that retained fixture before changing production wiring.

Suggested cheap commands after the focused fixtures exist:

```powershell
$env:CI='1'; $env:DO_NOT_TRACK='1'; $env:NO_UPDATE_NOTIFIER='1'
node tools/test/run_vitest_default.mjs tests/cdp_network_collector.test.ts tests/paradox_local_qa_harness.test.ts --pool=forks --reporter=dot
```

Cap at 180 seconds. Pass requires all focused tests green and the new adapter receipt to demonstrate the frame target boundary. If `newCDPSession(frame)` observes the synthetic child request, the smallest production proposal is to bind the diagnostic collector to the actual embedded gameplay frame before gameplay actions and define `complete` only for the explicit post-attach observation window. Any orphan in that window remains fatal. If the frame session cannot observe it, stop: a multi-target/auto-attach producer is a broader contract amendment requiring separate owner authorization and review.

No native retry is warranted until this cheaper target-boundary check passes, the chosen contract amendment is reviewed, and the retained current sidecar remains unchanged.

## Hash-bound inventory

- Selected source/reference set: 11 files, 938,029 bytes, aggregate SHA-256 `e4c5221f4aec4dc6eae383c3dd8b3d7feef1cf3b1e5dccffd44de978ee965506` (`SOURCE_BINDINGS.json`).
- Current failed wrapper attempt: 6 files, 10,233 bytes, aggregate `98cf1819e6cfa410b9155a1799cc162c52174c160102d5e0b12a245d6e78a204`.
- Current primary artifacts: 9 files, 40,415,419 bytes, aggregate `6db26d29e0dc1aa9f050ca25bce7735be0f695cd6b70eaec3eacaa3c0ea1bda9`.
- Current evidence tree: 50 files, 213,778,941 bytes, aggregate `1c9f24d699084ebf8d866cd52e222339dd4f8d094eef0ea85defb74618544cd1`.
- Current screenshots: 105 files, 225,204,810 bytes, aggregate `1c0241df3a113a4ab7e1950baf78dd6518ae4a38dccb6f5a962ffb092543aa21`.
- Prior native-703 strict-failure subset: 6 files, 28,410,429 bytes, aggregate `95720bab3da831a0ec00d267b382d00477c5e4440bf5bb8cd6f72f592a622f1d`.

The inventory generator reuses the existing task packet's `fileRecord`, `walkFiles`, and exclusive JSON writer. It creates no general framework and does not modify any retained evidence.

## Output format changes

- None to production or committed artifacts.
- New ignored diagnostic-only files: `REPORT.md`, `SOURCE_BINDINGS.json`, `RAW_INVENTORY.json`, and `build_diagnosis.cjs` under this directory.

