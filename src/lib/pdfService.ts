import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { createCanvas, loadImage as loadCanvasImage } from 'canvas';
import { FieldLayout } from './pdfTemplates';

export async function makeQrBuffer(text: string): Promise<Buffer> {
  return await QRCode.toBuffer(text, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

export async function loadAndResizePhoto(imageUrl: string, maxWidth = 200, maxHeight = 200): Promise<Buffer> {
  try {
    const image = await loadCanvasImage(imageUrl);
    
    let width = image.width;
    let height = image.height;
    
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(image, 0, 0, width, height);
    
    return canvas.toBuffer('image/jpeg', { quality: 0.8 });
  } catch (err) {
    console.error("Error resizing image", err);
    return await fetchImageAsBuffer(imageUrl);
  }
}

export async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Convert hex to rgb
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
}

export async function generatePdf(
  backgroundBuffer: Buffer,
  fields: FieldLayout[],
  dimensions: { width: number; height: number },
  isPdfTemplate: boolean = false
): Promise<Buffer> {
  let pdfDoc: PDFDocument;
  let page;

  if (isPdfTemplate) {
    pdfDoc = await PDFDocument.load(backgroundBuffer);
    page = pdfDoc.getPages()[0]; // Get the first page
  } else {
    // If it's an image, create a new PDF and embed the image as background
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([dimensions.width, dimensions.height]);
    
    // Auto-detect image type (very basic, usually better to check magic numbers)
    // For now try JPEG then PNG
    let bgImage;
    try {
      bgImage = await pdfDoc.embedJpg(backgroundBuffer);
    } catch (e) {
      bgImage = await pdfDoc.embedPng(backgroundBuffer);
    }
    
    page.drawImage(bgImage, {
      x: 0,
      y: 0,
      width: dimensions.width,
      height: dimensions.height,
    });
  }

  const { width: pageWidth, height: pageHeight } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to translate Y coordinate (pdf-lib originates at bottom-left)
  // Our frontend originates at top-left.
  // Also account for scaling if the uploaded PDF dimensions don't perfectly match frontend dimensions
  const scaleX = pageWidth / dimensions.width;
  const scaleY = pageHeight / dimensions.height;

  for (const field of fields) {
    const x = field.x * scaleX;
    // For text, the y coordinate usually refers to the baseline in pdf-lib, so we add fontSize
    const y = pageHeight - (field.y * scaleY); 
    
    if (field.type === 'text') {
      const fontSize = (field.fontSize || 16) * scaleY;
      const f = field.fontWeight === 'bold' ? boldFont : font;
      
      let textValue = field.value?.toString() || '';
      const textWidth = f.widthOfTextAtSize(textValue, fontSize);
      
      let drawX = x;
      if (field.align === 'center') {
        const fieldWidth = (field.width || 300) * scaleX;
        drawX = x + (fieldWidth / 2) - (textWidth / 2);
      } else if (field.align === 'right') {
        const fieldWidth = (field.width || 300) * scaleX;
        drawX = x + fieldWidth - textWidth;
      }
      
      page.drawText(textValue, {
        x: drawX,
        y: y - fontSize, // Adjust for baseline
        size: fontSize,
        font: f,
        color: hexToRgb(field.color || '#000000'),
      });
      
    } else if (field.type === 'checkbox') {
      // Draw a checkmark using SVG path if value is true or "true"
      const isChecked = field.value === true || field.value === 'true' || field.value === '1';
      if (isChecked) {
        const size = (field.width || 20) * scaleX;
        // Simple X
        page.drawLine({
          start: { x: x, y: y },
          end: { x: x + size, y: y - size },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
        page.drawLine({
          start: { x: x, y: y - size },
          end: { x: x + size, y: y },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
      }
    } else if (field.type === 'image' || field.type === 'qrcode') {
      if (field.value && Buffer.isBuffer(field.value)) {
        let img;
        try {
          img = await pdfDoc.embedPng(field.value);
        } catch (e) {
          try {
            img = await pdfDoc.embedJpg(field.value);
          } catch (err) {
            console.error("Failed to embed field image");
            continue;
          }
        }
        
        const imgWidth = (field.width || 100) * scaleX;
        const imgHeight = (field.height || 100) * scaleY;
        
        page.drawImage(img, {
          x: x,
          y: y - imgHeight, // origin is bottom left, so we subtract height to draw downward
          width: imgWidth,
          height: imgHeight,
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
