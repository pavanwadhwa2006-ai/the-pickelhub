/**
 * Promote User to Admin CLI Script
 *
 * Usage: node scripts/promote-admin.js <email>
 */

const path = require('path');
const fs = require('fs');

// Resolve mongoose and dotenv from server/node_modules or root
let mongoose, dotenv;
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

const envPath = fs.existsSync(path.resolve(__dirname, '../server/.env'))
  ? path.resolve(__dirname, '../server/.env')
  : path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const email = process.argv[2];

if (!email) {
  console.log('\n❌ Usage: node scripts/promote-admin.js <user-email>\nExample: node scripts/promote-admin.js user@example.com\n');
  process.exit(1);
}

async function promote() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    const User = require('../server/src/models/User');

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { role: 'ADMIN' },
      { new: true }
    );

    if (!user) {
      console.log(`\n❌ User with email "${email}" not found in database.\n`);
    } else {
      console.log(`\n✅ Success! User "${user.email}" is now an ADMIN (Role: ${user.role}).`);
      console.log('ℹ️  Please log out and log back in on the website to receive your new Admin token.\n');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

promote();
