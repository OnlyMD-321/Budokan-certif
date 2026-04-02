import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ notifications });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const notificationId = body.notificationId ? String(body.notificationId) : null;

    if (notificationId) {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });

      return NextResponse.json({ notification });
    }

    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Notification update error:", error);
    return NextResponse.json({ error: "Impossible de mettre à jour les notifications." }, { status: 500 });
  }
}
