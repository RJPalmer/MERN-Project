const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error('Usage: npm run admin:promote -- user@example.com');
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace');
  const result = await User.updateOne({ email }, { $set: { platformRole: 'admin' } });
  if (result.matchedCount === 0) {
    throw new Error(`No user found for ${email}. Register the account before granting admin access.`);
  }
  process.stdout.write(`Granted platform admin access to ${email}.\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
