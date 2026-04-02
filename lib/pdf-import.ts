import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { prisma } from "@/lib/prisma";
import { calculateTuition, defaultPairPricing, defaultPricing, getAgeGroup, getWeightCategory, type DisciplineKey } from "@/lib/jujitsu";
import { recordAuditEvent } from "@/lib/audit";

type ParsedAthlete = {
  fullName: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;
  currentWeight: number | null;
  selectedDisciplines: DisciplineKey[];
  notes?: string;
};

type ParsedPayload = {
  championshipName: string;
  championshipType: "REGIONAL" | "NATIONAL";
  eventDate: string;
  location: string;
  athletes: ParsedAthlete[];
  warnings: string[];
  usedOcr: boolean;
  extractedTextLength: number;
};

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/ +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isLikelyLowTextQuality(text: string) {
  const lines = text.split("\n").filter(Boolean);
  return text.length < 600 || lines.length < 12;
}

function toIsoDate(ddmmyyyy: string) {
  const match = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z\u00c0-\u017f])/g, (full) => full.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

function detectDisciplines(fragment: string): DisciplineKey[] {
  const disciplines: DisciplineKey[] = [];
  if (/\bFS\b/i.test(fragment) || /fighting/i.test(fragment)) disciplines.push("fighting");
  if (/\bDS\b/i.test(fragment) || /\bDUO\b/i.test(fragment) || /duo/i.test(fragment)) disciplines.push("duel");
  if (/no\s*-?\s*gi|\bnogi\b|\bNG\b/i.test(fragment)) disciplines.push("nawazaNog");
  if (/\bGI\b/i.test(fragment)) disciplines.push("nawazaGi");

  if (!disciplines.length) {
    return ["fighting", "duel"];
  }

  return Array.from(new Set(disciplines));
}

