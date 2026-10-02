const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectAndClean() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing in server/.env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    const db = mongoose.connection.db;

    // 1. Inspect existing state
    const collections = await db.listCollections().toArray();
    console.log('\n--- CURRENT COLLECTIONS & COUNTS ---');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  ${col.name}: ${count}`);
    }

    const nikhilUser = await db.collection('users').findOne({ email: 'nikhilmeghwani161216@gmail.com' });
    const pavanUser = await db.collection('users').findOne({ email: 'pavanwadhwa2006@gmail.com' });

    console.log('\n--- ADMIN USERS TO PRESERVE ---');
    console.log('Nikhil User:', nikhilUser ? { _id: nikhilUser._id, name: nikhilUser.name, email: nikhilUser.email, role: nikhilUser.role } : 'NOT FOUND');
    console.log('Pavan User:', pavanUser ? { _id: pavanUser._id, name: pavanUser.name, email: pavanUser.email, role: pavanUser.role } : 'NOT FOUND');

    const nikhilPlayer = await db.collection('players').findOne({ email: 'nikhilmeghwani161216@gmail.com' });
    const pavanPlayer = await db.collection('players').findOne({ email: 'pavanwadhwa2006@gmail.com' });

    console.log('Nikhil Player:', nikhilPlayer ? { _id: nikhilPlayer._id, playerId: nikhilPlayer.playerId, name: nikhilPlayer.name, rating: nikhilPlayer.currentRating } : 'NOT FOUND');
    console.log('Pavan Player:', pavanPlayer ? { _id: pavanPlayer._id, playerId: pavanPlayer.playerId, name: pavanPlayer.name, rating: pavanPlayer.currentRating } : 'NOT FOUND');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectAndClean();
