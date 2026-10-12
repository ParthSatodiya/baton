# Changelog

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
