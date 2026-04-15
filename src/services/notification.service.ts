import { prisma } from '../config/database';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export const initializeSocket = (server: any) => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.join(`user_${userId}`);
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export class NotificationService {
  
  static async sendFollowupAssigned(followup: any) {
    if (!io) return;

    const notification = {
      id: Date.now(),
      type: 'FOLLOWUP_ASSIGNED',
      title: 'New Follow-up Assigned',
      message: `You have a new ${followup.followupType} follow-up with ${followup.customer.name} scheduled for ${new Date(followup.followupDate).toLocaleDateString()}`,
      data: followup,
      createdAt: new Date()
    };

    io.to(`user_${followup.user.user.id}`).emit('notification', notification);
  }

  static async sendFollowupReminder(followup: any) {
    if (!io) return;

    const notification = {
      id: Date.now(),
      type: 'FOLLOWUP_REMINDER',
      title: 'Follow-up Reminder',
      message: `Reminder: ${followup.followupType} follow-up with ${followup.customer.name} is due today at ${new Date(followup.followupDate).toLocaleTimeString()}`,
      data: followup,
      createdAt: new Date()
    };

    io.to(`user_${followup.user.user.id}`).emit('notification', notification);
  }

  static async sendOverdueAlert(followup: any) {
    if (!io) return;

    const notification = {
      id: Date.now(),
      type: 'OVERDUE_ALERT',
      title: 'Overdue Follow-up',
      message: `Follow-up with ${followup.customer.name} was due on ${new Date(followup.followupDate).toLocaleDateString()} and is now overdue!`,
      data: followup,
      createdAt: new Date()
    };

    io.to(`user_${followup.user.user.id}`).emit('notification', notification);
  }

  static async sendActivityReminder(userId: bigint, message: string) {
    if (!io) return;

    const notification = {
      id: Date.now(),
      type: 'ACTIVITY_REMINDER',
      title: 'Activity Reminder',
      message,
      createdAt: new Date()
    };

    io.to(`user_${userId}`).emit('notification', notification);
  }
}