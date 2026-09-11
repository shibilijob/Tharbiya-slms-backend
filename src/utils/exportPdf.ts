import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const QR_LOGIN_URL = "https://tharbiya-slms-frontend.vercel.app";

export interface ParentCredentialExportRow {
  name: string;
  phone: string;
  password: string;
}

export interface ActiveStudentExportRow {
  registerNumber: string;
  name: string;
  className: string;
  parentName: string;
  parentPhone: string;
}

const collectPdfBuffer = (doc: PDFKit.PDFDocument): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

export const generateParentDetailsPdf = async (
  parents: ParentCredentialExportRow[]
): Promise<Buffer> => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    info: {
      Title: "Parent Details",
      Subject: "Parent login credential cards",
    },
  });
  const done = collectPdfBuffer(doc);

  const qrBuffer = await QRCode.toBuffer(QR_LOGIN_URL, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 132,
  });

  const margin = 36;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const gap = 14;
  const cardWidth = pageWidth - margin * 2;
  const cardHeight = 154;
  let y = margin;

  doc.font("Helvetica-Bold").fontSize(14).text("Parent Login Details", margin, y);
  doc.font("Helvetica").fontSize(9).fillColor("#555").text("Darunnajath Mundambra", margin, y + 18);
  y += 42;

  parents.forEach((parent, index) => {
    if (y + cardHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    doc
      .roundedRect(margin, y, cardWidth, cardHeight, 8)
      .lineWidth(1)
      .strokeColor("#1F2933")
      .stroke();

    doc.fillColor("#1F2933").font("Helvetica-Bold").fontSize(13);
    doc.text("PARENT DETAILS", margin + 24, y + 22, {
      width: cardWidth - 190,
      align: "center",
    });

    const labelX = margin + 28;
    const valueX = margin + 132;
    const textY = y + 58;
    const lineGap = 27;

    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("Parent Name", labelX, textY);
    doc.text("Mobile Number", labelX, textY + lineGap);
    doc.text("Password", labelX, textY + lineGap * 2);

    doc.font("Helvetica").fontSize(11);
    doc.text(`: ${parent.name}`, valueX, textY, { width: cardWidth - 280 });
    doc.text(`: ${parent.phone}`, valueX, textY + lineGap, { width: cardWidth - 280 });
    doc.text(`: ${parent.password}`, valueX, textY + lineGap * 2, { width: cardWidth - 280 });

    const qrSize = 96;
    const qrX = margin + cardWidth - qrSize - 30;
    const qrY = y + 24;
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0F6B50");
    doc.text("Scan to Login", qrX - 4, qrY + qrSize + 4, {
      width: qrSize + 8,
      align: "center",
    });

    doc.fillColor("#667085").font("Helvetica").fontSize(8);
    doc.text(String(index + 1), margin + cardWidth - 18, y + cardHeight - 18, {
      width: 10,
      align: "right",
    });

    y += cardHeight + gap;
  });

  doc.end();
  return done;
};

export const generateActiveStudentsPdf = (
  students: ActiveStudentExportRow[]
): Promise<Buffer> => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    info: {
      Title: "Active Students",
      Subject: "Active student register",
    },
  });
  const done = collectPdfBuffer(doc);

  const margin = 36;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const tableWidth = pageWidth - margin * 2;
  const rowHeight = 30;
  const headerHeight = 30;
  const widths = [32, 96, 136, 64, 116, tableWidth - 32 - 96 - 136 - 64 - 116];
  const headers = ["No.", "Register Number", "Student Name", "Class", "Parent Name", "Mobile Number"];
  let y = margin;

  const drawTitle = () => {
    doc.fillColor("#1F2933").font("Helvetica-Bold").fontSize(14).text("All Active Students", margin, y);
    doc.font("Helvetica").fontSize(9).fillColor("#555").text("Darunnajath Mundambra", margin, y + 18);
    y += 44;
  };

  const drawHeader = () => {
    let x = margin;
    doc.rect(margin, y, tableWidth, headerHeight).fillAndStroke("#FAF8F2", "#1F2933");
    doc.fillColor("#1F2933").font("Helvetica-Bold").fontSize(8);
    headers.forEach((header, index) => {
      doc.text(header, x + 6, y + 10, { width: widths[index] - 12, align: index === 0 ? "center" : "left" });
      if (index > 0) {
        doc.moveTo(x, y).lineTo(x, y + headerHeight).strokeColor("#1F2933").stroke();
      }
      x += widths[index];
    });
    y += headerHeight;
  };

  const ensureSpace = () => {
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  };

  drawTitle();
  drawHeader();

  students.forEach((student, index) => {
    ensureSpace();
    const values = [
      String(index + 1),
      student.registerNumber,
      student.name,
      student.className,
      student.parentName,
      student.parentPhone,
    ];
    let x = margin;
    doc.rect(margin, y, tableWidth, rowHeight).strokeColor("#1F2933").lineWidth(0.6).stroke();
    doc.fillColor("#1F2933").font("Helvetica").fontSize(8.5);
    values.forEach((value, colIndex) => {
      if (colIndex > 0) {
        doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor("#1F2933").stroke();
      }
      doc.text(value || "-", x + 6, y + 8, {
        width: widths[colIndex] - 12,
        height: rowHeight - 10,
        ellipsis: true,
        align: colIndex === 0 ? "center" : "left",
      });
      x += widths[colIndex];
    });
    y += rowHeight;
  });

  doc.end();
  return done;
};

export { QR_LOGIN_URL };
