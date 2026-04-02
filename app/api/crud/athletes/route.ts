import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const athlete = await prisma.athlete.findUnique({ where: { id } });
      return NextResponse.json({ athlete });
    }

    const athletes = await prisma.athlete.findMany({
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json({ athletes });
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
    const {
      fullName,
      dateOfBirth,
      gender,
      currentWeight,
      heightCm,
      clubName,
      phone,
      emergencyContact,
      photoUrl,
      notes,
    } = body;

    const athlete = await prisma.athlete.create({
      data: {
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        currentWeight: currentWeight || null,
        heightCm,
        clubName: clubName || "Budokan du Maroc",
        phone,
        emergencyContact,
        photoUrl,
        notes,
      },
    });

    return NextResponse.json({ athlete }, { status: 201 });
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
    const { id, fullName, dateOfBirth, gender, currentWeight, heightCm, clubName, phone, emergencyContact, photoUrl, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const athlete = await prisma.athlete.update({
      where: { id },
      data: {
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        currentWeight: currentWeight === null ? null : currentWeight,
        heightCm,
        clubName,
        phone,
        emergencyContact,
        photoUrl,
        notes,
      },
    });

    return NextResponse.json({ athlete });
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

    await prisma.athlete.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur suppression" },
      { status: 400 }
    );
  }
}
