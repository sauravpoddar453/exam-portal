/**
 * =================================================================
 * One-Time Admin Account Creation Script
 * =================================================================
 * Usage:
 *   node scripts/createAdmin.js
 *   node scripts/createAdmin.js --name="Super Admin" --email="admin@domain.com" --password="SecurePassword123"
 *   node scripts/createAdmin.js --force
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const getArgValue = (argName, shortName) => {
  const match = args.find(a => a.startsWith(`--${argName}=`) || (shortName && a.startsWith(`-${shortName}=`)));
  if (match) return match.split('=')[1].replace(/^['"]|['"]$/g, '');
  const index = args.findIndex(a => a === `--${argName}` || (shortName && a === `-${shortName}`));
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('-')) {
    return args[index + 1];
  }
  return null;
};

const isForce = args.includes('--force') || args.includes('-f');
const adminName = getArgValue('name', 'n') || process.env.ADMIN_NAME || 'System Administrator';
const adminEmail = (getArgValue('email', 'e') || process.env.ADMIN_EMAIL || 'admin@examportal.com').toLowerCase().trim();
const adminPassword = getArgValue('password', 'p') || process.env.ADMIN_PASSWORD || 'admin123456';

async function createAdmin() {
  console.log('\n=================== ADMIN CREATION SEED SCRIPT ===================');

  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/exam-portal';
  
  try {
    console.log(`[1/4] Connecting to MongoDB database...`);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[✓] MongoDB Connected successfully.`);

    // Check existing admin accounts
    console.log(`[2/4] Checking existing administrator accounts in database...`);
    const existingAdmins = await User.find({ role: 'admin' });

    if (existingAdmins.length > 0 && !isForce) {
      console.log('\n⚠️  WARNING: Admin Account(s) Already Exist!');
      console.log(`   Found ${existingAdmins.length} existing admin account(s):`);
      existingAdmins.forEach((adm, idx) => {
        console.log(`   ${idx + 1}. Email: ${adm.email} | Name: ${adm.name} | Created: ${adm.createdAt}`);
      });
      console.log('\n   To create an additional admin account, re-run with the --force flag:');
      console.log('   node scripts/createAdmin.js --force\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    if (existingAdmins.length > 0 && isForce) {
      console.log(`   [!] Existing admin(s) detected, but --force flag was provided. Proceeding with creation.`);
    }

    // Check if user with target email already exists
    console.log(`[3/4] Checking target email '${adminEmail}'...`);
    let user = await User.findOne({ email: adminEmail }).select('+password');

    if (user) {
      console.log(`   User with email '${adminEmail}' already exists. Elevating role to 'admin'...`);
      user.name = adminName;
      user.role = 'admin';
      user.isVerified = true;
      user.teacherApprovalStatus = 'approved';
      user.password = adminPassword; // Triggers pre-save bcrypt hash hook
      await user.save();
      console.log(`[✓] Existing user updated to Administrator successfully!`);
    } else {
      console.log(`   Creating new Administrator account for '${adminEmail}'...`);
      user = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isVerified: true,
        teacherApprovalStatus: 'approved',
      });
      console.log(`[✓] New Administrator created successfully!`);
    }

    console.log('\n==================================================================');
    console.log('🎉 ADMIN ACCOUNT CREATED SUCCESSFULLY!');
    console.log('==================================================================');
    console.log(` Name:     ${user.name}`);
    console.log(` Email:    ${user.email}`);
    console.log(` Role:     ${user.role}`);
    console.log(` Status:   Verified (isVerified = true)`);
    console.log(' You can now log in at /login with this administrator account.');
    console.log('==================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Error creating admin account:`, err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
