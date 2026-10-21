'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Check, Play, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { canStartOn } from '@/lib/days';
import { daysTone, initials, statusLabel, ui } from '@/lib/ui';

export interface Bar {
  id: number;
  standupId: number;
  memberId: number;
  title: string;
  comment: string;
  status: string;
  links: { url: string }[];
  from: number;
  to: number;
  date: string;
  startsBefore: boolean;
  daysDragging: number;
}

export interface WeekMember {
  memberId: number;
  memberName: string;
  role: string;
  isActive: boolean;
  absentOn: string[];
  bars: Bar[];
}

export interface Week {
  columns: { date: string; held: boolean; weekend: boolean }[];
  heldDates: string[];
  members: WeekMember[];
}

/**
 * The team's last few days as lanes: one row a person, one bar a task, its
 * length the days that task has been running. Editing is deliberately thin
 * here — finish a task on today's column, or open the person in run mode.
 */
export default function WeekGrid({
  teamId,
  week,
  today,
  only,
  standupId,
  editable,
  busy,
  run,
}: {
  teamId: number;
  week: Week;
  today: string;
  /** Statuses the chips are showing. Empty, or all three, means everything. */
  only: string[];
  /** Today's standup, when one has been started — what a quick add writes to. */
  standupId: number | null;
  editable: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
}) {
  const router = useRouter();
  const [addFor, setAddFor] = useState<number | null>(null);
  // No chip pressed and every chip pressed say the same thing.
  const filtering = only.length > 0 && only.length < 3;
  const dimmed = (status: string) => filtering && !only.includes(status);
  // When the whole week is empty, saying so once a person is just noise.
  const anyWork = week.members.some((m) => m.bars.length > 0);
  const [title, setTitle] = useState('');
  const cols = week.columns.length;
  const last = week.columns[cols - 1];
  // Grid columns: the person, then one a day. Inline because the count is data.
  // A bar spans days; open the one under the pointer, not always the last. A
  // skipped day under the bar has no row, so step back to the day before it.
  // The keyboard cannot point, so Enter keeps the link's own day: the last.
  function openDay(e: React.MouseEvent<HTMLAnchorElement>, bar: Bar) {
    const box = e.currentTarget.getBoundingClientRect();
    const span = bar.to - bar.from + 1;
    let at = bar.from + Math.min(span - 1, Math.floor(((e.clientX - box.left) / box.width) * span));
    while (at > bar.from && !week.columns[at].held) at--;
    const date = week.columns[at].date;
    if (date === bar.date) return;
    e.preventDefault();
    router.push(`/teams/${teamId}/walkthrough?date=${date}&member=${bar.memberId}`);
  }
  const track = {
    gridTemplateColumns: `minmax(140px, 200px) repeat(${cols}, minmax(96px, 1fr))`,
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid items-end" style={track}>
          <span />
          {week.columns.map((col) => (
            <div
              key={col.date}
              className={`px-2 pb-2 text-center text-xs tabular-nums ${
                col.date === today ? 'font-semibold text-baton' : 'text-dim'
              }`}
            >
              {format(parseISO(col.date), 'EEE d')}
              {!col.held && <span className="block text-xs text-dim">no standup</span>}
            </div>
          ))}
        </div>

        {week.members.map((member) => (
          <div
            key={member.memberId}
            className="group grid border-t border-line-soft first:border-t-line"
            style={track}
          >
            <div className="flex items-center gap-2.5 py-3 pr-3">
              {last.held ? (
                <Link
                  href={`/teams/${teamId}/walkthrough?date=${last.date}&member=${member.memberId}`}
                  title={`Start the walkthrough on ${member.memberName}`}
                  aria-label={`Start the walkthrough on ${member.memberName}`}
                  className="group/play relative grid size-8 shrink-0 place-items-center rounded bg-chalk/12 text-sm text-dim transition hover:bg-baton hover:text-baton-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-baton"
                >
                  <span aria-hidden="true" className="display group-hover/play:opacity-0">
                    {initials(member.memberName)}
                  </span>
                  <Play
                    size={13}
                    aria-hidden="true"
                    className="absolute opacity-0 transition group-hover/play:opacity-100"
                  />
                </Link>
              ) : (
                <span
                  aria-hidden="true"
                  className="display grid size-8 shrink-0 place-items-center rounded bg-chalk/12 text-sm text-dim"
                >
                  {initials(member.memberName)}
                </span>
              )}
              <span className="min-w-0">
                {/* No standup on the last day: nothing to walk through, like the initials. */}
                {last.held ? (
                  <Link
                    href={`/teams/${teamId}/walkthrough?date=${last.date}&member=${member.memberId}`}
                    className="block truncate text-sm font-semibold hover:text-baton focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-baton"
                  >
                    {member.memberName}
                  </Link>
                ) : (
                  <span className="block truncate text-sm font-semibold">{member.memberName}</span>
                )}
                <span className="flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-dim">
                  {member.role === 'lead'
                    ? 'Lead'
                    : member.role === 'observer'
                      ? 'Observer'
                      : 'Dev'}
                  {member.absentOn.length > 0 && (
                    <span className="text-warn">
                      · away {member.absentOn.map((d) => format(parseISO(d), 'EEE')).join(', ')}
                    </span>
                  )}
                  {editable && standupId !== null && member.isActive && (
                    <button
                      onClick={() => {
                        setTitle('');
                        setAddFor(addFor === member.memberId ? null : member.memberId);
                      }}
                      aria-label={`Add a task for ${member.memberName}`}
                      aria-expanded={addFor === member.memberId}
                      className={`${ui.rowAction} grid size-5 place-items-center rounded border border-line text-dim hover:border-baton hover:text-baton`}
                    >
                      {addFor === member.memberId ? <X size={11} /> : <Plus size={11} />}
                    </button>
                  )}
                </span>
              </span>
            </div>

            {/* The day cells sit under the bars, so the week reads as a grid. */}
            <div
              aria-hidden="true"
              className="grid"
              style={{
                gridColumn: '2 / -1',
                gridRow: 1,
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
              }}
            >
              {week.columns.map((col) =>
                member.absentOn.includes(col.date) ? (
                  // Away: bars run through unchanged — leave does not pause a
                  // task's days — but a long bar now shows why it is long.
                  <div
                    key={col.date}
                    className="hatch-away relative border-l border-line-soft shadow-[inset_0_2px_0_var(--color-warn)]"
                  >
                    <span className="absolute right-1.5 bottom-0.5 text-xs uppercase tracking-[0.12em] text-warn">
                      away
                    </span>
                  </div>
                ) : (
                  <div
                    key={col.date}
                    className={`border-l border-line-soft ${
                      col.date === today ? 'bg-baton/6' : col.held ? '' : 'bg-chalk/3'
                    }`}
                  />
                ),
              )}
            </div>

            <div
              className={`grid gap-1.5 pt-2.5 ${member.absentOn.length > 0 ? 'pb-4' : 'pb-2.5'}`}
              style={{
                gridColumn: '2 / -1',
                gridRow: 1,
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
              }}
            >
              {member.bars.length === 0 && (anyWork || member.absentOn.includes(last.date)) && (
                <p className="col-span-full self-center pl-3 text-xs text-dim">
                  {member.absentOn.includes(last.date) ? 'Away' : 'Nothing on the board'}
                </p>
              )}
              {member.bars.map((bar) => (
                <div
                  key={bar.id}
                  style={{ gridColumn: `${bar.from + 1} / ${bar.to + 2}` }}
                  // Filtered out: faded for the eye, gone for the keyboard and
                  // the screen reader — not a 1.8:1 link still in the tab order.
                  inert={dimmed(bar.status)}
                  className={`group/bar relative flex min-w-0 items-center transition ${
                    dimmed(bar.status) ? 'opacity-20' : ''
                  }`}
                >
                  <Link
                    href={`/teams/${teamId}/walkthrough?date=${bar.date}&member=${bar.memberId}`}
                    onClick={(e) => openDay(e, bar)}
                    title={`${bar.title}${bar.comment ? ` — ${bar.comment}` : ''}${
                      bar.startsBefore ? ' (started before this week)' : ''
                    }`}
                    className={`flex h-7 min-w-0 flex-1 items-center gap-2 rounded-full border px-3 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-baton ${
                      bar.status === 'done'
                        ? 'border-baton bg-baton text-baton-ink'
                        : bar.status === 'blocked'
                          ? 'hatch border-stall text-chalk'
                          : 'border-line bg-chalk/8 hover:border-baton'
                    } ${bar.startsBefore ? 'rounded-l-none border-l-4 border-l-warn' : ''}`}
                  >
                    <span className="truncate">{bar.title}</span>
                    {/* Fill, hatch and outline say the state to the eye only. */}
                    <span className="sr-only">, {statusLabel[bar.status]}</span>
                    <span
                      className={`ml-auto shrink-0 tabular-nums ${
                        bar.status === 'done' ? 'text-baton-ink/65' : daysTone(bar.daysDragging)
                      }`}
                    >
                      {bar.daysDragging}d
                    </span>
                  </Link>

                  {/* The one edit worth having here: finishing today's work. */}
                  {editable && bar.status !== 'done' && bar.date === last.date && (
                    <button
                      disabled={busy}
                      title={`Mark "${bar.title}" finished`}
                      aria-label={`Mark ${bar.title} finished`}
                      onClick={() =>
                        run(() =>
                          api(`/api/standups/${bar.standupId}/items/${bar.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ status: 'done' }),
                          }),
                        )
                      }
                      className={`${ui.rowAction} ml-1 grid size-6 shrink-0 place-items-center rounded border border-line text-dim hover:border-baton hover:text-baton`}
                    >
                      <Check size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {addFor === member.memberId && standupId !== null && (
              <form
                style={{ gridColumn: '1 / -1', gridRow: 2 }}
                className="flex flex-wrap items-center gap-2 pb-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!title.trim() || busy) return;
                  // Close only once it saved: a failed add keeps what was typed.
                  const saved = await run(() =>
                    api(`/api/standups/${standupId}/items`, {
                      method: 'POST',
                      body: JSON.stringify({ memberId: member.memberId, title, links: [] }),
                    }),
                  );
                  if (saved) {
                    setTitle('');
                    setAddFor(null);
                  }
                }}
              >
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`New task for ${member.memberName.split(' ')[0]}`}
                  aria-label={`New task for ${member.memberName}`}
                  className={`${ui.input} min-w-0 flex-1 py-1.5`}
                />
                <button disabled={busy} className={`${ui.btn} ${ui.btnPrimary} py-1.5`}>
                  Add
                </button>
              </form>
            )}
          </div>
        ))}

        {/* The empty-day action, in the column of the day it starts. A future
            day is left blank — it has nothing to carry forward yet — and so is
            a gap behind a day already held. */}
        {editable && week.columns.some((col) => !col.held && canStartOn(col.date, today, week.heldDates)) && (
          <div className="grid border-t border-line" style={track}>
            <p className="py-3 pr-3 text-xs uppercase tracking-[0.12em] text-dim">
              Nothing held
            </p>
            <div
              className="grid"
              style={{
                gridColumn: '2 / -1',
                gridRow: 1,
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
              }}
            >
              {week.columns.map((col) => (
                <div key={col.date} className="grid place-items-center py-2">
                  {!col.held && canStartOn(col.date, today, week.heldDates) && (
                    <button
                      disabled={busy}
                      title={`Start the standup for ${format(
                        parseISO(col.date),
                        'EEEE d MMMM',
                      )} — it carries every unfinished task forward`}
                      onClick={() =>
                        run(() =>
                          api(`/api/teams/${teamId}/standups`, {
                            method: 'POST',
                            body: JSON.stringify({ date: col.date }),
                          }),
                        )
                      }
                      className="rounded border border-dashed border-line px-2.5 py-1 text-xs text-dim transition hover:border-solid hover:border-baton hover:text-baton focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-baton"
                    >
                      + Start
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