function parseParticipantsFromText(text: string): ParsedPayload {
  const warnings: string[] = [];
  const lines = normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const championshipName = lines.find((line) => /championnat/i.test(line)) ?? "Championnat importé";
  const locationLine = lines.find((line) => /\b(local|lieu)\s*:/i.test(line)) ?? "";
  const dateLine = lines.find((line) => /\bdate\s*:/i.test(line)) ?? "";

  const location = locationLine
    .replace(/^(.*?)(local|lieu)\s*:\s*/i, "")
    .replace(/\bdate\s*:\s*\d{2}\/\d{2}\/\d{4}.*/i, "")
    .trim() || "Casablanca, Maroc";
  const dateMatch = (dateLine || locationLine).match(/(\d{2}\/\d{2}\/\d{4})/);
  const eventDate = dateMatch ? toIsoDate(dateMatch[1]) : new Date().toISOString().slice(0, 10);
  const championshipType = /national/i.test(championshipName) ? "NATIONAL" : "REGIONAL";

  const headerIndex = lines.findIndex((line) => /name/i.test(line) && /gender/i.test(line) && /birth/i.test(line));
  const dataLines = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;

  const athletes: ParsedAthlete[] = [];

  for (const line of dataLines) {
    if (/^\d+$/.test(line)) continue;
    if (/^--\s*\d+\s*of\s*\d+\s*--$/i.test(line)) continue;
    if (/^(name|gender|date|weight|discipline)/i.test(line)) continue;

    const match = line.match(/^([A-Z\u00c0-\u017f'\- ]{4,}?)\s+([MF])\s+(\d{2}\/\d{2}\/\d{4})\s*(.*)$/i);
    if (!match) continue;

    const fullName = toTitleCase(match[1]);
    const gender = match[2].toUpperCase() === "F" ? "FEMALE" : "MALE";
    const dateOfBirth = toIsoDate(match[3]);
    const tail = match[4]?.trim() ?? "";

    const weightMatch = tail.match(/(\d{1,3}[\.,]\d{1,2})/);
    const currentWeight = weightMatch ? Number(weightMatch[1].replace(",", ".")) : null;
    const selectedDisciplines = detectDisciplines(tail);

    if (!weightMatch) {
      warnings.push(`Poids manquant pour ${fullName}.`);
    }

    if (!dateOfBirth) {
      warnings.push(`Date de naissance invalide pour ${fullName}. Ligne ignoree.`);
      continue;
    }

    athletes.push({
      fullName,
      gender,
      dateOfBirth,
      currentWeight,
      selectedDisciplines,
    });
  }

  if (!athletes.length) {
    const headerIndexWithGender = lines.findIndex((line) => /gender/i.test(line) && /birth/i.test(line));
    const firstDateLineIndex = lines.findIndex(
      (line, index) =>
        index > headerIndexWithGender &&
        ((line.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) ?? []).length >= 2),
    );
    const peopleLines =
      firstDateLineIndex > headerIndexWithGender && headerIndexWithGender >= 0
        ? lines.slice(headerIndexWithGender + 1, firstDateLineIndex)
        : [];

    const pairs: Array<{ fullName: string; gender: "MALE" | "FEMALE" }> = [];
    let pendingName = "";

    for (const line of peopleLines) {
      const compact = line.trim();
      if (!compact) continue;

      const directPair = compact.match(/^([A-Z\u00c0-\u017f'\- ]{4,}?)\s+([MF])$/i);
      if (directPair) {
        pairs.push({
          fullName: toTitleCase(directPair[1]),
          gender: directPair[2].toUpperCase() === "F" ? "FEMALE" : "MALE",
        });
        pendingName = "";
        continue;
      }

      if (/^[MF]$/i.test(compact) && pendingName) {
        pairs.push({
          fullName: toTitleCase(pendingName),
          gender: compact.toUpperCase() === "F" ? "FEMALE" : "MALE",
        });
        pendingName = "";
        continue;
      }

      if (/^[A-Z\u00c0-\u017f'\- ]{4,}$/.test(compact) && !/name|gender|birth|weight|discipline/i.test(compact)) {
        pendingName = compact;
      }
    }

    const dateTokens = (text.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) ?? []).map(toIsoDate).filter(Boolean);
    if (dateTokens.length > pairs.length && dateTokens[0] === eventDate) {
      // The first date token in these exports is often the championship date from the header.
      dateTokens.shift();
    }
    const weightTokens = (text.match(/\b\d{1,3}[\.,]\d{1,2}\b/g) ?? []).map((weight) => Number(weight.replace(",", ".")));

    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      const dateOfBirth = dateTokens[index];
      if (!dateOfBirth) {
        warnings.push(`Date de naissance absente pour ${pair.fullName}.`);
        continue;
      }

      const currentWeight = weightTokens[index] ?? null;
      if (weightTokens[index] == null) {
        warnings.push(`Poids manquant pour ${pair.fullName}.`);
      }

      athletes.push({
        fullName: pair.fullName,
        gender: pair.gender,
        dateOfBirth,
        currentWeight,
        selectedDisciplines: ["fighting", "duel"],
      });
    }
  }

  if (!athletes.length) {
    warnings.push("Aucun athlete n'a pu etre extrait du texte PDF.");
  }

  return {
    championshipName,
    championshipType,
    eventDate,
    location,
    athletes,
    warnings,
    usedOcr: false,
    extractedTextLength: text.length,
  };
}

async function runCommand(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", () => {
      resolve({ stdout: "", stderr: "", code: -1 });
    });
    child.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? -1 });
    });
  });
}

async function tryCliOcrFallback(buffer: Buffer) {
  const id = randomUUID();
  const pdfPath = join(tmpdir(), `pdf-import-${id}.pdf`);
  const imageBasePath = join(tmpdir(), `pdf-import-${id}`);
  const imagePath = `${imageBasePath}.png`;

  try {
    await fs.writeFile(pdfPath, buffer);

    const poppler = await runCommand("pdftoppm", ["-f", "1", "-singlefile", "-png", pdfPath, imageBasePath]);
    if (poppler.code !== 0) {
      return "";
    }

    const tesseract = await runCommand("tesseract", [imagePath, "stdout", "-l", "eng"]);
    if (tesseract.code !== 0) {
      return "";
    }

    return normalizeWhitespace(tesseract.stdout);
  } finally {
    await Promise.allSettled([
      fs.unlink(pdfPath),
      fs.unlink(imagePath),
    ]);
  }
}

async function extractTextWithFallback(buffer: Buffer) {
  const warnings: string[] = [];
  const id = randomUUID();
  const pdfPath = join(tmpdir(), `pdf-import-text-${id}.pdf`);

  await fs.writeFile(pdfPath, buffer);

  const pdftotext = await runCommand("pdftotext", [pdfPath, "-"]);
  await fs.unlink(pdfPath).catch(() => undefined);

  if (pdftotext.code !== 0) {
    throw new Error("Echec extraction texte PDF (pdftotext indisponible ou erreur d'analyse).");
  }

  let text = normalizeWhitespace(pdftotext.stdout);
  let usedOcr = false;

  if (isLikelyLowTextQuality(text)) {
    try {
      const cliOcrText = await tryCliOcrFallback(buffer);
      if (cliOcrText.length > text.length / 2) {
        text = normalizeWhitespace(`${text}\n${cliOcrText}`);
        usedOcr = true;
      }
    } catch (ocrError) {
      warnings.push(`OCR fallback indisponible: ${ocrError instanceof Error ? ocrError.message : "Erreur inconnue"}`);
    }
  }

  return { text, usedOcr, warnings };
}

