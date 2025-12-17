import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // STEP 1: Clear existing data (optional - use with caution!)
  // ============================================
  console.log('⚠️  Clearing existing data...');
  
  // Delete in correct order (respecting foreign keys)
  await prisma.voteConsumption.deleteMany();
  await prisma.voteCredit.deleteMany();
  await prisma.votePurchase.deleteMany();
  await prisma.votePricing.deleteMany();
  await prisma.payment.deleteMany();
  
  await prisma.chatMessage.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chatRoom.deleteMany();
  
  await prisma.livestreamViewer.deleteMany();
  await prisma.livestream.deleteMany();
  await prisma.streamDestination.deleteMany();
  
  await prisma.forumPostVote.deleteMany();
  await prisma.forumBookmark.deleteMany();
  await prisma.forumPost.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.moderationQueue.deleteMany();
  
  await prisma.vote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.mVPProject.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.votingCycle.deleteMany();
  
  await prisma.userAchievement.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.userStreak.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.currencyTransaction.deleteMany();
  await prisma.userWallet.deleteMany();
  await prisma.pointHistory.deleteMany();
  await prisma.streak.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.notificationToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Existing data cleared');

  // ============================================
  // STEP 2: Create Test Users
  // ============================================
  console.log('👥 Creating test users...');

  const users = await Promise.all([
    // Admin user
    prisma.user.create({
      data: {
        fid: 1,
        username: 'admin',
        displayName: 'Admin User',
        pfpUrl: 'https://i.pravatar.cc/150?img=1',
        bio: 'Platform administrator',
        isAdmin: true,
        membershipTier: 'premium',
        points: 10000,
        reputation: 1000,
        level: 10,
      },
    }),
    // Active community members
    prisma.user.create({
      data: {
        fid: 2,
        username: 'alice_dev',
        displayName: 'Alice Developer',
        pfpUrl: 'https://i.pravatar.cc/150?img=2',
        bio: 'Full-stack developer passionate about Web3',
        membershipTier: 'pro',
        points: 5000,
        reputation: 500,
        level: 5,
      },
    }),
    prisma.user.create({
      data: {
        fid: 3,
        username: 'bob_designer',
        displayName: 'Bob Designer',
        pfpUrl: 'https://i.pravatar.cc/150?img=3',
        bio: 'UI/UX designer making the web beautiful',
        membershipTier: 'pro',
        points: 3000,
        reputation: 300,
        level: 4,
      },
    }),
    prisma.user.create({
      data: {
        fid: 4,
        username: 'carol_pm',
        displayName: 'Carol PM',
        pfpUrl: 'https://i.pravatar.cc/150?img=4',
        bio: 'Product manager with 10+ years experience',
        membershipTier: 'free',
        points: 1500,
        reputation: 150,
        level: 3,
      },
    }),
    prisma.user.create({
      data: {
        fid: 5,
        username: 'dave_crypto',
        displayName: 'Dave Crypto',
        pfpUrl: 'https://i.pravatar.cc/150?img=5',
        bio: 'Crypto enthusiast and blockchain developer',
        membershipTier: 'free',
        points: 800,
        reputation: 80,
        level: 2,
      },
    }),
  ]);

  console.log(`✓ Created ${users.length} test users`);

  // ============================================
  // STEP 3: Create Voting Cycles
  // ============================================
  console.log('📅 Creating voting cycles...');

  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activeCycle = await prisma.votingCycle.create({
    data: {
      name: 'Week of Nov 25-Dec 1, 2025',
      startDate: now,
      endDate: nextWeek,
      status: 'active',
    },
  });

  const completedCycle = await prisma.votingCycle.create({
    data: {
      name: 'Week of Nov 18-25, 2025',
      startDate: new Date(lastWeek.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: lastWeek,
      status: 'completed',
    },
  });

  console.log('✓ Created 2 voting cycles');

  // ============================================
  // STEP 4: Create Ideas with Enhanced Fields
  // ============================================
  console.log('💡 Creating ideas...');

  const ideas = await Promise.all([
    // Active cycle idea 1 - with comprehensive fields
    prisma.idea.create({
      data: {
        title: 'AI-Powered Code Review Assistant',
        description: 'An intelligent code review tool that provides real-time suggestions, detects security vulnerabilities, and ensures code quality standards across your team.',
        category: 'Developer Tools',
        complexity: 'medium',
        tags: ['AI', 'CodeReview', 'DevTools', 'Security'],
        targetAudience: 'Software development teams of 5-50 people who want to improve code quality and reduce review time. Ideal for startups and mid-size tech companies.',
        coreFeatures: [
          'Real-time code analysis using Claude AI',
          'Security vulnerability detection',
          'Style guide enforcement',
          'Automated test coverage suggestions',
          'Integration with GitHub, GitLab, and Bitbucket',
        ],
        technicalRequirements: 'Node.js backend with Express, React frontend, Claude API integration, GitHub OAuth, PostgreSQL database, Redis for caching',
        expectedTimeline: '4-6 weeks for MVP with core features',
        successMetrics: 'Reduce code review time by 40%, detect at least 80% of common vulnerabilities, achieve 90% user satisfaction score',
        fileCount: 2,
        fileAttachments: [
          {
            filename: 'architecture-diagram.png',
            url: '/uploads/code-review-arch.png',
            type: 'image/png',
            size: 245000,
            uploadedAt: now.toISOString(),
          },
          {
            filename: 'requirements.pdf',
            url: '/uploads/code-review-requirements.pdf',
            type: 'application/pdf',
            size: 128000,
            uploadedAt: now.toISOString(),
          },
        ],
        userId: users[1].id,
        votingCycleId: activeCycle.id,
        status: 'approved',
        voteCount: 12,
      },
    }),
    // Active cycle idea 2
    prisma.idea.create({
      data: {
        title: 'Community Recipe Sharing Platform',
        description: 'A social platform for home cooks to share recipes, meal plans, and cooking tips with integrated grocery list generation.',
        category: 'Social',
        complexity: 'medium',
        tags: ['Social', 'Food', 'Community', 'Mobile'],
        targetAudience: 'Home cooks aged 25-55 who enjoy trying new recipes and sharing their culinary creations. Primary focus on health-conscious millennials.',
        coreFeatures: [
          'Recipe creation with photo upload',
          'Ingredient-based search',
          'Auto-generated grocery lists',
          'Meal planning calendar',
          'Social following and recipe collections',
        ],
        technicalRequirements: 'React Native for mobile, Next.js web app, Supabase backend, Cloudinary for image storage, Algolia for search',
        expectedTimeline: '6-8 weeks for MVP with mobile + web',
        successMetrics: '1000+ recipes shared in first month, 5000+ active users, 70% user retention after 30 days',
        isPremiumBoosted: true,
        boostLevel: 2,
        boostExpiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        userId: users[2].id,
        votingCycleId: activeCycle.id,
        status: 'approved',
        voteCount: 8,
      },
    }),
    // Active cycle idea 3
    prisma.idea.create({
      data: {
        title: 'Decentralized Voting for DAOs',
        description: 'A transparent, secure voting system for decentralized autonomous organizations with on-chain verification.',
        category: 'Web3',
        complexity: 'hard',
        tags: ['Web3', 'DAO', 'Governance', 'Blockchain'],
        targetAudience: 'DAO members and organizations (5000+ members) needing transparent governance mechanisms',
        coreFeatures: [
          'On-chain vote recording on Base',
          'Quadratic voting support',
          'Delegation mechanisms',
          'Vote weight based on token holdings',
          'Multi-signature proposal execution',
        ],
        technicalRequirements: 'Solidity smart contracts, Viem for blockchain interaction, Next.js frontend, Wagmi hooks, IPFS for proposal storage',
        expectedTimeline: '8-12 weeks including smart contract audits',
        successMetrics: '10+ DAOs using the platform, 100,000+ votes cast, zero security incidents',
        userId: users[4].id,
        votingCycleId: activeCycle.id,
        status: 'approved',
        voteCount: 15,
      },
    }),
    // Active cycle idea 4
    prisma.idea.create({
      data: {
        title: 'Micro-Learning Mobile App',
        description: '5-minute daily lessons on various topics from coding to cooking, designed for busy professionals.',
        category: 'Education',
        complexity: 'easy',
        tags: ['Education', 'Mobile', 'Learning', 'Productivity'],
        targetAudience: 'Working professionals aged 25-45 who want to learn new skills but have limited time',
        coreFeatures: [
          'Daily 5-minute lessons',
          'Personalized learning paths',
          'Spaced repetition quizzes',
          'Offline mode support',
          'Progress tracking and streaks',
        ],
        technicalRequirements: 'React Native, Firebase for backend, push notifications, local storage for offline content',
        expectedTimeline: '4-5 weeks for MVP',
        successMetrics: '10,000 downloads in first month, 60% daily active users, 4.5+ app store rating',
        userId: users[3].id,
        votingCycleId: activeCycle.id,
        status: 'approved',
        voteCount: 6,
      },
    }),
    // Completed cycle idea (winner)
    prisma.idea.create({
      data: {
        title: 'Collaborative Playlist Generator',
        description: 'AI-powered playlist creation based on group preferences for parties, road trips, and events.',
        category: 'Entertainment',
        complexity: 'medium',
        tags: ['Music', 'AI', 'Social', 'Entertainment'],
        targetAudience: 'Event organizers and friend groups who want collaborative music selection',
        coreFeatures: [
          'Multi-user preference input',
          'AI-powered song recommendations',
          'Spotify/Apple Music integration',
          'Real-time playlist editing',
          'Mood and genre filtering',
        ],
        userId: users[1].id,
        votingCycleId: completedCycle.id,
        status: 'implemented',
        voteCount: 25,
        implementedAt: lastWeek,
      },
    }),
  ]);

  // Set winner for completed cycle
  await prisma.votingCycle.update({
    where: { id: completedCycle.id },
    data: { winnerId: ideas[4].id },
  });

  console.log(`✓ Created ${ideas.length} ideas`);

  // ============================================
  // STEP 5: Create Votes
  // ============================================
  console.log('🗳️  Creating votes...');

  const votes = [];
  
  // Votes for active cycle ideas
  for (let i = 0; i < 3; i++) {
    votes.push(
      await prisma.vote.create({
        data: {
          userId: users[i].id,
          ideaId: ideas[0].id,
        },
      })
    );
  }

  console.log(`✓ Created ${votes.length} votes`);

  // ============================================
  // STEP 6: Create Vote Pricing Packages
  // ============================================
  console.log('💰 Creating vote pricing packages...');

  const pricingPackages = await Promise.all([
    prisma.votePricing.create({
      data: {
        packageName: 'single',
        voteCount: 1,
        priceUsd: 1.00,
        priceUsdc: 1.00,
        pricePoints: 100,
        displayName: 'Single Vote',
        description: 'One additional vote',
        isActive: true,
        isPopular: false,
        sortOrder: 1,
      },
    }),
    prisma.votePricing.create({
      data: {
        packageName: 'pack_5',
        voteCount: 5,
        priceUsd: 4.00,
        priceUsdc: 4.00,
        pricePoints: 400,
        displayName: '5-Vote Pack',
        description: 'Best value - save 20%',
        isActive: true,
        isPopular: true,
        sortOrder: 2,
      },
    }),
    prisma.votePricing.create({
      data: {
        packageName: 'pack_20',
        voteCount: 20,
        priceUsd: 12.00,
        priceUsdc: 12.00,
        pricePoints: 1200,
        displayName: '20-Vote Pack',
        description: 'Power user pack - save 40%',
        isActive: true,
        isPopular: false,
        sortOrder: 3,
      },
    }),
    prisma.votePricing.create({
      data: {
        packageName: 'pack_100',
        voteCount: 100,
        priceUsd: 50.00,
        priceUsdc: 50.00,
        pricePoints: 5000,
        displayName: '100-Vote Pack',
        description: 'Ultimate pack - save 50%',
        isActive: true,
        isPopular: false,
        sortOrder: 4,
      },
    }),
  ]);

  console.log(`✓ Created ${pricingPackages.length} pricing packages`);

  // ============================================
  // STEP 7: Create Sample Vote Credits
  // ============================================
  console.log('🎫 Creating vote credits...');

  const voteCredits = await Promise.all([
    // Free daily credits for all users
    ...users.map((user) =>
      prisma.voteCredit.create({
        data: {
          userId: user.id,
          amount: 3,
          source: 'FREE_DAILY',
          description: 'Daily free votes',
          consumed: 0,
          remaining: 3,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      })
    ),
    // Purchased credits for power user
    prisma.voteCredit.create({
      data: {
        userId: users[1].id,
        amount: 20,
        source: 'PURCHASED_STRIPE',
        description: 'Purchased 20-vote pack',
        consumed: 5,
        remaining: 15,
      },
    }),
  ]);

  console.log(`✓ Created ${voteCredits.length} vote credit records`);

  // ============================================
  // STEP 8: Create Chat Rooms
  // ============================================
  console.log('💬 Creating chat rooms...');

  const chatRooms = await Promise.all([
    prisma.chatRoom.create({
      data: {
        name: 'General',
        slug: 'general',
        description: 'General discussion for all community members',
        type: 'PUBLIC',
        createdById: users[0].id,
        memberCount: 5,
        messageCount: 127,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'Ideas',
        slug: 'ideas',
        description: 'Discuss and brainstorm new ideas',
        type: 'PUBLIC',
        createdById: users[0].id,
        memberCount: 4,
        messageCount: 89,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'Development',
        slug: 'development',
        description: 'Technical discussions and development updates',
        type: 'PUBLIC',
        createdById: users[0].id,
        memberCount: 3,
        messageCount: 56,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'Announcements',
        slug: 'announcements',
        description: 'Official platform announcements',
        type: 'PUBLIC',
        createdById: users[0].id,
        allowReplies: false,
        memberCount: 5,
        messageCount: 12,
      },
    }),
    prisma.chatRoom.create({
      data: {
        name: 'Help',
        slug: 'help',
        description: 'Get help from the community',
        type: 'PUBLIC',
        createdById: users[0].id,
        memberCount: 5,
        messageCount: 34,
      },
    }),
  ]);

  console.log(`✓ Created ${chatRooms.length} chat rooms`);

  // ============================================
  // STEP 9: Create Chat Messages
  // ============================================
  console.log('📨 Creating chat messages...');

  const chatMessages = await Promise.all([
    // General room messages
    prisma.chatMessage.create({
      data: {
        content: 'Welcome to 24HRMVP! Excited to see what the community builds together 🚀',
        roomId: chatRooms[0].id,
        authorId: users[0].id,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        content: 'Thanks for creating this platform! The idea of community-driven development is amazing',
        roomId: chatRooms[0].id,
        authorId: users[1].id,
        createdAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        content: "Just submitted my first idea - an AI code review tool. Would love feedback from the community!",
        roomId: chatRooms[0].id,
        authorId: users[1].id,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
    }),
    // Ideas room messages
    prisma.chatMessage.create({
      data: {
        content: 'What types of projects do you think would have the most impact? Web3, social, or dev tools?',
        roomId: chatRooms[1].id,
        authorId: users[2].id,
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      },
    }),
    prisma.chatMessage.create({
      data: {
        content: 'I think dev tools have huge potential - they compound impact by helping other developers be more productive',
        roomId: chatRooms[1].id,
        authorId: users[3].id,
        createdAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      },
    }),
    // Announcements
    prisma.chatMessage.create({
      data: {
        content: '📢 New voting cycle has started! Check out the ideas and cast your votes',
        roomId: chatRooms[3].id,
        authorId: users[0].id,
        isPinned: true,
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log(`✓ Created ${chatMessages.length} chat messages`);

  // ============================================
  // STEP 10: Create Leaderboard Entries
  // ============================================
  console.log('🏆 Creating leaderboard entries...');

  const leaderboardEntries = await Promise.all([
    ...users.map((user, index) =>
      prisma.leaderboardEntry.create({
        data: {
          userId: user.id,
          period: 'weekly',
          category: 'points',
          score: user.points,
          rank: index + 1,
        },
      })
    ),
  ]);

  console.log(`✓ Created ${leaderboardEntries.length} leaderboard entries`);

  // ============================================
  // STEP 11: Create Badges
  // ============================================
  console.log('🎖️  Creating badges...');

  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        name: 'First Idea',
        description: 'Submitted your first idea',
        category: 'contribution',
        rarity: 'COMMON',
        pointsAwarded: 100,
        requirements: { type: 'idea_count', value: 1 },
        isActive: true,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Early Voter',
        description: 'Cast 10 votes',
        category: 'engagement',
        rarity: 'COMMON',
        pointsAwarded: 50,
        requirements: { type: 'vote_count', value: 10 },
        isActive: true,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Community Champion',
        description: 'Earned 1000 reputation points',
        category: 'reputation',
        rarity: 'RARE',
        pointsAwarded: 500,
        requirements: { type: 'reputation', value: 1000 },
        isActive: true,
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Winning Idea',
        description: 'Had an idea selected for development',
        category: 'achievement',
        rarity: 'EPIC',
        pointsAwarded: 1000,
        requirements: { type: 'idea_winner', value: 1 },
        isActive: true,
      },
    }),
  ]);

  console.log(`✓ Created ${badges.length} badges`);

  // ============================================
  // STEP 12: Create Forum Posts
  // ============================================
  console.log('📋 Creating forum posts...');

  const forumPosts = await Promise.all([
    prisma.forumPost.create({
      data: {
        slug: 'welcome-to-24hrmvp',
        title: 'Welcome to 24HRMVP!',
        content: 'Welcome to the community! This is where we discuss ideas, share feedback, and build together. Feel free to introduce yourself and share what brings you here.',
        type: 'ANNOUNCEMENT',
        authorId: users[0].id,
        upvotes: 12,
        score: 12,
        viewCount: 156,
        isPinned: true,
        moderationStatus: 'APPROVED',
      },
    }),
    prisma.forumPost.create({
      data: {
        slug: 'how-voting-works',
        title: 'How does the voting system work?',
        content: 'Can someone explain how vote credits work? I see I have 3 free daily votes, but can I purchase more?',
        type: 'QUESTION',
        authorId: users[4].id,
        upvotes: 5,
        score: 5,
        viewCount: 78,
        moderationStatus: 'APPROVED',
      },
    }),
    prisma.forumPost.create({
      data: {
        slug: 'feature-request-mobile-app',
        title: 'Feature Request: Mobile App',
        content: 'Would love to see a mobile app for iOS and Android. It would make voting and following ideas much easier on the go.',
        type: 'FEEDBACK',
        authorId: users[2].id,
        upvotes: 8,
        score: 8,
        viewCount: 92,
        moderationStatus: 'APPROVED',
      },
    }),
  ]);

  console.log(`✓ Created ${forumPosts.length} forum posts`);

  // ============================================
  // STEP 13: Create Comments
  // ============================================
  console.log('💬 Creating comments...');

  const comments = await Promise.all([
    prisma.comment.create({
      data: {
        content: 'This is an excellent idea! Code review automation could save so much time.',
        authorId: users[2].id,
        ideaId: ideas[0].id,
        path: `${ideas[0].id}`,
        depth: 0,
        score: 3,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'Have you considered integrating with VS Code as an extension?',
        authorId: users[3].id,
        ideaId: ideas[0].id,
        path: `${ideas[0].id}`,
        depth: 0,
        score: 2,
      },
    }),
  ]);

  console.log(`✓ Created ${comments.length} comments`);

  // ============================================
  // FINAL: Summary
  // ============================================
  console.log('\n✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`  • ${users.length} users`);
  console.log(`  • 2 voting cycles (1 active, 1 completed)`);
  console.log(`  • ${ideas.length} ideas (4 in active cycle, 1 winner)`);
  console.log(`  • ${votes.length} votes`);
  console.log(`  • ${pricingPackages.length} pricing packages`);
  console.log(`  • ${voteCredits.length} vote credit records`);
  console.log(`  • ${chatRooms.length} chat rooms`);
  console.log(`  • ${chatMessages.length} chat messages`);
  console.log(`  • ${leaderboardEntries.length} leaderboard entries`);
  console.log(`  • ${badges.length} badges`);
  console.log(`  • ${forumPosts.length} forum posts`);
  console.log(`  • ${comments.length} comments`);
  console.log('\n🎉 Your database is ready for beta testing!\n');
  console.log('Test users:');
  console.log('  • admin (FID: 1) - Admin access');
  console.log('  • alice_dev (FID: 2) - Pro member with purchased votes');
  console.log('  • bob_designer (FID: 3) - Pro member');
  console.log('  • carol_pm (FID: 4) - Free member');
  console.log('  • dave_crypto (FID: 5) - Free member');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
