import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyNotifications(userId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            createdAt: Date;
            data: string | null;
            userId: string;
            title: string;
            type: import(".prisma/client").$Enums.NotificationType;
            body: string;
            isRead: boolean;
            sentAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        success: boolean;
    }>;
    getUnreadCount(userId: string): Promise<{
        success: boolean;
        data: {
            count: number;
        };
    }>;
    markAsRead(id: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    markAllAsRead(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=notifications.controller.d.ts.map