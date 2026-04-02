import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const championshipId = searchParams.get("championshipId");

    if (id) {
      const registration = await prisma.registration.findUnique({
        where: { id },
        include: { athlete: true, championship: true },
      });
      return NextResponse.json({ registration });
    }

    const where = championshipId ? { championshipId } : {};
    const registrations = await prisma.registration.findMany({
      where,
      include: { athlete: true, championship: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ registrations });
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
    const { athleteId, championshipId, selectedDisciplines, status, notes } = body;

    const registration = await prisma.registration.create({
      data: {
        athleteId,
        championshipId,
        selectedDisciplines,
        status,
        notes,
      },
      include: { athlete: true, championship: true },
    });

    return NextResponse.json({ registration }, { status: 201 });
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
    const { id, selectedDisciplines, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const registration = await prisma.registration.update({
      where: { id },
      data: { selectedDisciplines, status, notes },
      include: { athlete: true, championship: true },
    });

    return NextResponse.json({ registration });
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

    await prisma.registration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur suppression" },
      { status: 400 }
    );
  }
}
