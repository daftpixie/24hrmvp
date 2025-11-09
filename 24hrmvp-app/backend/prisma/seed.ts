import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create voting cycle
  const cycle = await prisma.votingCycle.create({
    data: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
  });

  console.log('✓ Created voting cycle');

  // Create test users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        fid: 12345,
        username: 'builder_alex',
        displayName: 'Alex the Builder',
        points: 2420,
      },
    }),
    prisma.user.create({
      data: {
        fid: 67890,
        username: 'codemaster_sarah',
        displayName: 'Sarah CodeMaster',
        points: 1850,
      },
    }),
  ]);

  console.log('✓ Created test users');

  // Create test ideas
  await Promise.all([
    prisma.idea.create({
      data: {
        title: 'AI-Powered Code Review Tool',
        description: 'Automatically review pull requests using Claude AI with comprehensive security checks and best practice recommendations',
        category: 'developer-tools',
        complexity: 'medium',
        userId: users[0].id,
        votingCycleId: cycle.id,
        voteCount: 42,
      },
    }),
    prisma.idea.create({
      data: {
        title: 'Real-time Collaboration Whiteboard',
        description: 'Figma-like whiteboard for team brainstorming with live cursors, infinite canvas, and AI-powered organization',
        category: 'productivity',
        complexity: 'high',
        userId: users[1].id,
        votingCycleId: cycle.id,
        voteCount: 37,
      },
    }),
    prisma.idea.create({
      data: {
        title: 'Voice-Activated Task Manager',
        description: 'Natural language task management with voice commands, smart scheduling, and calendar integration',
        category: 'productivity',
        complexity: 'medium',
        userId: users[0].id,
        votingCycleId: cycle.id,
        voteCount: 28,
      },
    }),
  ]);

  console.log('✓ Created test ideas');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
