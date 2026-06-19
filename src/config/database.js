const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let isConnected = false;

async function connectDB() {
  if (isConnected) return client;

  await client.connect();
  isConnected = true;
  console.log('✅ Connected to MongoDB Atlas — SyncQuiz');
  return client;
}

async function disconnectDB() {
  if (!isConnected) return;
  await client.close();
  isConnected = false;
  console.log('🔌 Disconnected from MongoDB Atlas');
}

function getDB(dbName = 'syncquiz') {
  if (!isConnected) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return client.db(dbName);
}

module.exports = { connectDB, disconnectDB, getDB, client };
