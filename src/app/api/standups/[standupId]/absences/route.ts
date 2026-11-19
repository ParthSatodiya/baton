import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { errorResponse, parseId, requireStandupAccess } from '@/lib/perms';
import { requireTeamMember } from '@/lib/access';

interface Context {
  params: Promise<{ standupId: string }>;
}

/**
 * Toggle "on leave" for a member on this day. { memberId, absent: boolean }
 * Anyone who writes may mark anyone: whoever runs the standup when the lead is
 * away has to be able to mark the lead away too.
 */
export async function PUT(req: NextRequest, context: Context) {
  try {
    const standupId = parseId((await context.params).standupId, 'standup ID');
    const { standup } = await requireStandupAccess(standupId);

    const { memberId, absent } = await req.json();
    const targetId = Number(memberId);
    if (!targetId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    await requireTeamMember(standup.teamId, targetId);

    if (absent) {
      await prisma.absence.upsert({
        where: { standupId_memberId: { standupId, memberId: targetId } },
        update: {},
        create: { standupId, memberId: targetId },
      });
    } else {
      await prisma.absence.deleteMany({ where: { standupId, memberId: targetId } });
    }

    return NextResponse.json({ memberId: targetId, absent: Boolean(absent) });
  } catch (e) {
    return errorResponse(e);
  }
}
