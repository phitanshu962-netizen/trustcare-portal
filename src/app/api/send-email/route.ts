import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// Force Node.js runtime so pdf-lib (which uses Buffer/Uint8Array) works correctly
export const runtime = 'nodejs';


async function generatePdfReceiptBuffer(type: string, data: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 420]); // A5 Landscape Size (in points: 595 x 420)

  // Use Times-Roman (Serif) fonts to match the browser fonts exactly
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

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

  // Indian Rupee Symbol Drawer
  const drawRupee = (x: number, y: number) => {
    const thickness = 1.1;
    // Vertical stem of the upper loop only
    page.drawLine({ start: { x: x + 1.5, y: y + 4.5 }, end: { x: x + 1.5, y: y + 7.5 }, thickness, color: blackColor });
    // Horizontal bar 1
    page.drawLine({ start: { x, y: y + 7.5 }, end: { x: x + 7, y: y + 7.5 }, thickness, color: blackColor });
    // Horizontal bar 2
    page.drawLine({ start: { x, y: y + 4.5 }, end: { x: x + 6, y: y + 4.5 }, thickness, color: blackColor });
    // Upper loop (diagonal segments)
    page.drawLine({ start: { x: x + 1.5, y: y + 7.5 }, end: { x: x + 5.5, y: y + 6 }, thickness, color: blackColor });
    page.drawLine({ start: { x: x + 5.5, y: y + 6 }, end: { x: x + 1.5, y: y + 4.5 }, thickness, color: blackColor });
    // Diagonal leg slanted down-right
    page.drawLine({ start: { x: x + 1.8, y: y + 4.5 }, end: { x: x + 5.5, y: y }, thickness, color: blackColor });
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

  if (type === 'admission') {
    receiptTypeLabel = 'Admission Receipt';
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
    additionalRows = `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Purpose of Payment</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b;">Exam Registration Fee</td>
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
          Thank you for your payment. We have successfully processed your transaction and generated your receipt. Please find the receipt details below. We have also attached a printable PDF copy of the receipt to this email.
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
          <strong>Important Notice:</strong> Course fees, once paid, are non-refundable. After admission is completed, cancellation is not allowed. For any queries, please reach out to the institute office.
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

    if (!type || !['admission', 'installment', 'exam'].includes(type)) {
      return NextResponse.json({ error: "Invalid or missing receipt type" }, { status: 400 });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn("SENDGRID_API_KEY is not configured in environment variables.");
      return NextResponse.json({ error: "SendGrid API key is not configured on the server." }, { status: 500 });
    }

    const fromEmail = process.env.EMAIL_FROM || "trustcareinstitute03@gmail.com";
    const subject = `Trustcare Institute Of Health Science Receipt - ${data.receiptNo || 'Transaction Alert'}`;
    const htmlContent = generateEmailTemplate(type, data);

    // Generate PDF copy of the receipt
    let attachments: any[] = [];
    try {
      const pdfBuffer = await generatePdfReceiptBuffer(type, data);
      const base64Content = pdfBuffer.toString('base64');
      const filename = `receipt_${(data.receiptNo || 'details').replace(/\//g, '-')}.pdf`;

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
