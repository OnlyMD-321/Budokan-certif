import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { aikidoLogo, jujitsuLogo } from "@/lib/logos";
import { recordAuditEvent } from "@/lib/audit";

export const maxDuration = 60;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const disciplineConfig = {
  Jujitsu: {
    borderMiddleColor: "#b89447",
    borderInnerColor: "#8b1c1c",
    verticalLeft: "伝統柔術",
    watermarkText: "柔術",
    subtitleColor: "#8b1c1c",
    titleColor: "#151515",
    achievementText:
      "après avoir suivi un entraînement rigoureux aux disciplines physiques et mentales du Budo, et ayant démontré avec succès sa maîtrise des techniques requises, est officiellement promu(e) au grade de",
    hankoText: "武道",
    title: "CERTIFICAT DE GRADE",
    subtitle: "JUJITSU",
  },
  "Aïkido": {
    borderMiddleColor: "#8b1c1c",
    borderInnerColor: "#b89447",
    verticalLeft: "居合刀法",
    watermarkText: "合気道",
    subtitleColor: "#b89447",
    titleColor: "#8b1c1c",
    achievementText:
      "après avoir suivi un entraînement rigoureux aux disciplines physiques et mentales de l'Aïkido et de l'art du sabre (Iai Toho), et ayant démontré avec succès sa maîtrise des techniques requises, est officiellement promu(e) au grade de",
    hankoText: "合気",
    title: "DIPLÔME D'AÏKIDO",
    subtitle: "AÏKIDO & IAI TOHO",
  },
} as const;

