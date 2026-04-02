import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function summarizePayments(payments: Array<{ amountDue: number; amountPaid: number; status: string }>) {
  const totalExpected = payments.reduce((sum, payment) => sum + payment.amountDue, 0);
  const totalReceived = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
  const unpaidCount = payments.filter((payment) => payment.status === "UNPAID").length;
  const partialCount = payments.filter((payment) => payment.status === "PARTIAL").length;
  const paidCount = payments.filter((payment) => payment.status === "PAID").length;

  return {
    totalExpected,
    totalReceived,
    outstandingBalance: Math.max(totalExpected - totalReceived, 0),
    unpaidCount,
    partialCount,
    paidCount,
  };
}

export async function GET() {
  try {
    const [athletes, championships, registrations, payments, medals, certificates, notifications, activityLogs] = await Promise.all([
      prisma.athlete.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.championship.findMany({ orderBy: { eventDate: "desc" } }),
      prisma.registration.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          athlete: true,
          championship: true,
          payment: true,
        },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          registration: {
            include: {
              athlete: true,
              championship: true,
            },
          },
        },
      }),
      prisma.medal.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          athlete: true,
          championship: true,
        },
      }),
      prisma.certificate.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          athlete: true,
          championship: true,
        },
      }),
      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const paymentSummary = summarizePayments(payments);

    return NextResponse.json({
      athletes,
      championships,
      registrations,
      payments,
      medals,
      certificates,
      notifications,
      activityLogs,
      stats: {
        totalAthletes: athletes.length,
        totalChampionships: championships.length,
        totalRegistrations: registrations.length,
        totalMedals: medals.length,
        totalCertificates: certificates.length,
        totalNotifications: notifications.length,
        unreadNotifications: notifications.filter((item: { isRead: boolean }) => !item.isRead).length,
        ...paymentSummary,
      },
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Impossible de charger le tableau de bord.", details: message }, { status: 500 });
  }
}
