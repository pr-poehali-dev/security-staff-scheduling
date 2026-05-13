import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { exportPDF, exportExcel, type ExportReportData } from "@/lib/export";

// ─── Types & helpers ──────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";
const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

type Period = "month" | "quarter" | "year";

// Генерируем исторические месяцы (6 мес назад → текущий)
function getMonths(count = 6) {
  const now = new Date(2026, 4, 1); // май 2026
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }),
      labelFull: d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
    };
  });
}

// Синтетические данные по месяцам для каждой организации
// (В реальном проекте — из БД; здесь генерируем детерминировано по orgId + monthIndex)
function syntheticMonthData(orgId: number, monthIdx: number) {
  const seed = orgId * 13 + monthIdx * 7;
  const baseEmps = [8, 2, 1][orgId - 1] ?? 3;
  const baseObjects = [3, 2, 1][orgId - 1] ?? 2;
  const coverage = 70 + ((seed * 3) % 28);          // 70–98%
  const attendance = 80 + ((seed * 5) % 18);         // 80–98%
  const incidents = (seed % 4);                       // 0–3
  const finesAmt = incidents * (300 + (seed % 5) * 400); // 0–2800
  const hoursWorked = baseEmps * 22 * 12 + (seed % 50);
  return { coverage, attendance, incidents, finesAmt, hoursWorked, baseObjects };
}

