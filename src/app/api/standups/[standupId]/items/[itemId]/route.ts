import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logEvent } from '@/lib/audit';
import { errorResponse, HttpError, parseId, requireItemAccess } from '@/lib/perms';
import { assignItem, isStatus, requireOpenDay } from '@/lib/standup';
import { cleanLinks } from '@/lib/links';

interface Context {
  params: Promise<{ standupId: string; itemId: string }>;
}

export async function PUT(req: NextRequest, context: Context) {
  try {
    const itemId = parseId((await context.params).itemId, 'item ID');
    const { user, item, team } = await requireItemAccess(itemId);

    const { title, links, comment, status, memberId } = await req.json();
    // A comment is that day's note and is never carried, so it may still be
    // written on a closed day. Anything else waits for an open one.
    const onlyComment =
      title === undefined && links === undefined && status === undefined && memberId === undefined;
    if (!onlyComment) await requireOpenDay(item.standup);
    const data: Prisma.StandupItemUpdateInput = {};
    if (title !== undefined) {
      if (!String(title).trim()) throw new HttpError(400, 'title cannot be empty');
      data.title = String(title).trim();
    }
    if (comment !== undefined) data.comment = String(comment).trim();
    if (status !== undefined) {
      if (!isStatus(status)) throw new HttpError(400, 'Invalid status');
      data.status = status;
    }
    // Handing it to someone else moves it between two members' lists, so it
    // goes through assignItem rather than riding along as a plain field.
    if (memberId !== undefined && Number(memberId) !== item.memberId) {
      await assignItem(itemId, Number(memberId));
      const to = await prisma.teamMember.findUnique({ where: { id: Number(memberId) } });
      await logEvent({
        orgId: team.orgId,
        teamId: team.id,
        actor: { email: user.email, name: user.fullName },
        action: 'task.reassigned',
        summary: `Handed "${item.title}" to ${to?.name ?? 'someone else'}`,
      });
    }

    // Links arrive as the whole list — the ones the editor is holding win.
    if (links !== undefined) {
      data.links = { deleteMany: {}, create: cleanLinks(links).map((url) => ({ url })) };
    }

    return NextResponse.json(
      await prisma.standupItem.update({ where: { id: itemId }, data, include: { links: true } })
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const itemId = parseId((await context.params).itemId, 'item ID');
    const { item } = await requireItemAccess(itemId);
    await requireOpenDay(item.standup);
    await prisma.standupItem.delete({ where: { id: itemId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
