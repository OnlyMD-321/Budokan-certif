import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const certificates = await prisma.certificate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        athlete: true,
        championship: true,
      },
    });

    return NextResponse.json({ certificates });
  } catch (error) {
    console.error("Certificates fetch error:", error);
    return NextResponse.json({ error: "Impossible de charger les certificats." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "ID certificat requis." }, { status: 400 });
    }

    const certificate = await prisma.certificate.update({
      where: { id },
      data: {
        studentName: body.studentName ? String(body.studentName).trim() : undefined,
        rank: body.rank ? String(body.rank).trim() : undefined,
        date: body.date ? new Date(String(body.date)) : undefined,
        location: body.location ? String(body.location).trim() : undefined,
        discipline: body.discipline ? String(body.discipline) as "JUJITSU" | "AIKIDO" : undefined,
      },
      include: {
        athlete: true,
        championship: true,
      },
    });

    await recordAuditEvent({
      action: "UPDATE",
      entityType: "Certificate",
      entityId: certificate.id,
      summary: `Certificat mis à jour pour ${certificate.studentName}`,
      details: { id: certificate.id, discipline: certificate.discipline },
      notification: {
        type: "INFO",
        title: "Certificat modifié",
        message: `${certificate.studentName} · ${certificate.discipline}`,
      },
    });

    return NextResponse.json({ certificate });
  } catch (error) {
    console.error("Certificate update error:", error);
    return NextResponse.json({ error: "Impossible de mettre à jour le certificat." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "");

    if (!id) {
      return NextResponse.json({ error: "ID certificat requis." }, { status: 400 });
    }

    await prisma.certificate.delete({ where: { id } });

    await recordAuditEvent({
      action: "DELETE",
      entityType: "Certificate",
      entityId: id,
      summary: "Certificat supprimé",
      details: { id },
      notification: {
        type: "WARNING",
        title: "Certificat supprimé",
        message: "Un certificat a été supprimé de l'historique.",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Certificate delete error:", error);
    return NextResponse.json({ error: "Impossible de supprimer le certificat." }, { status: 500 });
  }
}