// ─── Bar ─────────────────────────────────────────────────────────────────────
function Bar({ value, max, color, height = 80 }: { value: number; max: number; color: string; height?: number }) {
  const h = max === 0 ? 0 : Math.round((value / max) * height);
  return (
    <div className="flex flex-col items-center justify-end" style={{ height }}>
      <div
        className="w-full rounded-t transition-all duration-500"
        style={{ height: h, backgroundColor: color, minHeight: value > 0 ? 2 : 0 }}
      />
    </div>
  );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────
function Trend({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  if (prev === 0) return null;
  const diff = cur - prev;
  const sign = diff > 0 ? "+" : "";
  const isGood = invert ? diff < 0 : diff > 0;
  if (diff === 0) return <span className="text-[10px] text-muted-foreground font-mono">= 0%</span>;
  return (
    <span className={`text-[10px] font-mono flex items-center gap-0.5 ${isGood ? "text-emerald-400" : "text-red-400"}`}>
      <Icon name={diff > 0 ? "TrendingUp" : "TrendingDown"} size={10} />
      {sign}{Math.round(diff)}%
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsolidatedReport() {
  const { orgs, allLocations, allEmployees, allPosts, allFines } = useApp();

  const [period, setPeriod] = useState<Period>("month");
  const [activeOrgs, setActiveOrgs] = useState<Set<number>>(new Set(orgs.map(o => o.id)));
  const [metric, setMetric] = useState<"coverage" | "fines" | "incidents" | "attendance">("coverage");

  const months = getMonths(6);
  const quarters = [
    { key: "Q1-2026", label: "I кв. 2026", months: ["2026-01", "2026-02", "2026-03"] },
    { key: "Q2-2026", label: "II кв. 2026", months: ["2026-04", "2026-05"] },
  ];

  const toggleOrg = (id: number) => setActiveOrgs(prev => {
    const next = new Set(prev);
    if (next.has(id)) { if (next.size > 1) next.delete(id); }
    else next.add(id);
    return next;
  });

  // ── Real-time snapshot (current state) ────────────────────────────────────
  const snapshot = orgs.map(org => {
    const locs = allLocations.filter(l => l.orgId === org.id);
    const emps = allEmployees.filter(e => e.orgId === org.id);
    const posts = allPosts.filter(p => p.orgId === org.id);
    const fines = allFines.filter(f => f.orgId === org.id);
    const covered = posts.filter(p => p.status === "covered").length;
    const active = emps.filter(e => e.status === "active").length;
    return {
      org,
      locs: locs.length,
      emps: emps.length,
      posts: posts.length,
      covered,
      active,
      finesTotal: fines.reduce((s, f) => s + f.amount, 0),
      finesCnt: fines.length,
      coveragePct: pct(covered, posts.length),
      attendancePct: pct(active, emps.length),
    };
  });

  const visibleSnapshot = snapshot.filter(s => activeOrgs.has(s.org.id));

  // ── Historical monthly data ────────────────────────────────────────────────
  const monthlyData = months.map((m, mi) => {
    const orgRows = orgs.map(org => {
      const d = syntheticMonthData(org.id, mi);
      // Overlay real fines for month if they match (by date prefix)
      const realFines = allFines.filter(f => f.orgId === org.id && f.date.startsWith(m.key));
      const realFinesAmt = realFines.length > 0 ? realFines.reduce((s, f) => s + f.amount, 0) : d.finesAmt;
      const realIncidents = realFines.length > 0 ? realFines.length : d.incidents;
      return { orgId: org.id, ...d, finesAmt: realFinesAmt, incidents: realIncidents };
    });
    return { month: m, orgs: orgRows };
  });

  // ── Comparison table rows ─────────────────────────────────────────────────
  const compRows = orgs.map(org => {
    const monthRows = monthlyData.map(md => md.orgs.find(o => o.orgId === org.id)!);
    const last = monthRows[monthRows.length - 1];
    const prev = monthRows[monthRows.length - 2];
    return { org, months: monthRows, last, prev };
  }).filter(r => activeOrgs.has(r.org.id));

  // ── Chart data (selected metric across all months) ────────────────────────
  const metricLabel = { coverage: "Покрытие постов, %", fines: "Штрафы, ₽", incidents: "Нарушения", attendance: "Явка персонала, %" }[metric];
  const metricKey = metric === "fines" ? "finesAmt" : metric === "incidents" ? "incidents" : metric === "coverage" ? "coverage" : "attendance";
  const chartData = months.map((m, mi) => ({
    month: m,
    values: orgs.filter(o => activeOrgs.has(o.id)).map(org => {
      const d = syntheticMonthData(org.id, mi);
      const realFines = allFines.filter(f => f.orgId === org.id && f.date.startsWith(m.key));
      const val = metric === "fines" ? (realFines.length > 0 ? realFines.reduce((s, f) => s + f.amount, 0) : d.finesAmt)
        : metric === "incidents" ? (realFines.length > 0 ? realFines.length : d.incidents)
        : metric === "coverage" ? d.coverage
        : d.attendance;
      return { org, val };
    }),
  }));
  const chartMax = Math.max(...chartData.flatMap(d => d.values.map(v => v.val)), 1);

  // ── Quarter aggregates ────────────────────────────────────────────────────
  const quarterData = quarters.map(q => ({
    quarter: q,
    orgs: orgs.map(org => {
      const monthIdxs = q.months.map(mk => months.findIndex(m => m.key === mk)).filter(i => i >= 0);
      const rows = monthIdxs.map(i => syntheticMonthData(org.id, i));
      return {
        orgId: org.id,
        coverage: Math.round(rows.reduce((s, r) => s + r.coverage, 0) / (rows.length || 1)),
        finesAmt: rows.reduce((s, r) => s + r.finesAmt, 0),
        incidents: rows.reduce((s, r) => s + r.incidents, 0),
        attendance: Math.round(rows.reduce((s, r) => s + r.attendance, 0) / (rows.length || 1)),
        hoursWorked: rows.reduce((s, r) => s + r.hoursWorked, 0),
      };
    }),
  }));

  const METRICS = [
    { key: "coverage",   label: "Покрытие",  icon: "ShieldCheck" },
    { key: "attendance", label: "Явка",       icon: "UserCheck" },
    { key: "fines",      label: "Штрафы",     icon: "BadgeAlert" },
    { key: "incidents",  label: "Нарушения",  icon: "AlertTriangle" },
  ] as const;

  // ── Export helpers ────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { holding } = useApp();

  const buildExportData = (): ExportReportData => {
    const periodLabel =
      period === "month" ? "Январь — Май 2026 (по месяцам)"
      : period === "quarter" ? "I–II квартал 2026"
      : "Сводная оценка 2026";

    const visibleOrgs = orgs.filter(o => activeOrgs.has(o.id));

    const summaryRows = visibleOrgs.map(org => {
      const yearData = monthlyData.map(md => md.orgs.find(o => o.orgId === org.id)!);
      const avgCov = Math.round(yearData.reduce((a, d) => a + d.coverage, 0) / yearData.length);
      const avgAtt = Math.round(yearData.reduce((a, d) => a + d.attendance, 0) / yearData.length);
      const totInc = yearData.reduce((a, d) => a + d.incidents, 0);
      const totFines = yearData.reduce((a, d) => a + d.finesAmt, 0);
      const totHours = yearData.reduce((a, d) => a + d.hoursWorked, 0);
      const score = Math.round(avgCov * 0.4 + avgAtt * 0.4 + Math.max(0, 100 - totInc * 10) * 0.2);
      const grade = score >= 90 ? "A" : score >= 75 ? "B" : "C";
      return { orgName: org.name, orgColor: org.color, coverage: avgCov, attendance: avgAtt, incidents: totInc, finesAmt: totFines, hoursWorked: totHours, score, grade };
    });

    const totalCoverage = Math.round(summaryRows.reduce((s, r) => s + r.coverage, 0) / Math.max(summaryRows.length, 1));
    const totalAttendance = Math.round(summaryRows.reduce((s, r) => s + r.attendance, 0) / Math.max(summaryRows.length, 1));
    const totalIncidents = summaryRows.reduce((s, r) => s + r.incidents, 0);
    const totalFines = summaryRows.reduce((s, r) => s + r.finesAmt, 0);
    const totalHours = summaryRows.reduce((s, r) => s + r.hoursWorked, 0);

    const monthlyRows = visibleOrgs.map(org => {
      const rows = monthlyData.map(md => md.orgs.find(o => o.orgId === org.id)!);
      return {
        orgName: org.name,
        coverage: rows.map(r => r.coverage),
        attendance: rows.map(r => r.attendance),
        incidents: rows.map(r => r.incidents),
        finesAmt: rows.map(r => r.finesAmt),
      };
    });

    return {
      holdingName: holding.name,
      inn: holding.inn,
      generatedAt: new Date().toLocaleDateString("ru-RU"),
      period: periodLabel,
      summaryRows,
      monthLabels: months.map(m => m.label),
      monthlyRows,
      totalCoverage,
      totalAttendance,
      totalIncidents,
      totalFines,
      totalHours,
    };
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    setExporting(format);
    setExportMenuOpen(false);
    // small delay to let the UI show loading state
    await new Promise(r => setTimeout(r, 80));
    const data = buildExportData();
    if (format === "pdf") exportPDF(data);
    else exportExcel(data);
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Period tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
          {([["month", "По месяцам"], ["quarter", "По кварталам"], ["year", "Сводная"]] as [Period, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Org filter */}
          {orgs.map(org => (
            <button
              key={org.id}
              onClick={() => toggleOrg(org.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${activeOrgs.has(org.id) ? "text-foreground border-transparent" : "text-muted-foreground border-border bg-muted/30"}`}
              style={activeOrgs.has(org.id) ? { backgroundColor: org.color + "20", borderColor: org.color + "60", color: org.color } : undefined}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeOrgs.has(org.id) ? org.color : "#666" }} />
              {org.shortName}
            </button>
          ))}

          {/* Export button */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(v => !v)}
              disabled={!!exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {exporting
                ? <><Icon name="Loader2" size={14} className="animate-spin" /> Генерация...</>
                : <><Icon name="Download" size={14} /> Экспорт <Icon name="ChevronDown" size={12} /></>
              }
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 w-44">
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <Icon name="FileText" size={14} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">PDF</p>
                    <p className="text-[10px] text-muted-foreground">Готовый документ</p>
                  </div>
                </button>
                <div className="h-px bg-border mx-3" />
                <button
                  onClick={() => handleExport("xlsx")}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Icon name="Table" size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Excel</p>
                    <p className="text-[10px] text-muted-foreground">5 листов с данными</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MONTHLY VIEW ────────────────────────────────────────────────────── */}
      {period === "month" && (
        <>
          {/* Metric selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${metric === m.key ? "bg-primary/10 border-primary/40 text-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}
              >
                <Icon name={m.icon} size={16} className={metric === m.key ? "text-primary" : ""} />
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">{metricLabel}</h3>
              <div className="flex gap-3">
                {orgs.filter(o => activeOrgs.has(o.id)).map(org => (
                  <div key={org.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: org.color }} />
                    {org.shortName}
                  </div>
                ))}
              </div>
            </div>

            {/* Grouped bar chart */}
            <div className="flex items-end gap-4">
              {chartData.map(({ month, values }) => (
                <div key={month.key} className="flex-1 flex flex-col items-center gap-2">
                  {/* Value labels on hover — just show bars */}
                  <div className="w-full flex items-end gap-0.5" style={{ height: 100 }}>
                    {values.map(({ org, val }) => (
                      <div key={org.id} className="flex-1 relative group">
                        <Bar value={val} max={chartMax} color={org.color} height={100} />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                          <div className="bg-popover border border-border rounded-lg px-2 py-1 text-[10px] text-foreground whitespace-nowrap shadow-lg">
                            <span className="font-semibold" style={{ color: org.color }}>{org.shortName}</span>
                            <span className="ml-1">{metric === "fines" ? fmt(val) : metric === "coverage" || metric === "attendance" ? val + "%" : val}</span>
                          </div>
                          <div className="w-1.5 h-1.5 rotate-45 bg-popover border-r border-b border-border -mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{month.label}</span>
                </div>
              ))}
            </div>

            {/* Y-axis hint */}
            <div className="flex justify-between mt-3 pt-3 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">0</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Макс: {metric === "fines" ? fmt(chartMax) : metric === "coverage" || metric === "attendance" ? chartMax + "%" : chartMax}
              </span>
            </div>
          </div>

          {/* Monthly comparison table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Сравнительная таблица по месяцам</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-36">Организация</th>
                    {months.map(m => (
                      <th key={m.key} className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">{m.label}</th>
                    ))}
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Тренд</th>
                  </tr>
                </thead>
                <tbody>
                  {compRows.map(({ org, months: mrows, last, prev }) => (
                    <tr key={org.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: org.color }} />
                          <span className="text-sm font-medium text-foreground">{org.shortName}</span>
                        </div>
                      </td>
                      {mrows.map((d, i) => {
                        const val = metric === "fines" ? d.finesAmt
                          : metric === "incidents" ? d.incidents
                          : metric === "coverage" ? d.coverage
                          : d.attendance;
                        const isLast = i === mrows.length - 1;
                        return (
                          <td key={i} className={`px-3 py-3 text-center ${isLast ? "font-semibold" : ""}`}>
                            <span className="text-sm font-mono" style={isLast ? { color: org.color } : {}}>
                              {metric === "fines" ? (val === 0 ? "—" : fmt(val))
                                : metric === "coverage" || metric === "attendance" ? val + "%"
                                : val === 0 ? "—" : val}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-5 py-3 text-right">
                        {metric === "fines" || metric === "incidents"
                          ? <Trend cur={last[metricKey as "finesAmt" | "incidents"]} prev={prev[metricKey as "finesAmt" | "incidents"]} invert />
                          : <Trend cur={last[metricKey as "coverage" | "attendance"]} prev={prev[metricKey as "coverage" | "attendance"]} />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── QUARTERLY VIEW ──────────────────────────────────────────────────── */}
      {period === "quarter" && (
        <div className="space-y-5">
          {quarterData.map(({ quarter, orgs: qOrgs }) => (
            <div key={quarter.key} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="CalendarDays" size={16} className="text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{quarter.label}</h3>
                <span className="text-xs text-muted-foreground ml-1">{quarter.months.length} месяца</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Организация", "Покрытие постов", "Явка персонала", "Нарушений", "Штрафы", "Часов работы"].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {qOrgs.filter(r => activeOrgs.has(r.orgId)).map(row => {
                      const org = orgs.find(o => o.id === row.orgId)!;
                      return (
                        <tr key={row.orgId} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: org.color }} />
                              <span className="text-sm font-medium text-foreground">{org.shortName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${row.coverage}%`, backgroundColor: row.coverage >= 90 ? "#10b981" : row.coverage >= 70 ? org.color : "#f59e0b" }} />
                              </div>
                              <span className="text-sm font-mono text-foreground">{row.coverage}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.attendance}%` }} />
                              </div>
                              <span className="text-sm font-mono text-foreground">{row.attendance}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-mono font-semibold ${row.incidents > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                              {row.incidents === 0 ? "—" : row.incidents}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-mono font-semibold ${row.finesAmt > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                              {row.finesAmt === 0 ? "—" : fmt(row.finesAmt)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-mono text-muted-foreground">
                            {row.hoursWorked.toLocaleString("ru-RU")} ч
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Footer totals */}
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30">
                      <td className="px-5 py-3 text-xs font-semibold text-muted-foreground">ИТОГО</td>
                      <td className="px-5 py-3 text-sm font-mono font-bold text-foreground">
                        {Math.round(qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.coverage, 0) / Math.max(qOrgs.filter(r => activeOrgs.has(r.orgId)).length, 1))}%
                      </td>
                      <td className="px-5 py-3 text-sm font-mono font-bold text-foreground">
                        {Math.round(qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.attendance, 0) / Math.max(qOrgs.filter(r => activeOrgs.has(r.orgId)).length, 1))}%
                      </td>
                      <td className="px-5 py-3 text-sm font-mono font-bold text-amber-400">
                        {qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.incidents, 0)}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono font-bold text-red-400">
                        {fmt(qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.finesAmt, 0))}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono font-bold text-foreground">
                        {qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.hoursWorked, 0).toLocaleString("ru-RU")} ч
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SUMMARY (YEAR) VIEW ──────────────────────────────────────────────── */}
      {period === "year" && (
        <div className="space-y-5">
          {/* Scorecards per org */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {snapshot.filter(s => activeOrgs.has(s.org.id)).map(s => {
              // compute yearly aggregates from all 6 months
              const yearData = monthlyData.map(md => md.orgs.find(o => o.orgId === s.org.id)!);
              const avgCoverage = Math.round(yearData.reduce((acc, d) => acc + d.coverage, 0) / yearData.length);
              const avgAttendance = Math.round(yearData.reduce((acc, d) => acc + d.attendance, 0) / yearData.length);
              const totalIncidents = yearData.reduce((acc, d) => acc + d.incidents, 0);
              const totalFinesAmt = yearData.reduce((acc, d) => acc + d.finesAmt, 0);
              const totalHours = yearData.reduce((acc, d) => acc + d.hoursWorked, 0);

              // Grade
              const score = avgCoverage * 0.4 + avgAttendance * 0.4 + Math.max(0, 100 - totalIncidents * 10) * 0.2;
              const grade = score >= 90 ? { label: "A", color: "#10b981" } : score >= 75 ? { label: "B", color: "#6366f1" } : { label: "C", color: "#f59e0b" };

              return (
                <div key={s.org.id} className="bg-card border border-border rounded-xl overflow-hidden" style={{ borderTopColor: s.org.color, borderTopWidth: 3 }}>
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: s.org.color }}>
                          {s.org.shortName.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{s.org.shortName}</p>
                          <p className="text-[10px] text-muted-foreground">2026 (янв — май)</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{ backgroundColor: grade.color + "20", color: grade.color }}>
                        {grade.label}
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="space-y-3">
                      {[
                        { label: "Покрытие постов", val: avgCoverage + "%", pctVal: avgCoverage, color: avgCoverage >= 90 ? "#10b981" : s.org.color },
                        { label: "Явка персонала", val: avgAttendance + "%", pctVal: avgAttendance, color: "#10b981" },
                      ].map(k => (
                        <div key={k.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{k.label}</span>
                            <span className="font-mono text-foreground font-semibold">{k.val}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${k.pctVal}%`, backgroundColor: k.color }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <p className="text-xs font-bold font-mono text-foreground">{totalIncidents}</p>
                        <p className="text-[9px] text-muted-foreground">наруш.</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <p className="text-xs font-bold font-mono text-red-400">{totalFinesAmt === 0 ? "—" : totalFinesAmt > 9999 ? Math.round(totalFinesAmt / 1000) + "к₽" : totalFinesAmt + "₽"}</p>
                        <p className="text-[9px] text-muted-foreground">штрафы</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <p className="text-xs font-bold font-mono text-foreground">{Math.round(totalHours / 1000)}к</p>
                        <p className="text-[9px] text-muted-foreground">часов</p>
                      </div>
                    </div>

                    {/* Mini sparkline */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <p className="text-[9px] text-muted-foreground mb-1.5 uppercase tracking-wider">Покрытие по месяцам</p>
                      <div className="flex items-end gap-0.5" style={{ height: 28 }}>
                        {yearData.map((d, i) => (
                          <div key={i} className="flex-1 rounded-sm" style={{ height: `${(d.coverage / 100) * 28}px`, backgroundColor: s.org.color, opacity: 0.4 + i * 0.1 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ranking table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Рейтинг эффективности</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Взвешенная оценка: 40% покрытие + 40% явка + 20% дисциплина</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["#", "Организация", "Покрытие", "Явка", "Нарушения", "Штрафы", "Оценка"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshot
                    .filter(s => activeOrgs.has(s.org.id))
                    .map(s => {
                      const yearData = monthlyData.map(md => md.orgs.find(o => o.orgId === s.org.id)!);
                      const avgCov = Math.round(yearData.reduce((a, d) => a + d.coverage, 0) / yearData.length);
                      const avgAtt = Math.round(yearData.reduce((a, d) => a + d.attendance, 0) / yearData.length);
                      const totInc = yearData.reduce((a, d) => a + d.incidents, 0);
                      const totFines = yearData.reduce((a, d) => a + d.finesAmt, 0);
                      const score = Math.round(avgCov * 0.4 + avgAtt * 0.4 + Math.max(0, 100 - totInc * 10) * 0.2);
                      return { s, avgCov, avgAtt, totInc, totFines, score };
                    })
                    .sort((a, b) => b.score - a.score)
                    .map(({ s, avgCov, avgAtt, totInc, totFines, score }, rank) => {
                      const grade = score >= 90 ? { label: "A", color: "#10b981" } : score >= 75 ? { label: "B", color: "#6366f1" } : { label: "C", color: "#f59e0b" };
                      return (
                        <tr key={s.org.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rank === 0 ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground"}`}>{rank + 1}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.org.color }} />
                              <span className="text-sm font-medium text-foreground">{s.org.shortName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-mono text-foreground">{avgCov}%</td>
                          <td className="px-5 py-4 text-sm font-mono text-foreground">{avgAtt}%</td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-mono font-semibold ${totInc > 0 ? "text-amber-400" : "text-muted-foreground"}`}>{totInc || "—"}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-mono font-semibold ${totFines > 0 ? "text-red-400" : "text-muted-foreground"}`}>{totFines ? fmt(totFines) : "—"}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: grade.color }} />
                              </div>
                              <span className="text-sm font-bold font-mono" style={{ color: grade.color }}>{score}</span>
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: grade.color + "20", color: grade.color }}>{grade.label}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}