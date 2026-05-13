import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OrgReportRow {
  orgName: string;
  orgColor: string;
  coverage: number;
  attendance: number;
  incidents: number;
  finesAmt: number;
  hoursWorked: number;
  score: number;
  grade: string;
}

export interface MonthlyRow {
  orgName: string;
  months: { label: string; value: number }[];
  metricLabel: string;
}

export interface ExportReportData {
  holdingName: string;
  inn: string;
  generatedAt: string;
  period: string;
  // summary table
  summaryRows: OrgReportRow[];
  // monthly table (optional)
  monthLabels?: string[];
  monthlyRows?: {
    orgName: string;
    coverage: number[];
    attendance: number[];
    incidents: number[];
    finesAmt: number[];
  }[];
  // totals
  totalCoverage: number;
  totalAttendance: number;
  totalIncidents: number;
  totalFines: number;
  totalHours: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRub = (n: number) => n.toLocaleString("ru-RU") + " ₽";
const fmtPct = (n: number) => n + "%";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
export function exportPDF(data: ExportReportData): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── Cover header ──────────────────────────────────────────────────────────
  // Dark background strip
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SecureOps", 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 160);
  doc.text("Система управления охраной", 14, 17);

  // Right: holding name & date
  doc.setTextColor(200, 200, 210);
  doc.setFontSize(9);
  doc.text(data.holdingName, W - 14, 11, { align: "right" });
  doc.text(`ИНН: ${data.inn}`, W - 14, 17, { align: "right" });
  doc.text(`Сформирован: ${data.generatedAt}`, W - 14, 23, { align: "right" });

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Сводный отчёт по холдингу", 14, 42);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 110);
  doc.text(`Период: ${data.period}`, 14, 50);

  // ── KPI boxes ─────────────────────────────────────────────────────────────
  const kpis = [
    { label: "Ср. покрытие постов", value: fmtPct(data.totalCoverage) },
    { label: "Ср. явка персонала",  value: fmtPct(data.totalAttendance) },
    { label: "Всего нарушений",     value: String(data.totalIncidents) },
    { label: "Сумма штрафов",       value: fmtRub(data.totalFines) },
    { label: "Часов отработано",    value: data.totalHours.toLocaleString("ru-RU") + " ч" },
  ];

  const boxW = (W - 28 - 4 * 4) / 5;
  kpis.forEach((k, i) => {
    const x = 14 + i * (boxW + 4);
    const y = 56;
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(x, y, boxW, 18, 2, 2, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 40);
    doc.text(k.value, x + boxW / 2, y + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 110);
    doc.text(k.label, x + boxW / 2, y + 14, { align: "center" });
  });

