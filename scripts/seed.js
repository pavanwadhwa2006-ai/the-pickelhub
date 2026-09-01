/**
 * The PickleHub — Comprehensive Database Seed Script
 *
 * Populates realistic demo data:
 * - Admin users & Club Managers
 * - 8 Players across Beginner, Intermediate, Advanced, and Pro tiers
 * - 8 Approved Matches with corresponding RatingHistory trajectories
 * - 3 Pending Matches waiting in Admin Approval Queue
 * - 1 Active Single-Elimination Tournament with live bracket
 *
 * Run: npm run seed
 */

const path = require('path');
const fs = require('fs');
let mongoose, dotenv, bcrypt;
try {
  mongoose = require('mongoose');
} catch {
  mongoose = require('../server/node_modules/mongoose');
}
try {
  dotenv = require('dotenv');
} catch {
  dotenv = require('../server/node_modules/dotenv');
}
try {
  bcrypt = require('bcryptjs');
} catch {
  bcrypt = require('../server/node_modules/bcryptjs');
}

const envPath = fs.existsSync(path.resolve(__dirname, '../server/.env'))
  ? path.resolve(__dirname, '../server/.env')
  : path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const User = require('../server/src/models/User');
const Player = require('../server/src/models/Player');
const Match = require('../server/src/models/Match');
const Tournament = require('../server/src/models/Tournament');
const RatingHistory = require('../server/src/models/RatingHistory');
const Counter = require('../server/src/models/Counter');
const AuditLog = require('../server/src/models/AuditLog');

const PLAYERS_DATA = [
  {
    name: 'Ben Johns',
    email: 'ben.johns@picklehub.demo',
    rating: 1780,
    highestRating: 1820,
    category: 'Pro',
    wins: 28,
    losses: 4,
    streak: 6,
    tournamentWins: 3,
    tournamentAppearances: 4,
  },
  {
    name: 'Anna Leigh Waters',
    email: 'anna.waters@picklehub.demo',
    rating: 1720,
    highestRating: 1745,
    category: 'Pro',
    wins: 24,
    losses: 3,
    streak: 8,
    tournamentWins: 2,
    tournamentAppearances: 3,
  },
  {
    name: 'Tyson McGuffin',
    email: 'tyson.m@picklehub.demo',
    rating: 1540,
    highestRating: 1580,
    category: 'Advanced',
    wins: 18,
    losses: 8,
    streak: 2,
    tournamentWins: 1,
    tournamentAppearances: 3,
  },
  {
    name: 'Catherine Parenteau',
    email: 'catherine.p@picklehub.demo',
    rating: 1460,
    highestRating: 1490,
    category: 'Advanced',
    wins: 14,
    losses: 9,
    streak: 3,
    tournamentWins: 0,
    tournamentAppearances: 2,
  },
  {
    name: 'Riley Newman',
    email: 'riley.n@picklehub.demo',
    rating: 1350,
    highestRating: 1390,
    category: 'Intermediate',
    wins: 11,
    losses: 11,
    streak: 0,
    tournamentWins: 0,
    tournamentAppearances: 1,
  },
  {
    name: 'Callie Smith',
    email: 'callie.s@picklehub.demo',
    rating: 1240,
    highestRating: 1280,
    category: 'Intermediate',
    wins: 8,
    losses: 12,
    streak: 1,
    tournamentWins: 0,
    tournamentAppearances: 1,
  },
  {
    name: 'Zane Navratil',
    email: 'zane.n@picklehub.demo',
    rating: 1120,
    highestRating: 1160,
    category: 'Beginner',
    wins: 4,
    losses: 15,
    streak: 0,
    tournamentWins: 0,
    tournamentAppearances: 1,
  },
  {
    name: 'Lea Jansen',
    email: 'lea.j@picklehub.demo',
    rating: 1050,
    highestRating: 1100,
    category: 'Beginner',
    wins: 3,
    losses: 14,
    streak: 0,
    tournamentWins: 0,
    tournamentAppearances: 0,
  },
];

