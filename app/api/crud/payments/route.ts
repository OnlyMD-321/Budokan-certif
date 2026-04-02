import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const registrationId = searchParams.get("registrationId");

    if (id) {
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: { registration: { include: { athlete: true } } },
      });
      return NextResponse.json({ payment });
    }

    const where = registrationId ? { registrationId } : {};
    const payments = await prisma.payment.findMany({
      where,
      include: { registration: { include: { athlete: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ payments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registrationId, amount, status, paymentDate, method, reference, notes } = body;

    const payment = await prisma.payment.create({
      data: {
        registrationId,
        amount,
        status,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        method,
        reference,
        notes,
      },
      include: { registration: { include: { athlete: true } } },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur création" },
      { status: 400 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, amount, status, paymentDate, method, reference, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        amount,
        status,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        method,
        reference,
        notes,
      },
      include: { registration: { include: { athlete: true } } },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur mise à jour" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await prisma.payment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur suppression" },
      { status: 400 }
    );
  }
}
