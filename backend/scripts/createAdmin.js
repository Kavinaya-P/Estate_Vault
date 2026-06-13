require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const SALT_ROUNDS = 12;
const hasDbInMongoUri = (uri = '') => {
  const withoutQuery = uri.split('?')[0];
  const match = withoutQuery.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/(.*)$/i);
  if (!match) return false;
  return !!(match[1] && match[1].trim());
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in .env');
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@estatevault.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456789';
  const fullName = process.env.ADMIN_NAME || 'Estate Vault Admin';

  const options = { serverSelectionTimeoutMS: 5000 };
  if (!hasDbInMongoUri(mongoUri)) {
    options.dbName = process.env.MONGO_DB_NAME || 'estate_vault';
  }

  await mongoose.connect(mongoUri, options);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await Admin.findOne({ email });

  if (existing) {
    existing.fullName = fullName;
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    await existing.save();
    console.log('Updated existing admin account.');
  } else {
    await Admin.create({ email, fullName, passwordHash, isActive: true });
    console.log('Created new admin account.');
  }

  console.log(`Admin email: ${email}`);
  console.log(`Admin password: ${password}`);
  console.log(`Database: ${mongoose.connection.name}`);

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Failed to create admin:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
