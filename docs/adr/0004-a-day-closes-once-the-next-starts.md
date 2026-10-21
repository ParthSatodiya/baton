# ADR-0004: A day closes once the next one starts

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Carry-forward copies a day's unfinished tasks at the moment the next standup
starts. Anything written to the older day after that stays on it. Three ways
this lost or doubled work, all found on the week grid:

- **A task added to an older day** never reached the later one. Nobody saw it
  again unless they went back to that day.
- **A task ticked on an older day** was done there and still open on the later
  copy, so it read as done and open at once.
- **A skipped day started after a later one** copied tasks the later day
  already carried, and the later day's "finished last time" then read the empty
  gap instead of the day before it.

Each looked like a small edit at the time, and none of them complained.

## Decision

**A standup with a later one after it is closed to task changes.**
`requireOpenDay` (`src/lib/standup.ts`) refuses, with a 409, adding, editing,
ticking, reordering, deleting or reopening a task onto a closed day, and
deleting a closed day. `startStandup` uses the same rule, so a gap behind a held
day stays a gap.

**The same rule for everyone, leads included.** A lead editing an old day breaks
the chain exactly as anyone else would.

**What is not carried stays open:** leave marks, day notes and task comments.
Writing them late cannot strand or double a task. A carried copy starts with an
empty comment, so a note written on yesterday cannot leak into today.

## Consequences

Good:

- A task cannot go missing between days, or be done and open at once.
- The board and Run standup read `closed` off `loadBoard` and hide the task
  buttons, so the refusal is something the screen explains rather than an error.
- Clicking a bar on the week grid can safely open the exact day under the
  pointer, because a past day opened that way is look-only.

Bad, and accepted:

- **An old day cannot be corrected.** Work finished on a skipped day, or found
  late, is ticked on the latest day and counts as finished there: one day off,
  same task, same age. A `doneOn` date would fix the attribution but touches
  every report, and nobody has needed it.
- **Only the latest day can be deleted.** Deleting a day in the middle would
  take its ticked tasks with it and break the chains through it.

## Guardrails

`npm test` pins that a skipped day cannot be started once a later day is held,
and that `requireOpenDay` refuses a closed day and lets the latest one through.
Every route that writes a task calls it; a new one must too.
