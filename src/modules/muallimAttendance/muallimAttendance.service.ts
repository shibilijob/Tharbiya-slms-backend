import mongoose from "mongoose";
import User, { IUser } from "../../models/User.js";
import Class from "../../models/Class.js";
import MuallimAttendance from "../../models/MuallimAttendance.js";
import {
  MUALLIM_SHIFTS,
  MuallimShiftId,
  MuallimAttendanceStatusType,
} from "../../constants/muallimShifts.js";
import { AppError } from "../../utils/AppError.js";
import {
  generateMuallimMonthlyAttendancePdf,
  MuallimPdfReportItem,
} from "./muallimAttendance.pdf.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface SaveShiftAttendanceRecordDTO {
  userId: string;
  shiftId: MuallimShiftId;
  status: MuallimAttendanceStatusType | "" | null;
  remarks?: string;
  holidayReason?: string | null;
}

export interface SaveBulkAttendanceDTO {
  date: string;
  records: SaveShiftAttendanceRecordDTO[];
}

export class MuallimAttendanceService {
  /**
   * Helper: Normalize YYYY-MM-DD string to exact UTC midnight Date
   */
  normalizeDate(dateInput: string | Date): Date {
    const str =
      typeof dateInput === "string"
        ? dateInput.split("T")[0]
        : new Date(dateInput).toISOString().split("T")[0];
    const [y, m, d] = str.split("-").map(Number);
    if (!y || !m || !d) {
      throw new AppError("Invalid date format. Expected YYYY-MM-DD", 400);
    }
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }

