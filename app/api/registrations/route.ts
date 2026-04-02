import { NextResponse } from "next/server";
import { calculateTuition, getAgeGroup, getWeightCategory, type DisciplineKey } from "@/lib/jujitsu";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";

function parseDisciplines(value: unknown): DisciplineKey[] {
  if (!Array.isArray(value)) return [];
  const disciplineAliases: Record<string, string> = {
    FS: "fighting",
    DS: "duel",
    NAWAZA_GI: "nawazaGi",
    NAWAZA_NOGI: "nawazaNog",
  };
  return value
    .map((item) => {
      const raw = String(item);
      const normalized = raw === "duo" ? "duel" : raw;
      return disciplineAliases[normalized] ?? normalized;
    })
    .filter((item): item is DisciplineKey => ["fighting", "duel", "nawazaNog", "nawazaGi"].includes(item));
}

export async function GET() {
  const registrations = await prisma.registration.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      athlete: true,
      championship: true,
      payment: true,
    },
  });

  return NextResponse.json({ registrations });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const athleteId = String(body.athleteId ?? "");
    const championshipId = String(body.championshipId ?? "");
    const selectedDisciplines = parseDisciplines(body.selectedDisciplines);

    if (!athleteId || !championshipId || selectedDisciplines.length === 0) {
      return NextResponse.json({ error: "Sélectionnez un athlète, un championnat et au moins une discipline." }, { status: 400 });
    }

    const [athlete, championship] = await Promise.all([
      prisma.athlete.findUnique({ where: { id: athleteId } }),
      prisma.championship.findUnique({ where: { id: championshipId } }),
    ]);

    if (!athlete || !championship) {
      return NextResponse.json({ error: "Athlète ou championnat introuvable." }, { status: 404 });
    }

    const ageGroup = getAgeGroup(athlete.dateOfBirth, championship.eventDate);
    if (ageGroup.key === "Not eligible") {
      return NextResponse.json({ error: "Cet athlète n'est pas éligible pour ce championnat." }, { status: 400 });
    }

    const weightCategory = getWeightCategory(ageGroup.key, athlete.gender, athlete.currentWeight);
    const tuitionAmount = calculateTuition(
      selectedDisciplines,
      championship.pricing as Record<string, number | string>,
      ageGroup.key,
    );

    const registration = await prisma.registration.create({
      data: {
        athleteId,
        championshipId,
        selectedDisciplines,
        ageGroup: ageGroup.key,
        weightCategory,
        tuitionAmount,
        status: "PENDING",
        notes: body.notes ? String(body.notes).trim() : null,
        payment: {
          create: {
            amountDue: tuitionAmount,
            amountPaid: 0,
            status: "UNPAID",
          },
        },
      },
      include: {
        athlete: true,
        championship: true,
        payment: true,
      },
    });

    await recordAuditEvent({
      action: "CREATE",
      entityType: "Registration",
      entityId: registration.id,
      summary: `Inscription créée pour ${registration.athlete.fullName}`,
      details: {
        athleteId,
        championshipId,
        disciplines: selectedDisciplines,
        tuitionAmount,
      },
      notification: {
        type: "INFO",
        title: "Nouvelle inscription",
        message: `${registration.athlete.fullName} est inscrit au championnat ${registration.championship.name}.`,
      },
    });

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error("Registration create error:", error);
    return NextResponse.json({ error: "Impossible de créer l'inscription." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "ID inscription requis." }, { status: 400 });
    }

    const existing = await prisma.registration.findUnique({
      where: { id },
      include: {
        athlete: true,
        championship: true,
        payment: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
    }

    const selectedDisciplines = parseDisciplines(body.selectedDisciplines ?? existing.selectedDisciplines);
    if (selectedDisciplines.length === 0) {
      return NextResponse.json({ error: "Au moins une discipline est requise." }, { status: 400 });
    }

    const ageGroup = getAgeGroup(existing.athlete.dateOfBirth, existing.championship.eventDate);
    const weightCategory = getWeightCategory(ageGroup.key, existing.athlete.gender, existing.athlete.currentWeight);
    const tuitionAmount = calculateTuition(
      selectedDisciplines,
      existing.championship.pricing as Record<string, number | string>,
      ageGroup.key,
    );

    const registration = await prisma.registration.update({
      where: { id },
      data: {
        selectedDisciplines,
        ageGroup: ageGroup.key,
        weightCategory,
        tuitionAmount,
        status: body.status ? String(body.status) as "PENDING" | "CONFIRMED" | "APPROVED" | "CANCELLED" : undefined,
        notes: body.notes == null ? null : String(body.notes).trim(),
      },
      include: {
        athlete: true,
        championship: true,
        payment: true,
      },
    });

    await prisma.payment.upsert({
      where: { registrationId: registration.id },
      create: {
        registrationId: registration.id,
        amountDue: tuitionAmount,
        amountPaid: 0,
        status: "UNPAID",
      },
      update: {
        amountDue: tuitionAmount,
      },
    });

    await recordAuditEvent({
      action: "UPDATE",
      entityType: "Registration",
      entityId: registration.id,
      summary: `Inscription mise à jour pour ${registration.athlete.fullName}`,
      details: { selectedDisciplines, tuitionAmount, status: registration.status },
      notification: {
        type: "INFO",
        title: "Inscription modifiée",
        message: `${registration.athlete.fullName} · ${registration.championship.name}`,
      },
    });

    return NextResponse.json({ registration });
  } catch (error) {
    console.error("Registration update error:", error);
    return NextResponse.json({ error: "Impossible de mettre à jour l'inscription." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "");

    if (!id) {
      return NextResponse.json({ error: "ID inscription requis." }, { status: 400 });
    }

    await prisma.registration.delete({ where: { id } });

    await recordAuditEvent({
      action: "DELETE",
      entityType: "Registration",
      entityId: id,
      summary: "Inscription supprimée",
      details: { id },
      notification: {
        type: "WARNING",
        title: "Inscription supprimée",
        message: "Une inscription a été supprimée de la base.",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration delete error:", error);
    return NextResponse.json({ error: "Impossible de supprimer l'inscription." }, { status: 500 });
  }
}
