/**
 * Database Reset & Handover Clean-up Script
 *
 * Prepares the PickleHub production database for official client handover to Nikhil Meghwani:
 * 1. Preserves only Nikhil Meghwani (nikhilmeghwani161216@gmail.com) and Pavan Wadhwa (pavanwadhwa2006@gmail.com) as ADMINs.
 * 2. Purges all 90+ synthetic test/e2e/demo accounts, test matches, test tournaments, test rating histories, test bookings, and test audit logs.
 * 3. Resets player ratings and statistics to pristine baseline (1,000 Elo, 0 matches, 0 wins, 0 losses, 0 streak, 0 tournaments).
 * 4. Assigns clean sequential Player IDs: Pavan (PH-00001) and Nikhil (PH-00002).
 * 5. Resets atomic counter sequences: playerId counter to 2 (so next user gets PH-00003), matchId counter to 0.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const NIKHIL_EMAIL = 'nikhilmeghwani161216@gmail.com';
const PAVAN_EMAIL = 'pavanwadhwa2006@gmail.com';

async function cleanAndResetDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is missing in server/.env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully to MongoDB.');

    const db = mongoose.connection.db;

    console.log('\n--- 1. VERIFYING ADMIN ACCOUNTS ---');
    const nikhilUser = await db.collection('users').findOne({ email: NIKHIL_EMAIL });
    const pavanUser = await db.collection('users').findOne({ email: PAVAN_EMAIL });

    if (!nikhilUser) {
      throw new Error(`CRITICAL: Nikhil Meghwani (${NIKHIL_EMAIL}) not found in users collection!`);
    }
    if (!pavanUser) {
      throw new Error(`CRITICAL: Pavan Wadhwa (${PAVAN_EMAIL}) not found in users collection!`);
    }

    console.log(`Found Nikhil: ${nikhilUser._id} (${nikhilUser.email})`);
    console.log(`Found Pavan:  ${pavanUser._id} (${pavanUser.email})`);

    // Ensure both are ADMINs
    await db.collection('users').updateOne(
      { _id: nikhilUser._id },
      { $set: { role: 'ADMIN' } }
    );
    await db.collection('users').updateOne(
      { _id: pavanUser._id },
      { $set: { role: 'ADMIN' } }
    );
    console.log('Verified both users have role: ADMIN.');

    console.log('\n--- 2. PURGING ALL OTHER USERS ---');
    const deleteUsersResult = await db.collection('users').deleteMany({
      email: { $nin: [NIKHIL_EMAIL, PAVAN_EMAIL] }
    });
    console.log(`Deleted ${deleteUsersResult.deletedCount} non-admin/test user accounts.`);

    console.log('\n--- 3. PURGING ALL OTHER PLAYERS ---');
    const deletePlayersResult = await db.collection('players').deleteMany({
      email: { $nin: [NIKHIL_EMAIL, PAVAN_EMAIL] }
    });
    console.log(`Deleted ${deletePlayersResult.deletedCount} non-admin/test player profiles.`);

    console.log('\n--- 4. RESETTING NIKHIL & PAVAN PLAYER STATS TO CLEAN FACTORY BASELINE ---');
    // Nikhil: PH-00002, 1000 Elo, 0 matches, 0 wins, 0 losses, 0 streak
    await db.collection('players').updateOne(
      { email: NIKHIL_EMAIL },
      {
        $set: {
          playerId: 'PH-00002',
          currentRating: 1000,
          highestRating: 1000,
          category: 'Intermediate',
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          winPercentage: 0,
          winningStreak: 0,
          tournamentWins: 0,
          tournamentAppearances: 0,
          accountStatus: 'ACTIVE',
          lastCategoryNotificationAt: null,
          updatedAt: new Date(),
        }
      }
    );
    console.log('Reset Nikhil Meghwani player profile: PH-00002, 1000 Elo, 0 matches, 0 wins, 0 losses.');

    // Pavan: PH-00001, 1000 Elo, 0 matches, 0 wins, 0 losses, 0 streak
    await db.collection('players').updateOne(
      { email: PAVAN_EMAIL },
      {
        $set: {
          playerId: 'PH-00001',
          currentRating: 1000,
          highestRating: 1000,
          category: 'Intermediate',
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          winPercentage: 0,
          winningStreak: 0,
          tournamentWins: 0,
          tournamentAppearances: 0,
          accountStatus: 'ACTIVE',
          lastCategoryNotificationAt: null,
          updatedAt: new Date(),
        }
      }
    );
    console.log('Reset Pavan Wadhwa player profile: PH-00001, 1000 Elo, 0 matches, 0 wins, 0 losses.');

    console.log('\n--- 5. PURGING ACTIVITY COLLECTIONS ---');
    const delMatches = await db.collection('matches').deleteMany({});
    console.log(`Deleted ${delMatches.deletedCount} matches.`);

    const delTournaments = await db.collection('tournaments').deleteMany({});
    console.log(`Deleted ${delTournaments.deletedCount} tournaments.`);

    const delHistory = await db.collection('ratinghistories').deleteMany({});
    console.log(`Deleted ${delHistory.deletedCount} rating history records.`);

    const delAudit = await db.collection('auditlogs').deleteMany({});
    console.log(`Deleted ${delAudit.deletedCount} audit logs.`);

    const delBookings = await db.collection('bookings').deleteMany({});
    console.log(`Deleted ${delBookings.deletedCount} court bookings.`);

    const delRateLimits = await db.collection('ratelimits').deleteMany({});
    console.log(`Deleted ${delRateLimits.deletedCount} rate limit records.`);

    console.log('\n--- 6. RESETTING ATOMIC ID COUNTERS ---');
    await db.collection('counters').updateOne(
      { name: 'playerId' },
      { $set: { value: 2 } },
      { upsert: true }
    );
    await db.collection('counters').updateOne(
      { name: 'matchId' },
      { $set: { value: 0 } },
      { upsert: true }
    );
    await db.collection('counters').updateOne(
      { name: 'bookingId' },
      { $set: { value: 0 } },
      { upsert: true }
    );
    console.log('playerId counter set to 2 (next user will receive PH-00003).');
    console.log('matchId counter reset to 0 (next match will receive M-00001 / ID 1).');

    console.log('\n--- 7. FINAL DATABASE AUDIT ---');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  ${col.name}: ${count}`);
    }

    const remainingUsers = await db.collection('users').find({}).toArray();
    console.log('\nPreserved Users:');
    for (const u of remainingUsers) {
      console.log(`  - ${u.email} [Role: ${u.role}] (ID: ${u._id})`);
    }

    const remainingPlayers = await db.collection('players').find({}).toArray();
    console.log('\nPreserved Players:');
    for (const p of remainingPlayers) {
      console.log(`  - ${p.name} (${p.playerId}) [Rating: ${p.currentRating}, Matches: ${p.matchesPlayed}, Wins: ${p.wins}]`);
    }

    console.log('\nSUCCESS! Database is 100% clean, fresh, and ready for Nikhil Meghwani handover!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

cleanAndResetDatabase();
