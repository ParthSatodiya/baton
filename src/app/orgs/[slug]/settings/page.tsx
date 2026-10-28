import { notFound, redirect } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import prisma from '@/lib/db';
import { pageOrg } from '@/lib/page';
import { storage } from '@/lib/storage';
import AppHeader from '@/components/AppHeader';
import OrgSettings from './OrgSettings';

export default async function OrgSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await pageOrg(slug);
  if (!ctx) notFound();
  if (!ctx.isAdmin) redirect(`/orgs/${slug}`);

  const inOrg = { team: { orgId: ctx.org.id } };
  const [days, tasks, events] = await Promise.all([
    prisma.standup.aggregate({ where: inOrg, _count: true, _min: { date: true } }),
    prisma.standupItem.count({ where: { standup: inOrg } }),
    prisma.auditEvent.count({ where: { orgId: ctx.org.id } }),
  ]);
  const n = (count: number, noun: string) =>
    `${count.toLocaleString('en-GB')} ${noun}${count === 1 ? '' : 's'}`;
  const dataSummary = days._min.date
    ? [
        `Since ${format(parseISO(days._min.date), 'd MMM yyyy')}`,
        n(days._count, 'standup'),
        n(tasks, 'task'),
        n(events, 'audit event'),
      ].join(' · ')
    : 'No standups yet.';

  return (
    <>
      <AppHeader email={ctx.user.email} org={ctx.org} isAdmin={ctx.isAdmin} />
      <main id="main" className="mx-auto max-w-xl px-4 py-6">
        <OrgSettings
          slug={ctx.org.slug}
          name={ctx.org.name}
          emailDomain={ctx.org.emailDomain}
          logoUrl={ctx.org.logoPath ? storage().url(ctx.org.logoPath) : ''}
          dataSummary={dataSummary}
        />
      </main>
    </>
  );
}
