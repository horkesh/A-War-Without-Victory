# Morning report: 5 November 2026

Plain-language summary of the overnight work. The technical detail sits in the linked records.

## 1. The repo is clean

- **On GitHub:** only `main` and `gh-pages`. Every other branch is saved as an `archive/<name>` tag (89), so nothing was lost. Merged overnight: #520 (OpenCode bridge), #521 (Codex handover), #522 (Codex UI) and #523 (first live January baseline). This fix is #524.
- **On this machine:** the main checkout is clean and in sync. Codex's last UI worktree is kept until Codex confirms it no longer needs it (I asked in the shared file, CL-20261105-004; no reply yet). The fix worktree is removed after #524 merges.
- **Incident, fixed:** removing an old worktree followed a hidden link and briefly emptied the main checkout's map folder and installed packages. Everything was restored from git and a fresh install, and the safeguard is now written down. Nothing was lost.
- **Backup note:** Codex's unfinished work from the handover is preserved as local git refs (`refs/handover/20261104/*`). They are not on GitHub because they are large evidence files. They exist only on this machine.

## 2. Calibration: live January 1993

The goal is for the **live game** to reach the same January 1993 map as the reference.

| You play as | Score last night | Score now | Same game, no player |
|---|---|---|---|
| RBiH | 698 / 712 | 698 | 702 |
| RS | 698 | **701** | 702 |
| HRHB | 703 | 703 | 702 |

**What I fixed:** when you played a faction, your own staff never carried out the historical troop movements the game had already planned for that faction. The game skipped them for "the player's side" even though your staff is meant to run them. Now they run. RS gains three correct villages. The headless reference run is unchanged byte for byte, so nothing else moved.

**What is still wrong for RBiH (and RS):** two Goražde villages, Glamoč and Sopotnica. An independent review found why:
- the live game and the no-player game start to differ in **week 1**, long before Goražde;
- by week 23 that difference has put a Serb brigade inside Sopotnica, so the Goražde operation can no longer attack.

The next job is to find what differs in week 1. One concrete lead: one kind of army-directive event appears only in the no-player game.

I also found and wrote down a smaller live-only bug. The operation list keeps re-adding operations that are already running. It has a one-line fix. It costs nothing in this run, but it gets its own measured run.

## 3. One question for you (no rush)

**Bukvik and Obadi** (2 of the 6 RBiH cells) are won in the no-player game only by armed volunteer groups seizing them in the first two weeks. A historical RBiH player refuses those groups, as history did, so these two villages can never be won.

Should the early local defence (Territorial Defence / Patriotic League) have a lawful way to hold them that does not depend on the paramilitaries? This is a design choice, not a bug. I won't change it without your answer.

## 4. Recorded, not fixed

- **Level 1 autonomy freezes everyone's plans:** at Level 1 ("staff proposes, you approve") a check meant for your side also freezes the computer-controlled sides' plans. Normal play uses Level 2, so this matters only to anyone who picks Level 1.
- **OpenCode helper limitation:** the local helper model cannot read its own long test output. It still did this job correctly. I found and fixed one mistake it missed: the full test suite caught a crash its smaller test set did not.
- **Farz (October 1995)** stays parked until we reach that checkpoint, as you asked.

## Records

- Fix and measurement: [prestage_fix/RESULT.md](prestage_fix/RESULT.md)
- Calibration log: [CALIBRATION_MASTER.md](../../CALIBRATION_MASTER.md), top entry