const getHtmlTemplate = (
  name: string,
  rank: string,
  date: string,
  location: string,
  discipline: string,
  baseUrl: string,
) => {
  const config = discipline === "Aïkido" ? disciplineConfig["Aïkido"] : disciplineConfig.Jujitsu;
  const logoPath = discipline === "Aïkido" ? aikidoLogo : jujitsuLogo;
  const logo = `${baseUrl}${logoPath}`;
  const safeName = escapeHtml(name);
  const safeRank = escapeHtml(rank);
  const safeLocation = escapeHtml(location);
  const safeDiscipline = escapeHtml(discipline);

  const formattedDate = date
    ? new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Budokan du Maroc - Diplôme</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: 297mm 210mm; margin: 0; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
  body {
    font-family: 'EB Garamond', 'Georgia', serif;
    background-color: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  .certificate-canvas {
    width: 297mm;
    height: 210mm;
    background-color: #ffffff;
    padding: 12mm;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
  }

  .border-outer { border: 7px solid #151515; height: 100%; padding: 6px; box-sizing: border-box; position: relative; }
  .border-middle { border: 2px solid ${config.borderMiddleColor}; height: 100%; padding: 4px; box-sizing: border-box; }
  .border-inner { border: 1px solid ${config.borderInnerColor}; height: 100%; position: relative; padding: 20px 50px; box-sizing: border-box; text-align: center; overflow: hidden; }

  .corner { position: absolute; width: 38px; height: 38px; border: 5px solid #151515; z-index: 10; }
  .corner-tl { top: -3px; left: -3px; border-right: none; border-bottom: none; }
  .corner-tr { top: -3px; right: -3px; border-left: none; border-bottom: none; }
  .corner-bl { bottom: -3px; left: -3px; border-right: none; border-top: none; }
  .corner-br { bottom: -3px; right: -3px; border-left: none; border-top: none; }

  .vertical-text {
    position: absolute;
    writing-mode: vertical-rl;
    text-orientation: upright;
    font-family: 'Noto Serif JP', 'Yu Mincho', 'MS Mincho', serif;
    font-size: 24px;
    letter-spacing: 12px;
    color: #333;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.7;
    white-space: nowrap;
    mix-blend-mode: multiply;
  }
  .vertical-left { left: 22px; }
  .vertical-right { right: 22px; }

  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 150px;
    color: #d1bfae;
    opacity: 0.30;
    z-index: 0;
    pointer-events: none;
    font-family: 'Noto Serif JP', 'Yu Mincho', 'MS Mincho', serif;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 20px;
    white-space: nowrap;
    mix-blend-mode: multiply;
  }

  .content-wrapper { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; justify-content: space-between; }
  .header-section { margin-bottom: 0; }

  .club-logo {
    width: 100px; height: 100px; margin: 0 auto 12px auto; display: block; object-fit: contain;
    background-color: #fff; border: 2px solid #b89447; border-radius: 50%; padding: 5px; box-shadow: 0 5px 15px rgba(0,0,0,0.12);
  }

  .club-name { font-size: 34px; font-weight: 700; letter-spacing: 6px; color: #151515; text-transform: uppercase; }
  .club-subtitle { font-size: 16px; font-weight: 600; letter-spacing: 4px; color: ${config.subtitleColor}; margin-top: 5px; text-transform: uppercase; }

  .title { font-size: 42px; font-weight: 600; letter-spacing: 12px; margin: 5px 0 10px 0; color: ${config.titleColor}; }
  .certifies { font-style: italic; font-size: 19px; color: #444; margin-bottom: 10px; }

  .student-name-line {
    display: inline-block; width: 480px; height: 40px; margin: 5px 0;
    border-bottom: 2px dashed #b89447; font-size: 36px; font-weight: bold; color: #000; line-height: 40px;
  }

  .achievement-text { font-size: 18px; line-height: 1.6; max-width: 85%; margin: 15px auto; color: #222; }

  .rank-display-line {
    display: inline-block; width: 320px; height: 25px; margin-bottom: 10px;
    border-bottom: 2px solid ${config.subtitleColor}; font-size: 20px; font-weight: bold; color: ${config.subtitleColor}; text-transform: uppercase;
  }

  .footer-section { display: flex; justify-content: space-between; align-items: flex-end; padding: 0 40px 10px 40px; margin-top: auto; }
  .info-block { text-align: left; font-size: 18px; }
  .info-line { margin-bottom: 10px; color: #151515; }
  .info-line span { display: inline-block; border-bottom: 1px solid #151515; width: 200px; color: #000; font-weight: bold; text-align: center; }

  .signature-block { text-align: center; position: relative; }
  .hanko-seal {
    position: absolute; top: -55px; right: 20px; width: 60px; height: 60px;
    border: 5px solid #b31b1b; color: #b31b1b; border-radius: 10px; display: flex;
    align-items: center; justify-content: center; font-size: 30px; opacity: 0.9;
    z-index: -1; transform: rotate(-5deg); font-family: 'Noto Serif JP', 'Yu Mincho', 'MS Mincho', serif;
    box-shadow: inset 0 0 4px rgba(179, 27, 27, 0.4); mix-blend-mode: multiply;
  }

  .signature-line { border-bottom: 1px solid #151515; width: 280px; height: 35px; margin-bottom: 5px; }
  .sensei-name { font-size: 22px; font-weight: bold; letter-spacing: 1px; margin: 0; color: #151515; }
  .sensei-title { font-size: 16px; color: #666; font-style: italic; margin: 2px 0 0 0; }
</style>
</head>
<body>
  <div class="certificate-canvas">
    <div class="border-outer">
      <div class="corner corner-tl"></div>
      <div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div>
      <div class="corner corner-br"></div>
      <div class="border-middle">
        <div class="border-inner">
          <div class="vertical-text vertical-left">${config.verticalLeft}</div>
          <div class="vertical-text vertical-right">モロッコ武道館</div>
          <div class="watermark">${config.watermarkText}</div>
          <div class="content-wrapper">
            <div class="header-section">
              <img src="${logo}" alt="Logo" class="club-logo">
              <div class="club-name">Budokan du Maroc</div>
              <div class="club-subtitle">${config.subtitle}</div>
            </div>
            <div>
              <div class="title">${config.title}</div>
              <div class="certifies">Nous certifions par la présente que</div>
              <div class="student-name-line">${safeName}</div>
              <div class="achievement-text">${config.achievementText}</div>
              <div class="rank-display-line">${safeRank}</div>
            </div>
            <div class="footer-section">
              <div class="info-block">
                <div class="info-line">Date : <span>${formattedDate}</span></div>
                <div class="info-line">Lieu : <span>${safeLocation}</span></div>
                <div class="info-line">Discipline : <span>${safeDiscipline}</span></div>
              </div>
              <div class="signature-block">
                <div class="hanko-seal">${config.hankoText}</div>
                <div class="signature-line"></div>
                <p class="sensei-name">Bahdou Abderrahmane</p>
                <p class="sensei-title">Shihan / DTN</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export async function POST(req: Request) {
  try {
    const {
      studentName,
      rank,
      date,
      location,
      discipline = "Jujitsu",
      athleteId = null,
      championshipId = null,
      isBlankTemplate = false,
    } = await req.json();
    const disciplineEnum = discipline === "Aïkido" ? "AIKIDO" : "JUJITSU";
    const templateMode = Boolean(isBlankTemplate);
    const resolvedRank = String(rank ?? "").trim();
    const resolvedDate = String(date ?? "").trim();
    const resolvedLocation = String(location ?? "").trim() || "Casablanca";

    if (!templateMode && (!resolvedRank || !resolvedDate || !resolvedLocation)) {
      return NextResponse.json({ error: "Tous les champs sont obligatoires." }, { status: 400 });
    }

    let resolvedStudentName = String(studentName ?? "").trim();

    if (!resolvedStudentName && athleteId) {
      const athlete = await prisma.athlete.findUnique({ where: { id: String(athleteId) } });
      resolvedStudentName = athlete?.fullName ?? "";
    }

    if (!templateMode && !resolvedStudentName) {
      return NextResponse.json({ error: "Le nom de l'athlète est obligatoire." }, { status: 400 });
    }

    if (!templateMode) {
      try {
        const certificate = await prisma.certificate.create({
          data: {
            studentName: resolvedStudentName,
            rank: resolvedRank,
            date: new Date(resolvedDate),
            location: resolvedLocation,
            discipline: disciplineEnum,
            athleteId: athleteId ? String(athleteId) : null,
            championshipId: championshipId ? String(championshipId) : null,
          },
        });

        await recordAuditEvent({
          action: "CREATE",
          entityType: "Certificate",
          entityId: certificate.id,
          summary: `Certificat généré pour ${resolvedStudentName}`,
          details: { discipline, rank: resolvedRank, location: resolvedLocation },
          notification: {
            type: "SUCCESS",
            title: "Certificat généré",
            message: `${resolvedStudentName} · ${discipline} · ${resolvedRank}`,
          },
        });
      } catch (dbError) {
        console.warn("Prisma save failed, continuing generation...", dbError);
      }
    }

    const executablePath =
      process.env.NODE_ENV === "production"
        ? await chromium.executablePath(path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin"))
        : process.env.CHROME_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    const VIEWPORT_WIDTH = 1123;
    const VIEWPORT_HEIGHT = 794;
    const SCALE_FACTOR = 3;

    let browser;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: SCALE_FACTOR },
        executablePath: executablePath,
        headless: true,
      });
    } catch {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: SCALE_FACTOR },
        executablePath: process.env.CHROME_EXECUTABLE_PATH,
        headless: true,
      });
    }

    const { origin } = new URL(req.url);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;
    const nameForTemplate = templateMode ? "" : resolvedStudentName;

    const page = await browser.newPage();
    await page.setContent(getHtmlTemplate(nameForTemplate, resolvedRank, resolvedDate, resolvedLocation, discipline, baseUrl), { waitUntil: "networkidle0" });

    const screenshotBuffer = await page.screenshot({ type: "png", fullPage: true });
    await browser.close();

    const PDF_WIDTH = 841.89;
    const PDF_HEIGHT = 595.28;

    const pdfDoc = await PDFDocument.create();
    const pageObj = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
    const image = await pdfDoc.embedPng(screenshotBuffer);

    pageObj.drawImage(image, { x: 0, y: 0, width: PDF_WIDTH, height: PDF_HEIGHT });
    const pdfBytes = await pdfDoc.save();
    const safeName = (templateMode ? "modele_vide" : resolvedStudentName || "sans_nom").replace(/\s+/g, "_");

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Certificat_${discipline}_${safeName}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("PDF Generation Error:", error);
    const details = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Impossible de générer le PDF.", details }, { status: 500 });
  }
}
