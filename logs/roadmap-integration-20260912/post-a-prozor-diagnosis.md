# Prozor injection diagnosis from retained POST-A evidence

Source: clean `51fe494151397c1cc6521b54006b0f8da70705e5`. No production edit or new scenario run.

POST-A records one `op_empty` error at turn 41 for Prozor–Rama Line Counterattack. The preceding
`all_objectives_owned` message claims both objectives are HRHB-controlled. That text is false:
the initial save puts Lug and Paros under RBiH, and their only control events are the ordinary
HVO Rama Brigade captures at turns 54 and 55. Both remain RBiH-controlled at turn 41.

`operation_validation.ts` counts objectives accepted by `isOperationObjectiveHostile`, which
includes the centralized bilateral combat-permission guard. It labels a zero count as
`all_objectives_owned`, although temporarily allied targets also produce zero. The queued
operation's actual-ownership check correctly finds the objectives unachieved, then validates
the politically unavailable targets and records an empty-operation error. The blocking gate
prevents invalid injection; later retry enables the two recorded combat captures.

The smallest supported repair is to defer the queued operation while all remaining foreign
objectives are temporarily unavailable under the existing combat-permission guard, retaining
the queue for retry. Truly achieved objectives still follow the existing moot-operation path;
missing formations, malformed definitions and other invalid operations must still fail. The
validator's explanatory text must distinguish ownership from combat eligibility. Do not lower
error severity, remove the truth gate, change bilateral doctrine or alter capture controls.

Before implementation, add focused regressions for blocked allied objectives retained without
an invalid injection, resumed eligibility admitting the same operation, actual friendly-owned
objectives following the existing moot path, and genuine malformed/empty operations remaining
blocking errors. No new historical objective, roster, timing constant or multiplier is needed.

This is a supported source-level diagnosis and proposed correction. Full-horizon behavior after
any repair remains unmeasured; January and western-cascade acceptance are independently unmet.
