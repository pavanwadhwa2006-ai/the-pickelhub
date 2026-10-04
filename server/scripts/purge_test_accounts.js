const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function deepCleanDatabase() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('=== DEEP CLEANING DATABASE OF ALL TEST ARTIFACTS ===');

  // 1. Players
  const testPlayerQuery = {
    $or: [
      { email: { $regex: /picklehub\.test$/i } },
      { name: { $regex: /^(test|refresh_test|testadmin|reg_refresh)/i } },
      { playerId: { $regex: /^PH-T/i } }
    ]
  };
  const deletedPlayers = await db.collection('players').deleteMany(testPlayerQuery);
  console.log('Deleted test players:', deletedPlayers.deletedCount);

  // 2. Users
  const testUserQuery = {
    $or: [
      { email: { $regex: /picklehub\.test$/i } },
      { email: { $regex: /^(test|refresh_test|testadmin|reg_refresh)/i } }
    ]
  };
  const deletedUsers = await db.collection('users').deleteMany(testUserQuery);
  console.log('Deleted test users:', deletedUsers.deletedCount);

  // 3. Matches
  const testMatchQuery = {
    $or: [
      { notes: { $regex: /test/i } },
      { 'player1.email': { $regex: /picklehub\.test$/i } },
      { 'player2.email': { $regex: /picklehub\.test$/i } }
    ]
  };
  const deletedMatches = await db.collection('matches').deleteMany(testMatchQuery);
  console.log('Deleted test matches:', deletedMatches.deletedCount);

  // 4. Tournaments
  const testTournamentQuery = {
    $or: [
      { name: { $regex: /test/i } },
      { title: { $regex: /test/i } },
      { description: { $regex: /test/i } }
    ]
  };
  const deletedTournaments = await db.collection('tournaments').deleteMany(testTournamentQuery);
  console.log('Deleted test tournaments:', deletedTournaments.deletedCount);

  // 5. Notifications
  const testNotifQuery = {
    $or: [
      { title: { $regex: /test/i } },
      { message: { $regex: /test/i } }
    ]
  };
  if (await db.listCollections({ name: 'notifications' }).hasNext()) {
    const deletedNotifs = await db.collection('notifications').deleteMany(testNotifQuery);
    console.log('Deleted test notifications:', deletedNotifs.deletedCount);
  }

  // Check remaining real players
  const remainingPlayers = await db.collection('players').find().toArray();
  console.log('\n=== REMAINING REAL PLAYERS IN DATABASE (' + remainingPlayers.length + ') ===');
  remainingPlayers.forEach(p => {
    console.log(`- ${p.playerId} | ${p.name} | ${p.email} | ${p.category} | ${p.currentRating} Elo`);
  });

  const remainingUsers = await db.collection('users').find().toArray();
  console.log('\n=== REMAINING REAL USERS IN DATABASE (' + remainingUsers.length + ') ===');
  remainingUsers.forEach(u => {
    console.log(`- ${u.email} | Role: ${u.role}`);
  });

  await mongoose.disconnect();
}

deepCleanDatabase().catch(console.error);
