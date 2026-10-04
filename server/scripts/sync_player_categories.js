const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { calculateCategory } = require('../src/services/playerService');

async function syncCategories() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const players = await db.collection('players').find().toArray();
  console.log(`Auditing ${players.length} players...`);

  for (const p of players) {
    const correctCat = calculateCategory(p.currentRating);
    if (p.category !== correctCat) {
      console.log(`Updating ${p.name} (${p.playerId}): ${p.category} -> ${correctCat} (Rating: ${p.currentRating})`);
      await db.collection('players').updateOne(
        { _id: p._id },
        { $set: { category: correctCat, updatedAt: new Date() } }
      );
    } else {
      console.log(`In sync: ${p.name} (${p.playerId}) - ${p.category} (${p.currentRating} Elo)`);
    }
  }

  const finalPlayers = await db.collection('players').find().toArray();
  console.log('\nFinal Verified Players:');
  finalPlayers.forEach(p => {
    console.log(`- ${p.playerId} | ${p.name} | ${p.currentRating} Elo | ${p.category}`);
  });

  await mongoose.disconnect();
}

syncCategories().catch(console.error);
