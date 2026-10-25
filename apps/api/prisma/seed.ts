/**
 * Demo data for SkillSwap.
 *
 *   npm run db:seed          create/refresh the demo community
 *   npm run db:seed:reset    remove every demo account and its data
 *
 * Every demo account uses an address under DEMO_DOMAIN, which is how the
 * reset finds them. Real accounts are never touched.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../../../.env') });

import { CreditType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { normalizeConnectionString } from '../src/prisma/connection';
import {
  FIVE_STAR_REVIEW_BONUS,
  SIGNUP_BONUS,
  badgeBonus,
  lessonCost,
} from '../src/credits/credits.rules';

const DEMO_DOMAIN = 'demo.skillswap.test';
// Shared sign-in password for the demo accounts. Override with SEED_PASSWORD.
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'skillswap-demo';

const CATEGORY: Record<string, string> = {
  Python: 'Programming',
  JavaScript: 'Programming',
  TypeScript: 'Programming',
  Go: 'Programming',
  SQL: 'Programming',
  'UI Design': 'Design',
  'UX Research': 'Design',
  Figma: 'Design',
  Illustration: 'Design',
  'Public Speaking': 'Personal Growth',
  'Time Management': 'Personal Growth',
  Leadership: 'Personal Growth',
  Guitar: 'Music',
  Piano: 'Music',
  Singing: 'Music',
  'Music Theory': 'Music',
  'Resume Review': 'Career',
  'Interview Coaching': 'Career',
  Networking: 'Career',
};

interface DemoUser {
  key: string;
  name: string;
  college: string;
  bio: string;
  offers: [skill: string, proficiency: string][];
  wants: string[];
  availability: string[];
}

const USERS: DemoUser[] = [
  {
    key: 'aarav',
    name: 'Aarav Mehta',
    college: 'IIT Bombay',
    bio: 'Backend developer who loves teaching Python from first principles. Trying to finally learn guitar.',
    offers: [
      ['Python', 'EXPERT'],
      ['SQL', 'INTERMEDIATE'],
    ],
    wants: ['Guitar', 'Public Speaking'],
    availability: ['MON_EVENING', 'WED_EVENING', 'SAT_MORNING'],
  },
  {
    key: 'priya',
    name: 'Priya Nair',
    college: 'NID Ahmedabad',
    bio: 'Guitarist for ten years, design student by day. Want to automate my boring spreadsheet work.',
    offers: [
      ['Guitar', 'EXPERT'],
      ['Music Theory', 'INTERMEDIATE'],
    ],
    wants: ['Python', 'Figma'],
    availability: ['MON_EVENING', 'SAT_MORNING', 'SUN_AFTERNOON'],
  },
  {
    key: 'rohan',
    name: 'Rohan Das',
    college: 'BITS Pilani',
    bio: 'Product designer. Happy to review your portfolio or walk you through Figma auto-layout.',
    offers: [
      ['Figma', 'EXPERT'],
      ['UI Design', 'EXPERT'],
    ],
    wants: ['JavaScript', 'Interview Coaching'],
    availability: ['TUE_EVENING', 'THU_EVENING', 'SUN_AFTERNOON'],
  },
  {
    key: 'sara',
    name: 'Sara Khan',
    college: 'Delhi University',
    bio: 'Debate captain and campus MC. I can help you stop dreading presentations.',
    offers: [
      ['Public Speaking', 'EXPERT'],
      ['Leadership', 'INTERMEDIATE'],
    ],
    wants: ['UI Design', 'SQL'],
    availability: ['WED_EVENING', 'FRI_EVENING', 'SAT_MORNING'],
  },
  {
    key: 'dev',
    name: 'Dev Patel',
    college: 'VIT Vellore',
    bio: 'Full-stack JavaScript developer. Learning piano one clumsy chord at a time.',
    offers: [
      ['JavaScript', 'EXPERT'],
      ['TypeScript', 'INTERMEDIATE'],
    ],
    wants: ['Piano', 'Resume Review'],
    availability: ['TUE_EVENING', 'THU_EVENING', 'SAT_AFTERNOON'],
  },
  {
    key: 'meera',
    name: 'Meera Iyer',
    college: 'Christ University',
    bio: 'Classically trained pianist and choir lead. Curious about building my own website.',
    offers: [
      ['Piano', 'EXPERT'],
      ['Singing', 'INTERMEDIATE'],
    ],
    wants: ['TypeScript', 'Time Management'],
    availability: ['THU_EVENING', 'SAT_AFTERNOON', 'SUN_MORNING'],
  },
  {
    key: 'kabir',
    name: 'Kabir Singh',
    college: 'IIM Indore',
    bio: 'Ex-recruiter. I have read thousands of resumes and run hundreds of mock interviews.',
    offers: [
      ['Resume Review', 'EXPERT'],
      ['Interview Coaching', 'EXPERT'],
      ['Networking', 'INTERMEDIATE'],
    ],
    wants: ['Go', 'Illustration'],
    availability: ['MON_MORNING', 'TUE_EVENING', 'FRI_EVENING'],
  },
  {
    key: 'ananya',
    name: 'Ananya Rao',
    college: 'Srishti Manipal',
    bio: 'Illustrator and UX researcher. Looking for someone to jam with and to grow my network.',
    offers: [
      ['Illustration', 'EXPERT'],
      ['UX Research', 'INTERMEDIATE'],
    ],
    wants: ['Networking', 'Guitar'],
    availability: ['MON_EVENING', 'FRI_EVENING', 'SUN_AFTERNOON'],
  },
];

const email = (key: string) => `${key}@${DEMO_DOMAIN}`;
const daysFromNow = (days: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

async function reset(prisma: PrismaClient) {
  // Matches, sessions, messages, reviews and skills cascade from the user.
  const { count } = await prisma.user.deleteMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
  });
  console.log(`Removed ${count} demo account(s).`);
  // Rewards created by test/smoke.sh.
  await prisma.reward.deleteMany({ where: { category: 'Smoke test' } });
}

async function seed(prisma: PrismaClient) {
  await reset(prisma);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const skillIds = new Map<string, string>();
  for (const [name, category] of Object.entries(CATEGORY)) {
    const skill = await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name, category },
    });
    skillIds.set(name, skill.id);
  }

  const userIds = new Map<string, string>();
  for (const user of USERS) {
    const created = await prisma.user.create({
      data: {
        email: email(user.key),
        name: user.name,
        college: user.college,
        bio: user.bio,
        availability: user.availability,
        passwordHash,
        offeredSkills: {
          create: user.offers.map(([skill, proficiency]) => ({
            skillId: skillIds.get(skill)!,
            proficiency,
          })),
        },
        wantedSkills: {
          create: user.wants.map((skill) => ({
            skillId: skillIds.get(skill)!,
          })),
        },
      },
    });
    userIds.set(user.key, created.id);
  }
  const id = (key: string) => userIds.get(key)!;

  // Aarav <-> Priya: an established swap with history.
  const aaravPriya = await prisma.match.create({
    data: {
      userAId: id('aarav'),
      userBId: id('priya'),
      status: 'ACCEPTED',
      messages: {
        create: [
          {
            senderId: id('aarav'),
            content:
              'Hi Priya! I saw you teach guitar. I can help with Python in return.',
            createdAt: daysFromNow(-9, 18),
          },
          {
            senderId: id('priya'),
            content: 'Perfect swap. Do you have a guitar already?',
            createdAt: daysFromNow(-9, 19),
          },
          {
            senderId: id('aarav'),
            content: 'A dusty acoustic. Saturday morning works for me.',
            createdAt: daysFromNow(-8, 9),
          },
        ],
      },
    },
  });

  const guitarSession = await prisma.session.create({
    data: {
      matchId: aaravPriya.id,
      createdById: id('aarav'),
      topic: 'Guitar',
      notes: 'Tuning, posture and the first three open chords.',
      teacherId: id('priya'),
      creditCost: lessonCost(60),
      scheduledAt: daysFromNow(-7, 10),
      durationMinutes: 60,
      status: 'COMPLETED',
      meetingLink: 'https://meet.jit.si/SkillSwap-demo-guitar',
    },
  });
  const pythonSession = await prisma.session.create({
    data: {
      matchId: aaravPriya.id,
      createdById: id('priya'),
      topic: 'Python',
      notes: 'Reading a CSV and cleaning it up with pandas.',
      teacherId: id('aarav'),
      creditCost: lessonCost(45),
      scheduledAt: daysFromNow(-3, 18),
      durationMinutes: 45,
      status: 'COMPLETED',
      meetingLink: 'https://meet.jit.si/SkillSwap-demo-python',
    },
  });
  const nextGuitarSession = await prisma.session.create({
    data: {
      matchId: aaravPriya.id,
      createdById: id('aarav'),
      topic: 'Guitar',
      notes: 'Strumming patterns and a first full song.',
      teacherId: id('priya'),
      creditCost: lessonCost(60),
      scheduledAt: daysFromNow(4, 10),
      durationMinutes: 60,
      status: 'SCHEDULED',
      meetingLink: 'https://meet.jit.si/SkillSwap-demo-guitar-2',
    },
  });

  // Rohan <-> Dev: one completed session.
  const rohanDev = await prisma.match.create({
    data: {
      userAId: id('rohan'),
      userBId: id('dev'),
      status: 'ACCEPTED',
      messages: {
        create: [
          {
            senderId: id('rohan'),
            content:
              'Could you look at my JavaScript carousel? It only breaks on mobile.',
            createdAt: daysFromNow(-5, 20),
          },
        ],
      },
    },
  });
  const jsSession = await prisma.session.create({
    data: {
      matchId: rohanDev.id,
      createdById: id('rohan'),
      topic: 'JavaScript',
      teacherId: id('dev'),
      creditCost: lessonCost(60),
      scheduledAt: daysFromNow(-4, 19),
      durationMinutes: 60,
      status: 'COMPLETED',
      meetingLink: 'https://meet.jit.si/SkillSwap-demo-js',
    },
  });

  // Dev <-> Meera: connected, first session coming up.
  const devMeera = await prisma.match.create({
    data: { userAId: id('dev'), userBId: id('meera'), status: 'ACCEPTED' },
  });
  const pianoSession = await prisma.session.create({
    data: {
      matchId: devMeera.id,
      createdById: id('dev'),
      topic: 'Piano',
      teacherId: id('meera'),
      creditCost: lessonCost(45),
      scheduledAt: daysFromNow(2, 19),
      durationMinutes: 45,
      status: 'SCHEDULED',
      meetingLink: 'https://meet.jit.si/SkillSwap-demo-piano',
    },
  });

  // Requests still waiting for an answer.
  await prisma.match.createMany({
    data: [
      { userAId: id('sara'), userBId: id('rohan'), status: 'PENDING' },
      { userAId: id('ananya'), userBId: id('kabir'), status: 'PENDING' },
    ],
  });

  const reviews = [
    {
      sessionId: guitarSession.id,
      reviewerId: id('aarav'),
      revieweeId: id('priya'),
      rating: 5,
      comment: 'Patient and clear. I can actually play a G chord now.',
    },
    {
      sessionId: guitarSession.id,
      reviewerId: id('priya'),
      revieweeId: id('aarav'),
      rating: 5,
      comment: 'Showed up prepared and practised between sessions.',
    },
    {
      sessionId: pythonSession.id,
      reviewerId: id('priya'),
      revieweeId: id('aarav'),
      rating: 5,
      comment: 'Explained pandas without drowning me in jargon.',
    },
    {
      sessionId: pythonSession.id,
      reviewerId: id('aarav'),
      revieweeId: id('priya'),
      rating: 4,
      comment: 'Great questions. Bring a dataset next time!',
    },
    {
      sessionId: jsSession.id,
      reviewerId: id('rohan'),
      revieweeId: id('dev'),
      rating: 4,
      comment: 'Found my bug in ten minutes and explained why it happened.',
    },
  ];
  await prisma.review.createMany({ data: reviews });

  for (const userId of new Set(reviews.map((review) => review.revieweeId))) {
    const { _avg } = await prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { ratingAvg: _avg.rating ?? 0 },
    });
  }

  const firstSwap = await prisma.badge.upsert({
    where: { name: 'First Swap' },
    update: {},
    create: {
      name: 'First Swap',
      criteria: 'Awarded for completing your first SkillSwap session.',
    },
  });
  await prisma.userBadge.createMany({
    data: ['aarav', 'priya', 'rohan', 'dev'].map((key) => ({
      userId: id(key),
      badgeId: firstSwap.id,
    })),
  });

  // Credit ledger matching the history above. Keys follow the same scheme
  // the API uses, so replaying an event later can never pay out twice.
  const ledger: Prisma.CreditTransactionCreateManyInput[] = [];
  const credit = (
    key: string,
    amount: number,
    type: CreditType,
    description: string,
    eventKey: string,
    sessionId?: string,
  ) =>
    ledger.push({
      userId: id(key),
      amount,
      type,
      description,
      key: eventKey,
      sessionId,
    });

  for (const user of USERS) {
    credit(user.key, SIGNUP_BONUS, 'SIGNUP_BONUS', 'Welcome bonus', 'signup');
  }

  const lessons = [
    { session: guitarSession, learner: 'aarav', teacher: 'priya', done: true },
    { session: pythonSession, learner: 'priya', teacher: 'aarav', done: true },
    { session: jsSession, learner: 'rohan', teacher: 'dev', done: true },
    {
      session: nextGuitarSession,
      learner: 'aarav',
      teacher: 'priya',
      done: false,
    },
    { session: pianoSession, learner: 'dev', teacher: 'meera', done: false },
  ];
  const nameOf = (key: string) => USERS.find((u) => u.key === key)!.name;
  for (const { session, learner, teacher, done } of lessons) {
    credit(
      learner,
      -session.creditCost,
      'LESSON_HOLD',
      `Booked: ${session.topic} with ${nameOf(teacher)}`,
      `session:${session.id}:hold`,
      session.id,
    );
    if (done) {
      credit(
        teacher,
        session.creditCost,
        'LESSON_EARNED',
        `Taught: ${session.topic} to ${nameOf(learner)}`,
        `session:${session.id}:payout`,
        session.id,
      );
    }
  }

  for (const key of ['aarav', 'priya', 'rohan', 'dev']) {
    credit(
      key,
      badgeBonus(firstSwap.name),
      'ACHIEVEMENT',
      `Badge earned: ${firstSwap.name}`,
      `badge:${firstSwap.id}`,
    );
  }

  const createdReviews = await prisma.review.findMany({
    where: { sessionId: { in: lessons.map(({ session }) => session.id) } },
    select: { id: true, revieweeId: true, rating: true, sessionId: true },
  });
  for (const review of createdReviews.filter((r) => r.rating === 5)) {
    ledger.push({
      userId: review.revieweeId,
      amount: FIVE_STAR_REVIEW_BONUS,
      type: 'REVIEW_BONUS',
      description: 'Five-star review received',
      key: `review:${review.id}`,
      sessionId: review.sessionId,
    });
  }

  await prisma.creditTransaction.createMany({ data: ledger });
  for (const userId of new Set(ledger.map((entry) => entry.userId))) {
    const { _sum } = await prisma.creditTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { credits: _sum.amount ?? 0 },
    });
  }

  console.log(`Seeded ${USERS.length} demo accounts:`);
  for (const user of USERS) console.log(`  ${email(user.key)}`);
  console.log(
    'Password: see DEMO_PASSWORD in prisma/seed.ts (or SEED_PASSWORD).',
  );
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizeConnectionString(connectionString),
    }),
  });
  try {
    if (process.argv.includes('--reset')) {
      await reset(prisma);
    } else {
      await seed(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
