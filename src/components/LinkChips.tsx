import { taskLink, type LinkRow, type TaskLink } from '@/lib/links';

const chipTone: Record<TaskLink['kind'], string> = {
  jira: 'border-baton/45 text-baton hover:border-baton',
  github: 'border-line text-chalk hover:border-baton hover:text-baton',
  other: 'border-line text-dim hover:border-baton hover:text-baton',
};

/**
 * The little ticket/PR chips beside a task title. Labelling is a display rule,
 * so it happens here rather than in the data layer — pages hand over the stored
 * URLs untouched.
 *
 * `onFill` is for a chip sitting on a baton fill (a finished pill): the tones
 * above are baton and chalk, which vanish on it, so the chip goes to ink. The
 * label still tells a ticket from a PR.
 */
export default function LinkChips({ links, onFill = false }: { links: LinkRow[]; onFill?: boolean }) {
  return links.map(({ url }) => {
    const link = taskLink(url);
    if (!link) return null;
    return (
      <a
        key={link.url}
        href={link.url}
        target="_blank"
        rel="noreferrer"
        title={link.url}
        className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs tracking-tight transition ${
          onFill ? 'border-baton-ink/40 text-baton-ink hover:border-baton-ink' : chipTone[link.kind]
        }`}
      >
        {link.label}
      </a>
    );
  });
}
