import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const championship = await prisma.championship.findUnique({ where: { id } });
      return NextResponse.json({ championship });
    }

    const championships = await prisma.championship.findMany({
      orderBy: { eventDate: "desc" },
    });
    return NextResponse.json({ championships });
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
    const { name, league, type, status, eventDate, location, enabledDisciplines, pricing } = body;

    const championship = await prisma.championship.create({
      data: {
        name,
        league,
        type,
        status,
        eventDate: new Date(eventDate),
        location,
        enabledDisciplines,
        pricing,
      },
    });

    return NextResponse.json({ championship }, { status: 201 });
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
    const { id, name, league, type, status, eventDate, location, enabledDisciplines, pricing } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const championship = await prisma.championship.update({
      where: { id },
      data: {
        name,
        league,
        type,
        status,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        location,
        enabledDisciplines,
        pricing,
      },
    });

    return NextResponse.json({ championship });
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

    await prisma.championship.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur suppression" },
      { status: 400 }
    );
  }
}
