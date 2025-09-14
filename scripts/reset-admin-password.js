import 'dotenv/config';
import { connectMongo, disconnectMongo } from '../src/db/mongo.js';
import { config } from '../src/config/index.js';
import { User } from '../src/modules/users/user.model.js';

/**
 * Reset the admin user's password to ADMIN_PASSWORD from .env
 * without touching anything else.
 */
async function main() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const newPassword = process.env.ADMIN_PASSWORD;
  if (!email || !newPassword) {
    // eslint-disable-next-line no-console
    console.error('ADMIN_EMAIL or ADMIN_PASSWORD missing in environment');
    process.exit(1);
  }

  await connectMongo(config.MONGO_URI, { dbName: config.DB_NAME || undefined });

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    // eslint-disable-next-line no-console
    console.error('Admin user not found for email:', email);
    process.exit(1);
  }

  // Ensure admin role present and reset password
  user.password = newPassword; // pre('save') hook will hash it
  if (!Array.isArray(user.roles)) user.roles = [];
  if (!user.roles.includes('admin')) user.roles.push('admin');
  await user.save();

  // eslint-disable-next-line no-console
  console.log('Admin password reset for', email);

  await disconnectMongo();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Reset failed:', err);
  process.exit(1);
});
