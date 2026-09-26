const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkAllDBs = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    const conn = await mongoose.connect(mongoURI);
    const admin = conn.connection.db.admin();
    const dbs = await admin.listDatabases();

    for (const dbInfo of dbs.databases) {
      if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
      console.log(`\n========================================`);
      console.log(`DATABASE: ${dbInfo.name}`);
      console.log(`========================================`);
      
      const db = conn.connection.client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  - Collection '${col.name}': ${count} documents`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkAllDBs();
