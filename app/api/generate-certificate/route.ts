import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { aikidoLogo, jujitsuLogo } from '@/lib/logos';

export const maxDuration = 60; // Max execution time for Vercel

const getHtmlTemplate = (name: string, rank: string, date: string, location: string, discipline: string, baseUrl: string) => {
  const isJujitsu = discipline === 'Jujitsu';
  
  const logoPath = isJujitsu ? jujitsuLogo : aikidoLogo;
  const logo = `${baseUrl}${logoPath}`;
  const borderMiddleColor = isJujitsu ? '#b89447' : '#8b1c1c';
  const borderInnerColor = isJujitsu ? '#8b1c1c' : '#b89447';
  const verticalLeft = isJujitsu ? '伝統柔術' : '居合刀法';
  const watermarkText = isJujitsu ? '柔術' : '合気道';
  const subtitleColor = isJujitsu ? '#8b1c1c' : '#b89447';
  const titleColor = isJujitsu ? '#151515' : '#8b1c1c';
  const achievementText = isJujitsu 
    ? 'après avoir suivi un entraînement rigoureux aux disciplines physiques et mentales du Budo, et ayant démontré avec succès sa maîtrise des techniques requises, est officiellement promu(e) au grade de'
    : "après avoir suivi un entraînement rigoureux aux disciplines physiques et mentales de l'Aïkido et de l'art du sabre (Iai Toho), et ayant démontré avec succès sa maîtrise des techniques requises, est officiellement promu(e) au grade de";
  const hankoText = isJujitsu ? '武道' : '合気';

  const formattedDate = date ? new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Budokan du Maroc - Diplôme</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
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
  .border-middle { border: 2px solid ${borderMiddleColor}; height: 100%; padding: 4px; box-sizing: border-box; }
  .border-inner { border: 1px solid ${borderInnerColor}; height: 100%; position: relative; padding: 20px 50px; box-sizing: border-box; text-align: center; overflow: hidden; }

  .corner { position: absolute; width: 38px; height: 38px; border: 5px solid #151515; z-index: 10; }
  .corner-tl { top: -3px; left: -3px; border-right: none; border-bottom: none; }
  .corner-tr { top: -3px; right: -3px; border-left: none; border-bottom: none; }
  .corner-bl { bottom: -3px; left: -3px; border-right: none; border-top: none; }
  .corner-br { bottom: -3px; right: -3px; border-left: none; border-top: none; }

  .vertical-text {
    position: absolute; writing-mode: vertical-rl; text-orientation: upright;
    font-family: 'Yu Mincho', 'MS Mincho', serif; font-size: 24px; letter-spacing: 12px;
    color: #333; top: 50%; transform: translateY(-50%); opacity: 0.7; white-space: nowrap; mix-blend-mode: multiply; 
  }
  .vertical-left { left: 22px; }
  .vertical-right { right: 22px; }

  .watermark {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    font-size: 150px; color: #d1bfae; opacity: 0.30; z-index: 0; pointer-events: none;
    font-family: 'Yu Mincho', 'MS Mincho', serif; writing-mode: vertical-rl; text-orientation: upright;
    letter-spacing: 20px; white-space: nowrap; mix-blend-mode: multiply;
  }

  .content-wrapper { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; justify-content: space-between; }
  .header-section { margin-bottom: 0; }

  .club-logo {
    width: 100px; height: 100px; margin: 0 auto 12px auto; display: block; object-fit: contain;
    background-color: #fff; border: 2px solid #b89447; border-radius: 50%; padding: 5px; box-shadow: 0 5px 15px rgba(0,0,0,0.12); 
  }

  .club-name { font-size: 34px; font-weight: 700; letter-spacing: 6px; color: #151515; text-transform: uppercase; }
  .club-subtitle { font-size: 16px; font-weight: 600; letter-spacing: 4px; color: ${subtitleColor}; margin-top: 5px; text-transform: uppercase; }

  .title { font-size: 42px; font-weight: 600; letter-spacing: 12px; margin: 5px 0 10px 0; color: ${titleColor}; }
  .certifies { font-style: italic; font-size: 19px; color: #444; margin-bottom: 10px; }

  .student-name-line {
    display: inline-block; width: 480px; height: 40px; margin: 5px 0;
    border-bottom: 2px dashed #b89447; font-size: 36px; font-weight: bold; color: #000; line-height: 40px; 
  }

  .achievement-text { font-size: 18px; line-height: 1.6; max-width: 85%; margin: 15px auto; color: #222; }

  .rank-display-line {
    display: inline-block; width: 320px; height: 25px; margin-bottom: 10px;
    border-bottom: 2px solid #8b1c1c; font-size: 20px; font-weight: bold; color: #8b1c1c; text-transform: uppercase;
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
    z-index: -1; transform: rotate(-5deg); font-family: 'Yu Mincho', 'MS Mincho', serif;
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
          <div class="vertical-text vertical-left">${verticalLeft}</div> 
          <div class="vertical-text vertical-right">モロッコ武道館</div> 
          <div class="watermark">${watermarkText}</div>
          <div class="content-wrapper">
            <div class="header-section">
              <img src="${logo}" alt="Logo" class="club-logo">
              <div class="club-name">Budokan du Maroc</div>
              <div class="club-subtitle">DEPUIS 1983</div>
            </div>
            <div>
              <div class="title">CERTIFICAT DE GRADE</div>
              <div class="certifies">Nous certifions par la présente que</div>
              <div class="student-name-line">${name}</div>
              <div class="achievement-text">${achievementText}</div>
              <div class="rank-display-line">${rank}</div>
            </div>
            <div class="footer-section">
              <div class="info-block">
                <div class="info-line">Date : <span>${formattedDate}</span></div>
                <div class="info-line">Lieu : <span>${location}</span></div>
              </div>
              <div class="signature-block">
                <div class="hanko-seal">${hankoText}</div> 
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
    const { studentName, rank, date, location, discipline } = await req.json();

    if (!studentName || !rank || !date || !location || !discipline) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
      await prisma.certificate.create({
        data: { studentName, rank, date: new Date(date), location, discipline },
      });
    } catch (dbError) {
      console.warn("Prisma save failed, continuing generation...", dbError);
    }

    const executablePath = process.env.NODE_ENV === 'production' ? await chromium.executablePath() : undefined;
    
    // Puppeteer Viewport matching A4 proportions at 96 DPI
    // 297mm = 1122.5px, 210mm = 793.7px
    const VIEWPORT_WIDTH = 1123;
    const VIEWPORT_HEIGHT = 794;
    const SCALE_FACTOR = 3; // Captures high resolution (3369 x 2382)

    let browser;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: SCALE_FACTOR },
        executablePath: executablePath || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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

    const page = await browser.newPage();
    await page.setContent(getHtmlTemplate(studentName, rank, date, location, discipline, baseUrl), { waitUntil: 'networkidle0' });

    // Rasterizing the complex CSS onto a PNG format
    const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: true });
    await browser.close();

    // Flatten it into PDF using pdf-lib
    // A4 dimensions in PDF points (72 DPI)
    const PDF_WIDTH = 841.89;
    const PDF_HEIGHT = 595.28;

    const pdfDoc = await PDFDocument.create();
    const pageObj = pdfDoc.addPage([PDF_WIDTH, PDF_HEIGHT]);
    const image = await pdfDoc.embedPng(screenshotBuffer);
    
    pageObj.drawImage(image, { x: 0, y: 0, width: PDF_WIDTH, height: PDF_HEIGHT });
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Certificate_${studentName.replace(/\s+/g, '_')}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message }, { status: 500 });
  }
}
