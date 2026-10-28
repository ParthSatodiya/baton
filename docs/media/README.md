# Media

Screen recordings used by the README and [use-cases.md](../use-cases.md).

Every file here is in git forever, and every clone pays for it. Be mean about
it.

## Rules

- **Six files, maximum.** If a seventh feels necessary, one of the six is not
  earning its place.
- **2 MB each, hard cap.** Check before committing: `ls -lh docs/media`.
- **5–8 seconds.** Long enough to show one idea, short enough to loop without
  irritating. One idea per file.
- **Name it for what it shows**, not where it goes: `week-grid.webp`, not
  `readme-1.webp`.
- **Show the pointer, and move it deliberately.** Without a visible cursor the
  interface looks like it changes on its own — the first take of these three
  had that problem. Travel to the control, click, let the result land. No
  wandering, no hunting for a menu: rehearse the path, then record it clean.
- **Record the window, not the screen**, at about 830×550 CSS pixels: ⌘⇧5,
  *Record Selected Portion*. A Retina Mac records that at 2×, about 1660 px
  wide, which is what GitHub's ~850px column needs to stay sharp there.
- **Hide the Next.js badge.** `npm run demo` is a dev server, and its "N" sits in
  the bottom-left corner of every frame.
- **Use seeded, plausible data.** Real names and real ticket numbers are a leak.
  Invent a team.

## Where the content comes from

All three were recorded against `DEMO_WEEK=2026-09-07 npm run seed:demo` — a
fictional Northwind payments team, pinned to that week in September 2026. Plain
`npm run seed:demo` seeds the week ending today, so pass `DEMO_WEEK` (a Monday)
when recording: the frames then never drift with the clock, and nobody's real
ticket numbers end up in a public repo.

## Making one small enough

Animated WebP, not GIF. A GIF has 256 colours, so the navy dithers into grain
and the 2× frame comes out several times the size; WebP keeps full colour at
2× and is still smaller than a 1× GIF. GitHub shows it inline like any image,
autoplaying and looping.

Record to video, then convert. Homebrew's `ffmpeg` has no WebP encoder, so
`ffmpeg` cuts the frames and `img2webp` (from `brew install webp`) builds the
animation:

```shell
# macOS: ⌘⇧5 records to .mov
mkdir frames && ffmpeg -i in.mov -vf fps=15 frames/%04d.png
img2webp -loop 0 -lossy -q 75 -m 6 -d 67 frames/*.png -o out.webp
```

`-d` is the frame time in milliseconds, so keep it at `1000 / fps`. A clip that
scrolls changes every pixel of every frame and runs large: drop to `fps=10`
with `-d 100`, then `-q 70`, until it is under the cap.

Not `.mp4`: GitHub plays a video only when it was uploaded into an issue or a
pull request, not when it is a file in the repository.

## Where they are used

| File | Used by |
|---|---|
| `week-grid.webp` | `docs/use-cases.md` top, and the README pitch |
| `start-standup.webp` | `docs/use-cases.md` — the daily loop |
| `reports.webp` | `docs/use-cases.md` — looking back |

The slots are marked with `GIF SLOT` comments in those files. Drop the file in,
swap the comment for an `![alt](path)`, and write real alt text — someone
reading this on a screen reader gets nothing else.
