const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Question = require('../src/models/Question');
const Exam = require('../src/models/Exam');
const Attempt = require('../src/models/Attempt');

const targetModels = [
  { name: 'Users', model: User, collectionName: User.collection.name },
  { name: 'Questions', model: Question, collectionName: Question.collection.name },
  { name: 'Exams', model: Exam, collectionName: Exam.collection.name },
  { name: 'Attempts', model: Attempt, collectionName: Attempt.collection.name },
];

async function resetDatabase() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/exam-portal';
  console.log('====================================================');
  console.log('       EXAM PORTAL DATABASE RESET SCRIPT           ');
  console.log('====================================================\n');
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoURI);
  console.log(`Connected to Database: ${mongoose.connection.name} @ ${mongoose.connection.host}\n`);

  const db = mongoose.connection.db;
  const rawCollections = await db.listCollections().toArray();
  const existingCollectionNames = rawCollections.map(c => c.name);

  console.log('----------------------------------------------------');
  console.log('1. PRE-RESET COLLECTION STATE');
  console.log('----------------------------------------------------');
  for (const item of targetModels) {
    let count = 0;
    const exists = existingCollectionNames.includes(item.collectionName);
    if (exists) {
      count = await db.collection(item.collectionName).countDocuments();
    }
    console.log(`- ${item.name} (Collection: '${item.collectionName}'): ${exists ? `${count} document(s)` : 'Does not exist'}`);
  }

  console.log('\n----------------------------------------------------');
  console.log('2. DROPPING AND RECREATING COLLECTIONS');
  console.log('----------------------------------------------------');
  for (const item of targetModels) {
    // Check for exact and case-insensitive matches
    const matchingCollections = existingCollectionNames.filter(
      cName => cName.toLowerCase() === item.collectionName.toLowerCase()
    );

    if (matchingCollections.length > 0) {
      for (const colName of matchingCollections) {
        console.log(`Dropping collection '${colName}'...`);
        try {
          await db.dropCollection(colName);
          console.log(`  ✓ Collection '${colName}' dropped.`);
        } catch (err) {
          console.log(`  ! Notice when dropping '${colName}': ${err.message}`);
        }
      }
    } else {
      console.log(`Collection '${item.collectionName}' does not exist yet. Preparing to create empty collection.`);
    }

    console.log(`Recreating empty collection and indexes for '${item.name}'...`);
    await item.model.createCollection();
    await item.model.syncIndexes();
    console.log(`  ✓ Collection '${item.collectionName}' created & indexes synchronized.\n`);
  }

  console.log('----------------------------------------------------');
  console.log('3. POST-RESET VERIFICATION (CONFIRM EMPTY STATE)');
  console.log('----------------------------------------------------');
  const summaryResults = [];
  let allEmpty = true;

  for (const item of targetModels) {
    const count = await item.model.countDocuments();
    const isEmptied = count === 0;
    if (!isEmptied) allEmpty = false;

    summaryResults.push({
      Model: item.name,
      'Collection Name': item.collectionName,
      'Document Count': count,
      Status: isEmptied ? 'EMPTY (0 Docs)' : 'NOT EMPTY',
    });
  }

  console.table(summaryResults);

  if (allEmpty) {
    console.log('\nSUCCESS: All target collections (Users, Questions, Exams, Attempts) dropped and recreated successfully!');
    console.log('All collections are verified to be completely empty.');
  } else {
    console.error('\nWARNING: One or more collections still contain documents after reset!');
  }

  await mongoose.disconnect();
  console.log('\nMongoDB connection closed.');
}

resetDatabase().catch(err => {
  console.error('Fatal error during database reset:', err);
  process.exit(1);
});
