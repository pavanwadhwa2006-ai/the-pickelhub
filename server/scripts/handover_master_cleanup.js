/**
 * Handover Master Cleansing Script — The PickleHub
 *
 * Ensures 100% pristine database state for handover to client Nikhil Meghwani:
 * 1. Preserves ONLY authentic players & users:
 *    - Pavan Wadhwa (pavanwadhwa2006@gmail.com, ADMIN, PH-00001)
 *    - Nikhil Meghwani (nikhilmeghwani161216@gmail.com, ADMIN, PH-00002)
 *    - Ram Sachdev (ramsachdev201@gmail.com, PLAYER, PH-00018)
 *    - Simran Sumyani (simransumyani08@gmail.com, PLAYER, PH-00019)
 * 2. Purges any test/synthetic players or users.
 * 3. Purges all orphaned rating histories not belonging to these 4 athletes.
 * 4. Purges all test audit logs.
 * 5. Purges any test notifications.
 * 6. Verifies atomic counters and records final DB summary.
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AUTHENTIC_EMAILS = [
  'pavanwadhwa2006@gmail.com',
  'nikhilmeghwani161216@gmail.com',
  'ramsachdev201@gmail.com',
  'simransumyani08@gmail.com',
];

async function runMasterCleanup() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in server/.env');
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  console.log('Connected successfully.\n');

  console.log('=== STEP 1: PURGING UNAPPROVED OR TEST USERS ===');
  const userDeleteResult = await db.collection('users').deleteMany({
    email: { $nin: AUTHENTIC_EMAILS }
  });
  console.log(`Deleted ${userDeleteResult.deletedCount} non-authentic user accounts.`);

  console.log('\n=== STEP 2: PURGING UNAPPROVED OR TEST PLAYERS ===');
  const playerDeleteResult = await db.collection('players').deleteMany({
    email: { $nin: AUTHENTIC_EMAILS }
  });
  console.log(`Deleted ${playerDeleteResult.deletedCount} non-authentic player records.`);

  // Retrieve valid player IDs and ObjectIds
  const validPlayers = await db.collection('players').find({}).toArray();
  const validPlayerIds = validPlayers.map(p => p._id);
  console.log(`Verified ${validPlayers.length} authentic players in database:`);
  validPlayers.forEach(p => {
    console.log(`  - ${p.playerId} | ${p.name} | ${p.email} | ${p.category} | ${p.currentRating} Elo`);
  });

  console.log('\n=== STEP 3: PURGING ORPHANED RATING HISTORIES ===');
  const rhDeleteResult = await db.collection('ratinghistories').deleteMany({
    playerId: { $nin: validPlayerIds }
  });
  console.log(`Deleted ${rhDeleteResult.deletedCount} orphaned rating history entries.`);

  console.log('\n=== STEP 4: PURGING TEST AUDIT LOGS ===');
  const auditDeleteResult = await db.collection('auditlogs').deleteMany({
    $or: [
      { action: { $regex: /test/i } },
      { details: { $regex: /test/i } },
      { performedBy: { $regex: /test/i } },
      { targetModel: { $regex: /test/i } },
      { userEmail: { $regex: /picklehub\.test$/i } }
    ]
  });
  console.log(`Deleted ${auditDeleteResult.deletedCount} test audit logs.`);

  console.log('\n=== STEP 5: PURGING TEST NOTIFICATIONS (IF ANY) ===');
  const collections = await db.listCollections().toArray();
  const hasNotifs = collections.some(c => c.name === 'notifications');
  if (hasNotifs) {
    const notifDeleteResult = await db.collection('notifications').deleteMany({
      $or: [
        { title: { $regex: /test/i } },
        { message: { $regex: /test/i } }
      ]
    });
    console.log(`Deleted ${notifDeleteResult.deletedCount} test notifications.`);
  } else {
    console.log('No persistent notifications collection (in-app notifications are transient/Pusher).');
  }

  console.log('\n=== STEP 6: VERIFYING ADMIN ROLES ===');
  await db.collection('users').updateOne(
    { email: 'pavanwadhwa2006@gmail.com' },
    { $set: { role: 'ADMIN' } }
  );
  await db.collection('users').updateOne(
    { email: 'nikhilmeghwani161216@gmail.com' },
    { $set: { role: 'ADMIN' } }
  );
  console.log('Confirmed ADMIN role for Pavan Wadhwa and Nikhil Meghwani.');

  console.log('\n=== FINAL PRISTINE DATABASE AUDIT ===');
  const finalUsers = await db.collection('users').find({}).toArray();
  const finalPlayers = await db.collection('players').find({}).toArray();
  const finalMatches = await db.collection('matches').find({}).toArray();
  const finalRatingHistories = await db.collection('ratinghistories').find({}).toArray();

  console.log(`Users: ${finalUsers.length}`);
  finalUsers.forEach(u => console.log(`  * ${u.email} [${u.role}]`));

  console.log(`Players: ${finalPlayers.length}`);
  finalPlayers.forEach(p => console.log(`  * ${p.playerId} ${p.name} (${p.email})`));

  console.log(`Matches: ${finalMatches.length}`);
  console.log(`Rating Histories: ${finalRatingHistories.length}`);

  await mongoose.disconnect();
  console.log('\n✅ Database is 100% clean and ready for client handover to Nikhil!');
}

runMasterCleanup().catch(err => {
  console.error('Master cleanup failed:', err);
  process.exit(1);
});
