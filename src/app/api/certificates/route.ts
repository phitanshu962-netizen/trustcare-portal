import { NextResponse } from 'next/server';
import { generatePdf, fetchImageAsBuffer, makeQrBuffer } from '@/lib/pdfService';
import { FieldLayout } from '@/lib/pdfTemplates';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { adminDb } from '@/lib/firebaseAdmin';

// Simple in-memory cache for the duration of the container's lifecycle
const imageCache = new Map<string, Buffer>();

async function getCachedImage(url: string): Promise<Buffer> {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }
  const buffer = await fetchImageAsBuffer(url);
  imageCache.set(url, buffer);
  return buffer;
}

const applyDataToField = (field: FieldLayout, data: any): FieldLayout => {
  if (!data) return field;
  
  if (field.type === 'text' && typeof field.value === 'string') {
    const newValue = field.value.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || '');
    return { ...field, value: newValue };
  }
  
  if (field.type === 'checkbox' && typeof field.value === 'string') {
    const newValue = field.value.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || '');
    return { ...field, value: newValue === 'true' || newValue === '1' || newValue.toLowerCase() === 'yes' };
  }

  return field;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, templateBase64, isPdfTemplate, fields, dimensions, studentsIds, data } = body;

    if (!templateBase64) {
      return NextResponse.json({ error: "Missing templateBase64" }, { status: 400 });
    }

    // Convert dataURL to buffer
    const base64Data = templateBase64.split(',')[1];
    const backgroundBuffer = Buffer.from(base64Data, 'base64');

    if (action === 'preview') {
      const resolvedFields = await Promise.all(fields.map(async (f: FieldLayout) => {
        const fieldWithData = applyDataToField(f, data);
        if (fieldWithData.type === 'qrcode' && fieldWithData.value) {
          const qrBuffer = await makeQrBuffer(fieldWithData.value as string);
          return { ...fieldWithData, value: qrBuffer };
        }
        return fieldWithData;
      }));

      const pdfBuffer = await generatePdf(backgroundBuffer, resolvedFields, dimensions, isPdfTemplate);

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="preview.pdf"'
        }
      });
    } else if (action === 'bulk_zip' || action === 'bulk_merge') {
      if (!studentsIds || !Array.isArray(studentsIds)) {
        return NextResponse.json({ error: "Missing studentsIds array" }, { status: 400 });
      }

      const pdfBuffers: Buffer[] = [];
      const CONCURRENCY_LIMIT = 5;

      for (let i = 0; i < studentsIds.length; i += CONCURRENCY_LIMIT) {
        const chunk = studentsIds.slice(i, i + CONCURRENCY_LIMIT);
        
        const chunkPromises = chunk.map(async (studentId) => {
          // In a real scenario, fetch student data here `await adminDb.collection('students').doc(studentId).get()`
          // For now, we mock the data payload for bulk processing
          const mockStudentData = { ...data, studentId, studentName: `Student ${studentId}` };
          
          const resolvedFields = await Promise.all(fields.map(async (f: FieldLayout) => {
            const fieldWithData = applyDataToField(f, mockStudentData);
            if (fieldWithData.type === 'qrcode' && fieldWithData.value) {
              const qrBuffer = await makeQrBuffer(fieldWithData.value as string);
              return { ...fieldWithData, value: qrBuffer };
            }
            return fieldWithData;
          }));

          return await generatePdf(backgroundBuffer, resolvedFields, dimensions, isPdfTemplate);
        });

        const chunkResults = await Promise.all(chunkPromises);
        pdfBuffers.push(...chunkResults);
      }

      if (action === 'bulk_zip') {
        const zip = new JSZip();
        pdfBuffers.forEach((buffer, idx) => {
          zip.file(`certificate_${studentsIds[idx]}.pdf`, buffer);
        });
        
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        
        return new NextResponse(zipBuffer as any, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="certificates.zip"'
          }
        });
      } else {
        // bulk_merge
        const mergedPdf = await PDFDocument.create();
        
        for (const pdfBuffer of pdfBuffers) {
          const pdf = await PDFDocument.load(pdfBuffer);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        
        const mergedPdfBytes = await mergedPdf.save();
        
        return new NextResponse(Buffer.from(mergedPdfBytes) as any, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="certificates_merged.pdf"'
          }
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error generating certificates:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
