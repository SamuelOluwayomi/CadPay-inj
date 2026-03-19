
import jsPDF from 'jspdf';
import { Receipt } from '@/types/Receipt';

export const generateReceiptPDF = (receipt: Receipt) => {
    const doc = new jsPDF();

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Colors
    const primaryColor = '#f97316'; // Orange
    const grayColor = '#71717A';
    const darkColor = '#18181B';

    let yPos = 20;

    // Header: CadPay Logo (orange badge with 'C') + Name
    doc.setFillColor(primaryColor);
    doc.roundedRect(margin, yPos - 6, 12, 12, 3, 3, 'F'); 
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('C', margin + 4.5, yPos + 2);

    // CadPay text next to logo
    doc.setFontSize(28);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('CadPay', margin + 16, yPos + 3);

    yPos += 12;
    doc.setFontSize(10);
    doc.setTextColor(grayColor);
    doc.text('Official Payment Receipt', margin, yPos);

    // Add horizontal line
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Receipt Details Section
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Details', margin, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Service Name
    doc.setTextColor(grayColor);
    doc.text('Service:', margin, yPos);
    doc.setTextColor(darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.service_name, margin + 50, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'normal');

    // Plan Name
    doc.setTextColor(grayColor);
    doc.text('Plan:', margin, yPos);
    doc.setTextColor(darkColor);
    doc.text(receipt.plan_name, margin + 50, yPos);

    yPos += 8;

    // Amount (INJ)
    doc.setTextColor(grayColor);
    doc.text('Amount:', margin, yPos);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`${receipt.amount_inj.toFixed(2)} INJ`, margin + 50, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'normal');

    // Amount (USD)
    doc.setTextColor(grayColor);
    doc.text('USD Equivalent:', margin, yPos);
    doc.setTextColor(darkColor);
    doc.text(`$${receipt.amount_usd.toFixed(2)} USD`, margin + 50, yPos);

    yPos += 8;

    // Status
    doc.setTextColor(grayColor);
    doc.text('Status:', margin, yPos);
    doc.setTextColor(receipt.status === 'completed' ? '#10B981' : '#EF4444');
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.status.toUpperCase(), margin + 50, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'normal');

    // Timestamp
    doc.setTextColor(grayColor);
    doc.text('Date:', margin, yPos);
    doc.setTextColor(darkColor);
    const date = new Date(receipt.timestamp);
    doc.text(date.toLocaleString(), margin + 50, yPos);

    // Add separator
    yPos += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Sender/Receiver Details
    doc.setFontSize(12);
    doc.setTextColor(darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Transfer Details', margin, yPos);

    yPos += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Sender
    doc.setTextColor(grayColor);
    doc.text('Sender:', margin, yPos);
    doc.setTextColor(darkColor);
    doc.text(receipt.sender_address || receipt.wallet_address || 'N/A', margin + 30, yPos);
    
    yPos += 6;
    
    // Receiver
    doc.setTextColor(grayColor);
    doc.text('Receiver:', margin, yPos);
    doc.setTextColor(darkColor);
    doc.text(receipt.receiver_address || receipt.merchant_wallet || 'N/A', margin + 30, yPos);

    // Add separator
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // Transaction ID Section
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction ID (Hash)', margin, yPos);

    yPos += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);

    const txId = receipt.tx_signature || 'N/A';
    const maxWidth = pageWidth - (2 * margin);
    const lines = doc.splitTextToSize(txId, maxWidth);
    doc.text(lines, margin, yPos);

    yPos += lines.length * 5 + 10;

    // Footer
    yPos += 20;
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text('Thank you for using CadPay!', pageWidth / 2, yPos, { align: 'center' });

    yPos += 5;
    doc.text('For support, visit cadpay.io/support', pageWidth / 2, yPos, { align: 'center' });

    // Generate filename
    const filename = `CadPay_Receipt_${receipt.id}_${Date.now()}.pdf`;

    // Download PDF
    doc.save(filename);
};
