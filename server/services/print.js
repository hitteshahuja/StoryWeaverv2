const fs = require('fs');
const path = require('path');
// Note: jsPDF is a client-side library and cannot be used on the server
// This file is kept for reference but is not currently functional
// PDF generation happens client-side in client/src/utils/printHelpers.js

/**
 * Map text size selection to PDF font sizes
 */
const getFontSizes = (textSize) => {
  const sizeMap = {
    sm: { title: 24, content: 14, dedication: 10, pageNumber: 9, conclusion: 18 },
    md: { title: 28, content: 16, dedication: 12, pageNumber: 10, conclusion: 20 },
    lg: { title: 32, content: 18, dedication: 14, pageNumber: 11, conclusion: 22 },
  };
  return sizeMap[textSize] || sizeMap.md;
};

/**
 * Draw decorative border on PDF page
 */
const drawBorder = (doc, borderStyle, pageWidth, pageHeight, margin) => {
  if (!borderStyle || borderStyle === 'None') return;

  const borderMargin = margin - 15;
  const borderWidth = pageWidth - borderMargin * 2;
  const borderHeight = pageHeight - borderMargin * 2;

  doc.setLineWidth(2);

  switch (borderStyle) {
    case 'Classic':
      doc.setDrawColor(100, 100, 100);
      doc.rect(borderMargin, borderMargin, borderWidth, borderHeight);
      doc.rect(borderMargin + 5, borderMargin + 5, borderWidth - 10, borderHeight - 10);
      break;

    case 'Floral':
      doc.setDrawColor(180, 140, 220);
      doc.setLineWidth(3);
      doc.rect(borderMargin, borderMargin, borderWidth, borderHeight);
      doc.setFillColor(180, 140, 220);
      const cornerSize = 8;
      doc.circle(borderMargin, borderMargin, cornerSize, 'F');
      doc.circle(borderMargin + borderWidth, borderMargin, cornerSize, 'F');
      doc.circle(borderMargin, borderMargin + borderHeight, cornerSize, 'F');
      doc.circle(borderMargin + borderWidth, borderMargin + borderHeight, cornerSize, 'F');
      break;

    case 'Stars':
      doc.setDrawColor(255, 215, 0);
      doc.setLineWidth(2);
      doc.setLineDash([10, 5]);
      doc.rect(borderMargin, borderMargin, borderWidth, borderHeight);
      doc.setLineDash([]);
      doc.setFillColor(255, 215, 0);
      const starSize = 6;
      doc.circle(borderMargin, borderMargin, starSize, 'F');
      doc.circle(borderMargin + borderWidth, borderMargin, starSize, 'F');
      doc.circle(borderMargin, borderMargin + borderHeight, starSize, 'F');
      doc.circle(borderMargin + borderWidth, borderMargin + borderHeight, starSize, 'F');
      break;

    case 'Royal':
      doc.setDrawColor(139, 69, 19);
      doc.setLineWidth(1);
      doc.rect(borderMargin, borderMargin, borderWidth, borderHeight);
      doc.rect(borderMargin + 3, borderMargin + 3, borderWidth - 6, borderHeight - 6);
      doc.setLineWidth(2);
      doc.rect(borderMargin + 7, borderMargin + 7, borderWidth - 14, borderHeight - 14);
      break;

    default:
      break;
  }
};

