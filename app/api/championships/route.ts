import { NextResponse } from "next/server";
import { defaultPricing, championshipDisciplineOptions } from "@/lib/jujitsu";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDiscipline(value: unknown) {
  return String(value) === "duo" ? "duel" : String(value);
}

export async function GET() {
  const championships = await prisma.championship.findMany({
    orderBy: { eventDate: "desc" },
  });

  return NextResponse.json({ championships });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const eventDate = String(body.eventDate ?? "");
    const location = String(body.location ?? "").trim();

    if (!name || !eventDate || !location) {
      return NextResponse.json({ error: "Le nom, la date et le lieu sont obligatoires." }, { status: 400 });
    }

    const enabledDisciplines = Array.isArray(body.enabledDisciplines)
      ? body.enabledDisciplines.map(normalizeDiscipline)
      : championshipDisciplineOptions.map((item) => item.key);

    const pricing = {
      profile: String(body.pricingProfile ?? "AUTO"),
      youthSinglePrice: toNumber(body.youthSinglePrice, 50),
      youthPairPrice: toNumber(body.youthPairPrice, 75),
      adultSinglePrice: toNumber(body.adultSinglePrice, 100),
      adultPairPrice: toNumber(body.adultPairPrice, 150),
      fighting: toNumber(body.fightingPrice, defaultPricing.fighting),
      duel: toNumber(body.duelPrice, defaultPricing.duel),
      nawazaNog: toNumber(body.nawazaNogPrice, defaultPricing.nawazaNog),
      nawazaGi: toNumber(body.nawazaGiPrice, defaultPricing.nawazaGi),
    };

    const championship = await prisma.championship.create({
      data: {
        name,
        league: String(body.league ?? "Casablanca-Settat"),
        type: String(body.type ?? "REGIONAL") as "REGIONAL" | "NATIONAL",
        status: String(body.status ?? "DRAFT") as "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED",
        eventDate: new Date(eventDate),
        location,
        enabledDisciplines,
        pricing,
        notes: body.notes ? String(body.notes).trim() : null,
      },
    });

    await recordAuditEvent({
      action: "CREATE",
      entityType: "Championship",
      entityId: championship.id,
      summary: `Championnat créé: ${championship.name}`,
      details: { league: championship.league, type: championship.type, eventDate: championship.eventDate },
      notification: {
        type: "SUCCESS",
        title: "Championnat prêt",
        message: `${championship.name} a été créé et configuré.`,
      },
    });

    return NextResponse.json({ championship }, { status: 201 });
  } catch (error) {
    console.error("Championship create error:", error);
    return NextResponse.json({ error: "Impossible de créer le championnat." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "ID championnat requis." }, { status: 400 });
    }

    const enabledDisciplines = Array.isArray(body.enabledDisciplines)
      ? body.enabledDisciplines.map(normalizeDiscipline)
      : undefined;

    const pricing = body.pricingProfile || body.youthSinglePrice || body.youthPairPrice || body.adultSinglePrice || body.adultPairPrice
      ? {
          profile: String(body.pricingProfile ?? "AUTO"),
          youthSinglePrice: toNumber(body.youthSinglePrice, 50),
          youthPairPrice: toNumber(body.youthPairPrice, 75),
          adultSinglePrice: toNumber(body.adultSinglePrice, 100),
          adultPairPrice: toNumber(body.adultPairPrice, 150),
          fighting: toNumber(body.fightingPrice, defaultPricing.fighting),
          duel: toNumber(body.duelPrice, defaultPricing.duel),
          nawazaNog: toNumber(body.nawazaNogPrice, defaultPricing.nawazaNog),
          nawazaGi: toNumber(body.nawazaGiPrice, defaultPricing.nawazaGi),
        }
      : undefined;

    const championship = await prisma.championship.update({
      where: { id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        league: body.league ? String(body.league).trim() : undefined,
        type: body.type ? String(body.type) as "REGIONAL" | "NATIONAL" : undefined,
        status: body.status ? String(body.status) as "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED" : undefined,
        eventDate: body.eventDate ? new Date(String(body.eventDate)) : undefined,
        location: body.location ? String(body.location).trim() : undefined,
        enabledDisciplines,
        pricing,
        notes: body.notes == null ? null : String(body.notes).trim(),
      },
    });

    await recordAuditEvent({
      action: "UPDATE",
      entityType: "Championship",
      entityId: championship.id,
      summary: `Championnat mis à jour: ${championship.name}`,
      details: { id: championship.id },
      notification: {
        type: "INFO",
        title: "Championnat modifié",
        message: `${championship.name} a été mis à jour.`,
      },
    });

    return NextResponse.json({ championship });
  } catch (error) {
    console.error("Championship update error:", error);
    return NextResponse.json({ error: "Impossible de mettre à jour le championnat." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "");

    if (!id) {
      return NextResponse.json({ error: "ID championnat requis." }, { status: 400 });
    }

    await prisma.championship.delete({ where: { id } });

    await recordAuditEvent({
      action: "DELETE",
      entityType: "Championship",
      entityId: id,
      summary: "Championnat supprimé",
      details: { id },
      notification: {
        type: "WARNING",
        title: "Championnat supprimé",
        message: "Un championnat a été supprimé de la base.",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Championship delete error:", error);
    return NextResponse.json({ error: "Impossible de supprimer le championnat." }, { status: 500 });
  }
}
