const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const Player = mongoose.model('Player', new mongoose.Schema({}, { strict: false }));
  
  const testQuery = {
    accountStatus: 'ACTIVE',
    email: { $not: /(@picklehub\.test|\.test)$/i },
    name: { $not: /^(test|refresh_test|testadmin|reg_refresh)/i },
    playerId: { $not: /^PH-T/i }
  };
  
  const results = await Player.find(testQuery).lean();
  console.log("Matched count:", results.length);
  results.forEach(r => console.log("Found:", r.playerId, r.name, r.email));
  process.exit(0);
})();
