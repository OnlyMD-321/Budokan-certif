import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export async function recordAuditEvent(options: {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
  notification?: {
    type?: NotificationType;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string | null;
  };
}) {
  const { notification, ...activity } = options;

  await prisma.activityLog.create({
    data: {
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId ?? null,
      summary: activity.summary,
      details: activity.details ?? undefined,
    },
  });

  if (notification) {
    await prisma.notification.create({
      data: {
        type: notification.type ?? "INFO",
        title: notification.title,
        message: notification.message,
        entityType: notification.entityType ?? activity.entityType,
        entityId: notification.entityId ?? activity.entityId ?? null,
      },
    });
  }
}