  /**
   * Format Date to YYYY-MM-DD
   */
  formatDateStr(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Helper: Get active Muallims with their assigned class names
   */
  async getActiveMuallims() {
    const teachers = await User.find({
      role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
      isActive: true,
    })
      .sort({ name: 1 })
      .select("name phone email role designation assignedClasses createdAt");

    const teacherIds = teachers.map((t) => t._id);
    const classes = await Class.find({
      classTeacherId: { $in: teacherIds },
      isActive: true,
    }).select("name classTeacherId");

    const classesByTeacher = new Map<string, string[]>();
    for (const c of classes) {
      const tId = c.classTeacherId?.toString();
      if (!tId) continue;
      const list = classesByTeacher.get(tId) || [];
      list.push(c.name);
      classesByTeacher.set(tId, list);
    }

    return teachers.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      phone: t.phone,
      email: t.email,
      role: t.role,
      designation:
        t.designation || (t.role === "SADHR_MUALLIM" ? "Sadhr Muallim" : "Muallim"),
      assignedClasses: classesByTeacher.get(t._id.toString()) || t.assignedClasses || [],
    }));
  }

  /**
   * Retrieve all Muallim attendance records for the selected date
   */
  async getDailyAttendance(dateStr: string) {
    const targetDate = this.normalizeDate(dateStr || new Date());
    const formattedDate = this.formatDateStr(targetDate);

    const [muallims, records] = await Promise.all([
      this.getActiveMuallims(),
      MuallimAttendance.find({ date: targetDate })
        .populate("userId", "name phone designation")
        .lean(),
    ]);

    const formattedRecords = records.map((r: any) => ({
      id: r._id.toString(),
      userId: r.userId?._id ? r.userId._id.toString() : r.userId?.toString(),
      date: formattedDate,
      shiftId: r.shiftId,
      status: r.status,
      remarks: r.remarks || "",
      holidayReason: r.status === "HOLIDAY" ? (r.holidayReason || r.remarks || null) : null,
      markedBy: r.markedBy?.toString(),
      updatedBy: r.updatedBy?.toString(),
      updatedAt: r.updatedAt,
    }));

    return {
      date: formattedDate,
      shifts: MUALLIM_SHIFTS,
      muallims,
      records: formattedRecords,
    };
  }

  /**
   * Save attendance for multiple Muallims and shifts for the selected date
   */
  async saveBulkAttendance(data: SaveBulkAttendanceDTO, markedById: string) {
    if (!data.date || !Array.isArray(data.records)) {
      throw new AppError("Invalid payload: date and records array required", 400);
    }

    const targetDate = this.normalizeDate(data.date);
    const markedByObjectId = new mongoose.Types.ObjectId(markedById);

    const validStatuses = new Set(["PRESENT", "CL", "HPL", "LLP", "HOLIDAY"]);
    const validShifts = new Set(["SHIFT_1", "SHIFT_2", "SHIFT_3"]);

    const operations: any[] = [];

    for (const item of data.records) {
      if (!item.userId || !mongoose.Types.ObjectId.isValid(item.userId)) continue;
      if (!validShifts.has(item.shiftId)) continue;

      const userObjectId = new mongoose.Types.ObjectId(item.userId);
      const filter = {
        userId: userObjectId,
        date: targetDate,
        shiftId: item.shiftId,
      };

      if (item.status && validStatuses.has(item.status)) {
        // Store holidayReason only when status is HOLIDAY; clear if status is changed to another status
        const isHoliday = item.status === "HOLIDAY";
        const holidayReasonVal = isHoliday
          ? (item.holidayReason !== undefined ? item.holidayReason : item.remarks || null)
          : null;

        // Upsert record
        operations.push({
          updateOne: {
            filter,
            update: {
              $set: {
                status: item.status,
                remarks: item.remarks || "",
                holidayReason: holidayReasonVal,
                markedBy: markedByObjectId,
                updatedBy: markedByObjectId,
              },
            },
            upsert: true,
          },
        });
      } else {
        // Not Recorded: remove record if it existed
        operations.push({
          deleteOne: {
            filter,
          },
        });
      }
    }

    if (operations.length > 0) {
      try {
        await MuallimAttendance.bulkWrite(operations, { ordered: false });
      } catch (err: any) {
        const isDuplicateKeyError =
          err.code === 11000 ||
          (err.message && err.message.includes("E11000")) ||
          (Array.isArray(err.writeErrors) && err.writeErrors.some((we: any) => we.code === 11000));

        if (isDuplicateKeyError) {
          // Retry updateOne operations with upsert: false
          const retryOps = operations.map((op) => {
            if (op.updateOne) {
              return {
                updateOne: {
                  filter: op.updateOne.filter,
                  update: op.updateOne.update,
                  upsert: false,
                },
              };
            }
            return op;
          });
          await MuallimAttendance.bulkWrite(retryOps, { ordered: false });
        } else {
          throw err;
        }
      }
    }

    return this.getDailyAttendance(this.formatDateStr(targetDate));
  }

  /**
   * Declare a selected shift as a holiday for all active Muallims
   */
  async declareShiftHoliday(
    dateStr: string,
    shiftId: MuallimShiftId,
    remarks: string | undefined,
    markedById: string
  ) {
    if (!["SHIFT_1", "SHIFT_2", "SHIFT_3"].includes(shiftId)) {
      throw new AppError(`Invalid shift ID: ${shiftId}`, 400);
    }

    const targetDate = this.normalizeDate(dateStr);
    const markedByObjectId = new mongoose.Types.ObjectId(markedById);

    const activeMuallims = await User.find({
      role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
      isActive: true,
    }).select("_id");

    const operations = activeMuallims.map((m) => ({
      updateOne: {
        filter: {
          userId: m._id,
          date: targetDate,
          shiftId: shiftId,
        },
        update: {
          $set: {
            status: "HOLIDAY" as MuallimAttendanceStatusType,
            remarks: remarks || "Institutional Holiday",
            holidayReason: remarks || null,
            markedBy: markedByObjectId,
            updatedBy: markedByObjectId,
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await MuallimAttendance.bulkWrite(operations, { ordered: false });
    }

    return this.getDailyAttendance(this.formatDateStr(targetDate));
  }

  /**
   * Declare all three shifts as holidays for all active Muallims
   */
  async declareFullDayHoliday(
    dateStr: string,
    remarks: string | undefined,
    markedById: string
  ) {
    const targetDate = this.normalizeDate(dateStr);
    const markedByObjectId = new mongoose.Types.ObjectId(markedById);

    const activeMuallims = await User.find({
      role: { $in: ["MUALLIM", "SADHR_MUALLIM"] },
      isActive: true,
    }).select("_id");

    const shifts: MuallimShiftId[] = ["SHIFT_1", "SHIFT_2", "SHIFT_3"];
    const operations: any[] = [];

    for (const m of activeMuallims) {
      for (const shiftId of shifts) {
        operations.push({
          updateOne: {
            filter: {
              userId: m._id,
              date: targetDate,
              shiftId,
            },
            update: {
              $set: {
                status: "HOLIDAY" as MuallimAttendanceStatusType,
                remarks: remarks || "Full Day Institutional Holiday",
                holidayReason: remarks || null,
                markedBy: markedByObjectId,
                updatedBy: markedByObjectId,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (operations.length > 0) {
      await MuallimAttendance.bulkWrite(operations, { ordered: false });
    }

    return this.getDailyAttendance(this.formatDateStr(targetDate));
  }

  /**
   * Retrieve monthly attendance data and summaries
   */
  async getMonthlyReport(yearNum: number, monthNum: number, userId?: string) {
    const year = Number(yearNum) || new Date().getFullYear();
    const month = Number(monthNum) || new Date().getMonth() + 1;

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    // 1. Fetch active Muallims
    const muallims = await this.getActiveMuallims();
    const targetMuallims = userId
      ? muallims.filter((m) => m.id === userId)
      : muallims;

    if (userId && targetMuallims.length === 0) {
      throw new AppError("Muallim not found or inactive", 404);
    }

    // 2. Fetch all attendance records for this month
    const query: any = {
      date: { $gte: startOfMonth, $lte: endOfMonth },
    };
    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    const records = await MuallimAttendance.find(query).lean();

    // 3. Find unique dates in this month where attendance was marked across the institution
    const institutionMarkedDates = new Set<string>();
    for (const r of records) {
      const dStr = this.formatDateStr(r.date);
      institutionMarkedDates.add(dStr);
    }

    // 4. Compute summaries per Muallim
    const summaries = targetMuallims.map((m) => {
      const mRecords = records.filter(
        (r) => r.userId.toString() === m.id.toString()
      );

      // Build daily map for all days of this month
      const dailyMap: Record<
        string,
        {
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
      > = {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const dStr = this.formatDateStr(dObj);
        const dayName = DAY_NAMES[dObj.getUTCDay()];

        const s1Rec = mRecords.find(
          (r) => this.formatDateStr(r.date) === dStr && r.shiftId === "SHIFT_1"
        );
        const s2Rec = mRecords.find(
          (r) => this.formatDateStr(r.date) === dStr && r.shiftId === "SHIFT_2"
        );
        const s3Rec = mRecords.find(
          (r) => this.formatDateStr(r.date) === dStr && r.shiftId === "SHIFT_3"
        );

        const s1 = s1Rec ? s1Rec.status : "";
        const s2 = s2Rec ? s2Rec.status : "";
        const s3 = s3Rec ? s3Rec.status : "";

        // Formulate a concise day summary label
        const statuses = [s1, s2, s3].filter(Boolean);
        let summary = "Not Recorded";
        if (statuses.length > 0) {
          if (s1 === "HOLIDAY" && s2 === "HOLIDAY" && s3 === "HOLIDAY") {
            summary = "Holiday";
          } else if (s1 === "PRESENT" && s2 === "PRESENT" && s3 === "PRESENT") {
            summary = "Full Day Present";
          } else {
            const counts: Record<string, number> = {};
            statuses.forEach((st) => (counts[st] = (counts[st] || 0) + 1));
            const parts = Object.entries(counts).map(
              ([st, count]) => `${count}/3 ${st}`
            );
            summary = parts.join(", ");
          }
        }

        const s1Reason = s1 === "HOLIDAY" ? (s1Rec?.holidayReason || s1Rec?.remarks || null) : null;
        const s2Reason = s2 === "HOLIDAY" ? (s2Rec?.holidayReason || s2Rec?.remarks || null) : null;
        const s3Reason = s3 === "HOLIDAY" ? (s3Rec?.holidayReason || s3Rec?.remarks || null) : null;

        dailyMap[dStr] = {
          dateStr: dStr,
          dayNumber: day,
          dayName,
          shift1: s1,
          shift2: s2,
          shift3: s3,
          shift1Reason: s1Reason,
          shift2Reason: s2Reason,
          shift3Reason: s3Reason,
          summary,
        };
      }

      // Compute status totals
      let presentShifts = 0;
      let clShifts = 0;
      let hplShifts = 0;
      let llpShifts = 0;
      let holidayShifts = 0;

      for (const r of mRecords) {
        if (r.status === "PRESENT") presentShifts++;
        else if (r.status === "CL") clShifts++;
        else if (r.status === "HPL") hplShifts++;
        else if (r.status === "LLP") llpShifts++;
        else if (r.status === "HOLIDAY") holidayShifts++;
      }

      // Not Recorded shifts:
      // Across all dates where attendance was marked by the institution,
      // count any shifts for this Muallim that were not recorded
      let notRecordedShifts = 0;
      for (const markedDateStr of institutionMarkedDates) {
        const dayEntry = dailyMap[markedDateStr];
        if (dayEntry) {
          if (!dayEntry.shift1) notRecordedShifts++;
          if (!dayEntry.shift2) notRecordedShifts++;
          if (!dayEntry.shift3) notRecordedShifts++;
        }
      }

      // Total scheduled shifts:
      // Requirement 10: "Attendance percentage = (Present shifts / Total scheduled shifts) × 100.
      // For percentage calculation, exclude HOLIDAY and Not Recorded shifts from the denominator."
      // Therefore, Total scheduled shifts = Present shifts + CL shifts + HPL shifts + LLP shifts
      const totalScheduledShifts =
        presentShifts + clShifts + hplShifts + llpShifts;

      const attendancePercentage =
        totalScheduledShifts > 0
          ? Number(((presentShifts / totalScheduledShifts) * 100).toFixed(1))
          : 0;

      // Day-equivalent calculations (divide shift counts by 3)
      const presentDayEquivalent = Number((presentShifts / 3).toFixed(2));
      const clDayEquivalent = Number((clShifts / 3).toFixed(2));
      const hplDayEquivalent = Number((hplShifts / 3).toFixed(2));
      const llpDayEquivalent = Number((llpShifts / 3).toFixed(2));
      const holidayDayEquivalent = Number((holidayShifts / 3).toFixed(2));

      return {
        muallim: m,
        stats: {
          totalScheduledShifts,
          presentShifts,
          clShifts,
          hplShifts,
          llpShifts,
          holidayShifts,
          notRecordedShifts,
          presentDayEquivalent,
          clDayEquivalent,
          hplDayEquivalent,
          llpDayEquivalent,
          holidayDayEquivalent,
          attendancePercentage,
        },
        dailyRecords: Object.values(dailyMap),
      };
    });

    return {
      year,
      month,
      monthName: MONTH_NAMES[month - 1] || `Month ${month}`,
      daysInMonth,
      markedDatesCount: institutionMarkedDates.size,
      summaries,
    };
  }

  /**
   * Generate and export A4 PDF register
   */
  async exportMonthlyPdf(yearNum: number, monthNum: number, userId?: string) {
    const report = await this.getMonthlyReport(yearNum, monthNum, userId);

    const pdfItems: MuallimPdfReportItem[] = report.summaries.map((s) => ({
      id: s.muallim.id,
      name: s.muallim.name,
      phone: s.muallim.phone,
      designation: s.muallim.designation,
      assignedClasses: s.muallim.assignedClasses,
      stats: s.stats,
      dailyRecords: s.dailyRecords,
    }));

    return generateMuallimMonthlyAttendancePdf({
      year: report.year,
      month: report.month,
      monthName: report.monthName,
      isIndividual: !!userId,
      items: pdfItems,
    });
  }
}

export const muallimAttendanceService = new MuallimAttendanceService();
export default muallimAttendanceService;

