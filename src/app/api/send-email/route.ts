import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import * as fontkit from 'fontkit';

// Force Node.js runtime so pdf-lib (which uses Buffer/Uint8Array) works correctly
export const runtime = 'nodejs';


async function generatePdfReceiptBuffer(type: string, data: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 420]); // A5 Landscape Size (in points: 595 x 420)

  // Use Times-Roman (Serif) fonts to match the browser fonts exactly
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Load Geist-Regular font for rendering the Unicode Indian Rupee symbol
  let rupeeFont: any = null;
  try {
    const fontPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'Geist-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      const fontBytes = fs.readFileSync(fontPath);
      rupeeFont = await pdfDoc.embedFont(fontBytes);
    }
  } catch (err) {
    console.error("Error embedding Geist font for Rupee symbol:", err);
  }

  const studentName = data.studentName || 'Student';
  const receiptNo = data.receiptNo || 'N/A';
  // Match browser format: "dd / mm / yyyy" with spaces around slashes
  const date = data.date
    ? data.date.replace(/\//g, ' / ')
    : new Date().toLocaleDateString('en-GB').replace(/\//g, ' / ');
  const courseName = (data.courseName || '').replace(/_/g, ' ').toUpperCase();
  const paymentMode = data.paymentMode || 'N/A';
  const receivedBy = data.receivedBy || 'Authorized Officer';
  const branch = (data.branch || 'Mankhurd').toUpperCase();

  const darkGreen = rgb(0.004, 0.196, 0.125); // #013220 (Extreme Dark Green)
  const grayColor = rgb(0.4, 0.4, 0.4);
  const blackColor = rgb(0, 0, 0);

  // Determine Purpose To Pay checkboxes
  const isAdmission = type === 'admission';
  const isCourse = type === 'installment';
  const isExam = type === 'exam';

  // Determine Payment Mode checkboxes
  const modeLower = paymentMode.toLowerCase();
  const isCash = modeLower === 'cash';
  const isOnline = modeLower === 'online' || modeLower === 'upi' || modeLower === 'bank' || modeLower === 'gpay' || modeLower === 'phonepe';
  const isCheque = modeLower === 'cheque';

  // Financial values
  let totalFees = 0;
  let amountPaid = 0;
  let balanceDue = 0;

  if (type === 'admission') {
    amountPaid = data.amountPaid || 0;
    totalFees = data.totalFees || amountPaid;
    balanceDue = 0;
  } else if (type === 'installment') {
    amountPaid = data.amountPaid || 0;
    totalFees = data.totalFees || 0;
    balanceDue = data.balanceDue || 0;
  } else if (type === 'exam') {
    amountPaid = data.amountPaid || data.totalAmount || 0;
    totalFees = amountPaid;
    balanceDue = 0;
  }

  let badgeLabel = 'FEE RECEIPT';
  if (type === 'admission') badgeLabel = 'ADMISSION RECEIPT';
  else if (type === 'exam') badgeLabel = 'EXAM FEE RECEIPT';

  // Draw Watermark and Logo PNG (Dual top logos and transparent watermark)
  try {
    const logoPath = path.join(process.cwd(), 'public', 'TrustCareLogo.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);

      // Draw watermark in center (opacity 0.05)
      page.drawImage(logoImage, {
        x: 187.5,
        y: 110,
        width: 220,
        height: 200,
        opacity: 0.05,
      });

      // Draw top-left logo (width 82, height 75)
      page.drawImage(logoImage, {
        x: 45,
        y: 300,
        width: 82,
        height: 75,
      });

      // Draw top-right logo (width 82, height 75)
      page.drawImage(logoImage, {
        x: 468,
        y: 300,
        width: 82,
        height: 75,
      });
    }
  } catch (err) {
    console.error("Error embedding logo in PDF:", err);
  }

  // Draw rounded main border around the page matching browser print graphic exactly (using cubic curves)
  page.drawSvgPath(
    'M 40 20 L 555 20 C 566.04 20 575 28.96 575 40 L 575 380 C 575 391.04 566.04 400 555 400 L 40 400 C 28.96 400 20 391.04 20 380 L 20 40 C 20 28.96 28.96 20 40 20 Z',
    {
      x: 0,
      y: 420,
      borderWidth: 3,
      borderColor: blackColor,
    }
  );

  // 1. Organization Text Header (Center)
  const titleText = "TRUSTCARE";
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 26);
  page.drawText(titleText, {
    x: (595 - titleWidth) / 2,
    y: 350,
    size: 26,
    font: boldFont,
    color: darkGreen,
  });

  const subTitleText = "INSTITUTE OF HEALTH SCIENCE";
  const subTitleWidth = boldFont.widthOfTextAtSize(subTitleText, 12);
  page.drawText(subTitleText, {
    x: (595 - subTitleWidth) / 2,
    y: 334,
    size: 12,
    font: boldFont,
    color: darkGreen,
  });

  // 2. Receipt Badge (Pill Shape Box)
  const badgeTextWidth = boldFont.widthOfTextAtSize(badgeLabel, 9);
  const badgeBoxWidth = badgeTextWidth + 24;
  const badgeCenterX = 297.5;
  const badgeLeftCircleX = badgeCenterX - (badgeBoxWidth / 2) + 8;
  const badgeRightCircleX = badgeCenterX + (badgeBoxWidth / 2) - 8;

  // Draw filled pill shape background using circles + rect
  page.drawCircle({ x: badgeLeftCircleX, y: 316, size: 8, color: blackColor });
  page.drawCircle({ x: badgeRightCircleX, y: 316, size: 8, color: blackColor });
  page.drawRectangle({
    x: badgeLeftCircleX,
    y: 308,
    width: badgeRightCircleX - badgeLeftCircleX,
    height: 16,
    color: blackColor,
  });

  // Badge text in white
  page.drawText(badgeLabel, {
    x: badgeCenterX - (badgeTextWidth / 2),
    y: 312,
    size: 9,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // 3. Student Copy Label
  const copyLabel = "STUDENT COPY";
  const copyWidth = boldFont.widthOfTextAtSize(copyLabel, 8);
  page.drawText(copyLabel, {
    x: (595 - copyWidth) / 2,
    y: 298,
    size: 8,
    font: boldFont,
    color: grayColor,
  });

  // Checkbox drawer
  const drawCheckbox = (x: number, y: number, checked: boolean) => {
    page.drawRectangle({
      x: x,
      y: y - 1,
      width: 12,
      height: 12,
      borderWidth: 1.5,
      borderColor: blackColor,
      color: rgb(1, 1, 1),
    });
    if (checked) {
      page.drawLine({ start: { x: x + 2.5, y: y + 4.5 }, end: { x: x + 5.5, y: y + 1.5 }, thickness: 2.2, color: blackColor });
      page.drawLine({ start: { x: x + 5.5, y: y + 1.5 }, end: { x: x + 9.5, y: y + 9.5 }, thickness: 2.2, color: blackColor });
    }
  };

  // Indian Rupee Symbol Drawer (using custom embedded Geist font or SVG path fallback)
  const drawRupee = (x: number, y: number) => {
    if (rupeeFont) {
      page.drawText('₹', {
        x: x,
        y: y,
        size: 10,
        font: rupeeFont,
        color: blackColor,
      });
    } else {
      page.drawSvgPath(
        'M 1 1 L 7 1 M 1 4 L 6 4 M 2.5 1 C 5.5 1 5.5 4 2.5 4 L 2.5 1 M 2.5 4 L 6 9',
        {
          x: x,
          y: y + 9,
          borderWidth: 1.2,
          borderColor: blackColor,
        }
      );
    }
  };

  // 4. Receipt No & Date
  page.drawText("Receipt No.", { x: 45, y: 265, size: 10, font: boldFont });
  page.drawText(receiptNo, { x: 115, y: 265, size: 10, font: font });
  page.drawLine({ start: { x: 110, y: 262 }, end: { x: 290, y: 262 }, thickness: 1, color: blackColor });

  page.drawText("Date :", { x: 305, y: 265, size: 10, font: boldFont });
  page.drawText(date, { x: 345, y: 265, size: 10, font: font });
  page.drawLine({ start: { x: 340, y: 262 }, end: { x: 550, y: 262 }, thickness: 1, color: blackColor });

  // 5. Student Name
  page.drawText("Student Name :", { x: 45, y: 237, size: 10, font: boldFont });
  page.drawText(studentName, { x: 130, y: 237, size: 10, font: font });
  page.drawLine({ start: { x: 125, y: 234 }, end: { x: 550, y: 234 }, thickness: 1, color: blackColor });

  // 6. Course Name
  page.drawText("Course Name :", { x: 45, y: 209, size: 10, font: boldFont });
  page.drawText(courseName, { x: 130, y: 209, size: 10, font: font });
  page.drawLine({ start: { x: 125, y: 206 }, end: { x: 550, y: 206 }, thickness: 1, color: blackColor });

  // 7. Purpose To Pay Checkboxes
  page.drawText("Purpose To Pay :", { x: 45, y: 181, size: 10, font: boldFont });

  page.drawText("Admission Fee's", { x: 145, y: 181, size: 10, font: font });
  drawCheckbox(220, 181, isAdmission);

  page.drawText("Course Fee's", { x: 245, y: 181, size: 10, font: font });
  drawCheckbox(305, 181, isCourse);

  page.drawText("Exam Fee's", { x: 330, y: 181, size: 10, font: font });
  drawCheckbox(385, 181, isExam);

  // 8. Financials: Total Amount, Paid Amt, Balance Amt
  page.drawText("Total Amount :", { x: 45, y: 153, size: 10, font: boldFont });
  drawRupee(120, 153);
  page.drawText(totalFees.toLocaleString('en-IN'), { x: 128, y: 153, size: 10, font: font });
  page.drawLine({ start: { x: 115, y: 150 }, end: { x: 210, y: 150 }, thickness: 1, color: blackColor });

  page.drawText("Paid Amt. :", { x: 225, y: 153, size: 10, font: boldFont });
  drawRupee(285, 153);
  page.drawText(amountPaid.toLocaleString('en-IN'), { x: 293, y: 153, size: 10, font: font });
  page.drawLine({ start: { x: 280, y: 150 }, end: { x: 375, y: 150 }, thickness: 1, color: blackColor });

  page.drawText("Balance Amt :", { x: 390, y: 153, size: 10, font: boldFont });
  drawRupee(460, 153);
  page.drawText(balanceDue.toLocaleString('en-IN'), { x: 468, y: 153, size: 10, font: font });
  page.drawLine({ start: { x: 455, y: 150 }, end: { x: 550, y: 150 }, thickness: 1, color: blackColor });

  // 9. Received By
  page.drawText("Received By :", { x: 45, y: 125, size: 10, font: boldFont });
  page.drawText(receivedBy, { x: 120, y: 125, size: 10, font: font });
  page.drawLine({ start: { x: 115, y: 122 }, end: { x: 300, y: 122 }, thickness: 1, color: blackColor });

  // 10. Mode of Payment Checkboxes (Pill shape box for label + checkboxes next to it)
  // Draw filled pill shape for "MODE OF PAYMENT:"
  page.drawCircle({ x: 52, y: 99, size: 7, color: blackColor });
  page.drawCircle({ x: 148, y: 99, size: 7, color: blackColor });
  page.drawRectangle({
    x: 52,
    y: 92,
    width: 96,
    height: 14,
    color: blackColor,
  });
  page.drawText("MODE OF PAYMENT:", {
    x: 52,
    y: 96,
    size: 7.5,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // Checkboxes
  page.drawText("Cash", { x: 170, y: 95, size: 10, font: font });
  drawCheckbox(200, 95, isCash);

  page.drawText("Online", { x: 225, y: 95, size: 10, font: font });
  drawCheckbox(260, 95, isOnline);

  page.drawText("Cheque", { x: 285, y: 95, size: 10, font: font });
  drawCheckbox(325, 95, isCheque);

  // 11. Terms & Conditions Notes (Left bottom, exact text matching)
  page.drawText("• Course Fees, Once Paid Cannot Be Refunded.", { x: 45, y: 56, size: 8, font: font, color: blackColor });
  page.drawText("• After Admission Is Completed Cancellation. Is Not Allowed.", { x: 45, y: 44, size: 8, font: font, color: blackColor });
  // 12. Signature Area (Right bottom, exact matching)
  page.drawText("Authority Sign./Stamp", { x: 395, y: 44, size: 9, font: boldFont, color: blackColor });

  try {
    const signaturePath = path.join(process.cwd(), 'public', 'signature.png');
    if (fs.existsSync(signaturePath)) {
      const sigBytes = fs.readFileSync(signaturePath);
      let sigImage;
      try {
        sigImage = await pdfDoc.embedPng(sigBytes);
      } catch {
        sigImage = await pdfDoc.embedJpg(sigBytes);
      }
      page.drawImage(sigImage, {
        x: 400,
        y: 55,
        width: 80,
        height: 40,
      });
    }

    const stampPath = path.join(process.cwd(), 'public', 'stamp.png');
    if (fs.existsSync(stampPath)) {
      const stampBytes = fs.readFileSync(stampPath);
      let stampImage;
      try {
        stampImage = await pdfDoc.embedPng(stampBytes);
      } catch {
        stampImage = await pdfDoc.embedJpg(stampBytes);
      }
      page.drawImage(stampImage, {
        x: 490,
        y: 20,
        width: 60,
        height: 60,
      });
    }
  } catch (err) {
    console.error("Error embedding signature or stamp in PDF:", err);
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getMixedTextWidth(text: string, fontSize: number, devanagariFont: any, boldFont: any): number {
  const regex = /([\u0900-\u097F]+)/g;
  const parts = text.split(regex);
  let totalWidth = 0;
  for (const part of parts) {
    if (!part) continue;
    const isDevanagari = /[\u0900-\u097F]/.test(part);
    const selectedFont = isDevanagari ? (devanagariFont || boldFont) : boldFont;
    try {
      totalWidth += selectedFont.widthOfTextAtSize(part.replace(/—/g, '-'), fontSize);
    } catch {
      totalWidth += part.length * (fontSize * 0.5);
    }
  }
  return totalWidth;
}

function wrapMixedText(text: string, maxWidth: number, fontSize: number, devanagariFont: any, boldFont: any): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = getMixedTextWidth(testLine, fontSize, devanagariFont, boldFont);
    if (width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function drawSuperscriptText(
  page: any,
  text: string,
  x: number,
  y: number,
  size: number,
  font: any,
  color: any
) {
  const match = text.match(/^(\d+)(st|nd|rd|th)(.*)$/);
  if (match) {
    const num = match[1];
    const suf = match[2];
    const rest = match[3];

    page.drawText(num, { x, y, size, font, color });
    const numWidth = font.widthOfTextAtSize(num, size);

    const sufSize = size * 0.65;
    const sufY = y + (size * 0.35);
    page.drawText(suf, { x: x + numWidth, y: sufY, size: sufSize, font, color });
    const sufWidth = font.widthOfTextAtSize(suf, sufSize);

    if (rest) {
      page.drawText(rest, { x: x + numWidth + sufWidth, y, size, font, color });
    }
  } else {
    page.drawText(text, { x, y, size, font, color });
  }
}

function getSuperscriptTextWidth(text: string, size: number, font: any): number {
  const match = text.match(/^(\d+)(st|nd|rd|th)(.*)$/);
  if (match) {
    const num = match[1];
    const suf = match[2];
    const rest = match[3];
    const numWidth = font.widthOfTextAtSize(num, size);
    const sufWidth = font.widthOfTextAtSize(suf, size * 0.65);
    const restWidth = font.widthOfTextAtSize(rest, size);
    return numWidth + sufWidth + restWidth;
  }
  return font.widthOfTextAtSize(text, size);
}

export async function generatePdfAdmissionFormBuffer(data: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  pdfDoc.setTitle(`Course Payment Receipt - ${data.receiptNo || data.enrollmentId || 'N/A'}`);
  pdfDoc.setAuthor('TrustCare Institute of Health Science');
  pdfDoc.setSubject('Admission Form');

  const page = pdfDoc.addPage([595, 842]); // Page 1: Admission Form
  const page2 = pdfDoc.addPage([595, 842]); // Page 2: Undertaking

  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Load Geist-Regular font for Rupee symbol
  let rupeeFont: any = null;
  try {
    const fontPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'Geist-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      const fontBytes = fs.readFileSync(fontPath);
      rupeeFont = await pdfDoc.embedFont(fontBytes);
    }
  } catch (err) {
    console.error("Error embedding Geist font for Rupee symbol:", err);
  }

  // Load Noto Sans Devanagari font for Marathi text
  let devanagariFont: any = null;
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      const fontBytes = fs.readFileSync(fontPath);
      devanagariFont = await pdfDoc.embedFont(fontBytes);
    }
  } catch (err) {
    console.error("Error embedding Noto Sans Devanagari font:", err);
  }

  const studentName = data.studentName || 'Student';
  const enrollmentId = data.enrollmentId || 'N/A';
  const receiptNo = data.receiptNo || 'N/A';
  const date = data.date
    ? data.date.replace(/\//g, ' / ')
    : new Date().toLocaleDateString('en-GB').replace(/\//g, ' / ');
  const courseName = (data.courseName || '').replace(/_/g, ' ').toUpperCase();
  const courseDuration = data.courseDuration || 'N/A';
  const totalFees = data.totalFees || 0;
  const admissionFee = data.admissionFee || 0;
  const paymentMode = data.paymentMode || 'N/A';
  const guardianName = data.guardianName || '';
  const guardianRelation = data.guardianRelation || '';
  const branch = (data.branch || 'Mankhurd').toUpperCase();
  const photoUrl = data.photoUrl || '';
  const email = data.email || 'N/A';
  const schedule = data.schedule || [];
  const totalPayable = data.totalPayable || totalFees;
  const paymentType = data.paymentType || '';

  const relationMap: Record<string, string> = {
    "Mother": "आई",
    "Father": "वडील",
    "Husband": "पती",
    "Wife": "पत्नी",
    "Sister": "बहीण",
    "Brother": "भाऊ",
    "Guardian": "पालक"
  };
  const engRelation = guardianRelation ? `${guardianRelation} of` : "Guardian of";
  const marathiRelation = guardianRelation ? (relationMap[guardianRelation] || "पालक") : "पालक";

  const years = courseDuration ? parseInt(courseDuration.split(" ")[0]) || 1 : 1;
  const getDurationInMonths = (durationStr: string): number => {
    if (!durationStr) return 12;
    const parts = durationStr.trim().split(/\s+/);
    const val = parseInt(parts[0]) || 1;
    const unit = parts[1] ? parts[1].toLowerCase() : "year";
    if (unit.startsWith("year")) {
      return val * 12;
    }
    return val;
  };
  let totalMonths = 12;
  if (paymentType === "emi" && schedule && schedule.length > 0) {
    totalMonths = schedule.length;
  } else {
    totalMonths = getDurationInMonths(courseDuration);
  }
  const monthlyFee = totalMonths > 0 ? Math.round(totalFees / totalMonths) : totalFees;

  const darkGreen = rgb(0.004, 0.196, 0.125); // #013220
  const blackColor = rgb(0, 0, 0);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const lightGrayColor = rgb(0.95, 0.95, 0.95);
  const tealColor = rgb(0.169, 0.714, 0.737); // #2bb6bc
  const tealBlueColor = rgb(0.078, 0.314, 0.478); // #14507a

  const drawRupeeSymbol = (p: any, x: number, y: number, size = 10) => {
    if (rupeeFont) {
      p.drawText('₹', { x, y, size, font: rupeeFont, color: blackColor });
    } else {
      p.drawText('Rs.', { x, y, size, font: font, color: blackColor });
    }
  };

  const drawTextWithDevanagari = (targetPage: any, text: string, x: number, y: number, options: any) => {
    if (devanagariFont) {
      targetPage.drawText(text, {
        x,
        y,
        font: devanagariFont,
        ...options
      });
    } else {
      targetPage.drawText(text, {
        x,
        y,
        font: boldFont,
        ...options
      });
    }
  };

  let canvasFontRegistered = false;
  const drawMixedText = async (targetPage: any, text: string, x: number, y: number, fontSize: number, options: any = {}): Promise<number> => {
    const isDevanagari = /[\u0900-\u097F]/.test(text);
    const color = options.color || blackColor;

    if (isDevanagari) {
      try {
        const { createCanvas, registerFont } = require('canvas');
        if (!canvasFontRegistered) {
          const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
          if (fs.existsSync(fontPath)) {
            registerFont(fontPath, { family: 'Noto Sans Devanagari' });
          }
          canvasFontRegistered = true;
        }

        const measureCanvas = createCanvas(10, 10);
        const measureCtx = measureCanvas.getContext('2d');
        const isBold = options.font === boldFont;
        const isItalic = options.italic ? 'italic ' : '';
        measureCtx.font = `${isItalic}${isBold ? 'bold ' : ''}${fontSize}px "Noto Sans Devanagari", "Arial", sans-serif`;

        // Split text by English/alphanumeric parts to draw English directly and Devanagari with Canvas
        const parts = text.split(/([a-zA-Z0-9%]+)/g);
        const partWidths = parts.map(part => {
          if (!part) return 0;
          if (/[a-zA-Z0-9%]/.test(part)) {
            const selectedFont = options.font || boldFont;
            return selectedFont.widthOfTextAtSize(part, fontSize);
          } else {
            return measureCtx.measureText(part).width;
          }
        });
        const totalWidth = partWidths.reduce((a, b) => a + b, 0);

        let drawX = x;
        if (options.align === 'center') {
          drawX = ((options.pageWidth || 595) - totalWidth) / 2;
        }
        const startX = drawX;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part) continue;
          const partWidth = partWidths[i];

          if (/[a-zA-Z0-9%]/.test(part)) {
            // Draw English text directly to avoid tofu boxes
            const selectedFont = options.font || boldFont;
            targetPage.drawText(part, {
              x: drawX,
              y,
              size: fontSize,
              font: selectedFont,
              color,
            });
          } else if (partWidth > 0) {
            // Draw Devanagari via Canvas for correct layout shaping
            const textHeight = Math.ceil(fontSize * 1.5);
            const scale = 4;
            const canvas = createCanvas(partWidth * scale, textHeight * scale);
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.font = measureCtx.font;

            const r = Math.round(color.red * 255);
            const g = Math.round(color.green * 255);
            const b = Math.round(color.blue * 255);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.textBaseline = 'top';
            ctx.fillText(part, 0, 0);

            const buffer = canvas.toBuffer('image/png');
            const img = await pdfDoc.embedPng(buffer);

            targetPage.drawImage(img, {
              x: drawX,
              y: y - fontSize * 0.25,
              width: partWidth,
              height: textHeight
            });
          }
          drawX += partWidth;
        }
        return drawX - startX;
      } catch (err) {
        console.error("Canvas rendering failed for Marathi text, falling back to pdf-lib:", err);
      }
    }

    // Fallback
    const regex = /([\u0900-\u097F]+)/g;
    const parts = text.split(regex);
    
    // Calculate total width first if we need centering
    let totalWidth = 0;
    for (const part of parts) {
      if (!part) continue;
      const isDev = /[\u0900-\u097F]/.test(part);
      const selectedFont = isDev ? (devanagariFont || boldFont) : boldFont;
      const cleanPart = part.replace(/—/g, '-');
      try {
        totalWidth += selectedFont.widthOfTextAtSize(cleanPart, fontSize);
      } catch {
        totalWidth += cleanPart.length * (fontSize * 0.5);
      }
    }

    let drawX = x;
    if (options.align === 'center') {
      drawX = ((options.pageWidth || 595) - totalWidth) / 2;
    }
    const startX = drawX;

    for (const part of parts) {
      if (!part) continue;
      const isDev = /[\u0900-\u097F]/.test(part);
      const selectedFont = isDev ? (devanagariFont || boldFont) : boldFont;
      const cleanPart = part.replace(/—/g, '-');

      try {
        targetPage.drawText(cleanPart, {
          x: drawX,
          y,
          size: fontSize,
          font: selectedFont,
          color,
          ...options
        });
        drawX += selectedFont.widthOfTextAtSize(cleanPart, fontSize);
      } catch (err) {
        drawX += cleanPart.length * (fontSize * 0.5);
      }
    }
    return drawX - startX;
  };

  // Helper to draw border & layout
  const drawBasePageTemplate = async (targetPage: any) => {
    // Outer border (Thick 14px Teal)
    targetPage.drawRectangle({
      x: 7,
      y: 7,
      width: 595 - 14,
      height: 842 - 14,
      borderWidth: 14,
      borderColor: tealColor,
    });

    // Logo image
    try {
      const logoPath = path.join(process.cwd(), 'public', 'TrustCareLogo.png');
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scaleToFit(94.5, 94.5);
        targetPage.drawImage(logoImage, {
          x: 35,
          y: 710 + (94.5 - logoDims.height) / 2, // vertically center
          width: logoDims.width,
          height: logoDims.height,
        });

        // Watermark (Opacity 0.08, centered, matching browser background-size: 825px)
        targetPage.drawImage(logoImage, {
          x: -11.5,
          y: 115,
          width: 618,
          height: 618,
          opacity: 0.08,
        });
      }
    } catch (err) {
      console.error("Error drawing logo template:", err);
    }

    // Title text (adjusted to size 14 and x: 135 to clear the photo at x: 485)
    targetPage.drawText("TRUSTCARE INSTITUTE OF HEALTH SCIENCE", {
      x: 135,
      y: 765,
      size: 14,
      font: boldFont,
      color: darkGreen,
    });

    // Contact line (increased size to 9.5, telephone icon temporarily removed)
    targetPage.drawText("Email: trustcareinstitute03@gmail.com | +91 9967340243 | +91 9967288158", {
      x: 135,
      y: 745,
      size: 9.5,
      font: boldFont,
      color: blackColor,
    });

    // Address banner with top/bottom double lines
    targetPage.drawLine({ start: { x: 35, y: 706 }, end: { x: 560, y: 706 }, thickness: 1.5, color: blackColor });

    const addressText = "TRUSTCARE INSTITUTE OF HEALTH SCIENCE, 1ST FLOOR, SHIVSENA OFFICE, BHARAT NAGAR, MANKHURD, MUMBAI - 400 088.";
    const addrWidth = boldFont.widthOfTextAtSize(addressText, 8);
    const addrX = 35 + (525 - addrWidth) / 2;
    targetPage.drawText(addressText, {
      x: addrX,
      y: 694,
      size: 8,
      font: boldFont,
      color: blackColor,
    });

    targetPage.drawLine({ start: { x: 35, y: 688 }, end: { x: 560, y: 688 }, thickness: 1.5, color: blackColor });
  };

  const drawBottomSection = async (targetPage: any) => {
    // Dashed line
    targetPage.drawLine({
      start: { x: 35, y: 140 },
      end: { x: 560, y: 140 },
      thickness: 1.2,
      color: grayColor,
      dashArray: [3, 3]
    });

    // English declaration
    const engDecl = `I Am Mr./Ms : ${guardianName}  ${engRelation} ${studentName} — I Agree with Terms And Condition.`;
    targetPage.drawText(engDecl, {
      x: 35,
      y: 122,
      size: 9,
      font: boldFont,
      color: blackColor
    });

    // Marathi declaration
    const marDecl = `मा.श्री./श्रीमती ${guardianName} ${marathiRelation} — मला सर्व अटी मंजूर आहेत.`;
    await drawMixedText(targetPage, marDecl, 35, 107, 9, {
      font: boldFont,
      color: blackColor
    });

    // Signatures
    targetPage.drawLine({ start: { x: 35, y: 55 }, end: { x: 170, y: 55 }, thickness: 1.1, color: blackColor });
    targetPage.drawText("Parent's Sign.", { x: 72, y: 42, size: 9, font: boldFont });

    targetPage.drawLine({ start: { x: 220, y: 55 }, end: { x: 350, y: 55 }, thickness: 1.1, color: blackColor });
    targetPage.drawText("Student Sign.", { x: 255, y: 42, size: 9, font: boldFont });

    targetPage.drawText("Authorised Sign./Stamp", { x: 420, y: 42, size: 9, font: boldFont });

    // Add signature and stamp images here
    try {
      const signaturePath = path.join(process.cwd(), 'public', 'signature.png');
      if (fs.existsSync(signaturePath)) {
        const sigBytes = fs.readFileSync(signaturePath);
        let sigImage;
        try {
          sigImage = await pdfDoc.embedPng(sigBytes);
        } catch {
          sigImage = await pdfDoc.embedJpg(sigBytes);
        }
        targetPage.drawImage(sigImage, {
          x: 400,
          y: 66,
          width: 80,
          height: 40,
        });
      }

      const stampPath = path.join(process.cwd(), 'public', 'stamp.png');
      if (fs.existsSync(stampPath)) {
        const stampBytes = fs.readFileSync(stampPath);
        let stampImage;
        try {
          stampImage = await pdfDoc.embedPng(stampBytes);
        } catch {
          stampImage = await pdfDoc.embedJpg(stampBytes);
        }
        targetPage.drawImage(stampImage, {
          x: 490,
          y: 35,
          width: 60,
          height: 60,
        });
      }
    } catch (err) {
      console.error("Error embedding signature or stamp in Admission form:", err);
    }
  };

  // Build Page 1
  await drawBasePageTemplate(page);

  // Draw Title Banner: ADMISSION FORM (Teal Blue #14507a)
  const bannerWidth1 = 240;
  const bannerHeight1 = 26;
  const bannerX1 = (595 - bannerWidth1) / 2;
  const bannerY1 = 650;
  const path1 = `M ${bannerX1 + 15} ${bannerY1} L ${bannerX1 + bannerWidth1} ${bannerY1} L ${bannerX1 + bannerWidth1 - 15} ${bannerY1 + bannerHeight1} L ${bannerX1} ${bannerY1 + bannerHeight1} Z`;
  page.drawSvgPath(path1, { color: tealBlueColor });

  page.drawText("ADMISSION FORM", {
    x: (595 - boldFont.widthOfTextAtSize("ADMISSION FORM", 15)) / 2,
    y: 658,
    size: 15,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // Photo embedding or placeholder (Width 75pt / 100px, Height 90pt / 120px)
  let photoDrawn = false;
  if (photoUrl) {
    try {
      const photoBuffer = await fetchImageAsBuffer(photoUrl);
      let photoImg;
      try {
        photoImg = await pdfDoc.embedJpg(photoBuffer);
      } catch {
        photoImg = await pdfDoc.embedPng(photoBuffer);
      }
      page.drawImage(photoImg, {
        x: 485,
        y: 715,
        width: 75,
        height: 90,
      });
      page.drawRectangle({
        x: 485,
        y: 715,
        width: 75,
        height: 90,
        borderWidth: 1.5,
        borderColor: blackColor,
        opacity: 0,
      });
      photoDrawn = true;
    } catch (err) {
      console.error("Error rendering photo in Page 1:", err);
    }
  }
  if (!photoDrawn) {
    page.drawRectangle({
      x: 485,
      y: 715,
      width: 75,
      height: 90,
      borderWidth: 1.5,
      borderColor: blackColor,
      color: lightGrayColor,
    });
  }

  // Receipt No & Date (Date moved to the right, underlines 50% extended)
  page.drawText("Receipt No.", { x: 35, y: 625, size: 10.5, font: boldFont });
  page.drawText(receiptNo, { x: 100, y: 625, size: 10.5, font: boldFont });
  const receiptNoWidth = boldFont.widthOfTextAtSize(receiptNo, 10.5);
  const receiptNoUnderlineLength = receiptNoWidth * 1.5;
  page.drawLine({ start: { x: 98, y: 623 }, end: { x: 100 + receiptNoUnderlineLength, y: 623 }, thickness: 1, color: blackColor });

  page.drawText("Date :", { x: 410, y: 625, size: 10.5, font: boldFont });
  page.drawText(date, { x: 445, y: 625, size: 10.5, font: boldFont });
  const dateWidth = boldFont.widthOfTextAtSize(date, 10.5);
  const dateUnderlineLength = dateWidth * 1.5;
  page.drawLine({ start: { x: 443, y: 623 }, end: { x: 445 + dateUnderlineLength, y: 623 }, thickness: 1, color: blackColor });

  // Rows of details (aligned nicely with lines, 50% extended underlines)
  page.drawText("Student Name", { x: 35, y: 600, size: 10.5, font: boldFont });
  page.drawText(studentName, { x: 115, y: 600, size: 10.5, font: boldFont });
  const studentNameWidth = boldFont.widthOfTextAtSize(studentName, 10.5);
  const studentNameUnderlineLength = studentNameWidth * 1.5;
  page.drawLine({ start: { x: 113, y: 598 }, end: { x: 115 + studentNameUnderlineLength, y: 598 }, thickness: 1, color: blackColor });

  page.drawText("Course Name", { x: 35, y: 575, size: 10.5, font: boldFont });
  page.drawText(courseName, { x: 115, y: 575, size: 10.5, font: boldFont });
  const courseNameWidth = boldFont.widthOfTextAtSize(courseName, 10.5);
  const courseNameUnderlineLength = courseNameWidth * 1.5;
  page.drawLine({ start: { x: 113, y: 573 }, end: { x: 115 + courseNameUnderlineLength, y: 573 }, thickness: 1, color: blackColor });

  // Row 3
  page.drawText("Course Duration", { x: 35, y: 550, size: 10.5, font: boldFont });
  page.drawText(courseDuration, { x: 125, y: 550, size: 10.5, font: boldFont });
  const durationWidth = boldFont.widthOfTextAtSize(courseDuration, 10.5);
  const durationUnderlineLength = durationWidth * 1.5;
  page.drawLine({ start: { x: 123, y: 548 }, end: { x: 125 + durationUnderlineLength, y: 548 }, thickness: 1, color: blackColor });

  page.drawText("Admission Fees", { x: 285, y: 550, size: 10.5, font: boldFont });
  drawRupeeSymbol(page, 380, 550, 10.5);
  const formattedAdmissionFee = admissionFee.toLocaleString('en-IN');
  page.drawText(formattedAdmissionFee, { x: 390, y: 550, size: 10.5, font: boldFont });
  const admissionFeeWidth = boldFont.widthOfTextAtSize(formattedAdmissionFee, 10.5);
  const admissionFeeUnderlineLength = admissionFeeWidth * 1.5;
  page.drawLine({ start: { x: 378, y: 548 }, end: { x: 390 + admissionFeeUnderlineLength, y: 548 }, thickness: 1, color: blackColor });

  // Row 4 (Dynamic spacing as per text, underlines extended 1.5x)
  let currentX = 35;
  page.drawText("Course Fees", { x: currentX, y: 525, size: 10.5, font: boldFont });
  let courseFeesLabelWidth = boldFont.widthOfTextAtSize("Course Fees", 10.5);
  currentX += courseFeesLabelWidth + 10;

  // Monthly fee group
  let monthlyFeeUnderlineStart = currentX - 2;
  drawRupeeSymbol(page, currentX, 525, 10.5);
  const rupeeWidth = rupeeFont ? rupeeFont.widthOfTextAtSize('₹', 10.5) : font.widthOfTextAtSize('Rs.', 10.5);
  currentX += rupeeWidth + 2;
  const formattedMonthlyFee = monthlyFee.toLocaleString('en-IN');
  page.drawText(formattedMonthlyFee, { x: currentX, y: 525, size: 10.5, font: boldFont });
  const monthlyFeeWidth = boldFont.widthOfTextAtSize(formattedMonthlyFee, 10.5);
  const monthlyFeeUnderlineLength = monthlyFeeWidth * 1.5;
  let monthlyFeeUnderlineEnd = currentX + monthlyFeeUnderlineLength;
  page.drawLine({ start: { x: monthlyFeeUnderlineStart, y: 523 }, end: { x: monthlyFeeUnderlineEnd, y: 523 }, thickness: 1, color: blackColor });
  currentX = monthlyFeeUnderlineEnd + 10;

  // Multiply sign
  page.drawText("×", { x: currentX, y: 525, size: 10.5, font: boldFont });
  let timesWidth = boldFont.widthOfTextAtSize("×", 10.5);
  currentX += timesWidth + 10;

  // Months group
  let monthsUnderlineStart = currentX - 2;
  const monthsText = `${totalMonths} Month${totalMonths > 1 ? 's' : ''}`;
  page.drawText(monthsText, { x: currentX, y: 525, size: 10.5, font: boldFont });
  const monthsWidth = boldFont.widthOfTextAtSize(monthsText, 10.5);
  const monthsUnderlineLength = monthsWidth * 1.5;
  let monthsUnderlineEnd = currentX + monthsUnderlineLength;
  page.drawLine({ start: { x: monthsUnderlineStart, y: 523 }, end: { x: monthsUnderlineEnd, y: 523 }, thickness: 1, color: blackColor });
  currentX = monthsUnderlineEnd + 10;

  // Equals sign
  page.drawText("=", { x: currentX, y: 525, size: 10.5, font: boldFont });
  let equalsWidth = boldFont.widthOfTextAtSize("=", 10.5);
  currentX += equalsWidth + 10;

  // Total fees group
  let totalFeesUnderlineStart = currentX - 2;
  drawRupeeSymbol(page, currentX, 525, 10.5);
  currentX += rupeeWidth + 2;
  const formattedTotalFees = totalFees.toLocaleString('en-IN');
  page.drawText(formattedTotalFees, { x: currentX, y: 525, size: 10.5, font: boldFont });
  const totalFeesWidth = boldFont.widthOfTextAtSize(formattedTotalFees, 10.5);
  const totalFeesUnderlineLength = totalFeesWidth * 1.5;
  let totalFeesUnderlineEnd = currentX + totalFeesUnderlineLength;
  page.drawLine({ start: { x: totalFeesUnderlineStart, y: 523 }, end: { x: totalFeesUnderlineEnd, y: 523 }, thickness: 1, color: blackColor });
  currentX = totalFeesUnderlineEnd + 10;

  // Total label
  page.drawText("Total", { x: currentX, y: 525, size: 10.5, font: boldFont });

  // Row 5: Exam Fees
  page.drawText("Exam Fees", { x: 35, y: 500, size: 10.5, font: boldFont });
  const examFee = data.examFee;
  let examFeeWidth = 0;
  let examFeeTextStartX = 115;
  if (examFee != null && examFee > 0) {
    drawRupeeSymbol(page, 115, 500, 10.5);
    const rupeeWidth = rupeeFont ? rupeeFont.widthOfTextAtSize('₹', 10.5) : font.widthOfTextAtSize('Rs.', 10.5);
    examFeeTextStartX = 115 + rupeeWidth + 2;
    const formattedExamFee = examFee.toLocaleString('en-IN');
    page.drawText(formattedExamFee, { x: examFeeTextStartX, y: 500, size: 10.5, font: boldFont });
    examFeeWidth = boldFont.widthOfTextAtSize(formattedExamFee, 10.5);
  } else {
    page.drawText("As Applicable", { x: 115, y: 500, size: 10.5, font: boldFont });
    examFeeWidth = boldFont.widthOfTextAtSize("As Applicable", 10.5);
  }
  const examFeeUnderlineLength = examFeeWidth * 1.5;
  page.drawLine({ start: { x: 113, y: 498 }, end: { x: examFeeTextStartX + examFeeUnderlineLength, y: 498 }, thickness: 1, color: blackColor });

  // Draw Horizontal 12-Month Calendar grid
  let tableEndY = 455;
  if (schedule.length > 0) {
    const firstInstDate = schedule[0]?.dueDate ? new Date(schedule[0].dueDate) : new Date();
    const startYear = firstInstDate.getFullYear();
    const startMonth = firstInstDate.getMonth();
    const defaultDay = firstInstDate.getDate();

    const getDaySuffix = (n: number) => {
      if (n >= 11 && n <= 13) return "th";
      switch (n % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
      }
    };

    const suffix = (n: number) => (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

    const getDaysInMonth = (year: number, monthIndex: number) => {
      return new Date(year, monthIndex + 1, 0).getDate();
    };

    const getValidDayForMonth = (year: number, monthIndex: number, targetDay: number) => {
      const maxDays = getDaysInMonth(year, monthIndex);
      return Math.min(targetDay, maxDays);
    };

    const mappedInstallments = schedule.map((inst: any, idx: number) => {
      const due = inst.dueDate ? new Date(inst.dueDate) : new Date(startYear, startMonth + idx, 1);
      const globalMonthIndex = (due.getFullYear() - startYear) * 12 + due.getMonth();
      const yearIndex = Math.floor(globalMonthIndex / 12);
      const monthIndex = due.getMonth();
      const day = due.getDate();
      return { yearIndex, monthIndex, amount: inst.amount, status: inst.status, day, fullDate: due };
    });

    const maxYearIndex = Math.max(...mappedInstallments.map((m: any) => m.yearIndex), years - 1);
    const totalYears = Math.max(maxYearIndex + 1, years);

    let currentTblY = 475;

    for (let y = 0; y < totalYears; y++) {
      const yearInsts = mappedInstallments.filter((m: any) => m.yearIndex === y);
      const grid: (typeof yearInsts[0] | null)[] = Array(12).fill(null);
      for (const inst of yearInsts) {
        grid[inst.monthIndex] = inst;
      }

      // Title above the table
      const tableTitle = `${y + 1}${suffix(y + 1)} Year Fee's ${startYear + y}`;
      drawSuperscriptText(page, tableTitle, 35, currentTblY + 4, 9.75, boldFont, blackColor);

      currentTblY -= 16; // Start table header

      const colWidth = 525 / 12; // 43.75
      const row1Height = 16;
      const row2Height = 24;

      // Draw header background rectangle (white to match browser)
      page.drawRectangle({
        x: 35,
        y: currentTblY,
        width: 525,
        height: row1Height,
        color: rgb(1, 1, 1),
      });

      // Draw cells
      const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept.", "Oct.", "Nov.", "Dec."];
      for (let mi = 0; mi < 12; mi++) {
        const inst = grid[mi];
        const targetYear = startYear + y + (mi < startMonth ? 1 : 0);
        const day = inst ? inst.day : defaultDay;
        const validDay = getValidDayForMonth(targetYear, mi, day);
        const dateLabel = `${validDay}${getDaySuffix(validDay)} ${monthLabels[mi]}`;

        const cellX = 35 + mi * colWidth;

        // Draw date text centered in header cell
        const dateTextWidth = getSuperscriptTextWidth(dateLabel, 7.2, boldFont);
        const drawX = cellX + (colWidth - dateTextWidth) / 2;
        drawSuperscriptText(page, dateLabel, drawX, currentTblY + 5, 7.2, boldFont, blackColor);

        // Draw vertical column line for header
        if (mi > 0) {
          page.drawLine({
            start: { x: cellX, y: currentTblY },
            end: { x: cellX, y: currentTblY + row1Height },
            thickness: 0.8,
            color: blackColor,
          });
        }
      }

      // Draw header bottom line
      page.drawLine({
        start: { x: 35, y: currentTblY },
        end: { x: 560, y: currentTblY },
        thickness: 1.5,
        color: blackColor,
      });

      currentTblY -= row2Height; // Amount row start

      // Draw amount cells
      for (let mi = 0; mi < 12; mi++) {
        const inst = grid[mi];
        const cellX = 35 + mi * colWidth;

        if (inst) {
          const amtStr = `${inst.amount.toLocaleString("en-IN")}`;
          const amtTextWidth = boldFont.widthOfTextAtSize(amtStr, 7.2);
          const rupeeWidth = rupeeFont ? rupeeFont.widthOfTextAtSize('₹', 7.2) : font.widthOfTextAtSize('Rs.', 7.2);

          // Draw Rupee symbol and amount centered
          const totalWidth = rupeeWidth + 1 + amtTextWidth;
          const startDrawX = cellX + (colWidth - totalWidth) / 2;

          drawRupeeSymbol(page, startDrawX, currentTblY + 8, 7.2);
          page.drawText(amtStr, {
            x: startDrawX + rupeeWidth + 1,
            y: currentTblY + 8,
            size: 7.2,
            font: boldFont,
            color: blackColor,
          });
        }

        // Draw vertical column line for amount
        if (mi > 0) {
          page.drawLine({
            start: { x: cellX, y: currentTblY },
            end: { x: cellX, y: currentTblY + row2Height },
            thickness: 0.8,
            color: blackColor,
          });
        }
      }

      // Draw outer table borders
      page.drawRectangle({
        x: 35,
        y: currentTblY,
        width: 525,
        height: row1Height + row2Height,
        borderWidth: 1.5,
        borderColor: blackColor,
        opacity: 0,
      });

      currentTblY -= 14; // Space below table
    }
    tableEndY = currentTblY;
  }

  // Draw Total Payable (underline removed and shifted to the right)
  const totalPayableY = Math.max(160, tableEndY - 10);
  page.drawText("Total Payable :", { x: 395, y: totalPayableY, size: 11, font: boldFont });
  drawRupeeSymbol(page, 485, totalPayableY, 11);
  page.drawText(totalPayable.toLocaleString('en-IN'), { x: 497, y: totalPayableY, size: 12, font: boldFont });

  // Draw Bottom Section on Page 1
  await drawBottomSection(page);


  // Build Page 2: Undertaking / हमी पत्र
  await drawBasePageTemplate(page2);

  // Draw Title Banner: हमी पत्र / UNDER TAKING (Teal Blue #14507a)
  const bannerWidth2 = 240;
  const bannerHeight2 = 26;
  const bannerX2 = (595 - bannerWidth2) / 2;
  const bannerY2 = 650;
  const path2 = `M ${bannerX2 + 15} ${bannerY2} L ${bannerX2 + bannerWidth2} ${bannerY2} L ${bannerX2 + bannerWidth2 - 15} ${bannerY2 + bannerHeight2} L ${bannerX2} ${bannerY2 + bannerHeight2} Z`;
  page2.drawSvgPath(path2, { color: tealBlueColor });

  await drawMixedText(page2, "हमी पत्र / UNDER TAKING", 0, 658, 13.5, { color: rgb(1, 1, 1), font: boldFont, align: 'center' });

  let currentPage = page2;
  let page2Y = 645;

  // Marathi Points
  const mrPoints = [
    "भरलेली फी परत मिळणार नाही.",
    "दिलेल्या तारखेवर फी भरावी अन्यथा आम्ही दंड घेऊ.",
    "जर तुम्हाला प्रवेश रद्द करायचा असल्यास तुम्हाला पूर्ण फी भरणे गरजेचे आहे.",
    "जर तुम्हा गैरवर्तन केले तर तुमचं प्रवेश रद्द करण्यात येईल.",
    "तुमचे गुण तुमच्या उपस्थिती आणि तुमच्या वर्तनावर अवलंबून असतील.",
    "आठ दिवसांपेक्षा जास्त गैरहजर असल्यास तुमचे प्रवेश रद्द करण्यात येईल.",
    "परिक्षेचे फी एक महिना अगोदर भरावी.",
    "जर तुम्ही OJT मध्येच थांबवली तर TCIHS तुमच्यासाठी जबाबदार नाही.",
    "100% नोकरीची हमी",
    "75% उपस्थिती अनिवार्य आहे.",
    "दिलेल्या वेळापकानुसार परिक्षा द्यावी उशीर केल्यास परिक्षेचे फी वाढेल याला राहणार TCIHS नाही",
    "जर तुम्ही व तुमचे पालक दिलेल्या अटी विरोधात वाद घातला तर कायदेशीर रित्या कारवाई केली जाईल. वर्गात नेहमी वेळेवर येणार अनिवार्य आहे. अन्यथा वर्गात प्रवेश दिला जाणार नाही."
  ];

  for (let i = 0; i < mrPoints.length; i++) {
    const text = mrPoints[i];
    const wrappedLines = wrapMixedText(text, 507, 8, devanagariFont, boldFont);
    for (let j = 0; j < wrappedLines.length; j++) {
      if (page2Y - 12 < 150) {
        currentPage = pdfDoc.addPage([595, 842]);
        await drawBasePageTemplate(currentPage);
        page2Y = 645;
      }
      page2Y -= 12;
      if (j === 0) {
        // Draw blue index
        currentPage.drawText(`${i + 1}.`, {
          x: 35,
          y: page2Y,
          size: 8.25,
          font: boldFont,
          color: tealBlueColor,
        });
      }
      // Draw text
      await drawMixedText(currentPage, wrappedLines[j], 53, page2Y, 8.25, { font: boldFont, color: blackColor, italic: true });
    }
    page2Y -= 2;
  }

  // Dashed separator line
  if (page2Y - 12 < 150) {
    currentPage = pdfDoc.addPage([595, 842]);
    await drawBasePageTemplate(currentPage);
    page2Y = 645;
  }
  page2Y -= 8;
  currentPage.drawLine({
    start: { x: 35, y: page2Y },
    end: { x: 560, y: page2Y },
    thickness: 1.2,
    color: grayColor,
    dashArray: [3, 3]
  });
  page2Y -= 4;

  // English Points
  const enPoints = [
    "Paid Fees Not Refundable.",
    "Pay Your Fees Above Given Date Otherwise We Charge Penalties.",
    "If You Want To Cancel Admission Still You Have To Pay Full Fees.",
    "If You Misbehave Then We Will Cancel Your Admission.",
    "Final Marks Are Based On Attendance And Behavior Etc.",
    "More Than 8 Days absent Will Cancel The Admission, Without Your Permission.",
    "Exam Fees Should Have To Pay Before 1 Month Of Exam.",
    "If You Dropping OJT, TCIHS Is Not Responsible For You.",
    "100% Job Assurance",
    "75% Attendance Should Be Compulsory.",
    "Give Exam In Given Schedule. If You Delay Then TCIHS Will Not Responsible, Exam Fees Will Increase.",
    "If You And Your Guardian Argue Against The Terms And Conditions, Legal Action Will Be Taken.",
    "It Is compulsory To Come on Time Otherwise You Are Not Permitted To Sit In Lecture."
  ];

  for (let i = 0; i < enPoints.length; i++) {
    const text = enPoints[i];
    const wrappedLines = wrapMixedText(text, 507, 8, devanagariFont, boldFont);
    for (let j = 0; j < wrappedLines.length; j++) {
      if (page2Y - 12 < 150) {
        currentPage = pdfDoc.addPage([595, 842]);
        await drawBasePageTemplate(currentPage);
        page2Y = 645;
      }
      page2Y -= 12;
      if (j === 0) {
        // Draw blue index
        currentPage.drawText(`${i + 1}.`, {
          x: 35,
          y: page2Y,
          size: 8.25,
          font: boldFont,
          color: tealBlueColor,
        });
      }
      // Draw text
      currentPage.drawText(wrappedLines[j], {
        x: 53,
        y: page2Y,
        size: 8.25,
        font: boldFont,
        color: blackColor,
      });
    }
    page2Y -= 2;
  }

  // Draw Bottom Section on the final page of Undertaking
  await drawBottomSection(currentPage);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}


function generateEmailTemplate(type: string, data: any, logoBase64: string = ""): string {
  const studentName = data.studentName || 'Student';
  const receiptNo = data.receiptNo || 'N/A';
  const date = data.date || new Date().toLocaleDateString('en-GB');
  const courseName = (data.courseName || '').replace(/_/g, ' ').toUpperCase();
  const paymentMode = data.paymentMode || 'N/A';
  const amountPaid = (data.amountPaid || data.totalAmount || 0).toLocaleString('en-IN');
  const branch = data.branch || 'Mankhurd';

  let receiptTypeLabel = '';
  let additionalRows = '';
  let bodyHtml = '';

  if (type === 'admission') {
    receiptTypeLabel = 'Admission Confirmation';
    bodyHtml = `Congratulations! Your admission at <strong>TrustCare Institute of Health Science</strong> is confirmed.
      <br /><br />
      We are pleased to welcome you to our community. Please find your admission receipt details below. We have also attached the printable PDF of your receipt to this email.`;
    additionalRows = `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Admission Fee</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b;">₹${amountPaid}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Course Duration</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b;">${data.courseDuration || 'N/A'}</td>
      </tr>
    `;
  } else if (type === 'installment') {
    receiptTypeLabel = `Installment Receipt #${data.installmentNumber || 1}`;
    bodyHtml = `Thank you for your payment. We have successfully processed your transaction and generated your receipt. Please find the receipt details below. We have also attached a printable PDF copy of the receipt to this email.`;
    additionalRows = `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Installment Number</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b;">#${data.installmentNumber || 1}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Total Paid So Far</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b;">₹${(data.totalPaidSoFar || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Remaining Balance</td>
        <td style="padding: 10px 0; text-align: right; color: #e11d48; font-weight: 600;">₹${(data.balanceDue || 0).toLocaleString('en-IN')}</td>
      </tr>
    `;
  } else if (type === 'exam') {
    receiptTypeLabel = 'Exam Fee Receipt';
    bodyHtml = `Thank you for your payment. We have successfully processed your transaction and generated your receipt. Please find the receipt details below. We have also attached a printable PDF copy of the receipt to this email.`;
    additionalRows = `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Purpose of Payment</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b;">Exam Registration Fee</td>
      </tr>
    `;
  } else if (type === 'admission_form') {
    receiptTypeLabel = 'Admission Form';
    bodyHtml = `Congratulations! Your admission details at <strong>TrustCare Institute of Health Science</strong> are confirmed.
      <br /><br />
      Please find your official Admission Form attached to this email as a PDF document for your records.`;
    additionalRows = `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Enrollment ID</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b; font-weight: bold;">${data.enrollmentId || 'N/A'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Admission Date</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b;">${date}</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${receiptTypeLabel}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0;">
      <!-- Top Bar -->
      <div style="background: #2bb6bc; border-bottom: 2px solid #14507a; padding: 24px; text-align: center;">
        ${logoBase64 ? `<img src="cid:trustcare_logo" alt="TrustCare Logo" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 12px;" />` : ''}
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">TRUSTCARE</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #e0f2fe;">Institute of Health Science</p>
        <div style="margin-top: 16px; display: inline-block; background: rgba(0, 0, 0, 0.2); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3); padding: 6px 16px; border-radius: 99px; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
          ${receiptTypeLabel}
        </div>
      </div>
      
      <!-- Body -->
      <div style="padding: 32px 24px; position: relative;">
        ${logoBase64 ? `
        <!-- Watermark -->
        <div style="height: 0; max-height: 0; text-align: center; opacity: 0.05; overflow: visible; pointer-events: none;">
          <img src="cid:trustcare_logo" style="width: 300px; height: auto; margin-top: 120px;" />
        </div>` : ''}
        
        <div style="position: relative; z-index: 1;">
          <p style="margin-top: 0; margin-bottom: 20px; font-size: 15px; line-height: 1.5;">Dear <strong>${studentName}</strong>,</p>
          <p style="margin-top: 0; margin-bottom: 24px; font-size: 14px; line-height: 1.5; color: #475569;">
            ${bodyHtml}
          </p>
          
          <!-- Receipt Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Receipt Number</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #1e293b;">${receiptNo}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Date</td>
                <td style="padding: 10px 0; text-align: right; color: #1e293b;">${date}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Course</td>
                <td style="padding: 10px 0; text-align: right; color: #1e293b; font-weight: 600;">${courseName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Payment Mode</td>
                <td style="padding: 10px 0; text-align: right; color: #1e293b;">${paymentMode}</td>
              </tr>
              ${additionalRows}
              <tr style="border-top: 2px solid #e2e8f0; font-size: 15px;">
                <td style="padding: 14px 0 0 0; color: #1e293b; font-weight: 800;">Amount Paid</td>
                <td style="padding: 14px 0 0 0; text-align: right; font-weight: 800; color: #0d9488;">₹${amountPaid}</td>
              </tr>
            </tbody>
          </table>
          
          <!-- Footer Note -->
          <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
            <strong>Important Notice:</strong> Fees, once paid, are non-refundable. If you want to cancel your admission, you must pay the full fees. For any queries, please reach out to the institute office.
          </div>
          
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Best regards,<br />
            <strong style="color: #013220;">TrustCare Institute of Health Science</strong>
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 4px 0;">TrustCare Institute of Health Science • ${branch} Branch</p>
        <p style="margin: 0;">Email: trustcareinstitute03@gmail.com</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function POST(req: Request) {
  try {
    const { to, type, data } = await req.json();

    if (!to) {
      return NextResponse.json({ error: "Missing recipient email 'to'" }, { status: 400 });
    }

    if (!type || !['admission', 'installment', 'exam', 'admission_form'].includes(type)) {
      return NextResponse.json({ error: "Invalid or missing receipt type" }, { status: 400 });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn("SENDGRID_API_KEY is not configured in environment variables.");
      return NextResponse.json({ error: "SendGrid API key is not configured on the server." }, { status: 500 });
    }

    const fromEmail = process.env.EMAIL_FROM || "trustcareinstitute03@gmail.com";
    let subject = `Trustcare Institute Of Health Science Receipt - ${data.receiptNo || 'Transaction Alert'}`;
    if (type === 'admission') {
      subject = `Admission Confirmed! Congratulations ${data.studentName || ''} - Trustcare Institute Of Health Science`;
    } else if (type === 'admission_form') {
      subject = `Official Admission Form - ${data.studentName || ''} (${data.enrollmentId || ''}) - Trustcare Institute Of Health Science`;
    }
    
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), 'public', 'TrustCareLogo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = logoBuffer.toString('base64');
      }
    } catch (e) {
      console.error("Could not load logo for email:", e);
    }
    
    const htmlContent = generateEmailTemplate(type, data, logoBase64);

    // Generate PDF copy of the receipt
    let attachments: any[] = [];
    try {
      let pdfBuffer: Buffer;
      if (type === 'admission_form') {
        pdfBuffer = await generatePdfAdmissionFormBuffer(data);
      } else {
        pdfBuffer = await generatePdfReceiptBuffer(type, data);
      }
      const base64Content = pdfBuffer.toString('base64');

      let filename = type === 'admission_form'
        ? `admission_form_${(data.enrollmentId || 'details').replace(/\//g, '-')}.pdf`
        : `receipt_${(data.receiptNo || 'details').replace(/\//g, '-')}.pdf`;
      if (data.studentName) {
        const sanitizedStudentName = data.studentName
          .replace(/[^a-zA-Z0-9\s-_]/g, '')
          .trim()
          .replace(/\s+/g, '_');
        if (type === 'admission_form') {
          filename = `${sanitizedStudentName}_Admission_Form_${(data.enrollmentId || 'details').replace(/[\/\\]/g, '-')}.pdf`;
        } else {
          const sanitizedReceiptNo = (data.receiptNo || 'details').replace(/[\/\\]/g, '-');
          filename = `${sanitizedStudentName}_${sanitizedReceiptNo}.pdf`;
        }
      }

      // SendGrid requires `content` (base64 encoded), `filename`, `type`, and `disposition`
      attachments.push({
        content: base64Content,
        filename,
        type: 'application/pdf',
        disposition: 'attachment',
      });
      
      if (logoBase64) {
        attachments.push({
          content: logoBase64,
          filename: 'TrustCareLogo.png',
          type: 'image/png',
          disposition: 'inline',
          content_id: 'trustcare_logo',
        });
      }

      console.log(`[send-email] PDF generated: ${filename} (${pdfBuffer.length} bytes)`);
    } catch (pdfErr) {
      console.error("[send-email] Error generating receipt PDF attachment:", pdfErr);
      // Continue sending email even if PDF generation failed — email body still delivers
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              {
                email: to,
              }
            ],
            subject: subject,
          }
        ],
        from: {
          email: fromEmail,
          name: "Trustcare Institute Of Health Science",
        },
        content: [
          {
            type: "text/html",
            value: htmlContent,
          }
        ],
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    });

    if (!response.ok) {
      const resBody = await response.json().catch(() => ({}));
      console.error("SendGrid API error response:", resBody);
      const errorMessage = resBody.errors?.[0]?.message || "Failed to send email via SendGrid";
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
