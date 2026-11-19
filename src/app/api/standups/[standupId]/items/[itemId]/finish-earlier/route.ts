import { NextRequest, NextResponse } from 'next/server';
import { format, parseISO } from 'date-fns';
import { errorResponse, parseId, requireItemAccess } from '@/lib/perms';
import { logEvent } from '@/lib/audit';
import { finishEarlier, requireOpenDay } from '@/lib/standup';

interface Context {
  params: Promise<{ standupId: string; itemId: string }>;
}

/** Tick the carried task `itemId` on the standup it came from instead of today. */
export async function POST(_req: NextRequest, context: Context) {
  try {
    const itemId = parseId((await context.params).itemId, 'item ID');
    const { user, item, team } = await requireItemAccess(itemId);
    // Today must be open; the day it lands on is closed by definition.
    await requireOpenDay(item.standup);

    const date = await finishEarlier(itemId);
    await logEvent({
      orgId: team.orgId,
      teamId: team.id,
      actor: { email: user.email, name: user.fullName },
      action: 'task.finished-earlier',
      summary: `Marked "${item.title}" finished on ${format(parseISO(date), 'EEE d MMM')}`,
    });
    return NextResponse.json({ date });
  } catch (e) {
    return errorResponse(e);
  }
}
