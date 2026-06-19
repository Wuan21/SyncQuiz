require('dotenv').config();

const { connectDB, disconnectDB, getDB } = require('./src/config/database');

async function testConnection() {
  try {
    await connectDB();

    const db = getDB();

    // Ping để xác nhận kết nối thành công
    await db.command({ ping: 1 });
    console.log('🏓 Ping successful — Database is reachable');

    // Liệt kê các collections hiện có
    const collections = await db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('📂 No collections yet (empty database — ready for use)');
    } else {
      console.log('📂 Collections:', collections.map(c => c.name));
    }

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
