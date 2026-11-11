import PDFDocument from "pdfkit";

export interface MuallimPdfDayRecord {
  dateStr: string;
  dayNumber: number;
  dayName: string;
  shift1: string;
  shift2: string;
  shift3: string;
  shift1Reason?: string | null;
  shift2Reason?: string | null;
  shift3Reason?: string | null;
  summary: string;
}

export interface MuallimPdfReportItem {
  id: string;
  name: string;
  phone: string;
  designation: string;
  assignedClasses?: string[];
  stats: {
    totalScheduledShifts: number;
    presentShifts: number;
    clShifts: number;
    hplShifts: number;
    llpShifts: number;
    holidayShifts: number;
    notRecordedShifts: number;
    presentDayEquivalent: number;
    clDayEquivalent: number;
    hplDayEquivalent: number;
    llpDayEquivalent: number;
    holidayDayEquivalent: number;
    attendancePercentage: number;
  };
  dailyRecords: MuallimPdfDayRecord[];
}

export interface MuallimAttendancePdfOptions {
  year: number;
  month: number;
  monthName: string;
  isIndividual?: boolean;
  items: MuallimPdfReportItem[];
}

const collectPdfBuffer = (doc: PDFKit.PDFDocument): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

export const generateMuallimMonthlyAttendancePdf = async (
  options: MuallimAttendancePdfOptions
): Promise<Buffer> => {
  // A4 Landscape Layout for clear three-shift date-wise columns
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 28,
    bufferPages: true,
    info: {
      Title: `${options.isIndividual ? "Individual" : "Full"} Muallim Attendance Register - ${options.monthName} ${options.year}`,
      Author: "Darunnajath Madrasa Mundambra",
    },
  });

  const bufferPromise = collectPdfBuffer(doc);
  const margin = 28;
  const pageWidth = doc.page.width; // 841.89 pt
  const pageHeight = doc.page.height; // 595.28 pt
  const contentWidth = pageWidth - margin * 2; // ~785 pt

  // Column widths for landscape table (sum = 785 pt)
  const colWidths = {
    date: 95,
    shift1: 180,
    shift2: 180,
    shift3: 180,
    summary: 150,
  };

  options.items.forEach((item, itemIdx) => {
    if (itemIdx > 0) {
      doc.addPage();
    }

    let y = margin;

    // Header Banner
    doc.rect(margin, y, contentWidth, 42).fill("#084C3A");
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(13);
    doc.text("DARUNNAJATH MADRASA MUNDAMBRA", margin, y + 8, {
      width: contentWidth,
      align: "center",
    });

    const reportTitle = options.isIndividual
      ? `INDIVIDUAL MUALLIM MONTHLY ATTENDANCE REPORT — ${options.monthName.toUpperCase()} ${options.year}`
      : `MONTHLY MUALLIM ATTENDANCE REGISTER — ${options.monthName.toUpperCase()} ${options.year}`;

    doc.fillColor("#C9A227").font("Helvetica-Bold").fontSize(9);
    doc.text(reportTitle, margin, y + 24, { width: contentWidth, align: "center" });

    y += 48;

    // Muallim Information Card
    doc.rect(margin, y, contentWidth, 34).fillAndStroke("#FAF8F2", "#E3EAE6");

    doc.fillColor("#1F2933").font("Helvetica-Bold").fontSize(10.5);
    doc.text(`Usthad: ${item.name}`, margin + 10, y + 7);

    doc.font("Helvetica").fontSize(8.5).fillColor("#555555");
    const classStr = item.assignedClasses?.length ? item.assignedClasses.join(", ") : "None";
    doc.text(
      `Designation: ${item.designation || "Muallim"}   |   Phone: ${item.phone}   |   Assigned Class: ${classStr}`,
      margin + 10,
      y + 20
    );

    y += 40;

    // Monthly Statistics Summary Box (7 metric blocks)
    const statBoxWidth = contentWidth / 7;
    const statBoxHeight = 36;
    const statBoxes = [
      {
        label: "Scheduled",
        val: `${item.stats.totalScheduledShifts} shifts`,
        sub: "Duty Shifts",
        color: "#1F2933",
      },
      {
        label: "Present",
        val: `${item.stats.presentShifts} shifts`,
        sub: `${item.stats.presentDayEquivalent} days`,
        color: "#0F6B50",
      },
      {
        label: "Casual Leave",
        val: `${item.stats.clShifts} shifts`,
        sub: `${item.stats.clDayEquivalent} days`,
        color: "#2563EB",
      },
      {
        label: "Half Pay Leave",
        val: `${item.stats.hplShifts} shifts`,
        sub: `${item.stats.hplDayEquivalent} days`,
        color: "#D97706",
      },
      {
        label: "Leave W/O Pay",
        val: `${item.stats.llpShifts} shifts`,
        sub: `${item.stats.llpDayEquivalent} days`,
        color: "#DC2626",
      },
      {
        label: "Holiday",
        val: `${item.stats.holidayShifts} shifts`,
        sub: `${item.stats.holidayDayEquivalent} days`,
        color: "#7C3AED",
      },
      {
        label: "Attendance %",
        val: `${item.stats.attendancePercentage}%`,
        sub: "Monthly Ratio",
        color: "#084C3A",
      },
    ];

    statBoxes.forEach((bx, bIdx) => {
      const bxX = margin + bIdx * statBoxWidth;
      doc.rect(bxX, y, statBoxWidth - 3, statBoxHeight).fillAndStroke("#F3F7F5", "#DDEDE5");
      doc.fillColor("#666666").font("Helvetica").fontSize(7);
      doc.text(bx.label.toUpperCase(), bxX + 4, y + 4, { width: statBoxWidth - 11, align: "center" });
      doc.fillColor(bx.color).font("Helvetica-Bold").fontSize(8.5);
      doc.text(bx.val, bxX + 4, y + 14, { width: statBoxWidth - 11, align: "center" });
      doc.fillColor("#555555").font("Helvetica").fontSize(7);
      doc.text(bx.sub, bxX + 4, y + 24, { width: statBoxWidth - 11, align: "center" });
    });

    y += statBoxHeight + 8;

    // Helper to print table headers
    const printTableHeader = (curY: number) => {
      doc.rect(margin, curY, contentWidth, 20).fill("#0F6B50");
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);

      let colX = margin;
      doc.text("Date & Day", colX + 4, curY + 6, { width: colWidths.date });
      colX += colWidths.date;
      doc.text("Shift 1 (6:00 AM – 7:15 AM)", colX + 4, curY + 6, { width: colWidths.shift1 });
      colX += colWidths.shift1;
      doc.text("Shift 2 (7:30 AM – 9:30 AM)", colX + 4, curY + 6, { width: colWidths.shift2 });
      colX += colWidths.shift2;
      doc.text("Shift 3 (6:30 PM – 9:30 PM)", colX + 4, curY + 6, { width: colWidths.shift3 });
      colX += colWidths.shift3;
      doc.text("Day Summary", colX + 4, curY + 6, { width: colWidths.summary });
      return curY + 20;
    };

    y = printTableHeader(y);

    const rowHeight = 22; // allows two lines (status + optional holiday reason)

    item.dailyRecords.forEach((day, rIdx) => {
      // Check for page break
      if (y + rowHeight > pageHeight - margin - 30) {
        doc.addPage();
        y = margin;

        // Re-print continuation header
        doc.rect(margin, y, contentWidth, 24).fill("#084C3A");
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
        doc.text(
          `DARUNNAJATH MADRASA MUNDAMBRA — ${item.name} (${options.monthName} ${options.year} Continued)`,
          margin,
          y + 7,
          { width: contentWidth, align: "center" }
        );
        y += 28;
        y = printTableHeader(y);
      }

      const isEven = rIdx % 2 === 0;
      doc.rect(margin, y, contentWidth, rowHeight).fill(isEven ? "#FFFFFF" : "#F9FAFB");
      doc.rect(margin, y, contentWidth, rowHeight).strokeColor("#E5E7EB").lineWidth(0.5).stroke();

      let cellX = margin;

      // Column 1: Date & Day
      doc.fillColor("#1F2933").font("Helvetica-Bold").fontSize(7.5);
      doc.text(
        `${String(day.dayNumber).padStart(2, "0")} ${options.monthName.slice(0, 3)} (${day.dayName.slice(0, 3)})`,
        cellX + 4,
        y + 6,
        { width: colWidths.date - 8 }
      );
      cellX += colWidths.date;

      // Helper to render shift cell with optional holiday reason
      const renderShiftCell = (
        status: string,
        reason: string | null | undefined,
        width: number
      ) => {
        if (!status || status === "NOT_RECORDED") {
          doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7.5);
          doc.text("Not Recorded", cellX + 4, y + 6, { width: width - 8 });
        } else if (status === "HOLIDAY") {
          doc.fillColor("#7C3AED").font("Helvetica-Bold").fontSize(7.5);
          doc.text("Holiday", cellX + 4, y + (reason ? 3 : 6), { width: width - 8 });
          if (reason) {
            doc.fillColor("#4B5563").font("Helvetica-Oblique").fontSize(6.5);
            doc.text(reason, cellX + 4, y + 12, {
              width: width - 8,
              lineBreak: false,
              ellipsis: true,
            });
          }
        } else if (status === "PRESENT") {
          doc.fillColor("#0F6B50").font("Helvetica-Bold").fontSize(7.5);
          doc.text("Present", cellX + 4, y + 6, { width: width - 8 });
        } else if (status === "CL") {
          doc.fillColor("#2563EB").font("Helvetica-Bold").fontSize(7.5);
          doc.text("CL (Casual Leave)", cellX + 4, y + 6, { width: width - 8 });
        } else if (status === "HPL") {
          doc.fillColor("#D97706").font("Helvetica-Bold").fontSize(7.5);
          doc.text("HPL (Half Pay Leave)", cellX + 4, y + 6, { width: width - 8 });
        } else if (status === "LLP") {
          doc.fillColor("#DC2626").font("Helvetica-Bold").fontSize(7.5);
          doc.text("LLP (Leave W/O Pay)", cellX + 4, y + 6, { width: width - 8 });
        } else {
          doc.fillColor("#1F2933").font("Helvetica").fontSize(7.5);
          doc.text(status, cellX + 4, y + 6, { width: width - 8 });
        }
        cellX += width;
      };

      // Column 2: Shift 1
      renderShiftCell(day.shift1, day.shift1Reason, colWidths.shift1);

      // Column 3: Shift 2
      renderShiftCell(day.shift2, day.shift2Reason, colWidths.shift2);

      // Column 4: Shift 3
      renderShiftCell(day.shift3, day.shift3Reason, colWidths.shift3);

      // Column 5: Day Summary
      doc.fillColor("#4B5563").font("Helvetica").fontSize(7.5);
      doc.text(day.summary || "-", cellX + 4, y + 6, {
        width: colWidths.summary - 8,
        lineBreak: false,
        ellipsis: true,
      });

      y += rowHeight;
    });

    // Signature Line
    if (y + 30 > pageHeight - margin - 20) {
      doc.addPage();
      y = margin + 20;
    } else {
      y += 12;
    }

    doc.fillColor("#374151").font("Helvetica-Bold").fontSize(8);
    doc.text("Sadhr Muallim Signature: _______________________", margin + 10, y);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      margin + contentWidth - 180,
      y,
      { align: "right" }
    );
  });

  // Stamp Page Numbers on all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor("#6B7280").font("Helvetica").fontSize(7.5);
    doc.text(
      `Page ${i + 1} of ${range.count}   •   Darunnajath Madrasa Mundambra   •   Monthly Attendance Register`,
      margin,
      pageHeight - 20,
      { width: contentWidth, align: "center" }
    );
  }

  doc.end();
  return bufferPromise;
};
