import express from 'express';
import http from 'node:http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { initDatabase } from './db/database.js';
import { seedInitialData } from './db/seed.js';
import { initSocketIO } from './sockets/socketHandler.js';
import matchRoutes from './routes/matchRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middlewares
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/matches', matchRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

initSocketIO(io);

// Server startup
async function startServer() {
  try {
    await initDatabase();
    await seedInitialData();

    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`[Grasshopper Server] Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Grasshopper Server] Startup error:', err);
    process.exit(1);
  }
}

startServer();

export { app, server };

