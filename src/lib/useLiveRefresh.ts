'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Other people's edits land without a reload: refresh every 15s while the tab
 * is visible, pause while it is hidden, and catch up the moment you come back —
 * to the tab, or to the browser from another app. Only hiding pauses: a screen
 * shared into a call stays live while the lead talks in another window.
 * Drafts survive: refresh keeps client state.
 */
export function useLiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let last = 0;
    const tick = () => {
      last = performance.now();
      router.refresh();
    };
    const start = () => (timer = setInterval(tick, 15_000));
    const catchUp = () => {
      clearInterval(timer);
      if (document.hidden) return;
      // A tab switch fires visibilitychange and focus together: one refresh.
      if (performance.now() - last > 1000) tick();
      start();
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', catchUp);
    window.addEventListener('focus', catchUp);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', catchUp);
      window.removeEventListener('focus', catchUp);
    };
  }, [router]);
}
