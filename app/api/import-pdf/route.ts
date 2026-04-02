import { NextResponse } from "next/server";
import { importParticipantsPdf } from "@/lib/pdf-import";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier PDF n'a ete fourni." }, { status: 400 });
    }

    const clearExisting = String(formData.get("clearExisting") ?? "false") === "true";
    const createRegistrations = String(formData.get("createRegistrations") ?? "true") !== "false";

    const bytes = await file.arrayBuffer();
    const result = await importParticipantsPdf({
      buffer: Buffer.from(bytes),
      sourceName: file.name,
      clearExisting,
      createRegistrations,
    });

    if (!result.ok) {
      return NextResponse.json({
        error: result.message,
        details: result.details,
      }, { status: 422 });
    }

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error("PDF import error:", error);
    return NextResponse.json(
      {
        error: "Impossible d'importer ce PDF.",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
