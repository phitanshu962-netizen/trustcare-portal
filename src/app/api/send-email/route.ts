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
  const date = data.date || new Date().toLocaleDateString('en-GB');
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
  page.drawText("Authority Sign./Stamp  ..........................", { x: 395, y: 44, size: 9, font: boldFont, color: blackColor });

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

async function generatePdfAdmissionFormBuffer(data: any): Promise<Buffer> {
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

  // Load Tiro Devanagari Marathi font for Marathi text
  let devanagariFont: any = null;
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'TiroDevanagariMarathi-Regular.ttf');
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
  const date = data.date || new Date().toLocaleDateString('en-GB');
  const courseName = (data.courseName || '').replace(/_/g, ' ').toUpperCase();
  const courseDuration = data.courseDuration || 'N/A';
  const totalFees = data.totalFees || 0;
  const admissionFee = data.admissionFee || 0;
  const paymentMode = data.paymentMode || 'N/A';
  const guardianName = data.guardianName || 'N/A';
  const guardianRelation = data.guardianRelation || 'N/A';
  const branch = (data.branch || 'Mankhurd').toUpperCase();
  const photoUrl = data.photoUrl || '';
  const email = data.email || 'N/A';
  const schedule = data.schedule || [];
  const totalPayable = data.totalPayable || totalFees;

  const years = courseDuration ? parseInt(courseDuration.split(" ")[0]) || 1 : 1;
  const perYearFee = years > 1 ? Math.round(totalFees / years) : totalFees;

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

  const drawMixedText = async (targetPage: any, text: string, x: number, y: number, fontSize: number, options: any = {}) => {
    const regex = /([\u0900-\u097F]+)/g;
    const parts = text.split(regex);
    let currentX = x;
    const color = options.color || blackColor;
    
    for (const part of parts) {
      if (!part) continue;
      const isDev = /[\u0900-\u097F]/.test(part);
      const selectedFont = isDev ? (devanagariFont || boldFont) : boldFont;
      const cleanPart = part.replace(/—/g, '-');
      
      try {
        targetPage.drawText(cleanPart, {
          x: currentX,
          y,
          size: fontSize,
          font: selectedFont,
          color,
          ...options
        });
        currentX += selectedFont.widthOfTextAtSize(cleanPart, fontSize);
      } catch (err) {
        console.error("Error drawing mixed text part:", cleanPart, err);
        try {
          targetPage.drawText(cleanPart, {
            x: currentX,
            y,
            size: fontSize,
            font: boldFont,
            color,
            ...options
          });
          currentX += boldFont.widthOfTextAtSize(cleanPart, fontSize);
        } catch {
          currentX += cleanPart.length * (fontSize * 0.5);
        }
      }
    }
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

        // Watermark (Opacity 0.08, centered, 400x400)
        targetPage.drawImage(logoImage, {
          x: 97.5,
          y: 221,
          width: 400,
          height: 400,
          opacity: 0.08,
        });
      }
    } catch (err) {
      console.error("Error drawing logo template:", err);
    }

    // Title text
    targetPage.drawText("TRUSTCARE INSTITUTE OF HEALTH SCIENCE", {
      x: 135,
      y: 765,
      size: 15.3,
      font: boldFont,
      color: darkGreen,
    });

    // Contact line with red circles
    targetPage.drawText("Email: trustcareinstitute03@gmail.com", { x: 135, y: 745, size: 9, font: boldFont, color: blackColor });
    targetPage.drawText("|", { x: 295, y: 745, size: 9, font: boldFont, color: grayColor });
    
    targetPage.drawCircle({ x: 310, y: 748, size: 6, color: rgb(0.82, 0.18, 0.18) });
    targetPage.drawText("+91 9967340243", { x: 320, y: 745, size: 9, font: boldFont, color: blackColor });

    targetPage.drawText("|", { x: 390, y: 745, size: 9, font: boldFont, color: grayColor });
    
    targetPage.drawCircle({ x: 405, y: 748, size: 6, color: rgb(0.82, 0.18, 0.18) });
    targetPage.drawText("+91 9967288158", { x: 415, y: 745, size: 9, font: boldFont, color: blackColor });

    // Address banner with top/bottom double lines
    targetPage.drawLine({ start: { x: 45, y: 706 }, end: { x: 550, y: 706 }, thickness: 1.5, color: blackColor });

    const addressText = "TRUSTCARE INSTITUTE OF HEALTH SCIENCE, 1ST FLOOR, SHIVSENA OFFICE, BHARAT NAGAR, MANKHURD, MUMBAI - 400 088.";
    targetPage.drawText(addressText, {
      x: 48,
      y: 694,
      size: 6.8,
      font: boldFont,
      color: blackColor,
    });

    targetPage.drawLine({ start: { x: 45, y: 688 }, end: { x: 550, y: 688 }, thickness: 1.5, color: blackColor });
  };

  const drawBottomSection = async (targetPage: any) => {
    // Dashed line
    targetPage.drawLine({
      start: { x: 45, y: 140 },
      end: { x: 550, y: 140 },
      thickness: 0.8,
      color: grayColor,
      dashArray: [3, 3]
    });

    // English declaration
    const engDecl = `I Am Mr./Ms : ${guardianName}  ${guardianRelation} of ${studentName} — I Agree with Terms And Condition.`;
    targetPage.drawText(engDecl, {
      x: 45,
      y: 122,
      size: 8,
      font: boldFont,
      color: blackColor
    });

    // Marathi declaration
    const marDecl = `मी श्री/ श्रीमती ${guardianName}, ${guardianRelation} आई/वडील/पती/बहीण/भाऊ — मला सर्व अटी मंजूर आहेत.`;
    await drawMixedText(targetPage, marDecl, 45, 107, 8.5, {
      color: blackColor
    });

    // Signatures
    targetPage.drawLine({ start: { x: 45, y: 55 }, end: { x: 180, y: 55 }, thickness: 0.8, color: blackColor });
    targetPage.drawText("Parent's Sign.", { x: 80, y: 42, size: 8.5, font: boldFont });

    targetPage.drawLine({ start: { x: 220, y: 55 }, end: { x: 350, y: 55 }, thickness: 0.8, color: blackColor });
    targetPage.drawText("Student Sign.", { x: 255, y: 42, size: 8.5, font: boldFont });

    targetPage.drawLine({ start: { x: 390, y: 55 }, end: { x: 550, y: 55 }, thickness: 0.8, color: blackColor });
    targetPage.drawText("Authorised Sign./Stamp", { x: 415, y: 42, size: 8.5, font: boldFont });
  };

  // Build Page 1
  await drawBasePageTemplate(page);

  // Draw Title Banner: ADMISSION FORM (Teal Blue #14507a)
  const bannerWidth1 = 240;
  const bannerHeight1 = 26;
  const bannerX1 = (595 - bannerWidth1) / 2;
  const bannerY1 = 650;
  const path1 = `M ${bannerX1 + 11} ${bannerY1} L ${bannerX1 + bannerWidth1} ${bannerY1} L ${bannerX1 + bannerWidth1 - 11} ${bannerY1 + bannerHeight1} L ${bannerX1} ${bannerY1 + bannerHeight1} Z`;
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
        x: 475,
        y: 715,
        width: 75,
        height: 90,
      });
      page.drawRectangle({
        x: 475,
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
      x: 475,
      y: 715,
      width: 75,
      height: 90,
      borderWidth: 1.5,
      borderColor: blackColor,
      color: lightGrayColor,
    });
  }

  // Receipt No & Date
  page.drawText("Receipt No.", { x: 45, y: 625, size: 10.5, font: boldFont });
  page.drawText(receiptNo, { x: 110, y: 625, size: 10.5, font: font });
  page.drawLine({ start: { x: 108, y: 623 }, end: { x: 250, y: 623 }, thickness: 1, color: blackColor });

  page.drawText("Date :", { x: 330, y: 625, size: 10.5, font: boldFont });
  page.drawText(date, { x: 365, y: 625, size: 10.5, font: font });
  page.drawLine({ start: { x: 363, y: 623 }, end: { x: 480, y: 623 }, thickness: 1, color: blackColor });

  // Rows of details (aligned nicely with lines)
  page.drawText("Student Name", { x: 45, y: 600, size: 10.5, font: boldFont });
  page.drawText(studentName, { x: 125, y: 600, size: 10.5, font: font });
  page.drawLine({ start: { x: 123, y: 598 }, end: { x: 550, y: 598 }, thickness: 1, color: blackColor });

  page.drawText("Course Name", { x: 45, y: 575, size: 10.5, font: boldFont });
  page.drawText(courseName, { x: 125, y: 575, size: 10.5, font: font });
  page.drawLine({ start: { x: 123, y: 573 }, end: { x: 550, y: 573 }, thickness: 1, color: blackColor });
  
  // Row 3
  page.drawText("Course Duration", { x: 45, y: 550, size: 10.5, font: boldFont });
  page.drawText(courseDuration, { x: 135, y: 550, size: 10.5, font: font });
  page.drawLine({ start: { x: 133, y: 548 }, end: { x: 280, y: 548 }, thickness: 1, color: blackColor });

  page.drawText("Admission Fees", { x: 295, y: 550, size: 10.5, font: boldFont });
  drawRupeeSymbol(page, 390, 550, 10.5);
  page.drawText(admissionFee.toLocaleString('en-IN'), { x: 400, y: 550, size: 10.5, font: font });
  page.drawLine({ start: { x: 388, y: 548 }, end: { x: 550, y: 548 }, thickness: 1, color: blackColor });

  // Row 4
  page.drawText("Course Fees", { x: 45, y: 525, size: 10.5, font: boldFont });
  drawRupeeSymbol(page, 120, 525, 10.5);
  page.drawText(perYearFee.toLocaleString('en-IN'), { x: 130, y: 525, size: 10.5, font: font });
  page.drawLine({ start: { x: 118, y: 523 }, end: { x: 215, y: 523 }, thickness: 1, color: blackColor });

  page.drawText("x", { x: 225, y: 525, size: 10.5, font: font });
  page.drawText(`${years} Year${years > 1 ? 's' : ''}`, { x: 245, y: 525, size: 10.5, font: font });
  page.drawLine({ start: { x: 240, y: 523 }, end: { x: 300, y: 523 }, thickness: 1, color: blackColor });

  page.drawText("=", { x: 310, y: 525, size: 10.5, font: font });
  drawRupeeSymbol(page, 330, 525, 10.5);
  page.drawText(totalFees.toLocaleString('en-IN'), { x: 340, y: 525, size: 10.5, font: font });
  page.drawLine({ start: { x: 328, y: 523 }, end: { x: 430, y: 523 }, thickness: 1, color: blackColor });
  page.drawText("Total", { x: 440, y: 525, size: 10.5, font: boldFont });

  // Row 5: Exam Fees
  page.drawText("Exam Fees", { x: 45, y: 500, size: 10.5, font: boldFont });
  page.drawText("As Applicable", { x: 125, y: 500, size: 10.5, font: font });
  page.drawLine({ start: { x: 123, y: 498 }, end: { x: 550, y: 498 }, thickness: 1, color: blackColor });

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
      const tableTitle = `${y + 1}${suffix(y + 1)} Year Fee's`;
      page.drawText(tableTitle, {
        x: 45,
        y: currentTblY + 4,
        size: 9,
        font: boldFont,
        color: blackColor,
      });

      currentTblY -= 16; // Start table header

      const colWidth = 505 / 12; // 42.08
      const row1Height = 16;
      const row2Height = 24;

      // Draw header background rectangle
      page.drawRectangle({
        x: 45,
        y: currentTblY,
        width: 505,
        height: row1Height,
        color: lightGrayColor,
      });

      // Draw cells
      const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept.", "Oct.", "Nov.", "Dec."];
      for (let mi = 0; mi < 12; mi++) {
        const inst = grid[mi];
        const targetYear = startYear + y + (mi < startMonth ? 1 : 0);
        const day = inst ? inst.day : defaultDay;
        const validDay = getValidDayForMonth(targetYear, mi, day);
        const dateLabel = `${validDay}${getDaySuffix(validDay)} ${monthLabels[mi]}`;

        const cellX = 45 + mi * colWidth;

        // Draw date text centered in header cell
        const dateTextWidth = font.widthOfTextAtSize(dateLabel, 6);
        page.drawText(dateLabel, {
          x: cellX + (colWidth - dateTextWidth) / 2,
          y: currentTblY + 5,
          size: 6,
          font: boldFont,
          color: blackColor,
        });

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
        start: { x: 45, y: currentTblY },
        end: { x: 550, y: currentTblY },
        thickness: 1.5,
        color: blackColor,
      });

      currentTblY -= row2Height; // Amount row start

      // Draw amount cells
      for (let mi = 0; mi < 12; mi++) {
        const inst = grid[mi];
        const cellX = 45 + mi * colWidth;

        if (inst) {
          const amtStr = `${inst.amount.toLocaleString("en-IN")}`;
          const amtTextWidth = font.widthOfTextAtSize(amtStr, 7.5);
          
          // Draw Rupee symbol and amount centered
          const totalWidth = 6 + amtTextWidth;
          const startDrawX = cellX + (colWidth - totalWidth) / 2;
          
          drawRupeeSymbol(page, startDrawX, currentTblY + 8, 7.5);
          page.drawText(amtStr, {
            x: startDrawX + 7,
            y: currentTblY + 8,
            size: 7.5,
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
        x: 45,
        y: currentTblY,
        width: 505,
        height: row1Height + row2Height,
        borderWidth: 1.5,
        borderColor: blackColor,
        opacity: 0,
      });

      currentTblY -= 14; // Space below table
    }
    tableEndY = currentTblY;
  }

  // Draw Total Payable
  const totalPayableY = Math.max(160, tableEndY - 10);
  page.drawText("Total Payable :", { x: 350, y: totalPayableY, size: 11, font: boldFont });
  drawRupeeSymbol(page, 435, totalPayableY, 11);
  page.drawText(totalPayable.toLocaleString('en-IN'), { x: 447, y: totalPayableY, size: 12, font: boldFont });
  page.drawLine({ start: { x: 350, y: totalPayableY - 4 }, end: { x: 550, y: totalPayableY - 4 }, thickness: 1.5, color: blackColor });

  // Draw Bottom Section on Page 1
  await drawBottomSection(page);


  // Build Page 2: Undertaking / हमी पत्र
  await drawBasePageTemplate(page2);

  // Draw Title Banner: हमी पत्र / UNDER TAKING (Teal Blue #14507a)
  const bannerWidth2 = 250;
  const bannerHeight2 = 26;
  const bannerX2 = (595 - bannerWidth2) / 2;
  const bannerY2 = 650;
  const path2 = `M ${bannerX2 + 11} ${bannerY2} L ${bannerX2 + bannerWidth2} ${bannerY2} L ${bannerX2 + bannerWidth2 - 11} ${bannerY2 + bannerHeight2} L ${bannerX2} ${bannerY2 + bannerHeight2} Z`;
  page2.drawSvgPath(path2, { color: tealBlueColor });
  
  await drawMixedText(page2, "हमी पत्र / UNDER TAKING", (595 - 200) / 2, 658, 13.5, { color: rgb(1, 1, 1), font: boldFont });

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
    const wrappedLines = wrapMixedText(text, 487, 8, devanagariFont, boldFont);
    for (let j = 0; j < wrappedLines.length; j++) {
      page2Y -= 12;
      if (j === 0) {
        // Draw blue index
        page2.drawText(`${i + 1}.`, {
          x: 45,
          y: page2Y,
          size: 8,
          font: boldFont,
          color: tealBlueColor,
        });
      }
      // Draw text
      await drawMixedText(page2, wrappedLines[j], 63, page2Y, 8.25, { color: blackColor, italic: true });
    }
    page2Y -= 2;
  }

  // Dashed separator line
  page2Y -= 8;
  page2.drawLine({
    start: { x: 45, y: page2Y },
    end: { x: 550, y: page2Y },
    thickness: 0.8,
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
    const wrappedLines = wrapMixedText(text, 487, 8, devanagariFont, boldFont);
    for (let j = 0; j < wrappedLines.length; j++) {
      page2Y -= 12;
      if (j === 0) {
        // Draw blue index
        page2.drawText(`${i + 1}.`, {
          x: 45,
          y: page2Y,
          size: 8,
          font: boldFont,
          color: tealBlueColor,
        });
      }
      // Draw text
      page2.drawText(wrappedLines[j], {
        x: 63,
        y: page2Y,
        size: 8,
        font: boldFont,
        color: blackColor,
      });
    }
    page2Y -= 2;
  }

  // Draw Bottom Section on Page 2
  await drawBottomSection(page2);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}


function generateEmailTemplate(type: string, data: any): string {
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
      <div style="background: #f0faf4; border-bottom: 2px solid #013220; padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; color: #013220;">TRUSTCARE</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #013220;">Institute of Health Science</p>
        <div style="margin-top: 16px; display: inline-block; background: rgba(1, 50, 32, 0.1); color: #013220; border: 1px solid rgba(1, 50, 32, 0.2); padding: 6px 16px; border-radius: 99px; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
          ${receiptTypeLabel}
        </div>
      </div>
      
      <!-- Body -->
      <div style="padding: 32px 24px;">
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
    const htmlContent = generateEmailTemplate(type, data);

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
