import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async getNotifications(userId: string, page = 1, limit = 15) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.notification.count({ where: { userId } }),
      this.db.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      success: true,
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.db.notification.count({
      where: { userId, isRead: false },
    });

    return {
      success: true,
      unreadCount,
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Unauthorized to update this notification.');
    }

    await this.db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    const unreadCount = await this.db.notification.count({
      where: { userId, isRead: false },
    });

    return {
      success: true,
      message: 'Notification marked as read.',
      unreadCount,
    };
  }

  async markAllAsRead(userId: string) {
    await this.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      success: true,
      message: 'All notifications marked as read.',
      unreadCount: 0,
    };
  }
}
