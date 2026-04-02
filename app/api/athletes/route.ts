import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";

export async function GET() {
  const athletes = await prisma.athlete.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ athletes });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName ?? "").trim();
    const dateOfBirth = String(body.dateOfBirth ?? "");
    const gender = String(body.gender ?? "");
    const currentWeight = Number(body.currentWeight ?? 0);
    const heightCm = body.heightCm === "" || body.heightCm == null ? null : Number(body.heightCm);
    const clubName = String(body.clubName ?? "").trim();

    if (!fullName || !dateOfBirth || !gender || !currentWeight || !clubName) {
      return NextResponse.json({ error: "Tous les champs obligatoires doivent être renseignés." }, { status: 400 });
    }

    const athlete = await prisma.athlete.create({
      data: {
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        gender: gender as "MALE" | "FEMALE",
        currentWeight,
        heightCm,
        clubName,
        phone: body.phone ? String(body.phone).trim() : null,
        emergencyContact: body.emergencyContact ? String(body.emergencyContact).trim() : null,
        photoUrl: body.photoUrl ? String(body.photoUrl).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
      },
    });

    await recordAuditEvent({
      action: "CREATE",
      entityType: "Athlete",
      entityId: athlete.id,
      summary: `Athlète créé: ${athlete.fullName}`,
      details: { clubName, gender, currentWeight },
      notification: {
        type: "SUCCESS",
        title: "Nouvel athlète ajouté",
        message: `${athlete.fullName} a été enregistré avec succès.`,
      },
    });

    return NextResponse.json({ athlete }, { status: 201 });
  } catch (error) {
    console.error("Athlete create error:", error);
    return NextResponse.json({ error: "Impossible de créer l'athlète." }, { status: 500 });
  }
}
