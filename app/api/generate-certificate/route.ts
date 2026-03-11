import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60; // Max execution time for Vercel

// A4 at 300 DPI
const A4_WIDTH = 3508;
const A4_HEIGHT = 2480;

const getHtmlTemplate = (name: string, rank: string, date: string, location: string, discipline: string) => {
  const isJujitsu = discipline === 'Jujitsu';
  const secondaryColor = isJujitsu ? '#3b82f6' : '#ef4444';
  const gradient = isJujitsu 
    ? 'radial-gradient(circle at 50% 50%, #1e293b, #0f172a)' 
    : 'radial-gradient(circle at 50% 50%, #7f1d1d, #450a0a)';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        
        body, html {
          margin: 0;
          padding: 0;
          width: ${A4_WIDTH}px;
          height: ${A4_HEIGHT}px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: ${gradient};
          font-family: 'Playfair Display', serif;
          color: #ffffff;
          overflow: hidden;
          position: relative;
        }

        /* SVG Noise Texture for Paper feel */
        .noise {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.15;
          pointer-events: none;
          mix-blend-mode: overlay;
          z-index: 1;
        }

        .border-container {
          position: relative;
          width: 90%;
          height: 88%;
          border: 15px solid #d4af37;
          box-sizing: border-box;
          padding: 80px;
          z-index: 2;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(5px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          text-align: center;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 500px;
          font-weight: 700;
          opacity: 0.04;
          color: #ffffff;
          mix-blend-mode: soft-light;
          z-index: -1;
          user-select: none;
        }

        .header h1 {
          font-family: 'Cinzel', serif;
          font-size: 140px;
          color: #d4af37;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 15px;
          text-shadow: 4px 4px 10px rgba(0, 0, 0, 0.5);
        }

        .header h2 {
          font-family: 'Cinzel', serif;
          font-size: 60px;
          color: ${secondaryColor};
          margin-top: 20px;
          letter-spacing: 5px;
        }

        .content { margin-top: 100px; }
        .content p { font-size: 60px; margin: 20px 0; font-style: italic; }

        .name {
          font-family: 'Cinzel', serif;
          font-size: 120px;
          font-weight: 700;
          color: #ffffff;
          margin: 40px 0;
          text-transform: uppercase;
          border-bottom: 4px solid #d4af37;
          display: inline-block;
          padding-bottom: 20px;
        }

        .rank {
          font-size: 70px;
          color: #d4af37;
          font-weight: bold;
          margin: 40px 0;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-top: auto;
          padding-top: 100px;
        }

        .signature-box { text-align: center; width: 600px; }
        .signature-line { border-bottom: 3px solid #ffffff; margin-bottom: 20px; height: 80px; }
        .signature-text { font-size: 40px; font-family: 'Cinzel', serif; color: #aaaaaa; }

        .corner { position: absolute; width: 150px; height: 150px; border: 10px solid #d4af37; }
        .corner-tl { top: -10px; left: -10px; border-right: none; border-bottom: none; }
        .corner-tr { top: -10px; right: -10px; border-left: none; border-bottom: none; }
        .corner-bl { bottom: -10px; left: -10px; border-right: none; border-top: none; }
        .corner-br { bottom: -10px; right: -10px; border-left: none; border-top: none; }
      </style>
    </head>
    <body>
      <svg class="noise">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
      </svg>
      
      <div class="border-container">
        <div class="corner corner-tl"></div>
        <div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div>
        <div class="corner corner-br"></div>
        
        <div class="watermark">${discipline.toUpperCase()}</div>

        <div class="header">
          <h1>Certificate of Achievement</h1>
          <h2>Budokan ${discipline} Academy</h2>
        </div>

        <div class="content">
          <p>This is to certify that</p>
          <div class="name">${name}</div>
          <p>has achieved the rank of</p>
          <div class="rank">${rank}</div>
        </div>

        <div class="footer">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-text">Date: ${new Date(date).toLocaleDateString()}</div>
            <div class="signature-text">${location}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-text">Master Instructor</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentName, rank, date, location, discipline } = body;

    if (!studentName || !rank || !date || !location || !discipline) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Attempt to save to database (wrapped in try/catch to not fail if DB isn't setup yet during dev testing)
    try {
      await prisma.certificate.create({
        data: {
          studentName,
          rank,
          date: new Date(date),
          location,
          discipline,
        },
      });
    } catch (dbError) {
      console.warn("Could not save to Prisma database, continuing with generation...", dbError);
    }

    // Determine executable path for local vs Vercel
    const executablePath = process.env.NODE_ENV === 'production' 
      ? await chromium.executablePath()
      : undefined; // Defaults to local puppeteer on dev (if installed, wait, we use puppeteer-core, need local path or fallback to sparticuz local)

    // Actually, on local development using puppeteer-core without an explicit executable path will fail.
    // We should either prompt the user to install full puppeteer for local dev, or use sparticuz locally if possible.
    // Sparticuz recommends using their 'chromium' package executable directly in AWS/Vercel, but for local, you typically provide your local Chrome path.
    // For simplicity, let's use chromium.executablePath() which sparticuz tries to download in some cases, or falls back.
    // Wait, `chromium.executablePath()` provides a path to the chromium binary downloaded by sparticuz for lambda.
    
    let browser;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: A4_WIDTH, height: A4_HEIGHT, deviceScaleFactor: 1 },
        executablePath: executablePath || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Fallback for local Windows testing if needed
        headless: true,
      });
    } catch (launchError) {
      // Secondary fallback if the above fails
       browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: A4_WIDTH, height: A4_HEIGHT, deviceScaleFactor: 1 },
        executablePath: process.env.CHROME_EXECUTABLE_PATH,
        headless: true,
      });
    }

    const page = await browser.newPage();
    const html = getHtmlTemplate(studentName, rank, date, location, discipline);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Capture rasterized screenshot to flatten complex CSS
    const screenshotBuffer = await page.screenshot({ 
      type: 'png', 
      fullPage: true 
    });
    await browser.close();

    // Embed the PNG into an A4 PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const pageObj = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const image = await pdfDoc.embedPng(screenshotBuffer);
    
    pageObj.drawImage(image, {
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: A4_HEIGHT,
    });

    const pdfBytes = await pdfDoc.save();

    // Return as downloadable PDF
    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Certificate_${studentName.replace(/\\s+/g, '_')}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message }, { status: 500 });
  }
}
