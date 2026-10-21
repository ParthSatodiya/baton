# Changelog

## 0.3.2 — 2026-10-22

### Added
- Run standup shows everything someone finished since they were last at standup. After leave you see each day they missed, marked On leave, and then their last day here. (b5d4b07)
- A task's latest note stays under it until someone writes a new one, even across a quiet day or a day on leave. (735a21d)
- Finished tasks in Run standup show their note, and the week view's tooltip says which day a note is from. (735a21d)
- Task comments can run to several lines; the box grows as you type and keeps your line breaks. (119ac51)
- Reports show the team's total days away for the range, and clicking a name opens that person's day-by-day history. (4803e6c)
- Clicking a task on the week opens the day you clicked, not always its latest day. (a7d0143)

### Fixed
- Tasks no longer get lost, or show as done and open at once, after an earlier day is edited. Once the next standup has started, an earlier day's tasks are read-only; leave and comments can still be changed there. (a7d0143)
- A day the team skipped can no longer be started once a later standup exists, which duplicated tasks and hid what was finished. Tick that work on the later day instead. (4b6fe7e)

## 0.3.1 — 2026-10-15

### Added
- The board and the Run standup screen pick up other people's changes on their own every 15 seconds while on screen, and straight away when you come back to the browser. (3cfb7c0, 96668b6)
- A carried task starts each day with a fresh comment, and the previous day's note shows underneath it. (978ad1d)
- A task shows the time it was added, so you can see who got their day written up before standup. (7a82cd2)

### Fixed
- Picking a developer or a date on the reports page no longer jumps back to the top. (7f996e2)
- In Run standup, arrow keys and their shortcuts work inside a task editor again instead of jumping to the next person. (82a0414)

## 0.3.0 — 2026-10-14

### Added
- Menus and the day picker open with a short grow from where you clicked, and buttons give a small press when you click them. (4e897b8)

### Fixed
- The Board, Reports and Members tabs line up with the rest of the page on wide screens. (826ec01)
- The board's day picker can be used from the keyboard: arrow keys move between days, Page Up and Page Down change month, and Escape returns you to the date. (2341725)
- Small labels across the app, such as the tab counts, the day picker and the week grid's notes, are larger and easier to read. (d1b609f)
- Every button now shows the pointer cursor on hover. (bf6d2bf)
- The organisation and team menus no longer run off the edge of a narrow phone screen. (b1c6d70)
- Blocked tasks, held days and the board's blocked count are now marked by shape and words as well as colour, and read out by screen readers. (895d882)
- When adding or editing a task fails, what you typed stays in the field instead of disappearing. (66c5897)

## 0.2.1 — 2026-10-13

### Added
- The week grid now marks the days someone was on leave, so a long bar that ran
  through a holiday says so.

### Fixed
- The login page and the header now say Baton instead of RelayStand.
- The date arrows on the board stay put, so a second click on the next-day arrow
  can no longer land on Today.

## 0.2.0 — 2026-10-13

First published release, and the first container image.

### Added

- **The daily board.** One section per person, each task carrying an optional
  link, a comment, and one of three statuses — running, finished or blocked.
  Developers edit their own tasks; a lead edits anyone's on their team.
- **Carry forward, on purpose.** Press *Start standup* and every unfinished task
  comes across. It reaches back to the last standup you actually held, so
  skipping a day — or three — still works.
- **The week grid.** Five working days at a glance, one bar per task, bar length
  being how long it has been running. Tasks going amber at three days and red at
  five, so the ones quietly rotting are the ones you see.
- **Reports.** Completions per person over any range, average days to done, and
  the tasks that have been dragging longest.
- **Organisations and teams.** Join requests need an admin's approval, roles run
  lead / member / observer, and an audit trail records membership and task
  changes as they happen.
- **Sign-in with Google, Microsoft Entra ID or GitHub**, and an allowlist —
  `AUTH_ALLOWED_DOMAINS` / `AUTH_ALLOWED_EMAILS` — deciding who may get an
  account at all. GitHub addresses are accepted only when GitHub has verified
  them, since your email is your identity here.
- **A demo you can run in one command.** `npm run demo` seeds an invented team
  with a week of history and puts a password-less button on the login page. No
  OAuth app, no `.env`, no account. It cannot be switched on in a production
  build.
- **Export and backup.** An admin can download everything the organisation owns
  as JSON from Settings, and `npm run backup` takes a consistent snapshot of the
  database while the app keeps serving.
- **Official container images**, published per release to
  `ghcr.io/parthsatodiya/baton` for amd64 and arm64. The container runs as
  a non-root user and reports its own health on `/api/health`, which reads the
  database rather than merely answering.
- **One definition of "today", set by `TZ`.** A standup day is the team's day,
  decided by the server, so a developer visiting from another timezone sees the
  team's board rather than their own.
- **A boot-time configuration check** that names what is missing. A production
  start with no `AUTH_SECRET` refuses outright instead of failing later on
  somebody's sign-in.

### Known limits

Stated plainly, and covered in full in
[SECURITY.md](https://github.com/ParthSatodiya/baton/blob/main/SECURITY.md): there is no
rate limiting on any route, removal of a member is a soft delete, and SQLite
plus local file storage means a single container — there is no clustering story
yet.
