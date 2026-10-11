# Contributing to RelayStand

Thanks for taking a look. Setup, deployment and the first-run walkthrough all
live in [README.md](README.md) — start there, then come back for the parts a
newcomer usually trips over.

## The four commands

```shell
npm run dev            # http://localhost:3000
npm test               # carry-forward check on a throwaway SQLite file
npm run lint
npx prisma migrate dev # after editing prisma/schema.prisma
npm run backup         # VACUUM INTO a snapshot, into ./backups
```

## Rules that are easy to break

These are load-bearing. A change that violates one will look fine and be wrong.

- **Identity is the email.** `TeamMember` has no `userId`. A session email is
  matched against `TeamMember.email`, both stored lowercase. Lowercase on write,
  always.
- **Every API route authorizes through `src/lib/perms.ts`** —
  `requireMembership`, `requireLead`, `requireItemAccess`, `requireStandupAccess`.
  Server components use the equivalents in `src/lib/page.ts`. Never add a route
  that skips them, and never key a write on a client-supplied id without scoping
  it to the caller's team.
- **Three statuses only:** `open`, `done`, `blocked`. "Carried forward" is not a
  status — it is `carriedFromId != null`.
- **Dates are `YYYY-MM-DD` strings** everywhere: database, API, URL. No `Date`
  objects crossing a boundary, no timezone conversions.
- **Carry-forward reaches for the most recent standup _before_ the target date**,
  not yesterday. That is what makes a skipped day work, and `npm test` guards
  exactly this. Do not break it.
- **Reading a date must never create a standup.** Creation is the explicit
  `POST /api/teams/:id/standups`.
- **Data flows one way.** Pages are server components that read through
  `src/lib/`. Client components mutate via `/api/**` then call
  `router.refresh()`. There are no `useEffect` data loads, and there should
  stay none.

## Demo data

```shell
npm run seed:demo      # builds prisma/demo.db — a fictional team, one week
```

An invented company with four people and a week of standups, including a task
blocked since Monday and someone off on the Wednesday. It writes to
`prisma/demo.db`, never to your `dev.db`, and refuses to run against any
database whose path does not say `demo`.

It is what the GIFs in `docs/media/` were recorded from, so re-record against it
and the screens stay consistent.

```shell
npm run demo          # seeds it, then serves it with a password-less sign-in
```

`npm run demo` is `seed:demo` plus `DEMO_MODE=1`, which adds a Credentials
provider that signs you in as the seeded lead. It is gated on
`NODE_ENV !== 'production'` as well, so it cannot reach a real build — see
`demoMode()` in `src/lib/signup.ts`, and the test that pins it.

## The words

[CONTEXT.md](CONTEXT.md) is the glossary — what a *task* is versus an *item*,
why "carried forward" is not a status, and the words this project avoids.
Decisions that were argued out, with their consequences, are in
[docs/adr/](docs/adr/). Worth five minutes before your first PR.

## Touching the UI

Read [DESIGN.md](DESIGN.md) first. Colour and font tokens live in
`src/app/globals.css` (`@theme`), shared classes in `src/lib/ui.ts`. Never
hard-code a hex or a Tailwind palette name in a component.

## Commit messages

Conventional prefix, and a scope when there is an obvious one:

```
feat(auth): GitHub sign-in, verified addresses only
fix(board): the forward arrow could not see a weekend standup ahead of it
chore(deps): next 16.4.0
```

`feat` and `fix` reach the changelog. `chore`, `docs`, `refactor`, `test` and
`style` do not.

### Write the changelog line while you still have the context

The release script reads the subject, and subjects are written for the person
reviewing the diff. When the user-facing wording is different — which is most of
the time — say so in a `Changelog:` trailer:

```
feat(auth): GitHub sign-in, verified addresses only

Changelog: Sign in with GitHub. Only addresses GitHub has verified are
 accepted, because in RelayStand your email is your identity.
```

Continuation lines are indented by one space, the way git expects them.

Two things the trailer is for, and neither can be worked out later from a commit
list:

- **`Changelog: skip`** — the commit is invisible to users. The usual case is a
  fix for something that broke after the last release, so nobody running a
  release ever saw the bug.
- **A different line from the subject** — "keep instrumentation.ts edge-safe"
  tells a reviewer what changed and a user nothing at all.

With no trailer the subject is used as-is, which is fine when the two agree.

### Breaking changes

Mark them. A `!` before the colon, and a footer saying what someone has to do:

```
feat(docker)!: run as the node user

BREAKING-CHANGE: existing relaystand-data volumes are root-owned, so the
 container cannot write to them until a one-time chown. Command in README.
```

Hyphenated, not `BREAKING CHANGE:` with a space. Conventional Commits treats the
two as synonyms, but a git trailer token cannot contain a space, so only the
hyphenated one comes back from `git log --format='%(trailers:key=...)'`. The
spaced form parses as nothing and the script would miss it.

If upgrading needs a human to do something, it is breaking, even when no API
changed.

## Pull requests

- One concern per PR.
- `npm run lint` and `npm test` green. CI runs both, plus a build.
- Logic worth a test gets one, in the style of `src/lib/standup.test.ts`: node's
  own test runner against a throwaway SQLite file. No frameworks.
- Say what you changed and why. A short PR body beats a long one.

## Cutting a release

```shell
npm run release                 # dry run — what version, and what the entry says
npm run release -- --write      # bumps package.json, prepends CHANGELOG.md
```

Then **edit `CHANGELOG.md`**. What the script produces is a draft assembled from
commit subjects; the editing pass is what makes it worth reading. Drop anything
a user would not recognise, and merge the lines that describe one change.

```shell
git commit -am "chore(release): 0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
git push && git push --tags
```

Pushing the tag is the trigger. `.github/workflows/release.yml` re-runs lint,
tests and the build, then builds the image for amd64 and arm64, pushes it to
`ghcr.io/parthsatodiya/relaystand`, and opens a GitHub Release whose body is
that version's section of `CHANGELOG.md` plus the pull command.

Nothing is published before the checks pass, and a version with no section in
`CHANGELOG.md` fails the job rather than publishing an empty release.

## Reporting a security issue

Please do not open a public issue. See [SECURITY.md](SECURITY.md) — it has the
private reporting link, what the app stores, and the limits we already know
about.
