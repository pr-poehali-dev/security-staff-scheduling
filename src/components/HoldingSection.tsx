import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Organization } from "@/types";
import Icon from "@/components/ui/icon";
import ConsolidatedReport from "@/components/ConsolidatedReport";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";
const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors";

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}{req && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const ORG_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

// ─── Org Modal ────────────────────────────────────────────────────────────────
const EMPTY_ORG: Omit<Organization, "id" | "holdingId"> = {
  name: "", shortName: "", inn: "", address: "", phone: "", license: "", color: "#6366f1",
};

function OrgModal({ initial, onSave, onClose, title }: {
  initial: Omit<Organization, "id" | "holdingId"> | null;
  onSave: (d: Omit<Organization, "id" | "holdingId">) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial ?? EMPTY_ORG);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0 && form.shortName.trim().length > 0 && form.inn.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Полное название" req>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder='ООО "Охрана Центр"' className={inputCls} />
            </Field>
            <Field label="Короткое название" req>
              <input value={form.shortName} onChange={e => set("shortName", e.target.value)} placeholder="ОГ Центр" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="ИНН" req>
              <input value={form.inn} onChange={e => set("inn", e.target.value)} placeholder="7700000000" className={inputCls} />
            </Field>
            <Field label="Телефон">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 800 000-00-00" className={inputCls} />
            </Field>
          </div>
          <Field label="Адрес">
            <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="ул. Примерная, 1, Москва" className={inputCls} />
          </Field>
          <Field label="Лицензия ЧО">
            <input value={form.license} onChange={e => set("license", e.target.value)} placeholder="ЧО-000000 / до дд.мм.гггг" className={inputCls} />
          </Field>
          <Field label="Цвет-акцент">
            <div className="flex gap-2 flex-wrap mt-1">
              {ORG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set("color", c)}
                  className="w-8 h-8 rounded-xl transition-all"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `3px solid ${c}` : "none",
                    outlineOffset: "2px",
                    opacity: form.color === c ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

function DeleteOrgModal({ org, onConfirm, onClose }: { org: Organization; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
          <Icon name="Trash2" size={22} className="text-red-400" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить организацию?</h3>
        <p className="text-sm text-muted-foreground mb-6">
          «{org.shortName}» будет удалена из холдинга. Все связанные данные (объекты, сотрудники, штрафы) останутся в базе, но потеряют привязку.
        </p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Org Detail Drawer ────────────────────────────────────────────────────────
function OrgDetail({ org, onClose, onEdit, onSwitch }: {
  org: Organization;
  onClose: () => void;
  onEdit: () => void;
  onSwitch: () => void;
}) {
  const { allLocations, allEmployees, allPosts, allFines, users, roles } = useApp();

  const locs = allLocations.filter(l => l.orgId === org.id);
  const emps = allEmployees.filter(e => e.orgId === org.id);
  const orgPosts = allPosts.filter(p => p.orgId === org.id);
  const orgFines = allFines.filter(f => f.orgId === org.id);
  const orgUsers = users.filter(u => u.orgIds.includes(org.id));

  const covered = orgPosts.filter(p => p.status === "covered").length;
  const vacant = orgPosts.filter(p => p.status === "vacant").length;
  const alerts = orgPosts.filter(p => p.status === "alert").length;
  const active = emps.filter(e => e.status === "active").length;
  const finesTotal = orgFines.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card border border-border w-full sm:max-w-xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl section-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-border shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-lg font-bold text-white" style={{ backgroundColor: org.color }}>
            {org.shortName.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground leading-tight">{org.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">ИНН {org.inn} · {org.address}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"><Icon name="X" size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPI grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Объектов", val: locs.length, icon: "Building2", c: "text-primary", bg: "bg-primary/10" },
              { label: "Охранников", val: emps.length, icon: "Users", c: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Постов всего", val: orgPosts.length, icon: "MapPin", c: "text-indigo-400", bg: "bg-indigo-500/10" },
            ].map(s => (
              <div key={s.label} className="bg-muted/40 rounded-xl p-3 text-center">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}><Icon name={s.icon} size={16} className={s.c} /></div>
                <div className={`text-xl font-bold font-mono ${s.c}`}>{s.val}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Coverage bar */}
          <div className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Покрытие постов</span>
              <span className="text-xs font-mono text-muted-foreground">{covered}/{orgPosts.length}</span>
            </div>
            {orgPosts.length > 0 ? (
              <div className="h-2.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                {covered > 0 && <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${(covered / orgPosts.length) * 100}%` }} />}
                {vacant > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: `${(vacant / orgPosts.length) * 100}%` }} />}
                {alerts > 0 && <div className="h-full bg-red-500 rounded-r-full transition-all" style={{ width: `${(alerts / orgPosts.length) * 100}%` }} />}
              </div>
            ) : <div className="h-2.5 bg-muted rounded-full" />}
            <div className="flex gap-4 mt-2">
              {[{ label: "Закрыты", val: covered, c: "bg-emerald-500" }, { label: "Вакантны", val: vacant, c: "bg-amber-400" }, { label: "Тревога", val: alerts, c: "bg-red-500" }].map(x => (
                <div key={x.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${x.c}`} />
                  <span className="text-[10px] text-muted-foreground">{x.label}: <span className="text-foreground font-mono">{x.val}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="UserCheck" size={14} className="text-emerald-400" />
                <span className="text-xs text-muted-foreground">На смене сейчас</span>
              </div>
              <span className="text-2xl font-bold font-mono text-emerald-400">{active}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {emps.length}</span>
            </div>
            <div className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="BadgeAlert" size={14} className="text-red-400" />
                <span className="text-xs text-muted-foreground">Штрафы</span>
              </div>
              <span className="text-xl font-bold font-mono text-red-400">{fmt(finesTotal)}</span>
              <p className="text-[10px] text-muted-foreground">{orgFines.length} нарушений</p>
            </div>
          </div>

          {/* License */}
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl">
            <Icon name="ShieldCheck" size={16} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Лицензия ЧО</p>
              <p className="text-sm text-foreground">{org.license || "—"}</p>
            </div>
          </div>

          {/* Users */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Пользователи системы</p>
            {orgUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Не назначены</p>
            ) : (
              <div className="space-y-1.5">
                {orgUsers.map(u => {
                  const userRoles = roles.filter(r => u.roleIds.includes(r.id));
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{u.avatarInitials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{userRoles.map(r => r.name).join(", ")}</p>
                      </div>
                      <span className={u.isActive ? "badge-active" : "badge-inactive"}>{u.isActive ? "Активен" : "Блок."}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button
            onClick={onSwitch}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Icon name="ArrowRightLeft" size={15} /> Перейти в организацию
          </button>
          <button onClick={onEdit} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary transition-colors flex items-center gap-2">
            <Icon name="Pencil" size={14} /> Изменить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HoldingSection({ onSwitchOrg }: { onSwitchOrg: (orgId: number) => void }) {
  const {
    holding, orgs, addOrg, editOrg, deleteOrg,
    allLocations, allEmployees, allPosts, allFines,
    users,
  } = useApp();

  const [tab, setTab] = useState<"orgs" | "report">("orgs");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | "detail" | null>(null);
  const [target, setTarget] = useState<Organization | null>(null);
  const close = () => { setModal(null); setTarget(null); };

  // Consolidated KPIs across all orgs
  const totalLocs = allLocations.length;
  const totalEmps = allEmployees.length;
  const totalPosts = allPosts.length;
  const coveredPosts = allPosts.filter(p => p.status === "covered").length;
  const alertPosts = allPosts.filter(p => p.status === "alert").length;
  const totalFines = allFines.reduce((s, f) => s + f.amount, 0);
  const totalUsers = users.length;
  const activeEmps = allEmployees.filter(e => e.status === "active").length;

  // Coverage % per org for mini-bar
  const orgStats = orgs.map(org => {
    const locs = allLocations.filter(l => l.orgId === org.id);
    const emps = allEmployees.filter(e => e.orgId === org.id);
    const posts = allPosts.filter(p => p.orgId === org.id);
    const fines = allFines.filter(f => f.orgId === org.id);
    const covered = posts.filter(p => p.status === "covered").length;
    const alert = posts.filter(p => p.status === "alert").length;
    const pct = posts.length > 0 ? Math.round((covered / posts.length) * 100) : 0;
    return { org, locs: locs.length, emps: emps.length, posts: posts.length, covered, alert, pct, finesTotal: fines.reduce((s, f) => s + f.amount, 0), finesCnt: fines.length };
  });

  // Fines by org chart data
  const maxFines = Math.max(...orgStats.map(s => s.finesTotal), 1);

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Холдинг</h2>
          <p className="text-muted-foreground text-sm mt-1">{holding.name} · ИНН {holding.inn}</p>
        </div>
        {tab === "orgs" && (
          <button
            onClick={() => { setTarget(null); setModal("add"); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0"
          >
            <Icon name="Plus" size={16} /> Добавить организацию
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {[
          { key: "orgs",   label: "Организации",  icon: "Building2" },
          { key: "report", label: "Сводный отчёт", icon: "BarChart3" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "orgs" | "report")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all
              ${tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Report tab ── */}
      {tab === "report" && <ConsolidatedReport />}

      {/* ── Orgs tab ── */}
      {tab === "orgs" && <>

      {/* Consolidated KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {[
          { label: "Организаций",    val: orgs.length,    icon: "Building2",        c: "text-primary",     bg: "bg-primary/10" },
          { label: "Объектов",       val: totalLocs,      icon: "MapPin",           c: "text-indigo-400",  bg: "bg-indigo-500/10" },
          { label: "Охранников",     val: totalEmps,      icon: "Users",            c: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Пользователей",  val: totalUsers,     icon: "UserCog",          c: "text-cyan-400",    bg: "bg-cyan-500/10" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon name={s.icon} size={20} className={s.c} /></div>
            <div className={`text-3xl font-bold font-mono ${s.c} mb-1`}>{s.val}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Operational summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Посты по всем объектам</p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold font-mono text-foreground">{coveredPosts}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {totalPosts}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex gap-0.5">
            <div className="h-full bg-emerald-500" style={{ width: `${totalPosts > 0 ? (coveredPosts / totalPosts) * 100 : 0}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${totalPosts > 0 ? (alertPosts / totalPosts) * 100 : 0}%` }} />
          </div>
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            <span><span className="text-emerald-400 font-mono">{coveredPosts}</span> закрыты</span>
            <span><span className="text-red-400 font-mono">{alertPosts}</span> тревога</span>
            <span><span className="text-amber-400 font-mono">{totalPosts - coveredPosts - alertPosts}</span> вакантны</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Персонал на смене</p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold font-mono text-emerald-400">{activeEmps}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {totalEmps}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalEmps > 0 ? (activeEmps / totalEmps) * 100 : 0}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            <span className="text-foreground font-mono">{Math.round(totalEmps > 0 ? (activeEmps / totalEmps) * 100 : 0)}%</span> явка по холдингу
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Штрафы по холдингу</p>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-2xl font-bold font-mono text-red-400">{fmt(totalFines)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">{allFines.length} {allFines.length === 1 ? "нарушение" : allFines.length < 5 ? "нарушения" : "нарушений"} всего</p>
          {/* Mini bar chart by org */}
          <div className="space-y-1.5">
            {orgStats.filter(s => s.finesCnt > 0).sort((a, b) => b.finesTotal - a.finesTotal).map(s => (
              <div key={s.org.id} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-16 truncate shrink-0">{s.org.shortName}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.finesTotal / maxFines) * 100}%`, backgroundColor: s.org.color }} />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-16 text-right">{fmt(s.finesTotal)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Organizations list */}
      <div>
        <h3 className="font-semibold text-foreground mb-4">Организации холдинга</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgStats.map(({ org, locs, emps, posts: orgPostsCnt, covered, alert, pct, finesTotal, finesCnt }) => (
            <div
              key={org.id}
              className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-lg hover:shadow-black/20 transition-all group"
              style={{ borderTopColor: org.color, borderTopWidth: "3px" }}
              onClick={() => { setTarget(org); setModal("detail"); }}
            >
              {/* Org header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: org.color }}>
                  {org.shortName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-sm leading-tight">{org.shortName}</h4>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{org.name}</p>
                </div>
                {alert > 0 && (
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <Icon name="AlertTriangle" size={12} className="text-red-400" />
                  </div>
                )}
              </div>

              {/* Coverage bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">Покрытие постов</span>
                  <span className="font-mono text-foreground">{covered}/{orgPostsCnt}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct === 100 ? "#10b981" : pct >= 60 ? org.color : "#f59e0b",
                    }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                {[
                  { label: "Объектов", val: locs },
                  { label: "Охранников", val: emps },
                  { label: "Штрафы", val: finesCnt },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded-lg py-2">
                    <div className="text-base font-bold font-mono text-foreground">{s.val}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                <Icon name="Phone" size={11} className="text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate flex-1">{org.phone || "—"}</span>
                {finesTotal > 0 && (
                  <span className="text-[10px] font-mono text-red-400 shrink-0">{fmt(finesTotal)}</span>
                )}
              </div>

              {/* Actions (show on hover) */}
              <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onSwitchOrg(org.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                >
                  <Icon name="ArrowRightLeft" size={12} /> Перейти
                </button>
                <button
                  onClick={() => { setTarget(org); setModal("edit"); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-secondary text-foreground text-xs transition-colors"
                >
                  <Icon name="Pencil" size={12} />
                </button>
                <button
                  onClick={() => { setTarget(org); setModal("delete"); }}
                  className="flex items-center justify-center px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 text-xs transition-colors"
                >
                  <Icon name="Trash2" size={12} />
                </button>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <button
            onClick={() => { setTarget(null); setModal("add"); }}
            className="bg-card border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[220px] group"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Icon name="Plus" size={22} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Добавить организацию</p>
              <p className="text-xs text-muted-foreground mt-0.5">Новое юрлицо в холдинге</p>
            </div>
          </button>
        </div>
      </div>

      </> /* end orgs tab */}

      {/* Modals */}
      {modal === "add" && (
        <OrgModal title="Новая организация" initial={null} onSave={d => { addOrg(d); close(); }} onClose={close} />
      )}
      {modal === "edit" && target && (
        <OrgModal title={`Редактировать — ${target.shortName}`} initial={target} onSave={d => { editOrg(target.id, d); close(); }} onClose={close} />
      )}
      {modal === "delete" && target && (
        <DeleteOrgModal org={target} onConfirm={() => { deleteOrg(target.id); close(); }} onClose={close} />
      )}
      {modal === "detail" && target && (
        <OrgDetail
          org={target}
          onClose={close}
          onEdit={() => setModal("edit")}
          onSwitch={() => { onSwitchOrg(target.id); close(); }}
        />
      )}
    </div>
  );
}