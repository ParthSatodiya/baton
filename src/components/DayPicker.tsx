'use client';

import { useEffect, useRef, useState } from 'react';
import { addMonths, format, getDay, isSameMonth, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthGrid, shiftDays } from '@/lib/days';
import { ui } from '@/lib/ui';

export interface StandupDay {
  date: string;
  blocked: boolean;
}

/**
 * The board's day picker. The native control cannot say which days the team
 * actually stood up on, which is the only thing worth knowing when you are
 * looking for a day — so this one marks them.
 */
export default function DayPicker({
  date,
  today,
  days,
  onPick,
  onClose,
  anchor,
}: {
  date: string;
  today: string;
  days: StandupDay[];
  onPick: (date: string) => void;
  onClose: () => void;
  /** The button that opened it: Escape hands focus back here. */
  anchor: React.RefObject<HTMLButtonElement | null>;
}) {
  const [month, setMonth] = useState(date);
  // The one day in the tab order; the arrow keys move it.
  const [focusDay, setFocusDay] = useState(date);
  const moved = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const dayButton = (day: string) =>
    box.current?.querySelector<HTMLButtonElement>(`[data-day="${day}"]`);

  // Opening lands on the day being viewed, so the arrows work straight away.
  useEffect(() => dayButton(date)?.focus(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    dayButton(focusDay)?.focus();
  }, [focusDay, month]);

  // Escape and a click outside both close it, like the switchers in the header.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
      anchor.current?.focus();
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // The trigger toggles itself; closing here too would reopen it on click.
      if (anchor.current?.contains(target)) return;
      if (box.current && !box.current.contains(target)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [onClose, anchor]);

  const held = new Map(days.map((d) => [d.date, d.blocked]));
  const lastStandup = days.find((d) => d.date <= today)?.date;
  const grid = monthGrid(month);
  // After a month button the focused day may be off screen; fall back to the
  // first day of this month that can be picked.
  const tabbable = grid.includes(focusDay)
    ? focusDay
    : (grid.find((d) => isSameMonth(parseISO(d), parseISO(month)) && d <= today) ?? grid[0]);

  // The date-picker keys from the ARIA practices: arrows by day and week,
  // Home/End to the week's ends, Page Up/Down by month.
  const onGridKey = (e: React.KeyboardEvent) => {
    const from = (e.target as HTMLElement).dataset.day;
    if (!from) return;
    const weekday = (getDay(parseISO(from)) + 6) % 7; // Monday is 0
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    };
    let to: string;
    if (e.key in step) to = shiftDays(from, step[e.key]);
    else if (e.key === 'PageUp' || e.key === 'PageDown')
      to = format(addMonths(parseISO(from), e.key === 'PageUp' ? -1 : 1), 'yyyy-MM-dd');
    else return;
    e.preventDefault();
    // A future day is disabled and cannot take focus.
    if (to > today) to = today;
    if (to === from) return;
    moved.current = true;
    setFocusDay(to);
    if (!isSameMonth(parseISO(to), parseISO(month))) setMonth(to);
  };

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Pick a standup day"
      className="absolute left-0 top-full z-20 mt-2 w-72 rounded-md border border-line bg-raised p-3 shadow-[0_18px_40px_rgba(0,0,0,.5)]"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonth(shiftDays(month, -28))}
          aria-label="Previous month"
          className={`${ui.btn} ${ui.btnSubtle} px-1.5 py-1`}
        >
          <ChevronLeft size={15} />
        </button>
        <p className="display text-xs tracking-[0.09em]">{format(parseISO(month), 'MMMM yyyy')}</p>
        <button
          onClick={() => setMonth(shiftDays(month, 28))}
          aria-label="Next month"
          className={`${ui.btn} ${ui.btnSubtle} px-1.5 py-1`}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center" onKeyDown={onGridKey}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="pb-1 text-xs uppercase tracking-[0.08em] text-dim">
            {d}
          </span>
        ))}
        {grid.map((day) => {
          const blocked = held.get(day);
          const isHeld = held.has(day);
          const outside = !isSameMonth(parseISO(day), parseISO(month));
          const ahead = day > today;
          return (
            <button
              key={day}
              data-day={day}
              tabIndex={day === tabbable ? 0 : -1}
              disabled={ahead}
              onClick={() => onPick(day)}
              aria-current={day === date ? 'date' : undefined}
              // The mark under the number is drawn for the eye; say it in words.
              aria-label={`${format(parseISO(day), 'EEEE d MMMM')}${
                isHeld ? `, standup held${blocked ? ', something blocked' : ''}` : ''
              }`}
              title={isHeld ? `Standup held${blocked ? ' — something blocked' : ''}` : undefined}
              className={`relative rounded py-1.5 pb-2.5 text-sm tabular-nums transition disabled:opacity-25 ${
                day === date
                  ? 'bg-baton font-semibold text-baton-ink'
                  : `${outside ? 'text-dim' : 'text-chalk'} enabled:hover:bg-chalk/8`
              } ${day === today && day !== date ? 'ring-1 ring-baton ring-inset' : ''}`}
            >
              {format(parseISO(day), 'd')}
              {isHeld && (
                <span
                  aria-hidden="true"
                  // Blocked is a dash, held a dot: the two read apart without hue.
                  className={`absolute bottom-1 left-1/2 h-1 -translate-x-1/2 rounded-full ${
                    blocked ? 'w-3' : 'w-1'
                  } ${day === date ? 'bg-baton-ink' : blocked ? 'bg-stall' : 'bg-baton'}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-dim">
        <span>
          <span className="mr-1 inline-block size-1 rounded-full bg-baton align-middle" />
          standup held
        </span>
        <span>
          <span className="mr-1 inline-block h-1 w-3 rounded-full bg-stall align-middle" />
          something blocked
        </span>
        <span>ring = today</span>
      </p>

      {lastStandup && lastStandup !== date && (
        <div className="mt-2.5 flex items-center justify-between border-t border-line-soft pt-2.5 text-xs text-dim">
          <span>Last standup {format(parseISO(lastStandup), 'd MMM')}</span>
          <button onClick={() => onPick(lastStandup)} className="text-baton hover:underline">
            Jump to it
          </button>
        </div>
      )}
    </div>
  );
}
