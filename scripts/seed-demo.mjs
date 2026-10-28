/**
 * Seeds the throwaway demo database: invented company, invented people,
 * invented ticket numbers.
 *
 *   npm run seed:demo                         # the five working days ending today
 *   DEMO_WEEK=2026-09-07 npm run seed:demo    # a fixed Monday-to-Friday, for the docs GIFs
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { addDays, format, isMonday, isWeekend, parseISO, subDays } from 'date-fns';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('demo')) {
  throw new Error(`refusing to seed a database that is not the demo one: ${url}`);
}
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

/**
 * The demo's five standup days, oldest first. By default they end today — or
 * on Friday, at a weekend — so whoever opens the demo lands on a full board.
 * DEMO_WEEK pins a fixed week instead, so a recording never drifts with the
 * clock. Local dates, the way the app's own today() reads them.
 */
function demoDays() {
  const ymd = (d) => format(d, 'yyyy-MM-dd');
  if (process.env.DEMO_WEEK) {
    const monday = parseISO(process.env.DEMO_WEEK);
    if (!isMonday(monday)) throw new Error(`DEMO_WEEK must be a Monday: ${process.env.DEMO_WEEK}`);
    return [0, 1, 2, 3, 4].map((i) => ymd(addDays(monday, i)));
  }
  const days = [];
  for (let d = new Date(); days.length < 5; d = subDays(d, 1)) {
    if (!isWeekend(d)) days.unshift(ymd(d));
  }
  return days;
}
// D5 is "today" in the story; D1 is the week's start.
const [D1, D2, D3, D4, D5] = demoDays();
const weekday = (date) => format(parseISO(date), 'EEEE');

const LEAD = 'rhea.kapadia@northwind.example';

async function main() {
  for (const t of ['standupItemLink', 'absence', 'standupItem', 'standup', 'teamMember', 'team', 'auditEvent', 'orgMember', 'org', 'user']) {
    await prisma[t].deleteMany();
  }

  const user = await prisma.user.create({
    data: { email: LEAD, fullName: 'Rhea Kapadia' },
  });

  const org = await prisma.org.create({
    data: {
      name: 'Northwind',
      slug: 'northwind',
      emailDomain: 'northwind.example',
      createdBy: user.id,
      members: {
        create: [
          { email: LEAD, name: 'Rhea Kapadia', role: 'admin', status: 'active' },
          { email: 'dev.raval@northwind.example', name: 'Dev Raval', status: 'active' },
          { email: 'mei.lin@northwind.example', name: 'Mei Lin', status: 'active' },
          { email: 'tom.okafor@northwind.example', name: 'Tom Okafor', status: 'active' },
        ],
      },
    },
  });

  const team = await prisma.team.create({
    data: {
      orgId: org.id,
      name: 'Payments',
      createdBy: user.id,
      members: {
        create: [
          { name: 'Rhea Kapadia', email: LEAD, role: 'lead' },
          { name: 'Dev Raval', email: 'dev.raval@northwind.example' },
          { name: 'Mei Lin', email: 'mei.lin@northwind.example' },
          { name: 'Tom Okafor', email: 'tom.okafor@northwind.example' },
        ],
      },
    },
    include: { members: true },
  });
  const m = Object.fromEntries(team.members.map((r) => [r.name.split(' ')[0], r.id]));

  const days = {};
  for (const date of [D1, D2, D3, D4, D5]) {
    days[date] = await prisma.standup.create({
      data: {
        teamId: team.id,
        date,
        createdBy: user.id,
        notes: date === D5 ? 'Release freeze from 16:00. Nothing new to staging after that.' : '',
      },
    });
  }

  let order = 0;
  /** Create one task and carry it forward across `dates`, ending in `endStatus`. */
  async function task({ member, title, comment = '', link, dates, endStatus = 'open' }) {
    const originDate = dates[0];
    let previous = null;
    for (const [i, date] of dates.entries()) {
      const last = i === dates.length - 1;
      const item = await prisma.standupItem.create({
        data: {
          standupId: days[date].id,
          memberId: member,
          title,
          comment: last ? comment : '',
          status: last ? endStatus : 'open',
          carriedFromId: previous,
          originDate,
          displayOrder: order++,
        },
      });
      // Every copy, as carry-forward would have made it — not just the last.
      if (link) await prisma.standupItemLink.create({ data: { itemId: item.id, url: link } });
      previous = item.id;
    }
  }

  // The point of the product: one task that has been running all week.
  await task({
    member: m.Dev,
    title: 'Retry logic for failed card captures',
    comment: `Waiting on the gateway sandbox — raised with their support on ${weekday(D2)}.`,
    link: 'https://northwind.atlassian.net/browse/PAY-1187',
    dates: [D1, D2, D3, D4, D5],
    endStatus: 'blocked',
  });
  await task({
    member: m.Dev,
    title: 'Split the settlement job into batches',
    link: 'https://github.com/northwind/payments/pull/482',
    dates: [D4, D5],
  });

  await task({
    member: m.Mei,
    title: 'Refund endpoint returns 500 on partial amounts',
    link: 'https://northwind.atlassian.net/browse/PAY-1203',
    dates: [D3, D4, D5],
  });
  await task({ member: m.Mei, title: 'Review Tom’s webhook signing PR', dates: [D5], endStatus: 'done' });
  await task({ member: m.Mei, title: 'Drop the unused currency table', dates: [D1, D2], endStatus: 'done' });

  await task({
    member: m.Tom,
    title: 'Sign outgoing webhooks',
    link: 'https://github.com/northwind/payments/pull/479',
    dates: [D2, D3, D4, D5],
    endStatus: 'done',
  });
  await task({ member: m.Tom, title: 'Bump the SDK to 4.2', dates: [D5], endStatus: 'done' });

  await task({ member: m.Rhea, title: 'Write up the chargeback flow for support', dates: [D4, D5] });
  await task({ member: m.Rhea, title: 'Q4 capacity plan', dates: [D1, D2, D3], endStatus: 'done' });

  // Tom took the middle day off — his work stops carrying while he is away.
  await prisma.absence.create({ data: { standupId: days[D3].id, memberId: m.Tom } });

  const counts = {
    standups: await prisma.standup.count(),
    items: await prisma.standupItem.count(),
    members: await prisma.teamMember.count(),
  };
  console.log(
    `seeded ${JSON.stringify(counts)}\n` +
      `  org   /orgs/${org.slug}\n` +
      `  team  /teams/${team.id}?date=${D5}`,
  );
}

main().finally(() => prisma.$disconnect());
