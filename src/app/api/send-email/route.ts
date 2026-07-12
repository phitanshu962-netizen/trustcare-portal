import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Force Node.js runtime so pdf-lib (which uses Buffer/Uint8Array) works correctly
export const runtime = 'nodejs';


async function generatePdfReceiptBuffer(type: string, data: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 Size (in points: 595 x 842)

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const studentName = data.studentName || 'Student';
  const receiptNo = data.receiptNo || 'N/A';
  const date = data.date || new Date().toLocaleDateString('en-GB');
  const courseName = (data.courseName || '').replace(/_/g, ' ').toUpperCase();
  const paymentMode = data.paymentMode || 'N/A';
  const amountPaid = (data.amountPaid || data.totalAmount || 0).toLocaleString('en-IN');
  const branch = (data.branch || 'Mankhurd').toUpperCase();

  // Draw border
  // Outer border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 555,
    height: 802,
    borderWidth: 2,
    borderColor: rgb(0.05, 0.58, 0.53), // Teal #0d9488
  });
  
  // Inner border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: 547,
    height: 794,
    borderWidth: 0.5,
    borderColor: rgb(0.7, 0.7, 0.7),
  });

  // Top header colored bar
  page.drawRectangle({
    x: 24,
    y: 778,
    width: 547,
    height: 40,
    color: rgb(0.93, 0.97, 0.93), // Light green background tint
  });

  // Header Title in extreme dark green
  const titleText = "TRUSTCARE INSTITUTE OF HEALTH SCIENCE";
  const titleWidth = boldFont.widthOfTextAtSize(titleText, 16);
  page.drawText(titleText, {
    x: (595 - titleWidth) / 2,
    y: 790,
    size: 16,
    font: boldFont,
    color: rgb(0.004, 0.196, 0.125), // Extreme dark green (#013220)
  });

  // Subheaders
  const subText1 = `${branch} BRANCH`;
  const subText1Width = font.widthOfTextAtSize(subText1, 10);
  page.drawText(subText1, {
    x: (595 - subText1Width) / 2,
    y: 755,
    size: 10,
    font: font,
    color: rgb(0.1, 0.1, 0.1),
  });

  const subText2 = "Email: trustcareinstitute03@gmail.com";
  const subText2Width = font.widthOfTextAtSize(subText2, 9);
  page.drawText(subText2, {
    x: (595 - subText2Width) / 2,
    y: 740,
    size: 9,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Horizontal divider
  page.drawLine({
    start: { x: 40, y: 725 },
    end: { x: 555, y: 725 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Receipt Badge
  let badgeLabel = 'RECEIPT';
  if (type === 'admission') badgeLabel = 'ADMISSION RECEIPT';
  else if (type === 'installment') badgeLabel = 'INSTALLMENT RECEIPT';
  else if (type === 'exam') badgeLabel = 'EXAM FEE RECEIPT';

  const badgeWidth = boldFont.widthOfTextAtSize(badgeLabel, 12);
  const badgeBoxWidth = badgeWidth + 30;
  
  // Draw filled badge background
  page.drawRectangle({
    x: (595 - badgeBoxWidth) / 2,
    y: 695,
    width: badgeBoxWidth,
    height: 22,
    color: rgb(0.3, 0.27, 0.9), // Indigo #4f46e5-ish
  });

  // Badge text in white
  page.drawText(badgeLabel, {
    x: (595 - badgeWidth) / 2,
    y: 702,
    size: 12,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // Helper to draw structured grid lines & fields
  let currentY = 650;
  const drawFieldRow = (label1: string, val1: string, label2: string, val2: string) => {
    // Label 1
    page.drawText(label1, { x: 50, y: currentY, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(val1, { x: 160, y: currentY, size: 10, font: font, color: rgb(0.1, 0.1, 0.1) });
    // Underline 1
    page.drawLine({ start: { x: 155, y: currentY - 3 }, end: { x: 285, y: currentY - 3 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });

    // Label 2
    page.drawText(label2, { x: 310, y: currentY, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(val2, { x: 410, y: currentY, size: 10, font: font, color: rgb(0.1, 0.1, 0.1) });
    // Underline 2
    page.drawLine({ start: { x: 405, y: currentY - 3 }, end: { x: 545, y: currentY - 3 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });

    currentY -= 30;
  };

  const drawSingleFieldRow = (label: string, val: string) => {
    page.drawText(label, { x: 50, y: currentY, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(val, { x: 160, y: currentY, size: 10, font: font, color: rgb(0.1, 0.1, 0.1) });
    page.drawLine({ start: { x: 155, y: currentY - 3 }, end: { x: 545, y: currentY - 3 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    currentY -= 30;
  };

  // Draw common metadata fields
  drawFieldRow("Receipt No:", receiptNo, "Date:", date);
  drawSingleFieldRow("Student Name:", studentName);
  drawFieldRow("Course Name:", courseName, "Payment Mode:", paymentMode);

  // Type specific rows
  if (type === 'admission') {
    drawFieldRow("Duration:", data.courseDuration || '1 Year', "Enrollment ID:", data.enrollmentId || 'N/A');
  } else if (type === 'installment') {
    drawFieldRow("Installment No:", `#${data.installmentNumber || 1}`, "Enrollment ID:", data.enrollmentId || 'N/A');
    drawFieldRow("Paid So Far:", `Rs. ${(data.totalPaidSoFar || 0).toLocaleString('en-IN')}`, "Balance Due:", `Rs. ${(data.balanceDue || 0).toLocaleString('en-IN')}`);
  } else if (type === 'exam') {
    drawFieldRow("Purpose:", "Exam Registration Fee", "Enrollment ID:", data.enrollmentId || 'N/A');
  }

  // Draw large Amount Paid callout box
  currentY -= 20;
  page.drawRectangle({
    x: 50,
    y: currentY - 40,
    width: 495,
    height: 50,
    color: rgb(0.95, 0.98, 0.98),
    borderColor: rgb(0.05, 0.58, 0.53),
    borderWidth: 1.5,
  });

  page.drawText("TOTAL AMOUNT PAID:", {
    x: 70,
    y: currentY - 20,
    size: 11,
    font: boldFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  const amtText = `INR ${amountPaid}/-`;
  const amtTextWidth = boldFont.widthOfTextAtSize(amtText, 16);
  page.drawText(amtText, {
    x: 520 - amtTextWidth,
    y: currentY - 22,
    size: 16,
    font: boldFont,
    color: rgb(0.05, 0.58, 0.53),
  });

  // Footer terms box
  currentY -= 120;
  page.drawRectangle({
    x: 50,
    y: currentY - 50,
    width: 495,
    height: 70,
    color: rgb(0.98, 0.95, 0.95),
    borderColor: rgb(0.8, 0.3, 0.3),
    borderWidth: 0.5,
  });

  page.drawText("TERMS & CONDITIONS:", {
    x: 65,
    y: currentY + 6,
    size: 9,
    font: boldFont,
    color: rgb(0.6, 0.1, 0.1),
  });

  const termLines = [
    "• Course Fees, Once Paid Cannot Be Refunded.",
    "• After Admission Is Completed, Cancellation Is Not Allowed.",
    "• Please verify details. Call the office for any billing query."
  ];
  let termY = currentY - 8;
  for (const line of termLines) {
    page.drawText(line, {
      x: 65,
      y: termY,
      size: 8.5,
      font: font,
      color: rgb(0.4, 0.2, 0.2),
    });
    termY -= 12;
  }

  // Signatures
  currentY -= 130;
  page.drawLine({ start: { x: 50, y: currentY }, end: { x: 200, y: currentY }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
  page.drawText("Trainee Signature", { x: 75, y: currentY - 15, size: 9, font: boldFont, color: rgb(0.4, 0.4, 0.4) });

  page.drawLine({ start: { x: 395, y: currentY }, end: { x: 545, y: currentY }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
  page.drawText("Authorized Signatory", { x: 415, y: currentY - 15, size: 9, font: boldFont, color: rgb(0.4, 0.4, 0.4) });

  // Save document bytes
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
    const subject = `TrustCare Receipt - ${data.receiptNo || 'Transaction Alert'}`;
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
          name: "TrustCare Institute",
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
