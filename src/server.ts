import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { prisma } from './config/database';
import { initializeSocket } from './services/notification.service';
import { startFollowupReminderJob } from './jobs/followupReminder.job';
import http from 'http';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl === 'null') {
      throw new Error('DATABASE_URL is not set or is invalid. Please check your .env file.');
    }
    
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    const server = http.createServer(app);
    
    // Initialize Socket.IO for real-time notifications
    initializeSocket(server);
    console.log('✅ Socket.IO initialized');

    // Start cron jobs
    startFollowupReminderJob();
    console.log('✅ Cron jobs started');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await prisma.$disconnect();
  process.exit(0);
});