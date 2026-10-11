#!/usr/bin/env node
/**
 * Cut a release: work out the next version, draft the changelog entry, write
 * both. It does NOT commit, tag or push — it prints those commands and stops,
 * because the draft is a draft. Edit CHANGELOG.md before committing it; that
 * editing pass is the difference between a changelog and a reformatted git log.
 *
 *   npm run release                 # dry run. Prints the draft, changes nothing.
 *   npm run release -- --write      # bump package.json, prepend CHANGELOG.md
 *   npm run release -- minor --write
 *
 * ponytail: no dependency. git already parses trailers and node already reads
 * JSON, so this is string handling and nothing else.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
/** For calls that are allowed to fail, so git's own message stays off stderr. */
const gitQuiet = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** Commit types that reach a user. Everything else is ours, not theirs. */
const SECTIONS = [
  ['feat', 'Added'],
  ['fix', 'Fixed'],
  ['perf', 'Performance'],
  ['revert', 'Reverted'],
];

const RECORD = '\x1e';
const FIELD = '\x1f';

/** One object a commit, with the trailers git parsed for us. */
export function readCommits(range) {
  const fmt = [
    '%H',
    '%s',
    '%(trailers:key=Changelog,valueonly,separator=%x20)',
    '%(trailers:key=BREAKING-CHANGE,valueonly,separator=%x20)',
  ].join(FIELD);
  const out = git('log', ...(range ? [range] : []), `--format=${fmt}${RECORD}`);
  return out
    .split(RECORD)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, changelog, breaking] = record.split(FIELD);
      const m = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/.exec(subject ?? '');
      return {
        hash: (hash ?? '').slice(0, 7),
        subject: subject ?? '',
        type: m?.[1] ?? '',
        scope: m?.[2] ?? '',
        // Either marker counts: the ! in the subject or the footer.
        breaking: Boolean(m?.[3]) || Boolean(breaking?.trim()),
        breakingNote: (breaking ?? '').trim(),
        description: m?.[4] ?? subject ?? '',
        changelog: (changelog ?? '').trim(),
      };
    });
}

/**
 * What a release of these commits should be called.
 *
 * While the major is 0 the API is unstable by definition, so a breaking change
 * moves the minor rather than declaring 1.0.0 by accident. Going 1.0 stays a
 * decision somebody makes on purpose, by passing the bump in.
 */
export function nextVersion(current, commits, forced) {
  const [major, minor, patch] = current.split('.').map(Number);
  const natural = commits.some((c) => c.breaking)
    ? 'major'
    : commits.some((c) => c.type === 'feat')
      ? 'minor'
      : 'patch';
  let bump = forced ?? natural;
  let note = forced ? 'forced' : `from the commits (${natural})`;
  if (!forced && bump === 'major' && major === 0) {
    bump = 'minor';
    note = 'breaking, but 0.x — minor, not 1.0.0';
  }
  const next =
    bump === 'major'
      ? [major + 1, 0, 0]
      : bump === 'minor'
        ? [major, minor + 1, 0]
        : [major, minor, patch + 1];
  return { version: next.join('.'), bump, note };
}

/** The entry body. `Changelog: skip` drops a commit; the trailer beats the subject. */
export function renderEntry(version, commits, date) {
  const kept = commits.filter((c) => c.changelog.toLowerCase() !== 'skip');
  const line = (c) => `- ${c.changelog || c.description} (${c.hash})`;

  const parts = [`## ${version} — ${date}`];
  const breaking = kept.filter((c) => c.breaking);
  if (breaking.length) {
    parts.push(
      '### Breaking',
      ...breaking.map((c) => `- ${c.breakingNote || c.changelog || c.description} (${c.hash})`)
    );
  }
  for (const [type, heading] of SECTIONS) {
    const rows = kept.filter((c) => c.type === type);
    if (rows.length) parts.push(`### ${heading}`, ...rows.map(line));
  }
  // Only the noise was left, so there is nothing a user would call a change.
  if (parts.length === 1) parts.push('- Internal changes only.');
  return parts.join('\n\n').replace(/\n\n- /g, '\n- ') + '\n';
}

/**
 * Put a new entry under the heading, keeping everything already there. Split
 * out so it is testable without a tag, a branch and a clean tree.
 */
export function prependEntry(existing, entry) {
  const header = '# Changelog\n';
  const current = existing || header;
  const body = current.startsWith(header) ? current.slice(header.length).trimStart() : current;
  return `${header}\n${entry}\n${body}`.trimEnd() + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const forced = args.find((a) => ['major', 'minor', 'patch'].includes(a));

  if (git('status', '--porcelain') && write) {
    console.error('Working tree is dirty. Commit or stash first.');
    process.exit(1);
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== 'main' && write) {
    console.error(`On ${branch}. Releases are cut from main.`);
    process.exit(1);
  }

  let last = '';
  try {
    last = gitQuiet('describe', '--tags', '--abbrev=0');
  } catch {
    // No tags yet: the first release covers the whole history.
  }
  const commits = readCommits(last ? `${last}..HEAD` : '');
  if (!commits.length) {
    console.error(`No commits since ${last}. Nothing to release.`);
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const { version, bump, note } = nextVersion(pkg.version, commits, forced);
  if (git('tag', '--list', `v${version}`)) {
    console.error(`Tag v${version} already exists.`);
    process.exit(1);
  }

  const date = new Date().toLocaleDateString('en-CA');
  const entry = renderEntry(version, commits, date);
  const skipped = commits.filter((c) => c.changelog.toLowerCase() === 'skip').length;

  console.log(`${pkg.version} -> ${version}  (${bump}: ${note})`);
  console.log(
    `${commits.length} commit(s) since ${last || 'the beginning'}` +
      (skipped ? `, ${skipped} marked "Changelog: skip"` : '') +
      '\n'
  );
  console.log(entry);

  if (!write) {
    console.log('Dry run. Nothing written. Re-run with --write to apply.');
    return;
  }

  pkg.version = version;
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

  const existing = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '';
  writeFileSync('CHANGELOG.md', prependEntry(existing, entry));

  console.log('Written: package.json, CHANGELOG.md');
  console.log('\nEdit CHANGELOG.md into something worth reading, then:\n');
  console.log(`  git commit -am "chore(release): ${version}"`);
  console.log(`  git tag -a v${version} -m "v${version}"`);
  console.log('  git push && git push --tags');
}

// Importable for tests without cutting a release.
if (process.argv[1] && process.argv[1].endsWith('release.mjs')) main();
