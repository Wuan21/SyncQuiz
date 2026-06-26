require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./socket/gameHandler');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Attach Socket.io
initSocket(server);

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
