import jsPDF from 'jspdf';
import { booksAPI } from '../lib/api';
import { getFontById } from '../config/fonts';
import logo from '../assets/dreamweaverlogo3.png';

/**
 * Generates a PDF for a selected book and triggers a download.
 * @param {Object} selectedBook - The book object containing details and pages.
 */
export const handlePrint = async (selectedBook) => {
  if (!selectedBook) return;

  const fontConfig = getFontById(selectedBook.font);
  const pdfFont = fontConfig.pdf || 'helvetica';
  
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Convert logo to base64 for embedding in PDF
  const getLogoBase64 = () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = logo;
    });
  };

  const logoBase64 = await getLogoBase64();

  const getImageFormat = (dataUrl) => {
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'PNG';
  };

  const fetchImageAsBase64 = async (url) => {
    try {
      const result = await booksAPI.proxyImage(url);
      return result.data;
    } catch (err) {
      console.error('Failed to load image:', url, err);
      return null;
    }
  };

  const getImageDimensions = (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 100, height: 100 });
      img.src = base64;
    });
  };

  const imgInfos = await Promise.all(selectedBook.pages.map(async (p) => {
    const imgUrl = p.ai_image_url || p.image_url;
    if (!imgUrl) return null;
    const b64 = await fetchImageAsBase64(imgUrl);
    if (!b64) return null;
    const dims = await getImageDimensions(b64);
    return { b64, ...dims };
  }));

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

  for (let i = 0; i < selectedBook.pages.length; i++) {
    const page = selectedBook.pages[i];
    const imgInfo = imgInfos[i];

    if (i > 0) doc.addPage();

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
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(28);
      doc.setTextColor(50, 50, 50);
      const titleY = imgInfo ? titleYOffset : pageHeight / 2 - 40;
      const titleLines = doc.splitTextToSize(page.content, contentWidth);
      doc.text(titleLines, pageWidth / 2, titleY, { align: 'center', maxWidth: contentWidth });
      doc.setDrawColor(180, 140, 220);
      doc.setLineWidth(2);
      doc.line(pageWidth / 2 - 40, titleY + 20, pageWidth / 2 + 40, titleY + 20);
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

      doc.setFont(pdfFont, 'italic');
      doc.setFontSize(16);
      doc.setTextColor(60, 60, 60);
      const textLines = doc.splitTextToSize(page.content, contentWidth);
      doc.text(textLines, margin, textStartY, { maxWidth: contentWidth, lineHeightFactor: 1.6 });

      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(160, 160, 160);
      doc.text(`Page ${page.page_number}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
    }

    // Add watermark to every page
    addWatermark();
  }

  doc.save(`${selectedBook.title.replace(/\s+/g, '_')}.pdf`);
};
