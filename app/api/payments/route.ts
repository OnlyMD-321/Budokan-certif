import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";

function resolvePaymentStatus(amountPaid: number, amountDue: number) {
  if (amountPaid <= 0) return "UNPAID";
  if (amountPaid >= amountDue) return "PAID";
  return "PARTIAL";
}

export async function GET() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      registration: {
        include: {
          athlete: true,
          championship: true,
        },
      },
    },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const registrationId = String(body.registrationId ?? "");
    const amountPaid = Number(body.amountPaid ?? 0);
    const note = body.note ? String(body.note).trim() : null;

    if (!registrationId) {
      return NextResponse.json({ error: "Veuillez sélectionner une inscription." }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        athlete: true,
        championship: true,
      },
    });
    if (!registration) {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
    }

    const status = resolvePaymentStatus(amountPaid, registration.tuitionAmount);

    const payment = await prisma.payment.upsert({
      where: { registrationId },
      create: {
        registrationId,
        amountDue: registration.tuitionAmount,
        amountPaid,
        status,
        paidAt: status === "PAID" ? new Date() : null,
        note,
      },
      update: {
        amountDue: registration.tuitionAmount,
        amountPaid,
        status,
        paidAt: status === "PAID" ? new Date() : null,
        note,
      },
    });

    await recordAuditEvent({
      action: "UPSERT",
      entityType: "Payment",
      entityId: payment.id,
      summary: `Paiement ${payment.status.toLowerCase()} pour inscription ${registrationId}`,
      details: { registrationId, amountPaid, amountDue: registration.tuitionAmount, status: payment.status },
      notification: {
        type: payment.status === "PAID" ? "SUCCESS" : payment.status === "PARTIAL" ? "WARNING" : "INFO",
        title: "Paiement mis à jour",
        message: `${registration.athlete.fullName} · ${registration.championship.name} · ${payment.status}`,
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Payment upsert error:", error);
    return NextResponse.json({ error: "Impossible d'enregistrer le paiement." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    const amountPaid = Number(body.amountPaid ?? 0);
    const note = body.note ? String(body.note).trim() : null;

    if (!id) {
      return NextResponse.json({ error: "ID paiement requis." }, { status: 400 });
    }

    const existing = await prisma.payment.findUnique({
      where: { id },
      include: {
        registration: {
          include: {
            athlete: true,
            championship: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
    }

    const status = resolvePaymentStatus(amountPaid, existing.amountDue);

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        amountPaid,
        status,
        paidAt: status === "PAID" ? new Date() : null,
        note,
      },
    });

    await recordAuditEvent({
      action: "UPDATE",
      entityType: "Payment",
      entityId: payment.id,
      summary: `Paiement modifié (${payment.status})`,
      details: { id: payment.id, amountPaid, status: payment.status },
      notification: {
        type: payment.status === "PAID" ? "SUCCESS" : payment.status === "PARTIAL" ? "WARNING" : "INFO",
        title: "Paiement modifié",
        message: `${existing.registration.athlete.fullName} · ${existing.registration.championship.name} · ${payment.status}`,
      },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("Payment update error:", error);
    return NextResponse.json({ error: "Impossible de mettre à jour le paiement." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "");

    if (!id) {
      return NextResponse.json({ error: "ID paiement requis." }, { status: 400 });
    }

    await prisma.payment.delete({ where: { id } });

    await recordAuditEvent({
      action: "DELETE",
      entityType: "Payment",
      entityId: id,
      summary: "Paiement supprimé",
      details: { id },
      notification: {
        type: "WARNING",
        title: "Paiement supprimé",
        message: "Un paiement a été supprimé de la base.",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment delete error:", error);
    return NextResponse.json({ error: "Impossible de supprimer le paiement." }, { status: 500 });
  }
}
