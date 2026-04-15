import cron from 'node-cron';
import { prisma } from '../config/database';
import { NotificationService } from '../services/notification.service';
import { DateHelper } from '../utils/dateHelper';

export const startFollowupReminderJob = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running follow-up reminder check...');
    
    const now = new Date();
    const today = DateHelper.startOfDay(now);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Send reminders for today's follow-ups (morning)
      const todayFollowups = await prisma.followup.findMany({
        where: {
          status: 'PENDING',
          followupDate: {
            gte: today,
            lt: tomorrow
          },
          deletedAt: null
        },
        include: {
          customer: true,
          user: {
            include: { user: true }
          }
        }
      });

      for (const followup of todayFollowups) {
        await NotificationService.sendFollowupReminder(followup);
      }

      // Check for overdue follow-ups
      const overdueFollowups = await prisma.followup.findMany({
        where: {
          status: 'PENDING',
          followupDate: { lt: now },
          deletedAt: null
        },
        include: {
          customer: true,
          user: {
            include: { user: true }
          }
        }
      });

      for (const followup of overdueFollowups) {
        await NotificationService.sendOverdueAlert(followup);
      }

      console.log(`Sent ${todayFollowups.length} reminders and ${overdueFollowups.length} overdue alerts`);
    } catch (error) {
      console.error('Error in follow-up reminder job:', error);
    }
  });

  // Run daily at 9 AM for activity reminders
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily activity reminder...');
    
    try {
      const startOfDay = DateHelper.startOfDay(new Date());
      const endOfDay = DateHelper.endOfDay(new Date());

      const usersWithActivities = await prisma.activity.groupBy({
        by: ['userId'],
        where: {
          activityDate: { gte: startOfDay, lte: endOfDay }
        }
      });

      const allActiveUsers = await prisma.companyUser.findMany({
        where: { isActive: true },
        include: { user: true }
      });

      for (const user of allActiveUsers) {
        const hasActivity = usersWithActivities.some(u => u.userId === user.id);
        
        if (!hasActivity) {
          await NotificationService.sendActivityReminder(
            user.user.id,
            `You haven't logged any activities today. Don't forget to update your sales activities!`
          );
        }
      }
    } catch (error) {
      console.error('Error in daily activity reminder:', error);
    }
  });
};