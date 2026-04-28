require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Admin    = require('../models/Admin');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'nextbigwin' });

  const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  await Admin.create({
    email:    process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role:     'superadmin',
  });

  console.log('✅ Admin created:', process.env.ADMIN_EMAIL);
  process.exit(0);
})();
