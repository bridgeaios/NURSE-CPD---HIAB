import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { UserProfile, Webinar } from '../types';

export const generateCertificate = async (user: UserProfile, webinar: Webinar) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Border
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  doc.setDrawColor(180, 150, 100);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(20, 20, 20);
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 45, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text('This is to certify that', pageWidth / 2, 65, { align: 'center' });

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(180, 150, 100);
  doc.text(user.displayName.toUpperCase(), pageWidth / 2, 80, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text(`SANC Number: ${user.sancNumber || 'N/A'}`, pageWidth / 2, 90, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('has successfully completed the accredited CPD activity:', pageWidth / 2, 110, { align: 'center' });

  // Webinar Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(webinar.title, pageWidth / 2, 125, { align: 'center' });

  // Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Provider: ${webinar.provider}`, pageWidth / 2, 140, { align: 'center' });
  doc.text(`Accreditation No: ${webinar.accreditationNumber}`, pageWidth / 2, 148, { align: 'center' });
  doc.text(`Date: ${format(webinar.startTime.toDate(), 'PPP')}`, pageWidth / 2, 156, { align: 'center' });

  // Points
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(180, 150, 100);
  doc.text(`${webinar.cpdPoints} CPD POINTS`, pageWidth / 2, 175, { align: 'center' });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('This certificate is verifiable and issued electronically.', pageWidth / 2, 190, { align: 'center' });

  // QR Code for Verification
  const registrationId = `${user.uid}_${webinar.id}`;
  const verifyUrl = `${window.location.origin}/verify/${registrationId}`;
  
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 100,
      color: {
        dark: '#141414',
        light: '#ffffff'
      }
    });
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 45, pageHeight - 45, 30, 30);
    doc.setFontSize(8);
    doc.text('Scan to Verify', pageWidth - 30, pageHeight - 12, { align: 'center' });
  } catch (err) {
    console.error('Failed to generate QR code', err);
  }

  // Signatures (Placeholders)
  doc.setDrawColor(20, 20, 20);
  doc.line(40, 175, 100, 175);
  doc.text('Program Director', 70, 182, { align: 'center' });

  doc.line(pageWidth - 100, 175, pageWidth - 40, 175);
  doc.text('Accreditation Officer', pageWidth - 70, 182, { align: 'center' });

  return doc.output('bloburl');
};