export async function importParticipantsPdf(options: {
  buffer: Buffer;
  sourceName?: string;
  clearExisting?: boolean;
  createRegistrations?: boolean;
}) {
  const { buffer, sourceName, clearExisting = false, createRegistrations = true } = options;

  const extraction = await extractTextWithFallback(buffer);
  const parsed = parseParticipantsFromText(extraction.text);
  parsed.usedOcr = extraction.usedOcr;
  parsed.warnings.push(...extraction.warnings);

  if (!parsed.athletes.length) {
    return {
      ok: false,
      message: "Aucune donnee athlete exploitable dans le PDF.",
      details: parsed,
    } as const;
  }

  if (clearExisting) {
    await prisma.payment.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.medal.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.athlete.deleteMany();
    await prisma.championship.deleteMany();
  }

  const championship = await prisma.championship.create({
    data: {
      name: parsed.championshipName,
      league: "Casablanca-Settat",
      type: parsed.championshipType,
      status: "OPEN",
      eventDate: new Date(parsed.eventDate),
      location: parsed.location,
      enabledDisciplines: ["fighting", "duel"],
      pricing: {
        ...defaultPricing,
        ...defaultPairPricing,
      },
      notes: sourceName ? `Import PDF: ${sourceName}` : "Import PDF automatique",
    },
  });

  let createdAthletes = 0;
  let createdRegistrations = 0;

  for (const athleteInput of parsed.athletes) {
    const existingAthlete = await prisma.athlete.findFirst({
      where: {
        fullName: athleteInput.fullName,
        dateOfBirth: new Date(athleteInput.dateOfBirth),
      },
    });

    const athlete =
      existingAthlete ??
      (await prisma.athlete.create({
        data: {
          fullName: athleteInput.fullName,
          dateOfBirth: new Date(athleteInput.dateOfBirth),
          gender: athleteInput.gender,
          currentWeight: athleteInput.currentWeight,
          heightCm: null,
          clubName: "Budokan du Maroc",
          notes: athleteInput.notes ?? null,
        },
      }));

    if (!existingAthlete) {
      createdAthletes += 1;
    }

    if (!createRegistrations) continue;

    const ageGroup = getAgeGroup(new Date(athlete.dateOfBirth), new Date(championship.eventDate));
    if (ageGroup.key === "Not eligible") {
      parsed.warnings.push(`Athlete non eligible ignore pour inscription: ${athlete.fullName}`);
      continue;
    }

    const weightCategory = getWeightCategory(ageGroup.key, athlete.gender, athlete.currentWeight);
    const tuitionAmount = calculateTuition(
      athleteInput.selectedDisciplines,
      championship.pricing as Record<string, number | string>,
      ageGroup.key,
    );

    await prisma.registration.create({
      data: {
        athleteId: athlete.id,
        championshipId: championship.id,
        selectedDisciplines: athleteInput.selectedDisciplines,
        ageGroup: ageGroup.key,
        weightCategory,
        tuitionAmount,
        status: "PENDING",
        notes: sourceName ? `Genere depuis ${sourceName}` : "Genere depuis import PDF",
        payment: {
          create: {
            amountDue: tuitionAmount,
            amountPaid: 0,
            status: "UNPAID",
          },
        },
      },
    });

    createdRegistrations += 1;
  }

  const summary = {
    championshipId: championship.id,
    championshipName: championship.name,
    createdAthletes,
    createdRegistrations,
  };

  await recordAuditEvent({
    action: "IMPORT",
    entityType: "PDF",
    summary: `Import PDF termine: ${summary.createdAthletes} athletes, ${summary.createdRegistrations} inscriptions`,
    details: {
      sourceName: sourceName ?? "unknown",
      usedOcr: parsed.usedOcr,
      extractedTextLength: parsed.extractedTextLength,
      warnings: parsed.warnings,
      championshipName: summary.championshipName,
    },
    notification: {
      type: "SUCCESS",
      title: "Import PDF termine",
      message: `${summary.createdAthletes} athletes importes et ${summary.createdRegistrations} inscriptions creees.`,
    },
  });

  return {
    ok: true,
    ...summary,
    warnings: parsed.warnings,
    usedOcr: parsed.usedOcr,
  } as const;
}