  // ── Summary table ─────────────────────────────────────────────────────────
  const summaryY = 82;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 40);
  doc.text("Сравнительная таблица организаций", 14, summaryY);

  autoTable(doc, {
    startY: summaryY + 4,
    head: [["Организация", "Покрытие", "Явка", "Нарушения", "Штрафы", "Часов работы", "Оценка", "Рейтинг"]],
    body: data.summaryRows.map(r => [
      r.orgName,
      fmtPct(r.coverage),
      fmtPct(r.attendance),
      r.incidents === 0 ? "—" : String(r.incidents),
      r.finesAmt === 0 ? "—" : fmtRub(r.finesAmt),
      r.hoursWorked.toLocaleString("ru-RU") + " ч",
      String(r.score),
      r.grade,
    ]),
    foot: [["ИТОГО / СРЕДНЕЕ",
      fmtPct(data.totalCoverage),
      fmtPct(data.totalAttendance),
      String(data.totalIncidents),
      fmtRub(data.totalFines),
      data.totalHours.toLocaleString("ru-RU") + " ч",
      "", "",
    ]],
    styles: { fontSize: 9, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [30, 30, 40], textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 248], textColor: [30, 30, 40], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "center", fontStyle: "bold" },
      7: { halign: "center", fontStyle: "bold" },
    },
    didDrawCell: (hookData) => {
      // Color org name cell with org accent
      if (hookData.section === "body" && hookData.column.index === 0) {
        const row = data.summaryRows[hookData.row.index];
        if (row) {
          const [r, g, b] = hexToRgb(row.orgColor);
          doc.setFillColor(r, g, b);
          doc.rect(hookData.cell.x, hookData.cell.y, 2, hookData.cell.height, "F");
        }
      }
      // Color grade cell
      if (hookData.section === "body" && hookData.column.index === 7) {
        const row = data.summaryRows[hookData.row.index];
        if (row) {
          const gradeColors: Record<string, [number, number, number]> = {
            A: [16, 185, 129], B: [99, 102, 241], C: [245, 158, 11],
          };
          const c = gradeColors[row.grade] ?? [150, 150, 150];
          doc.setTextColor(...c);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(row.grade, hookData.cell.x + hookData.cell.width / 2, hookData.cell.y + hookData.cell.height / 2 + 1.5, { align: "center" });
        }
      }
    },
  });

  // ── Monthly table (if data available) ────────────────────────────────────
  if (data.monthLabels && data.monthlyRows && data.monthlyRows.length > 0) {
    // new page
    doc.addPage();

    doc.setFillColor(15, 15, 20);
    doc.rect(0, 0, W, 14, "F");
    doc.setTextColor(200, 200, 210);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.holdingName} · Сводный отчёт · ${data.generatedAt}`, 14, 9);

    doc.setTextColor(30, 30, 40);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Динамика покрытия постов по месяцам", 14, 26);

    autoTable(doc, {
      startY: 30,
      head: [["Организация", ...data.monthLabels]],
      body: data.monthlyRows.map(r => [r.orgName, ...r.coverage.map(v => fmtPct(v))]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 40], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      columnStyles: { 0: { cellWidth: 48 } },
    });

    const afterCovY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setTextColor(30, 30, 40);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Штрафы по организациям (помесячно)", 14, afterCovY);

    autoTable(doc, {
      startY: afterCovY + 4,
      head: [["Организация", ...data.monthLabels, "Итого"]],
      body: data.monthlyRows.map(r => {
        const total = r.finesAmt.reduce((s, v) => s + v, 0);
        return [r.orgName, ...r.finesAmt.map(v => v === 0 ? "—" : fmtRub(v)), fmtRub(total)];
      }),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 40], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      columnStyles: { 0: { cellWidth: 48 }, [data.monthLabels.length + 1]: { fontStyle: "bold" } },
    });
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 230);
    doc.line(14, pageH - 10, W - 14, pageH - 10);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 160);
    doc.setFont("helvetica", "normal");
    doc.text("SecureOps · Конфиденциально · Только для внутреннего использования", 14, pageH - 5);
    doc.text(`Страница ${i} из ${totalPages}`, W - 14, pageH - 5, { align: "right" });
  }

  doc.save(`SecureOps_Отчёт_${data.period.replace(/\s/g, "_")}.pdf`);
}

// ─── Excel Export ─────────────────────────────────────────────────────────────
export function exportExcel(data: ExportReportData): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  const summaryData: (string | number)[][] = [
    [`Сводный отчёт — ${data.holdingName}`],
    [`ИНН: ${data.inn}`, "", `Период: ${data.period}`, "", `Сформирован: ${data.generatedAt}`],
    [],
    ["Организация", "Покрытие постов (%)", "Явка персонала (%)", "Нарушений", "Штрафы (₽)", "Часов работы", "Оценка (0-100)", "Рейтинг"],
    ...data.summaryRows.map(r => [
      r.orgName, r.coverage, r.attendance, r.incidents,
      r.finesAmt, r.hoursWorked, r.score, r.grade,
    ]),
    [],
    ["ИТОГО / СРЕДНЕЕ", data.totalCoverage, data.totalAttendance, data.totalIncidents, data.totalFines, data.totalHours, "", ""],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

  // Column widths
  wsSummary["!cols"] = [
    { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 14 },
    { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, "Сводная таблица");

  // ── Sheet 2: Monthly coverage ─────────────────────────────────────────────
  if (data.monthLabels && data.monthlyRows && data.monthlyRows.length > 0) {
    const covData: (string | number)[][] = [
      ["Покрытие постов по месяцам (%)"],
      [`${data.holdingName} · ${data.period}`],
      [],
      ["Организация", ...data.monthLabels],
      ...data.monthlyRows.map(r => [r.orgName, ...r.coverage]),
    ];
    const wsCov = XLSX.utils.aoa_to_sheet(covData);
    wsCov["!cols"] = [{ wch: 30 }, ...data.monthLabels.map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(wb, wsCov, "Покрытие по месяцам");

    // ── Sheet 3: Monthly attendance ────────────────────────────────────────
    const attData: (string | number)[][] = [
      ["Явка персонала по месяцам (%)"],
      [`${data.holdingName} · ${data.period}`],
      [],
      ["Организация", ...data.monthLabels],
      ...data.monthlyRows.map(r => [r.orgName, ...r.attendance]),
    ];
    const wsAtt = XLSX.utils.aoa_to_sheet(attData);
    wsAtt["!cols"] = [{ wch: 30 }, ...data.monthLabels.map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(wb, wsAtt, "Явка по месяцам");

    // ── Sheet 4: Monthly fines ─────────────────────────────────────────────
    const finesData: (string | number)[][] = [
      ["Штрафы по организациям (₽)"],
      [`${data.holdingName} · ${data.period}`],
      [],
      ["Организация", ...data.monthLabels, "Итого"],
      ...data.monthlyRows.map(r => {
        const total = r.finesAmt.reduce((s, v) => s + v, 0);
        return [r.orgName, ...r.finesAmt, total];
      }),
      [],
      ["ИТОГО", ...data.monthLabels.map((_, mi) =>
        data.monthlyRows!.reduce((s, r) => s + r.finesAmt[mi], 0)
      ), data.totalFines],
    ];
    const wsFines = XLSX.utils.aoa_to_sheet(finesData);
    wsFines["!cols"] = [{ wch: 30 }, ...data.monthLabels.map(() => ({ wch: 14 })), { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsFines, "Штрафы по месяцам");

    // ── Sheet 5: Monthly incidents ─────────────────────────────────────────
    const incData: (string | number)[][] = [
      ["Нарушения по организациям"],
      [`${data.holdingName} · ${data.period}`],
      [],
      ["Организация", ...data.monthLabels, "Итого"],
      ...data.monthlyRows.map(r => {
        const total = r.incidents.reduce((s, v) => s + v, 0);
        return [r.orgName, ...r.incidents, total];
      }),
    ];
    const wsInc = XLSX.utils.aoa_to_sheet(incData);
    wsInc["!cols"] = [{ wch: 30 }, ...data.monthLabels.map(() => ({ wch: 12 })), { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsInc, "Нарушения по месяцам");
  }

  XLSX.writeFile(wb, `SecureOps_Отчёт_${data.period.replace(/\s/g, "_")}.xlsx`);
}