async function seedDatabase() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI missing from environment variables.');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    console.log('\n🧹 Preparing clean database slate (preserving real users)...');
    const demoEmails = PLAYERS_DATA.map((p) => p.email).concat(['admin@picklehub.com']);
    await User.deleteMany({ email: { $in: demoEmails } });
    await Player.deleteMany({});
    await Match.deleteMany({});
    await Tournament.deleteMany({});
    await RatingHistory.deleteMany({});
    await Counter.deleteMany({});

    let playerSequence = 1;

    // 1. Re-link existing real users (e.g. pavanwadhwa2006@gmail.com)
    const existingRealUsers = await User.find({});
    for (const realUser of existingRealUsers) {
      const padNum = String(playerSequence++).padStart(5, '0');
      await Player.create({
        userId: realUser._id,
        playerId: `PH-${padNum}`,
        name: realUser.email.split('@')[0],
        email: realUser.email,
        currentRating: 1300,
        highestRating: 1300,
        category: 'Intermediate',
        matchesPlayed: 4,
        wins: 3,
        losses: 1,
        winningStreak: 2,
        accountStatus: 'ACTIVE',
      });
      // Ensure pavanwadhwa2006 is ADMIN
      if (realUser.email === 'pavanwadhwa2006@gmail.com') {
        realUser.role = 'ADMIN';
        await realUser.save();
      }
    }

    const defaultPassword = 'Password@123';
    const adminPassword = 'Admin@123456';

    console.log('\n👑 Creating Default Admin Account (admin@picklehub.com)...');
    const adminUser = await User.create({
      email: 'admin@picklehub.com',
      password: adminPassword,
      role: 'ADMIN',
    });

    const adminPadNum = String(playerSequence++).padStart(5, '0');
    const adminPlayer = await Player.create({
      userId: adminUser._id,
      playerId: `PH-${adminPadNum}`,
      name: 'Club Administrator',
      email: adminUser.email,
      currentRating: 1500,
      highestRating: 1500,
      category: 'Advanced',
      matchesPlayed: 10,
      wins: 8,
      losses: 2,
      winningStreak: 4,
      accountStatus: 'ACTIVE',
    });

    console.log('🎾 Creating 8 Demo Players across Skill Categories...');
    const createdPlayers = [];

    for (let i = 0; i < PLAYERS_DATA.length; i++) {
      const pData = PLAYERS_DATA[i];
      const user = await User.create({
        email: pData.email,
        password: defaultPassword,
        role: 'PLAYER',
      });

      const padNum = String(playerSequence++).padStart(5, '0');
      const player = await Player.create({
        userId: user._id,
        playerId: `PH-${padNum}`,
        name: pData.name,
        email: pData.email,
        currentRating: pData.rating,
        highestRating: pData.highestRating,
        category: pData.category,
        matchesPlayed: pData.wins + pData.losses,
        wins: pData.wins,
        losses: pData.losses,
        winningStreak: pData.streak,
        tournamentWins: pData.tournamentWins,
        tournamentAppearances: pData.tournamentAppearances,
        accountStatus: 'ACTIVE',
      });

      createdPlayers.push(player);
    }

    // Set atomic Counter sequence for future registrations
    await Counter.create({ name: 'playerId', value: playerSequence - 1 });
    await Counter.create({ name: 'matchId', value: 10 });

    console.log('📊 Generating Approved Matches & Rating History charts...');
    const matchHistoryData = [
      { p1: createdPlayers[0], p2: createdPlayers[1], score: [{ teamAScore: 11, teamBScore: 9 }, { teamAScore: 11, teamBScore: 7 }], winner: 'A', delta: 18, daysAgo: 20 },
      { p1: createdPlayers[0], p2: createdPlayers[2], score: [{ teamAScore: 11, teamBScore: 5 }, { teamAScore: 11, teamBScore: 6 }], winner: 'A', delta: 12, daysAgo: 15 },
      { p1: createdPlayers[1], p2: createdPlayers[3], score: [{ teamAScore: 11, teamBScore: 8 }, { teamAScore: 11, teamBScore: 8 }], winner: 'A', delta: 14, daysAgo: 12 },
      { p1: createdPlayers[2], p2: createdPlayers[4], score: [{ teamAScore: 11, teamBScore: 6 }, { teamAScore: 9, teamBScore: 11 }, { teamAScore: 11, teamBScore: 8 }], winner: 'A', delta: 16, daysAgo: 8 },
      { p1: createdPlayers[3], p2: createdPlayers[5], score: [{ teamAScore: 11, teamBScore: 4 }, { teamAScore: 11, teamBScore: 7 }], winner: 'A', delta: 15, daysAgo: 5 },
      { p1: createdPlayers[4], p2: createdPlayers[6], score: [{ teamAScore: 11, teamBScore: 8 }, { teamAScore: 11, teamBScore: 9 }], winner: 'A', delta: 20, daysAgo: 3 },
      { p1: createdPlayers[1], p2: createdPlayers[0], score: [{ teamAScore: 7, teamBScore: 11 }, { teamAScore: 11, teamBScore: 8 }, { teamAScore: 11, teamBScore: 9 }], winner: 'A', delta: 22, daysAgo: 1 },
    ];

    for (let i = 0; i < matchHistoryData.length; i++) {
      const item = matchHistoryData[i];
      const matchDate = new Date(Date.now() - item.daysAgo * 24 * 60 * 60 * 1000);
      const matchNum = String(i + 1).padStart(5, '0');

      const match = await Match.create({
        matchId: `M-${matchNum}`,
        date: matchDate,
        court: `Court ${(i % 3) + 1}`,
        matchType: 'SINGLES',
        teamA: [item.p1._id],
        teamB: [item.p2._id],
        scores: item.score,
        winnerTeam: item.winner,
        status: 'APPROVED',
        submittedBy: item.p1._id,
        approvedBy: adminUser._id,
        approvedAt: matchDate,
        ratingChanges: [
          { playerId: item.p1._id, oldRating: item.p1.currentRating - item.delta, newRating: item.p1.currentRating, delta: item.delta },
          { playerId: item.p2._id, oldRating: item.p2.currentRating + item.delta, newRating: item.p2.currentRating, delta: -item.delta },
        ],
      });

      // Rating history records for performance graphs
      await RatingHistory.create({
        playerId: item.p1._id,
        changeType: 'MATCH',
        matchId: match._id,
        ratingBefore: item.p1.currentRating - item.delta,
        ratingAfter: item.p1.currentRating,
        delta: item.delta,
        categoryBefore: item.p1.category,
        categoryAfter: item.p1.category,
        createdAt: matchDate,
      });

      await RatingHistory.create({
        playerId: item.p2._id,
        changeType: 'MATCH',
        matchId: match._id,
        ratingBefore: item.p2.currentRating + item.delta,
        ratingAfter: item.p2.currentRating,
        delta: -item.delta,
        categoryBefore: item.p2.category,
        categoryAfter: item.p2.category,
        createdAt: matchDate,
      });
    }

    console.log('⏳ Creating 3 Pending Matches for the Admin Queue...');
    const pendingMatches = [
      {
        matchId: `M-00008`,
        court: 'Court 1',
        matchType: 'SINGLES',
        teamA: [createdPlayers[2]._id],
        teamB: [createdPlayers[3]._id],
        scores: [{ teamAScore: 11, teamBScore: 9 }, { teamAScore: 11, teamBScore: 8 }],
        winnerTeam: 'A',
        submittedBy: createdPlayers[2]._id,
      },
      {
        matchId: `M-00009`,
        court: 'Court 2',
        matchType: 'DOUBLES',
        teamA: [createdPlayers[0]._id, createdPlayers[4]._id],
        teamB: [createdPlayers[1]._id, createdPlayers[5]._id],
        scores: [{ teamAScore: 11, teamBScore: 8 }, { teamAScore: 7, teamBScore: 11 }, { teamAScore: 11, teamBScore: 9 }],
        winnerTeam: 'A',
        submittedBy: createdPlayers[0]._id,
      },
      {
        matchId: `M-00010`,
        court: 'Court 3',
        matchType: 'SINGLES',
        teamA: [createdPlayers[4]._id],
        teamB: [createdPlayers[5]._id],
        scores: [{ teamAScore: 9, teamBScore: 11 }, { teamAScore: 8, teamBScore: 11 }],
        winnerTeam: 'B',
        submittedBy: createdPlayers[5]._id,
      },
    ];

    for (const pm of pendingMatches) {
      await Match.create(pm);
    }
    await Counter.updateOne({ name: 'matchId' }, { value: 10 });

    console.log('🏆 Creating Sample Tournament (PickleHub Spring Championship)...');
    const tournament = await Tournament.create({
      name: 'PickleHub Spring Masters Championship',
      description: 'Official single-elimination tournament with Elo rating bonus payouts.',
      tournamentType: 'SINGLES',
      category: 'All',
      status: 'IN_PROGRESS',
      registrationDeadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      maxParticipants: 4,
      bonusPoints: {
        winner: 50,
        runnerUp: 25,
        semiFinalist: 10,
      },
      participants: [
        { player: createdPlayers[0]._id, seed: 1, seedRating: createdPlayers[0].currentRating, appliedBy: adminUser._id },
        { player: createdPlayers[1]._id, seed: 2, seedRating: createdPlayers[1].currentRating, appliedBy: adminUser._id },
        { player: createdPlayers[2]._id, seed: 3, seedRating: createdPlayers[2].currentRating, appliedBy: adminUser._id },
        { player: createdPlayers[3]._id, seed: 4, seedRating: createdPlayers[3].currentRating, appliedBy: adminUser._id },
      ],
      bracket: [
        {
          matchId: 'R1_M0',
          round: 1,
          matchIndex: 0,
          player1: createdPlayers[0]._id,
          player2: createdPlayers[3]._id,
          score1: 11,
          score2: 4,
          winner: createdPlayers[0]._id,
          status: 'COMPLETED',
        },
        {
          matchId: 'R1_M1',
          round: 1,
          matchIndex: 1,
          player1: createdPlayers[1]._id,
          player2: createdPlayers[2]._id,
          score1: null,
          score2: null,
          winner: null,
          status: 'READY',
        },
        {
          matchId: 'R2_M0',
          round: 2,
          matchIndex: 0,
          player1: createdPlayers[0]._id,
          player2: null,
          score1: null,
          score2: null,
          winner: null,
          status: 'PENDING',
        },
      ],
      createdBy: adminUser._id,
    });

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('\n🔑 TEST CREDENTIALS:');
    console.log('------------------------------------------------------');
    console.log(`👑 ADMIN:   admin@picklehub.com      | Password: ${adminPassword}`);
    console.log(`👑 ADMIN:   pavanwadhwa2006@gmail.com | (Your existing password)`);
    console.log(`🎾 PRO:     ben.johns@picklehub.demo  | Password: ${defaultPassword}`);
    console.log(`🎾 PRO:     anna.waters@picklehub.demo| Password: ${defaultPassword}`);
    console.log(`🎾 ADVANCED:tyson.m@picklehub.demo     | Password: ${defaultPassword}`);
    console.log('------------------------------------------------------');
    console.log(`📋 Total Players in Leaderboard: 9`);
    console.log(`⏳ Pending Matches in Admin Queue: 3 (Ready to Approve/Reject in /admin)`);
    console.log(`🏆 Active Tournament: 1 ("${tournament.name}")`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
