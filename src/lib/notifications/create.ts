import { prisma } from "@/lib/db/prisma";
import type { NotificationType } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Notifications are secondary to whatever primary action triggered them
 * (approving a story, processing a withdrawal, etc.) — that action must
 * still succeed and return normally even if this fails. Never throws;
 * logs and swallows instead.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
      },
    });
  } catch (error) {
    console.error("[notifications] failed to create notification:", error);
  }
}
