# Continuation 7 preflight-name collision readback

This file records the information still available after the helper worker and root used the same reserved `_preflight*` names. It is not a raw-byte recovery of overwritten files, and no preflight command was rerun to reconstruct evidence.

## Transcript-derived original worker execution

- Original command visible in the tool call: `node logs/prusac-diagnostic-20260929/continuation7_front_writer_campaign_20261004_preflight.cjs`.
- Original available exit: `0`.
- Original tool-return verdict: `PASS_PRECAMPAIGN_READINESS`.
- Original tool return reported: exact HEAD `2a1554a50866af292b949d3668ae45aec4e861fa`, empty tracked status, n40 present, 30 consumed inputs, digest `ed7fa30986392451f797708a5a0fe9d3ac83f284692be04e199305c533a1f0b6`, 139 weeks, and ten source hashes.
- A separate original syntax call returned exit `0`.

Root later encountered the existing outputs and overwrote `_preflight.cjs`, `_preflight.command.txt`, `_preflight.exit.txt`, and `_preflight.log` while diagnosing the collision. Those paths no longer establish the original worker source, command file, exit file, or log bytes. This readback therefore treats their original facts as transcript-derived only.

The surviving `_preflight.json` currently has SHA-256 `b5a7063cc09c52bcb4e13183e1ef8c2157b8ef603ba8b46c509e681d94143f52` and begins with the same `PASS_PRECAMPAIGN_READINESS` content returned by the original tool call. No pre-collision hash was recorded, so the current hash cannot prove byte-for-byte identity to the original output by itself.

No campaign launched during the collision. All `_preflight*`, `_root_preflight*`, `_authorization*`, `_runner*`, and `_root_*` paths are now explicitly root-owned and were not modified during the resumed normalizer/comparison work.
