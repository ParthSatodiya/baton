import prisma from '@/lib/db';
import { HttpError } from '@/lib/http';

/**
 * Who may do what, as plain database rules — no session, no request. perms.ts
 * puts the signed-in user in front of these; tests call them directly.
 */

/** Org membership is the outer gate: pending or deactivated reaches nothing. */
export async function orgMembershipOf(email: string, orgId: number) {
  const om = await prisma.orgMember.findUnique({ where: { orgId_email: { orgId, email } } });
  if (!om || om.status !== 'active') {
    throw new HttpError(403, 'You are not a member of this organisation');
  }
  return om;
}

/**
 * Everything a request needs to know about one person on one team.
 * An org admin gets a lead's reach on every team in their org, even one they
 * are not a member of — so `member` can be null while `isLead` is true.
 */
export async function teamContext(email: string, teamId: number) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new HttpError(404, 'Team not found');

  const orgMember = await orgMembershipOf(email, team.orgId);
  const isAdmin = orgMember.role === 'admin';

  const row = await prisma.teamMember.findUnique({ where: { teamId_email: { teamId, email } } });
  const member = row?.isActive ? row : null;
  if (!member && !isAdmin) throw new HttpError(403, 'You are not a member of this team');

  return {
    team,
    orgMember,
    isAdmin,
    member,
    isLead: isAdmin || member?.role === 'lead',
    // An observer reads the board and the reports and writes nothing.
    canWrite: isAdmin || (!!member && member.role !== 'observer'),
  };
}

/**
 * Who may start a team's day. Any member who writes — deliberately not lead-only,
 * so the standup still happens when the lead is away. Starting a day writes items
 * for the whole team, which is why an observer may not.
 */
export async function requireStandupStarter(email: string, teamId: number) {
  const ctx = await teamContext(email, teamId);
  if (!ctx.canWrite) throw new HttpError(403, 'Observers can only read this board');
  return ctx;
}

/**
 * The member row named by a URL segment or a request body, but only if it
 * really is on this team. Being a lead of team A says nothing about who a
 * given member id belongs to — ids are sequential across every org.
 */
export async function requireTeamMember(teamId: number, memberId: number) {
  const member = await prisma.teamMember.findFirst({ where: { id: memberId, teamId } });
  if (!member) throw new HttpError(404, 'That member is not on this team');
  return member;
}
