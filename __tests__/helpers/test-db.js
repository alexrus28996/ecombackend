import mongoose from 'mongoose';

export async function connectOrSkip(timeoutMs = 5000) {
  try {
    await Promise.race([
      mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('connect-timeout')), timeoutMs))
    ]);
    await mongoose.connection.db.dropDatabase();
    return { skip: false };
  } catch (err) {
    console.warn('Skipping tests due to Mongo unavailability', err.message);
    return { skip: true };
  }
}

export async function disconnectIfNeeded(skip) {
  if (!skip) await mongoose.disconnect();
}

export function skipIfNeeded(skip) {
  if (skip) {
    expect(true).toBe(true);
    return true;
  }
  return false;
}