async function handlePrint(book) {
    const fontSizes = getFontSizes(book.text_size);
    
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // Load logo as base64
    const logoPath = path.join(__dirname, '../public/dreamweaverlogo3.png');
    let logoBase64 = null;
    try {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
        console.warn('Logo not found for PDF watermark:', err.message);
    }

    // Helper function to add watermark to each page
    const addWatermark = () => {
        const watermarkText = 'Created with AI Dreamweaver';
        const logoSize = 12; // Height of logo in points
        const textX = pageWidth - margin - 120;
        const textY = pageHeight - 15;
        
        // Add logo if available
        if (logoBase64) {
            const logoX = textX - logoSize - 5; // 5pt gap between logo and text
            doc.addImage(logoBase64, 'PNG', logoX, textY - logoSize + 2, logoSize, logoSize);
        }
        
        // Add text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text(watermarkText, textX, textY, { align: 'left' });
    };

    const getImageFormat = (dataUrl) => {
        if (dataUrl.startsWith('data:image/png')) return 'PNG';
        if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
        if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
        return 'PNG';
    };

    // Note: Server-side PDF generation would need to fetch images differently
    // This is a placeholder - actual implementation would need axios or similar
    const fetchImageAsBase64 = async (url) => {
        // TODO: Implement server-side image fetching
        console.warn('Server-side image fetching not implemented');
        return null;
    };

    const getImageDimensions = (base64) => {
        // TODO: Implement server-side image dimension detection
        return { width: 100, height: 100 };
    };

    const imgInfos = await Promise.all(book.pages.map(async (p) => {
        const imgUrl = p.ai_image_url || p.image_url;
        if (!imgUrl) return null;
        const b64 = await fetchImageAsBase64(imgUrl);
        if (!b64) return null;
        const dims = getImageDimensions(b64);
        return { b64, ...dims };
    }));

    for (let i = 0; i < book.pages.length; i++) {
        const page = book.pages[i];
        const imgInfo = imgInfos[i];

        if (i > 0) doc.addPage();

        // Draw border first (so it's behind content)
        drawBorder(doc, book.border_style, pageWidth, pageHeight, margin);

        if (page.type === 'title') {
            let titleYOffset = margin + 20;
            if (imgInfo) {
                const maxBox = Math.min(contentWidth, 350);
                const aspectRatio = imgInfo.width / imgInfo.height;
                let targetW = maxBox;
                let targetH = targetW / aspectRatio;

                if (targetH > maxBox) {
                    targetH = maxBox;
                    targetW = targetH * aspectRatio;
                }

                const imgX = (pageWidth - targetW) / 2;
                doc.addImage(imgInfo.b64, getImageFormat(imgInfo.b64), imgX, margin + 20, targetW, targetH);
                titleYOffset = margin + 20 + targetH + 40;
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(fontSizes.title);
            doc.setTextColor(50, 50, 50);
            const titleY = imgInfo ? titleYOffset : pageHeight / 2 - 40;
            const titleLines = doc.splitTextToSize(page.content, contentWidth);
            doc.text(titleLines, pageWidth / 2, titleY, { align: 'center', maxWidth: contentWidth });
            doc.setDrawColor(180, 140, 220);
            doc.setLineWidth(2);
            doc.line(pageWidth / 2 - 40, titleY + 20, pageWidth / 2 + 40, titleY + 20);

            if (page.dedication) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(fontSizes.dedication);
                doc.setTextColor(140, 140, 140);
                doc.text(page.dedication, pageWidth / 2, titleY + 45, { align: 'center' });
            }
        } else if (page.type === 'conclusion') {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(fontSizes.conclusion);
            doc.setTextColor(80, 80, 80);
            const endLines = doc.splitTextToSize(page.content, contentWidth);
            doc.text(endLines, pageWidth / 2, pageHeight / 2, { align: 'center', maxWidth: contentWidth, lineHeightFactor: 1.6 });
        } else {
            let textStartY = margin + 40;
            if (imgInfo) {
                const maxHeight = 400;
                const aspectRatio = imgInfo.width / imgInfo.height;
                let targetW = contentWidth;
                let targetH = targetW / aspectRatio;

                if (targetH > maxHeight) {
                    targetH = maxHeight;
                    targetW = targetH * aspectRatio;
                }

                const imgX = margin + (contentWidth - targetW) / 2;
                doc.addImage(imgInfo.b64, getImageFormat(imgInfo.b64), imgX, margin, targetW, targetH);
                textStartY = margin + targetH + 30;
            }

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(fontSizes.content);
            doc.setTextColor(60, 60, 60);
            const textLines = doc.splitTextToSize(page.content, contentWidth);
            doc.text(textLines, margin, textStartY, { maxWidth: contentWidth, lineHeightFactor: 1.6 });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(fontSizes.pageNumber);
            doc.setTextColor(160, 160, 160);
            doc.text(`Page ${page.page_number}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
        }

        // Add watermark to every page
        addWatermark();
    }

    doc.save(`${book.title.replace(/\s+/g, '_')}.pdf`);
};

module.exports = { handlePrint };