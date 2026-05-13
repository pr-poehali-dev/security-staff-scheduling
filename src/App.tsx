import { useState } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import LoginScreen from "@/components/LoginScreen";
import OrgSwitcher from "@/components/OrgSwitcher";
import UsersSection from "@/components/UsersSection";
import HoldingSection from "@/components/HoldingSection";
import Icon from "@/components/ui/icon";
import type { Section, Location, Post, FineRecord, FineReason } from "@/types";
import {
  exportFinesPDF, exportFinesExcel, type FinesReportData,
  exportPDF, exportExcel, type ExportReportData,
} from "@/lib/export";

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_LABELS = { office: "Офис / БЦ", warehouse: "Склад", retail: "Торговый объект", industrial: "Промышленный", residential: "Жилой комплекс" } as const;
const TYPE_COLORS = {
  office: "text-primary bg-primary/10 border-primary/20",
  warehouse: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  retail: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  industrial: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  residential: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
} as const;

const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors";

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
      {children}
    </div>
  );
}

const postBadge = (s: Post["status"]) => s === "covered" ? <span className="badge-active">Закрыт</span> : s === "alert" ? <span className="badge-danger">Тревога</span> : <span className="badge-warning">Вакантен</span>;

// ─── Nav ─────────────────────────────────────────────────────────────────────
const NAV_ITEMS: { key: Section; label: string; icon: string; perm?: string; holdingOnly?: boolean }[] = [
  { key: "dashboard",  label: "Главная",          icon: "LayoutDashboard", perm: "dashboard:view" },
  { key: "objects",    label: "Объекты",           icon: "Building2",       perm: "objects:view" },
  { key: "placements", label: "Расстановки",       icon: "MapPin",          perm: "placements:view" },
  { key: "employees",  label: "Сотрудники",        icon: "Users",           perm: "employees:view" },
  { key: "fines",      label: "Штрафы",            icon: "BadgeAlert",      perm: "fines:view" },
  { key: "reports",    label: "Отчёты",            icon: "FileText",        perm: "reports:view" },
  { key: "schedule",   label: "График",            icon: "CalendarDays",    perm: "schedule:view" },
  { key: "export",     label: "Экспорт",           icon: "Download",        perm: "export:use" },
  { key: "analytics",  label: "Аналитика",         icon: "BarChart3",       perm: "analytics:view" },
  { key: "users",      label: "Пользователи",      icon: "UserCog",         perm: "users:view" },
  { key: "settings",   label: "Настройки",         icon: "Settings",        perm: "settings:edit" },
  { key: "holding",    label: "Холдинг",           icon: "Network",         perm: "holding:view", holdingOnly: true },
];

// ─── Location Form ────────────────────────────────────────────────────────────
const EMPTY_LOC: Omit<Location, "id" | "orgId"> = { name: "", address: "", type: "office", posts: 1, contact: "", note: "", hourlyRate: 200 };

function LocationModal({ initial, onSave, onClose, title }: {
  initial: Omit<Location, "id" | "orgId"> | null;
  onSave: (d: Omit<Location, "id" | "orgId">) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial ?? EMPTY_LOC);
  const set = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0 && form.address.trim().length > 0;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Название" req><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Объект Д" className={inputCls} /></Field>
            <Field label="Тип">
              <select value={form.type} onChange={e => set("type", e.target.value as Location["type"])} className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Адрес" req><input value={form.address} onChange={e => set("address", e.target.value)} placeholder="ул. Примерная, 1" className={inputCls} /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Контакт"><input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="+7 900 000-00-00" className={inputCls} /></Field>
            <Field label="Постов"><input type="number" min={1} max={99} value={form.posts} onChange={e => set("posts", parseInt(e.target.value) || 1)} className={inputCls} /></Field>
            <Field label="Тариф, ₽/час">
              <input type="number" min={0} step={10} value={form.hourlyRate} onChange={e => set("hourlyRate", parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>
          </div>
          <Field label="Примечание"><textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Особые условия..." /></Field>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Сохранить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"><Icon name="Trash2" size={22} className="text-red-400" /></div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить объект?</h3>
        <p className="text-sm text-muted-foreground mb-6">«{name}» и все его посты будут удалены. Действие нельзя отменить.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({ post, onAssign, onClose }: {
  post: Post;
  onAssign: (postId: number, empId: number | null, fine: Omit<FineRecord, "id" | "date" | "postId" | "orgId"> | null) => void;
  onClose: () => void;
}) {
  const { employees, fineReasons, locations } = useApp();
  const loc = locations.find(l => l.id === post.locationId);
  const curEmp = employees.find(e => e.id === post.officerId) ?? null;
  const [selId, setSelId] = useState<number | null>(post.officerId);
  const [withFine, setWithFine] = useState(false);
  const [reasonId, setReasonId] = useState<number>(fineReasons[0]?.id ?? 1);
  const [fineAmt, setFineAmt] = useState<number>(fineReasons[0]?.amount ?? 500);
  const [fineNote, setFineNote] = useState("");

  const handleReason = (id: number) => { setReasonId(id); const r = fineReasons.find(r => r.id === id); if (r) setFineAmt(r.amount); };
  const isReplacement = curEmp !== null && selId !== post.officerId;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg text-foreground">Назначение на пост</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{post.name} · {loc?.name ?? "—"} · <span className="font-mono">{post.time}</span></p>

        {curEmp && (
          <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl mb-4">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {curEmp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{curEmp.name}</p><p className="text-xs text-muted-foreground">{curEmp.rank} · сейчас на посту</p></div>
            <Icon name="ArrowRight" size={16} className="text-muted-foreground" />
          </div>
        )}

        <Field label="Назначить сотрудника">
          <select value={selId ?? ""} onChange={e => setSelId(e.target.value === "" ? null : Number(e.target.value))} className={inputCls}>
            <option value="">— Снять (вакантный пост) —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} · {e.rank}{e.id === post.officerId ? " (текущий)" : ""}</option>)}
          </select>
        </Field>

        {isReplacement && curEmp && (
          <div className="mt-4 border border-border rounded-xl overflow-hidden">
            <button onClick={() => setWithFine(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left">
              <div className={`w-5 h-5 rounded flex items-center justify-center ${withFine ? "bg-primary" : "bg-muted border border-border"}`}>
                {withFine && <Icon name="Check" size={12} className="text-primary-foreground" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Начислить штраф</p>
                <p className="text-xs text-muted-foreground">{curEmp.name} — зафиксировать нарушение</p>
              </div>
            </button>
            {withFine && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                <Field label="Причина">
                  <select value={reasonId} onChange={e => handleReason(Number(e.target.value))} className={inputCls}>
                    {fineReasons.map(r => <option key={r.id} value={r.id}>{r.label} — {fmt(r.amount)}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Сумма штрафа, ₽">
                    <input type="number" min={0} step={100} value={fineAmt} onChange={e => setFineAmt(Number(e.target.value))} className={inputCls} />
                  </Field>
                  <Field label="Примечание">
                    <input value={fineNote} onChange={e => setFineNote(e.target.value)} placeholder="Уточнение..." className={inputCls} />
                  </Field>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                  <Icon name="AlertTriangle" size={13} /> Штраф {fmt(fineAmt)} будет записан в историю
                </div>
              </div>
            )}
          </div>
        )}

        {selId === null && curEmp && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
            <Icon name="Info" size={13} /> Пост будет помечен как вакантный
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              const fine = withFine && curEmp ? { employeeId: curEmp.id, reasonId, note: fineNote, amount: fineAmt } : null;
              onAssign(post.id, selId, fine);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            {isReplacement ? "Заменить" : selId === null ? "Снять охранника" : "Назначить"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── FineReasons Modal ────────────────────────────────────────────────────────
function FineReasonsModal({ onClose }: { onClose: () => void }) {
  const { fineReasons, setFineReasons } = useApp();
  const [list, setList] = useState<FineReason[]>(fineReasons);
  const upd = (id: number, k: keyof FineReason, v: string | number) => setList(p => p.map(r => r.id === id ? { ...r, [k]: v } : r));
  const add = () => setList(p => [...p, { id: Math.max(0, ...p.map(r => r.id)) + 1, orgId: p[0]?.orgId ?? 1, label: "Новое нарушение", amount: 500, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" }]);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-xl section-enter max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="font-bold text-lg text-foreground">Справочник нарушений</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {list.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <input value={r.label} onChange={e => upd(r.id, "label", e.target.value)} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none border-b border-transparent focus:border-border pb-0.5 transition-colors" />
              <input type="number" min={0} step={100} value={r.amount} onChange={e => upd(r.id, "amount", Number(e.target.value))} className="w-24 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-mono text-right focus:outline-none" />
              <span className="text-xs text-muted-foreground">₽</span>
              <button onClick={() => setList(p => p.filter(x => x.id !== r.id))} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"><Icon name="X" size={14} /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex gap-3 shrink-0">
          <button onClick={add} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary"><Icon name="Plus" size={15} /> Добавить</button>
          <button onClick={() => { setFineReasons(list); onClose(); }} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Сохранить</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const { locations, employees, posts, fines, currentOrg } = useApp();
  const active = employees.filter(e => e.status === "active").length;
  const covered = posts.filter(p => p.status === "covered").length;
  const vacant = posts.filter(p => p.status === "vacant").length;
  const alertC = posts.filter(p => p.status === "alert").length;
  const finesTotal = fines.reduce((s, f) => s + f.amount, 0);
  return (
    <div className="section-enter space-y-6">
      <div className="relative rounded-2xl overflow-hidden border border-border p-8 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="relative z-10">
          <p className="text-xs font-mono text-primary uppercase tracking-widest mb-2">06 мая 2026</p>
          <h1 className="text-3xl font-bold text-foreground mb-1">{currentOrg?.shortName ?? "SecureOps"}</h1>
          <p className="text-muted-foreground">{currentOrg?.name ?? "Система управления охраной"} · {locations.length} объектов</p>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5"><Icon name="Shield" size={160} /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "На смене", value: active, icon: "UserCheck", color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Постов закрыто", value: covered, icon: "ShieldCheck", color: "text-primary", bg: "bg-primary/10" },
          { label: "Вакантных", value: vacant, icon: "ShieldOff", color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Тревоги", value: alertC, icon: "AlertTriangle", color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Штрафы", value: fmt(finesTotal), icon: "BadgeAlert", color: "text-rose-400", bg: "bg-rose-500/10" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon name={s.icon} size={20} className={s.color} /></div>
            <div className={`text-2xl font-bold font-mono ${s.color} mb-1 truncate`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-foreground">Тревоги и вакансии</h3><Icon name="Bell" size={16} className="text-muted-foreground" /></div>
          {posts.filter(p => p.status !== "covered").length === 0
            ? <p className="text-sm text-muted-foreground py-4 text-center">Все посты закрыты</p>
            : <div className="space-y-2">{posts.filter(p => p.status !== "covered").map(p => {
              const loc = locations.find(l => l.id === p.locationId);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div><p className="text-sm font-medium text-foreground">{p.name}</p><p className="text-xs text-muted-foreground">{loc?.name ?? "—"} · {p.time}</p></div>
                  {postBadge(p.status)}
                </div>
              );
            })}</div>
          }
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-foreground">Объекты</h3><Icon name="Building2" size={16} className="text-muted-foreground" /></div>
          <div className="space-y-2">
            {locations.map(loc => {
              const lp = posts.filter(p => p.locationId === loc.id);
              const cov = lp.filter(p => p.status === "covered").length;
              return (
                <div key={loc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${lp.some(p => p.status === "alert") ? "bg-red-400" : cov === lp.length && lp.length > 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{loc.name}</p><p className="text-xs text-muted-foreground truncate">{loc.address}</p></div>
                  <span className="text-xs font-mono text-muted-foreground">{cov}/{lp.length > 0 ? lp.length : loc.posts}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Objects() {
  const { locations, posts, addLocation, editLocation, deleteLocation, can } = useApp();
  const canEdit = can("objects:edit");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<Location | null>(null);
  const [search, setSearch] = useState("");
  const filtered = locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.address.toLowerCase().includes(search.toLowerCase()));
  const close = () => { setModal(null); setTarget(null); };
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-foreground">Объекты</h2><p className="text-muted-foreground text-sm mt-1">{locations.length} объектов</p></div>
        {canEdit && <button onClick={() => setModal("add")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0"><Icon name="Plus" size={16} /> Добавить</button>}
      </div>
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="X" size={14} /></button>}
      </div>
      {filtered.length === 0
        ? <div className="bg-card border border-border rounded-xl p-12 text-center"><Icon name="Building2" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-muted-foreground text-sm">{search ? "Ничего не найдено" : "Объекты не добавлены"}</p>{!search && canEdit && <button onClick={() => setModal("add")} className="mt-4 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Добавить первый</button>}</div>
        : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(loc => {
            const lp = posts.filter(p => p.locationId === loc.id);
            const cov = lp.filter(p => p.status === "covered").length;
            const hasAlert = lp.some(p => p.status === "alert");
            const pct = lp.length > 0 ? Math.round((cov / lp.length) * 100) : 0;
            return (
              <div key={loc.id} className={`bg-card border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20 ${hasAlert ? "border-red-500/30" : "border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3"><h3 className="font-bold text-foreground truncate">{loc.name}</h3><p className="text-xs text-muted-foreground mt-0.5 truncate">{loc.address}</p></div>
                  <span className={`text-xs px-2 py-1 rounded-lg border font-medium shrink-0 ${TYPE_COLORS[loc.type]}`}>{TYPE_LABELS[loc.type]}</span>
                </div>
                {hasAlert && <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-3 text-xs text-red-400"><Icon name="AlertTriangle" size={13} /> Пост в тревоге</div>}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Покрытие</span><span className="font-mono">{cov}/{lp.length > 0 ? lp.length : loc.posts}</span></div>
                  <div className="h-1.5 bg-muted rounded-full"><div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${lp.length > 0 ? pct : 0}%` }} /></div>
                </div>
                {loc.contact && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4"><Icon name="Phone" size={11} /> {loc.contact}</p>}
                {canEdit && (
                  <div className="flex gap-2 pt-3 border-t border-border/60">
                    <button onClick={() => { setTarget(loc); setModal("edit"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted hover:bg-secondary text-foreground text-xs font-medium transition-colors"><Icon name="Pencil" size={13} /> Редактировать</button>
                    <button onClick={() => { setTarget(loc); setModal("delete"); }} className="flex items-center justify-center px-3 py-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 text-xs transition-colors"><Icon name="Trash2" size={13} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
      {modal === "add" && <LocationModal title="Новый объект" initial={null} onSave={d => { addLocation(d); close(); }} onClose={close} />}
      {modal === "edit" && target && <LocationModal title={`Редактировать — ${target.name}`} initial={target} onSave={d => { editLocation(target.id, d); close(); }} onClose={close} />}
      {modal === "delete" && target && <DeleteModal name={target.name} onConfirm={() => { deleteLocation(target.id); close(); }} onClose={close} />}
    </div>
  );
}

// ─── Confirm Post Modal ───────────────────────────────────────────────────────
function ConfirmPostModal({ post, operatorName, onConfirm, onClose }: {
  post: Post;
  operatorName: string;
  onConfirm: (actualStartTime: string, confirmedBy: string) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [startTime, setStartTime] = useState(defaultTime);
  const [operator, setOperator] = useState(operatorName);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Icon name="ClipboardCheck" size={22} className="text-emerald-400" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-1">Подтверждение заступления</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Пост: <span className="text-foreground font-medium">{post.name}</span> · {post.time}
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Фактическое время заступления</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Оператор (подтверждающий)</label>
            <input
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => { onConfirm(startTime, operator); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            Подтвердить заступление
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Close Post Modal ─────────────────────────────────────────────────────────
function ClosePostModal({ post, onClose: onModalClose, onConfirm }: {
  post: Post;
  onClose: () => void;
  onConfirm: (hours: number) => void;
}) {
  // Calculate expected hours from scheduled time
  const expectedHours = parseShiftHours(post.time);
  const [hours, setHours] = useState(expectedHours > 0 ? expectedHours : 12);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onModalClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon name="Timer" size={22} className="text-primary" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-1">Закрытие смены</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Пост: <span className="text-foreground font-medium">{post.name}</span>
          {post.actualStartTime && <> · Заступил: <span className="font-mono">{post.actualStartTime}</span></>}
        </p>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Фактически отработано часов</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setHours(h => Math.max(0.5, h - 0.5))} className="w-9 h-9 rounded-xl bg-muted hover:bg-secondary flex items-center justify-center text-foreground">
              <Icon name="Minus" size={14} />
            </button>
            <input
              type="number" min={0.5} max={24} step={0.5}
              value={hours}
              onChange={e => setHours(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-center font-mono font-bold text-foreground focus:outline-none focus:border-primary/50"
            />
            <button onClick={() => setHours(h => Math.min(24, h + 0.5))} className="w-9 h-9 rounded-xl bg-muted hover:bg-secondary flex items-center justify-center text-foreground">
              <Icon name="Plus" size={14} />
            </button>
          </div>
          {expectedHours > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              По графику: <span className="font-mono">{expectedHours} ч</span>
              {hours < expectedHours && <span className="text-amber-400 ml-2">↓ {(expectedHours - hours).toFixed(1)} ч недоработка</span>}
              {hours > expectedHours && <span className="text-emerald-400 ml-2">↑ {(hours - expectedHours).toFixed(1)} ч сверхурочно</span>}
            </p>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => { onConfirm(hours); onModalClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Закрыть смену
          </button>
          <button onClick={onModalClose} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

function Placements() {
  const { locations, posts, employees, assignPost, confirmPost, closePost, can, session } = useApp();
  const canEdit = can("placements:edit");
  const [assignPost2, setAssignPost2] = useState<Post | null>(null);
  const [confirmingPost, setConfirmingPost] = useState<Post | null>(null);
  const [closingPost, setClosingPost] = useState<Post | null>(null);
  const [fineSettings, setFineSettings] = useState(false);

  const operatorName = session?.user.name ?? "Оператор";

  // Summary stats
  const confirmed = posts.filter(p => p.confirmedAt !== null).length;
  const covered = posts.filter(p => p.status === "covered").length;
  const pending = covered - confirmed;

  if (locations.length === 0) return (
    <div className="section-enter text-center py-20">
      <Icon name="MapPin" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-muted-foreground">Добавьте объекты в разделе «Объекты»</p>
    </div>
  );

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Расстановки</h2>
          <p className="text-muted-foreground text-sm mt-1">Назначение и подтверждение заступления на посты</p>
        </div>
        {canEdit && (
          <button onClick={() => setFineSettings(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors">
            <Icon name="Settings2" size={15} /> Причины штрафов
          </button>
        )}
      </div>

      {/* Confirmation summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Постов назначено", val: covered, icon: "UserCheck", c: "text-primary", bg: "bg-primary/10" },
          { label: "Подтверждено", val: confirmed, icon: "ClipboardCheck", c: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Ожидают подтверждения", val: pending, icon: "Clock", c: pending > 0 ? "text-amber-400" : "text-muted-foreground", bg: pending > 0 ? "bg-amber-500/10" : "bg-muted/40" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <Icon name={s.icon} size={18} className={s.c} />
            </div>
            <div>
              <div className={`text-xl font-bold font-mono ${s.c}`}>{s.val}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Location groups */}
      {locations.map(loc => {
        const lp = posts.filter(p => p.locationId === loc.id);
        const locConfirmed = lp.filter(p => p.confirmedAt !== null).length;
        return (
          <div key={loc.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Icon name="Building2" size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">{loc.name}</h3>
              <span className="text-xs text-muted-foreground font-mono ml-1">
                {lp.filter(p => p.status === "covered").length}/{lp.length} закрыто
              </span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full border font-mono
                 border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                {locConfirmed}/{lp.filter(p => p.status === "covered").length} подтверждено
              </span>
            </div>

            {lp.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Посты не назначены</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {lp.map(post => {
                  const emp = employees.find(e => e.id === post.officerId);
                  const isConfirmed = post.confirmedAt !== null;
                  const isClosed = post.actualHours !== null;

                  return (
                    <div
                      key={post.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isClosed         ? "border-blue-500/20 bg-blue-500/5" :
                        isConfirmed      ? "border-emerald-500/30 bg-emerald-500/8" :
                        post.status === "covered" ? "border-emerald-500/20 bg-emerald-500/5" :
                        post.status === "alert"   ? "border-red-500/30 bg-red-500/5" :
                                                    "border-amber-500/20 bg-amber-500/5"
                      }`}
                    >
                      {/* Post header */}
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="font-medium text-sm text-foreground">{post.name}</span>
                        {isClosed
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">Закрыта</span>
                          : isConfirmed
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                              <Icon name="CheckCircle2" size={9} />Подтверждён
                            </span>
                          : postBadge(post.status)
                        }
                      </div>

                      {/* Schedule time */}
                      <p className="text-xs text-muted-foreground font-mono mb-2">{post.time}</p>

                      {/* Employee row */}
                      {emp ? (
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="text-xs text-foreground truncate">{emp.name}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-400 flex items-center gap-1 mb-2.5">
                          <Icon name="UserX" size={11} /> Не назначен
                        </p>
                      )}

                      {/* Confirmation details */}
                      {isConfirmed && (
                        <div className="mb-2.5 space-y-0.5">
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <Icon name="Clock" size={9} />
                            Заступил: <span className="font-mono font-semibold">{post.actualStartTime}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Icon name="User" size={9} />
                            Оператор: {post.confirmedBy}
                          </p>
                          {isClosed && (
                            <p className="text-[10px] text-blue-400 flex items-center gap-1">
                              <Icon name="Timer" size={9} />
                              Отработано: <span className="font-mono font-semibold">{post.actualHours} ч</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {canEdit && (
                        <div className="flex gap-1.5 mt-1">
                          {/* Assign/Replace */}
                          {!isConfirmed && (
                            <button
                              onClick={() => setAssignPost2(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Icon name="UserCog" size={11} />
                              {emp ? "Заменить" : "Назначить"}
                            </button>
                          )}

                          {/* Confirm button — only if assigned and not confirmed */}
                          {emp && !isConfirmed && (
                            <button
                              onClick={() => setConfirmingPost(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs text-emerald-400 font-medium transition-all"
                            >
                              <Icon name="ClipboardCheck" size={11} />
                              Подтвердить
                            </button>
                          )}

                          {/* Close shift — only if confirmed and not closed */}
                          {isConfirmed && !isClosed && (
                            <button
                              onClick={() => setClosingPost(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-xs text-primary font-medium transition-all"
                            >
                              <Icon name="Timer" size={11} />
                              Закрыть смену
                            </button>
                          )}

                          {/* Re-assign after close */}
                          {isClosed && (
                            <button
                              onClick={() => setAssignPost2(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 text-xs text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Icon name="RefreshCw" size={11} />
                              Новая смена
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {assignPost2 && (
        <AssignModal post={assignPost2} onAssign={assignPost} onClose={() => setAssignPost2(null)} />
      )}
      {confirmingPost && (
        <ConfirmPostModal
          post={confirmingPost}
          operatorName={operatorName}
          onConfirm={(t, by) => confirmPost(confirmingPost.id, t, by)}
          onClose={() => setConfirmingPost(null)}
        />
      )}
      {closingPost && (
        <ClosePostModal
          post={closingPost}
          onConfirm={h => closePost(closingPost.id, h)}
          onClose={() => setClosingPost(null)}
        />
      )}
      {fineSettings && <FineReasonsModal onClose={() => setFineSettings(false)} />}
    </div>
  );
}

// ─── Employee Modal ───────────────────────────────────────────────────────────
type EmpForm = Omit<import("@/types").Employee, "id" | "orgId">;

const EMPTY_EMP: EmpForm = {
  name: "", rank: "Охранник", status: "active", location: "—",
  shift: "08:00 – 20:00", phone: "", hireDate: "", yearsExp: 0, seniorityBonus: 0, note: "",
};

function EmployeeModal({ initial, onSave, onClose, title }: {
  initial: EmpForm | null;
  onSave: (d: EmpForm) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState<EmpForm>(initial ?? EMPTY_EMP);
  const set = <K extends keyof EmpForm>(k: K, v: EmpForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ФИО + Должность */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Полное имя" req>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Фамилия Имя Отчество" className={inputCls} />
            </Field>
            <Field label="Должность">
              <select value={form.rank} onChange={e => set("rank", e.target.value)} className={inputCls}>
                {["Охранник", "Ст. охранник", "Руководитель группы", "Стажёр"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          {/* Статус + Телефон */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Статус">
              <select value={form.status} onChange={e => set("status", e.target.value as EmpForm["status"])} className={inputCls}>
                <option value="active">На смене</option>
                <option value="off">Выходной</option>
                <option value="sick">Больничный</option>
              </select>
            </Field>
            <Field label="Телефон">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 900 000-00-00" className={inputCls} />
            </Field>
          </div>

          {/* Смена + Локация */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="График смены">
              <select value={form.shift} onChange={e => set("shift", e.target.value)} className={inputCls}>
                {["08:00 – 20:00", "20:00 – 08:00", "Выходной", "Больничный", "Отпуск"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Текущий объект">
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Объект А — Главный вход" className={inputCls} />
            </Field>
          </div>

          {/* Дата приёма + Стаж */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Дата приёма на работу">
              <input type="date" value={form.hireDate} onChange={e => set("hireDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Стаж в охране, лет">
              <input type="number" min={0} max={50} value={form.yearsExp} onChange={e => set("yearsExp", parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>
          </div>

          {/* Надбавка */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="TrendingUp" size={15} className="text-amber-400" />
              <p className="text-sm font-semibold text-foreground">Надбавка за выслугу лет</p>
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <Field label="Надбавка, ₽/час">
                <input type="number" min={0} step={5} value={form.seniorityBonus} onChange={e => set("seniorityBonus", parseInt(e.target.value) || 0)} className={inputCls} />
              </Field>
              <div className="pb-2.5 text-xs text-muted-foreground">
                {form.yearsExp >= 10 && <span className="text-emerald-400">≥ 10 лет: рекомендуется +40–50 ₽/ч</span>}
                {form.yearsExp >= 5 && form.yearsExp < 10 && <span className="text-primary">5–9 лет: рекомендуется +20–35 ₽/ч</span>}
                {form.yearsExp > 0 && form.yearsExp < 5 && <span className="text-muted-foreground">1–4 лет: рекомендуется +10–20 ₽/ч</span>}
                {form.yearsExp === 0 && <span className="text-muted-foreground">Стаж не указан</span>}
              </div>
            </div>
          </div>

          {/* Примечание */}
          <Field label="Примечание">
            <textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Дополнительная информация..." />
          </Field>
        </div>

        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Сохранить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

function EmployeeDeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"><Icon name="UserX" size={22} className="text-red-400" /></div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить сотрудника?</h3>
        <p className="text-sm text-muted-foreground mb-6">«{name}» будет удалён из базы. Это действие нельзя отменить.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Employees Section ────────────────────────────────────────────────────────
// ─── Salary helpers ───────────────────────────────────────────────────────────
function parseShiftHours(shift: string): number {
  // "08:00 – 20:00" → 12, "20:00 – 08:00" → 12
  const m = shift.match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
  if (!m) return 0;
  const start = parseInt(m[1]) * 60 + parseInt(m[2]);
  let end = parseInt(m[3]) * 60 + parseInt(m[4]);
  if (end <= start) end += 24 * 60;
  return (end - start) / 60;
}

function calcSalary(hourlyTotal: number, shiftHours: number, shiftsPerMonth: number) {
  const perShift = hourlyTotal * shiftHours;
  const perMonth = perShift * shiftsPerMonth;
  return { perShift, perMonth };
}

// ─── Employee Salary Card ─────────────────────────────────────────────────────
function EmployeeSalaryCard({ employee, locations, onEdit, onClose }: {
  employee: import("@/types").Employee;
  locations: import("@/types").Location[];
  onEdit: () => void;
  onClose: () => void;
}) {
  const { posts, fines } = useApp();

  const loc = locations.find(l => employee.location.startsWith(l.name));
  const baseRate = loc?.hourlyRate ?? 0;
  const totalRate = baseRate + employee.seniorityBonus;
  const shiftHours = parseShiftHours(employee.shift);

  // ── Фактические данные из расстановок ────────────────────────────────────
  // Все посты этого сотрудника с подтверждёнными и закрытыми сменами
  const empPosts = posts.filter(p => p.officerId === employee.id);
  const closedPosts = empPosts.filter(p => p.actualHours !== null);
  const confirmedPosts = empPosts.filter(p => p.confirmedAt !== null && p.actualHours === null);
  const totalActualHours = closedPosts.reduce((s, p) => s + (p.actualHours ?? 0), 0);
  const actualEarned = totalActualHours * totalRate;

  // Штрафы сотрудника
  const empFines = fines.filter(f => f.employeeId === employee.id);
  const totalFinesAmt = empFines.reduce((s, f) => s + f.amount, 0);
  const netActual = Math.max(0, actualEarned - totalFinesAmt);

  const hasActualData = closedPosts.length > 0 || confirmedPosts.length > 0;

  // Configurable in card
  const [shiftsPerMonth, setShiftsPerMonth] = useState(15);
  const { perShift, perMonth } = calcSalary(totalRate, shiftHours, shiftsPerMonth);

  const fmtRub = (n: number) => n.toLocaleString("ru-RU") + " ₽";
  const initials = employee.name.split(" ").map(n => n[0]).join("").slice(0, 2);

  const badge = (s: "active" | "off" | "sick") =>
    s === "active" ? <span className="badge-active">На смене</span>
    : s === "sick"   ? <span className="badge-danger">Больничный</span>
    : <span className="badge-inactive">Выходной</span>;

  const hireYear = employee.hireDate ? new Date(employee.hireDate).getFullYear() : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card border border-border w-full sm:max-w-md max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl section-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start gap-4 p-5 border-b border-border shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground leading-tight">{employee.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{employee.rank} · {employee.phone}</p>
            <div className="mt-1.5">{badge(employee.status)}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── Info block ── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Объект", val: loc?.name ?? "Не назначен", icon: "Building2" },
              { label: "График", val: employee.shift, icon: "Clock" },
              { label: "Стаж", val: `${employee.yearsExp} лет${employee.yearsExp >= 10 ? " 🏅" : ""}`, icon: "Award" },
              { label: "Принят", val: hireYear ? `${hireYear} г.` : "—", icon: "CalendarDays" },
            ].map(s => (
              <div key={s.label} className="flex items-start gap-2.5 p-3 bg-muted/40 rounded-xl">
                <Icon name={s.icon} size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm text-foreground font-medium truncate">{s.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Rate breakdown ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Ставка ₽/час</p>
            </div>
            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                  <span className="text-sm text-muted-foreground">Тариф объекта</span>
                  {loc && <span className="text-[10px] text-muted-foreground">({loc.name})</span>}
                </div>
                <span className="text-sm font-mono text-foreground">{baseRate > 0 ? `${baseRate} ₽/ч` : "—"}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-sm text-muted-foreground">Надбавка за выслугу</span>
                </div>
                <span className="text-sm font-mono text-amber-400">
                  {employee.seniorityBonus > 0 ? `+${employee.seniorityBonus} ₽/ч` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-semibold text-foreground">Итоговая ставка</span>
                </div>
                <span className="text-base font-mono font-bold text-emerald-400">{totalRate > 0 ? `${totalRate} ₽/ч` : "—"}</span>
              </div>
            </div>
          </div>

          {/* ── Фактические данные из расстановок ── */}
          {hasActualData && (
            <div className="bg-card border border-emerald-500/20 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
                <Icon name="ClipboardCheck" size={14} className="text-emerald-400" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Факт из расстановок</p>
              </div>
              <div className="p-4 space-y-2">
                {/* Closed shifts */}
                {closedPosts.map(p => {
                  const pLoc = locations.find(l => l.id === p.locationId);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{pLoc?.name} · {p.actualStartTime ?? p.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-blue-400">{p.actualHours} ч</p>
                        <p className="text-[10px] text-muted-foreground">{fmtRub((p.actualHours ?? 0) * totalRate)}</p>
                      </div>
                    </div>
                  );
                })}
                {/* Confirmed but open shifts */}
                {confirmedPosts.map(p => {
                  const pLoc = locations.find(l => l.id === p.locationId);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-emerald-500/5 rounded-lg px-3 py-2 border border-emerald-500/15">
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-emerald-400">{pLoc?.name} · Заступил: {p.actualStartTime}</p>
                      </div>
                      <span className="text-[10px] text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">Смена идёт</span>
                    </div>
                  );
                })}

                {/* Totals row */}
                {closedPosts.length > 0 && (
                  <div className="pt-2 border-t border-border space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Отработано часов</span>
                      <span className="font-mono font-semibold text-foreground">{totalActualHours} ч</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Начислено</span>
                      <span className="font-mono text-foreground">{fmtRub(actualEarned)}</span>
                    </div>
                    {totalFinesAmt > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Icon name="BadgeAlert" size={12} className="text-red-400" />
                          Штрафы ({empFines.length} шт.)
                        </span>
                        <span className="font-mono text-red-400">−{fmtRub(totalFinesAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1.5 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">К выплате</span>
                      <span className={`text-base font-mono font-bold ${netActual > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {fmtRub(netActual)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Salary calculator ── */}
          {totalRate > 0 && shiftHours > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <Icon name="Calculator" size={14} className="text-primary" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Плановый расчёт</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Shift hours display */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Часов в смене</span>
                  <span className="font-mono text-foreground font-semibold">{shiftHours} ч</span>
                </div>

                {/* Shifts per month slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Смен в месяц</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShiftsPerMonth(s => Math.max(1, s - 1))} className="w-6 h-6 rounded-lg bg-muted hover:bg-secondary flex items-center justify-center text-foreground transition-colors">
                        <Icon name="Minus" size={12} />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-foreground text-sm">{shiftsPerMonth}</span>
                      <button onClick={() => setShiftsPerMonth(s => Math.min(31, s + 1))} className="w-6 h-6 rounded-lg bg-muted hover:bg-secondary flex items-center justify-center text-foreground transition-colors">
                        <Icon name="Plus" size={12} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range" min={1} max={31} value={shiftsPerMonth}
                    onChange={e => setShiftsPerMonth(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 rounded-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>1</span><span>15</span><span>31</span>
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div>
                      <p className="text-xs text-muted-foreground">За 1 смену ({shiftHours}ч × {totalRate}₽)</p>
                      <p className="text-base font-bold font-mono text-foreground mt-0.5">{fmtRub(perShift)}</p>
                    </div>
                    <Icon name="Sun" size={18} className="text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <div>
                      <p className="text-xs text-muted-foreground">За месяц ({shiftsPerMonth} смен)</p>
                      <p className="text-xl font-bold font-mono text-primary mt-0.5">{fmtRub(perMonth)}</p>
                    </div>
                    <Icon name="Banknote" size={22} className="text-primary" />
                  </div>
                </div>

                {/* Annual estimate */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                  <span>Годовой фонд (оценочно)</span>
                  <span className="font-mono font-semibold text-foreground">{fmtRub(perMonth * 12)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          {employee.note && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <Icon name="StickyNote" size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{employee.note}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 p-5 border-t border-border shrink-0">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Icon name="Pencil" size={15} /> Редактировать
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Employees Section ────────────────────────────────────────────────────────
function Employees() {
  const { employees, addEmployee, editEmployee, deleteEmployee, locations, posts, fines, can } = useApp();
  const canEdit = can("employees:edit");

  const [filter, setFilter] = useState<"all" | "active" | "off" | "sick">("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | "card" | null>(null);
  const [target, setTarget] = useState<import("@/types").Employee | null>(null);
  const close = () => { setModal(null); setTarget(null); };

  const filtered = employees
    .filter(e => filter === "all" || e.status === filter)
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.rank.toLowerCase().includes(search.toLowerCase()));

  const badge = (s: "active" | "off" | "sick") =>
    s === "active" ? <span className="badge-active">На смене</span>
    : s === "sick" ? <span className="badge-danger">Больничный</span>
    : <span className="badge-inactive">Выходной</span>;

  const getEffectiveRate = (e: import("@/types").Employee) => {
    const loc = locations.find(l => e.location.startsWith(l.name));
    const base = loc?.hourlyRate ?? 0;
    return { base, bonus: e.seniorityBonus, total: base + e.seniorityBonus };
  };

  const counts = {
    all: employees.length,
    active: employees.filter(e => e.status === "active").length,
    off: employees.filter(e => e.status === "off").length,
    sick: employees.filter(e => e.status === "sick").length,
  };

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Сотрудники</h2>
          <p className="text-muted-foreground text-sm mt-1">{employees.length} охранников в базе</p>
        </div>
        {canEdit && (
          <button onClick={() => { setTarget(null); setModal("add"); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0">
            <Icon name="UserPlus" size={16} /> Добавить
          </button>
        )}
      </div>

      {/* Filters + Search */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1.5 flex-wrap">
          {([["all", "Все"], ["active", "На смене"], ["off", "Выходной"], ["sick", "Больничный"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {l}
              <span className={`text-[10px] font-mono px-1 py-0.5 rounded-full ${filter === k ? "bg-white/20 text-white" : "bg-background/60 text-muted-foreground"}`}>{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени..." className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="X" size={13} /></button>}
        </div>
      </div>

      {/* ── ФОТ summary ── */}
      {employees.length > 0 && (() => {
        const SHIFTS = 15;
        const fmtR = (n: number) => n.toLocaleString("ru-RU") + " ₽";

        // Плановый ФОТ
        const planAll = employees.map(e => {
          const r = getEffectiveRate(e);
          return r.total * parseShiftHours(e.shift) * SHIFTS;
        });
        const fotPlan = planAll.reduce((s, v) => s + v, 0);

        // Фактический ФОТ из закрытых смен
        const closedPosts = posts.filter(p => p.actualHours !== null && p.officerId !== null);
        const fotActual = closedPosts.reduce((s, p) => {
          const emp = employees.find(e => e.id === p.officerId);
          if (!emp) return s;
          const rate = getEffectiveRate(emp).total;
          return s + (p.actualHours ?? 0) * rate;
        }, 0);
        const actualHoursTotal = closedPosts.reduce((s, p) => s + (p.actualHours ?? 0), 0);

        // Штрафы
        const totalFinesDeduction = fines.reduce((s, f) => s + f.amount, 0);
        const fotNet = Math.max(0, fotActual - totalFinesDeduction);

        // Среднее
        const avgRate = employees.filter(e => getEffectiveRate(e).total > 0);
        const avgRateVal = avgRate.length > 0
          ? Math.round(avgRate.reduce((s, e) => s + getEffectiveRate(e).total, 0) / avgRate.length)
          : 0;

        const hasActual = fotActual > 0;

        return (
          <div className="space-y-3">
            {/* Плановые */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "ФОТ план/мес", val: fmtR(fotPlan), sub: `${employees.length} чел. × ${SHIFTS} смен`, icon: "Banknote", c: "text-primary", bg: "bg-primary/10" },
                { label: "Средняя ставка", val: avgRateVal > 0 ? `${avgRateVal} ₽/ч` : "—", sub: "тариф + надбавка", icon: "TrendingUp", c: "text-amber-400", bg: "bg-amber-500/10" },
                { label: "Фактически начислено", val: hasActual ? fmtR(fotActual) : "—", sub: hasActual ? `${actualHoursTotal} ч из расстановок` : "Нет закрытых смен", icon: "ClipboardCheck", c: hasActual ? "text-blue-400" : "text-muted-foreground", bg: hasActual ? "bg-blue-500/10" : "bg-muted/40" },
                { label: "К выплате (факт − штрафы)", val: hasActual ? fmtR(fotNet) : "—", sub: hasActual ? (totalFinesDeduction > 0 ? `−${fmtR(totalFinesDeduction)} штрафы` : "Штрафов нет") : "Нет данных", icon: "Wallet", c: hasActual ? "text-emerald-400" : "text-muted-foreground", bg: hasActual ? "bg-emerald-500/10" : "bg-muted/40" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2.5`}>
                    <Icon name={s.icon} size={18} className={s.c} />
                  </div>
                  <div className={`text-lg font-bold font-mono ${s.c} leading-tight`}>{s.val}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Расшифровка фактического ФОТ по сотрудникам */}
            {hasActual && (
              <div className="bg-card border border-emerald-500/20 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
                  <Icon name="ClipboardList" size={14} className="text-emerald-400" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Фактический ФОТ по сотрудникам</p>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">из подтверждённых расстановок</span>
                </div>
                <div className="divide-y divide-border/50">
                  {employees
                    .map(emp => {
                      const empPosts = closedPosts.filter(p => p.officerId === emp.id);
                      if (empPosts.length === 0) return null;
                      const rate = getEffectiveRate(emp).total;
                      const hours = empPosts.reduce((s, p) => s + (p.actualHours ?? 0), 0);
                      const earned = hours * rate;
                      const empFinesTotal = fines.filter(f => f.employeeId === emp.id).reduce((s, f) => s + f.amount, 0);
                      const net = Math.max(0, earned - empFinesTotal);
                      return (
                        <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{hours} ч × {rate} ₽/ч{empFinesTotal > 0 ? ` − ${fmtR(empFinesTotal)} штрафы` : ""}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {empFinesTotal > 0 && <p className="text-xs font-mono text-muted-foreground line-through">{fmtR(earned)}</p>}
                            <p className="text-sm font-mono font-bold text-emerald-400">{fmtR(net)}</p>
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean)
                  }
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Icon name="Users" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">{search ? "Ничего не найдено" : "Нет сотрудников в этой категории"}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-border">
                  {["Сотрудник", "Должность", "Статус", "Стаж", "Тариф объекта", "Надбавка", "Итого ₽/ч", ""].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const rate = getEffectiveRate(e);
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => { setTarget(e); setModal("card"); }}
                    >
                      {/* Имя */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{e.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{e.location}</p>
                          </div>
                        </div>
                      </td>
                      {/* Должность */}
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{e.rank}</td>
                      {/* Статус */}
                      <td className="px-4 py-3.5">{badge(e.status)}</td>
                      {/* Стаж */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-mono text-foreground">{e.yearsExp}</span>
                          <span className="text-xs text-muted-foreground">лет</span>
                          {e.yearsExp >= 10 && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">Ветеран</span>}
                        </div>
                      </td>
                      {/* Тариф объекта */}
                      <td className="px-4 py-3.5">
                        {rate.base > 0
                          ? <span className="text-sm font-mono text-foreground">{rate.base} ₽/ч</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Надбавка */}
                      <td className="px-4 py-3.5">
                        {e.seniorityBonus > 0
                          ? <span className="text-sm font-mono text-amber-400">+{e.seniorityBonus} ₽/ч</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Итого */}
                      <td className="px-4 py-3.5">
                        {rate.total > 0
                          ? <span className="text-sm font-mono font-semibold text-emerald-400">{rate.total} ₽/ч</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5" onClick={ev => ev.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setTarget(e); setModal("card"); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Карточка и расчёт зарплаты">
                            <Icon name="Calculator" size={14} />
                          </button>
                          {canEdit && <>
                            <button onClick={() => { setTarget(e); setModal("edit"); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Icon name="Pencil" size={14} />
                            </button>
                            <button onClick={() => { setTarget(e); setModal("delete"); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                              <Icon name="Trash2" size={14} />
                            </button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* ── Footer: totals ── */}
              {(() => {
                const SHIFTS_DEFAULT = 15;
                const fmtR = (n: number) => n.toLocaleString("ru-RU") + " ₽";
                if (filtered.length === 0) return null;
                const totals = filtered.reduce((acc, e) => {
                  const r = getEffectiveRate(e);
                  const hrs = parseShiftHours(e.shift);
                  // фактические часы из закрытых постов
                  const empClosed = posts.filter(p => p.officerId === e.id && p.actualHours !== null);
                  const actualH = empClosed.reduce((s, p) => s + (p.actualHours ?? 0), 0);
                  const actualEarned = actualH * r.total;
                  const empFinesAmt = fines.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0);
                  return {
                    base: acc.base + r.base,
                    bonus: acc.bonus + r.bonus,
                    planFot: acc.planFot + r.total * hrs * SHIFTS_DEFAULT,
                    actualHours: acc.actualHours + actualH,
                    actualNet: acc.actualNet + Math.max(0, actualEarned - empFinesAmt),
                  };
                }, { base: 0, bonus: 0, planFot: 0, actualHours: 0, actualNet: 0 });
                const hasActual = totals.actualHours > 0;
                return (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40">
                      <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {filtered.length} чел.
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {totals.base > 0 ? `∅ ${Math.round(totals.base / filtered.length)} ₽/ч` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-amber-400">
                        {totals.bonus > 0 ? `+∅${Math.round(totals.bonus / filtered.length)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-muted-foreground">план: {fmtR(totals.planFot)}</div>
                        {hasActual && <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">факт: {fmtR(totals.actualNet)}</div>}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" /> Тариф — базовая ставка объекта</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Надбавка за выслугу лет</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Итого = тариф + надбавка</div>
      </div>

      {/* Modals */}
      {modal === "card" && target && (
        <EmployeeSalaryCard
          employee={target}
          locations={locations}
          onEdit={() => setModal("edit")}
          onClose={close}
        />
      )}
      {modal === "add" && (
        <EmployeeModal title="Новый сотрудник" initial={null} onSave={d => { addEmployee(d); close(); }} onClose={close} />
      )}
      {modal === "edit" && target && (
        <EmployeeModal title={`Редактировать — ${target.name}`} initial={target} onSave={d => { editEmployee(target.id, d); close(); }} onClose={close} />
      )}
      {modal === "delete" && target && (
        <EmployeeDeleteModal name={target.name} onConfirm={() => { deleteEmployee(target.id); close(); }} onClose={close} />
      )}
    </div>
  );
}

function Fines() {
  const { fines, employees, posts, locations, fineReasons, currentOrg, holding } = useApp();
  const [filterEmp, setFilterEmp] = useState<number | "all">("all");
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportMenu, setExportMenu] = useState(false);

  const filtered = filterEmp === "all" ? fines : fines.filter(f => f.employeeId === filterEmp);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const totalAll = fines.reduce((s, f) => s + f.amount, 0);
  const byEmp = employees
    .map(e => ({ e, total: fines.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0), cnt: fines.filter(f => f.employeeId === e.id).length }))
    .filter(x => x.cnt > 0)
    .sort((a, b) => b.total - a.total);

  const buildFinesData = (): FinesReportData => {
    const filterLabel = filterEmp === "all"
      ? "Все сотрудники"
      : employees.find(e => e.id === filterEmp)?.name ?? "—";

    const rows = sorted.map(f => {
      const emp = employees.find(e => e.id === f.employeeId);
      const post = posts.find(p => p.id === f.postId);
      const loc = post ? locations.find(l => l.id === post.locationId) : null;
      const reason = fineReasons.find(r => r.id === f.reasonId);
      return {
        date: fmtDate(f.date),
        employeeName: emp?.name ?? "—",
        rank: emp?.rank ?? "—",
        postName: post?.name ?? "—",
        locationName: loc?.name ?? "—",
        reasonLabel: reason?.label ?? "—",
        note: f.note,
        amount: f.amount,
      };
    });

    const byEmployee = byEmp
      .filter(x => filterEmp === "all" || x.e.id === filterEmp)
      .map(x => ({ name: x.e.name, rank: x.e.rank, count: x.cnt, total: x.total }));

    return {
      orgName: currentOrg?.name ?? "—",
      orgColor: currentOrg?.color ?? "#6366f1",
      holdingName: holding.name,
      generatedAt: new Date().toLocaleDateString("ru-RU"),
      filterLabel,
      rows,
      byEmployee,
      totalAmount: sorted.reduce((s, f) => s + f.amount, 0),
      totalCount: sorted.length,
    };
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    setExporting(format);
    setExportMenu(false);
    await new Promise(r => setTimeout(r, 80));
    const data = buildFinesData();
    if (format === "pdf") exportFinesPDF(data);
    else exportFinesExcel(data);
    setExporting(null);
  };

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Штрафы</h2>
          <p className="text-muted-foreground text-sm mt-1">История нарушений</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenu(v => !v)}
            disabled={!!exporting || fines.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {exporting
              ? <><Icon name="Loader2" size={15} className="animate-spin" /> Генерация...</>
              : <><Icon name="Download" size={15} /> Экспорт <Icon name="ChevronDown" size={12} /></>
            }
          </button>
          {exportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 w-44">
              <button onClick={() => handleExport("pdf")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0"><Icon name="FileText" size={14} className="text-red-400" /></div>
                <div><p className="text-sm font-medium text-foreground">PDF</p><p className="text-[10px] text-muted-foreground">Готовый документ</p></div>
              </button>
              <div className="h-px bg-border mx-3" />
              <button onClick={() => handleExport("xlsx")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Icon name="Table" size={14} className="text-emerald-400" /></div>
                <div><p className="text-sm font-medium text-foreground">Excel</p><p className="text-[10px] text-muted-foreground">3 листа с данными</p></div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ label: "Всего нарушений", val: fines.length, icon: "BadgeAlert", c: "text-red-400", bg: "bg-red-500/10" }, { label: "Сумма штрафов", val: fmt(totalAll), icon: "CircleDollarSign", c: "text-amber-400", bg: "bg-amber-500/10" }, { label: "Нарушителей", val: byEmp.length, icon: "Users", c: "text-primary", bg: "bg-primary/10" }].map(s => (
          <div key={s.label} className="stat-card"><div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon name={s.icon} size={20} className={s.c} /></div><div className={`text-2xl font-bold font-mono ${s.c} mb-1`}>{s.val}</div><div className="text-sm text-muted-foreground">{s.label}</div></div>
        ))}
      </div>

      {byEmp.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Топ нарушителей</h3>
          <div className="space-y-2">{byEmp.map((x, i) => (
            <div key={x.e.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">{x.e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{x.e.name}</p><p className="text-xs text-muted-foreground">{x.cnt} нарушений</p></div>
              <span className="text-sm font-mono font-semibold text-red-400">{fmt(x.total)}</span>
            </div>
          ))}</div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
          <h3 className="font-semibold text-foreground mr-2">История</h3>
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none">
            <option value="all">Все сотрудники</option>
            {employees.filter(e => fines.some(f => f.employeeId === e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{sorted.length} записей</span>
        </div>
        {sorted.length === 0 ? <div className="py-12 text-center"><Icon name="CheckCircle2" size={36} className="text-emerald-400 mx-auto mb-3 opacity-60" /><p className="text-sm text-muted-foreground">Нарушений не зафиксировано</p></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr className="border-b border-border">{["Дата", "Сотрудник", "Пост / Объект", "Причина", "Примечание", "Штраф"].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>)}</tr></thead>
            <tbody>{sorted.map(f => {
              const emp = employees.find(e => e.id === f.employeeId);
              const post = posts.find(p => p.id === f.postId);
              const loc = post ? locations.find(l => l.id === post.locationId) : null;
              const reason = fineReasons.find(r => r.id === f.reasonId);
              return (
                <tr key={f.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{fmtDate(f.date)}</td>
                  <td className="px-5 py-4">{emp ? <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div><span className="text-sm text-foreground">{emp.name}</span></div> : <span className="text-sm text-muted-foreground">—</span>}</td>
                  <td className="px-5 py-4"><p className="text-sm text-foreground">{post?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{loc?.name ?? "—"}</p></td>
                  <td className="px-5 py-4">{reason ? <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${reason.color}`}>{reason.label}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground max-w-[140px] truncate">{f.note || "—"}</td>
                  <td className="px-5 py-4 text-sm font-mono font-semibold text-red-400 whitespace-nowrap">{fmt(f.amount)}</td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr className="border-t border-border bg-muted/30"><td colSpan={5} className="px-5 py-3 text-sm font-semibold text-foreground text-right">Итого:</td><td className="px-5 py-3 text-sm font-mono font-bold text-red-400">{fmt(sorted.reduce((s, f) => s + f.amount, 0))}</td></tr></tfoot>
          </table></div>
        )}
      </div>
    </div>
  );
}

function Schedule() {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const sched: Record<string, (string | null)[]> = {
    "Иванов С.А.": ["Дн", "Дн", null, null, "Дн", "Дн", null],
    "Петров А.В.": ["Дн", null, "Дн", "Дн", null, null, "Дн"],
    "Смирнова Е.К.": ["Ноч", "Ноч", null, null, "Ноч", null, null],
    "Козлов Д.И.": [null, null, "Дн", "Дн", null, "Дн", "Дн"],
    "Николаева И.Р.": ["Дн", "Дн", "Дн", null, null, null, "Дн"],
    "Волков П.С.": [null, null, null, null, null, null, null],
    "Морозов А.Г.": ["Дн", null, null, "Дн", "Дн", "Дн", null],
    "Фёдорова Н.В.": ["Ноч", null, "Ноч", "Ноч", null, null, "Ноч"],
  };
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">График смен</h2><p className="text-muted-foreground text-sm mt-1">5 — 11 мая 2026</p></div>
      <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[600px]">
        <thead><tr className="border-b border-border"><th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-44">Сотрудник</th>
          {days.map((d, i) => <th key={d} className={`text-center text-xs font-medium uppercase tracking-wider px-3 py-3 ${i === 2 ? "text-primary" : "text-muted-foreground"}`}>{d}{i === 2 && <span className="block w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}</th>)}
        </tr></thead>
        <tbody>{Object.entries(sched).map(([name, shifts]) => (
          <tr key={name} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-5 py-3 text-sm font-medium text-foreground whitespace-nowrap">{name}</td>
            {shifts.map((s, ci) => <td key={ci} className="px-2 py-3 text-center">
              {s === "Дн" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-primary/20 text-primary text-xs font-mono font-semibold">Дн</span>}
              {s === "Ноч" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">Ноч</span>}
              {s === null && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-muted/50"><span className="w-1.5 h-1.5 rounded-full bg-border" /></span>}
            </td>)}
          </tr>
        ))}</tbody>
      </table></div></div>
    </div>
  );
}

// ─── Reports helpers (shared with Reports component) ──────────────────────────
function useReportBuilders() {
  const { fines, employees, posts, locations, fineReasons, currentOrg, holding, allLocations, allEmployees, allPosts, allFines, orgs } = useApp();

  const today = new Date().toLocaleDateString("ru-RU");

  // ── Fines report data ─────────────────────────────────────────────────────
  const buildFinesData = (empFilter: number | "all" = "all"): FinesReportData => {
    const filterLabel = empFilter === "all" ? "Все сотрудники" : employees.find(e => e.id === empFilter)?.name ?? "—";
    const filtered = empFilter === "all" ? fines : fines.filter(f => f.employeeId === empFilter);
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const rows = sorted.map(f => {
      const emp = employees.find(e => e.id === f.employeeId);
      const post = posts.find(p => p.id === f.postId);
      const loc = post ? locations.find(l => l.id === post.locationId) : null;
      const reason = fineReasons.find(r => r.id === f.reasonId);
      return {
        date: fmtDate(f.date), employeeName: emp?.name ?? "—", rank: emp?.rank ?? "—",
        postName: post?.name ?? "—", locationName: loc?.name ?? "—",
        reasonLabel: reason?.label ?? "—", note: f.note, amount: f.amount,
      };
    });
    const byEmployee = employees
      .map(e => ({ name: e.name, rank: e.rank, count: sorted.filter(f => f.employeeId === e.id).length, total: sorted.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0) }))
      .filter(x => x.count > 0).sort((a, b) => b.total - a.total);
    return {
      orgName: currentOrg?.name ?? "—", orgColor: currentOrg?.color ?? "#6366f1",
      holdingName: holding.name, generatedAt: today, filterLabel, rows, byEmployee,
      totalAmount: sorted.reduce((s, f) => s + f.amount, 0), totalCount: sorted.length,
    };
  };

  // ── Consolidated (holding) report data ────────────────────────────────────
  const synth = (orgId: number, mi: number) => {
    const seed = orgId * 13 + mi * 7;
    return { coverage: 70 + ((seed * 3) % 28), attendance: 80 + ((seed * 5) % 18), incidents: seed % 4, finesAmt: (seed % 4) * (300 + (seed % 5) * 400), hoursWorked: ([8, 2, 1][orgId - 1] ?? 3) * 22 * 12 + (seed % 50) };
  };
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(2026, 4 - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }) };
  });

  const buildConsolidatedData = (period: string): ExportReportData => {
    const summaryRows = orgs.map(org => {
      const yearData = months.map((_, mi) => {
        const d = synth(org.id, mi);
        const realFines = allFines.filter(f => f.orgId === org.id && f.date.startsWith(months[mi].key));
        return { ...d, finesAmt: realFines.length > 0 ? realFines.reduce((s, f) => s + f.amount, 0) : d.finesAmt, incidents: realFines.length > 0 ? realFines.length : d.incidents };
      });
      const avgCov = Math.round(yearData.reduce((a, d) => a + d.coverage, 0) / yearData.length);
      const avgAtt = Math.round(yearData.reduce((a, d) => a + d.attendance, 0) / yearData.length);
      const totInc = yearData.reduce((a, d) => a + d.incidents, 0);
      const totFines = yearData.reduce((a, d) => a + d.finesAmt, 0);
      const totHours = yearData.reduce((a, d) => a + d.hoursWorked, 0);
      const score = Math.round(avgCov * 0.4 + avgAtt * 0.4 + Math.max(0, 100 - totInc * 10) * 0.2);
      return { orgName: org.name, orgColor: org.color, coverage: avgCov, attendance: avgAtt, incidents: totInc, finesAmt: totFines, hoursWorked: totHours, score, grade: score >= 90 ? "A" : score >= 75 ? "B" : "C" };
    });
    const totalCoverage = Math.round(summaryRows.reduce((s, r) => s + r.coverage, 0) / Math.max(summaryRows.length, 1));
    const totalAttendance = Math.round(summaryRows.reduce((s, r) => s + r.attendance, 0) / Math.max(summaryRows.length, 1));
    const monthlyRows = orgs.map(org => {
      const rows = months.map((m, mi) => {
        const d = synth(org.id, mi);
        const realFines = allFines.filter(f => f.orgId === org.id && f.date.startsWith(m.key));
        return { coverage: d.coverage, attendance: d.attendance, incidents: realFines.length > 0 ? realFines.length : d.incidents, finesAmt: realFines.length > 0 ? realFines.reduce((s, f) => s + f.amount, 0) : d.finesAmt };
      });
      return { orgName: org.name, coverage: rows.map(r => r.coverage), attendance: rows.map(r => r.attendance), incidents: rows.map(r => r.incidents), finesAmt: rows.map(r => r.finesAmt) };
    });
    return {
      holdingName: holding.name, inn: holding.inn, generatedAt: today, period,
      summaryRows, monthLabels: months.map(m => m.label), monthlyRows,
      totalCoverage, totalAttendance,
      totalIncidents: summaryRows.reduce((s, r) => s + r.incidents, 0),
      totalFines: summaryRows.reduce((s, r) => s + r.finesAmt, 0),
      totalHours: summaryRows.reduce((s, r) => s + r.hoursWorked, 0),
    };
  };

  // ── Shifts summary (as fines-style with employees/posts) ──────────────────
  const buildShiftsData = (): FinesReportData => {
    const activeEmps = employees.filter(e => e.status === "active");
    const rows = activeEmps.map(e => {
      const post = posts.find(p => p.officerId === e.id);
      const loc = post ? locations.find(l => l.id === post.locationId) : null;
      return { date: today, employeeName: e.name, rank: e.rank, postName: post?.name ?? "—", locationName: loc?.name ?? "—", reasonLabel: "На смене", note: e.shift, amount: 0 };
    });
    return {
      orgName: currentOrg?.name ?? "—", orgColor: currentOrg?.color ?? "#6366f1",
      holdingName: holding.name, generatedAt: today, filterLabel: "Все смены",
      rows, byEmployee: [], totalAmount: 0, totalCount: rows.length,
    };
  };

  return { buildFinesData, buildConsolidatedData, buildShiftsData, today };
}

function Reports() {
  const { currentOrg, fines, employees, posts } = useApp();
  const { buildFinesData, buildConsolidatedData, buildShiftsData } = useReportBuilders();

  const [generating, setGenerating] = useState<string | null>(null);

  const handle = async (id: string, fn: () => void) => {
    setGenerating(id);
    await new Promise(r => setTimeout(r, 100));
    fn();
    setGenerating(null);
  };

  const finesCount = fines.length;
  const empCount = employees.filter(e => e.status === "active").length;
  const postsCovered = posts.filter(p => p.status === "covered").length;
  const today = new Date().toLocaleDateString("ru-RU");

  type ReportDef = {
    id: string;
    title: string;
    description: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    badge?: string;
    stat: string;
    statLabel: string;
    formats: { fmt: "pdf" | "xlsx"; label: string; icon: string; desc: string }[];
  };

  const REPORT_DEFS: ReportDef[] = [
    {
      id: "fines",
      title: "Отчёт по штрафам",
      description: "Полная история нарушений, топ нарушителей, разбивка по причинам",
      icon: "BadgeAlert", iconBg: "bg-red-500/10", iconColor: "text-red-400",
      badge: finesCount > 0 ? `${finesCount} записей` : undefined,
      stat: String(finesCount), statLabel: "нарушений",
      formats: [
        { fmt: "pdf", label: "PDF", icon: "FileText", desc: "Документ с брендингом" },
        { fmt: "xlsx", label: "Excel", icon: "Table", desc: "3 листа: история, сотрудники, причины" },
      ],
    },
    {
      id: "consolidated",
      title: "Сводный отчёт холдинга",
      description: "KPI всех организаций, покрытие постов, явка, сравнительный рейтинг",
      icon: "BarChart3", iconBg: "bg-primary/10", iconColor: "text-primary",
      stat: `${Math.round((postsCovered / Math.max(posts.length, 1)) * 100)}%`, statLabel: "покрытие сейчас",
      formats: [
        { fmt: "pdf", label: "PDF", icon: "FileText", desc: "Многостраничный с KPI" },
        { fmt: "xlsx", label: "Excel", icon: "Table", desc: "5 листов: сводка + динамика" },
      ],
    },
    {
      id: "shifts",
      title: "Отчёт по сменам",
      description: "Текущие расстановки, кто на смене, занятые и вакантные посты",
      icon: "CalendarDays", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400",
      stat: String(empCount), statLabel: "на смене сейчас",
      formats: [
        { fmt: "pdf", label: "PDF", icon: "FileText", desc: "Список дежурных по объектам" },
        { fmt: "xlsx", label: "Excel", icon: "Table", desc: "Таблица расстановки" },
      ],
    },
  ];

  const onExport = (reportId: string, fmt: "pdf" | "xlsx") => {
    const key = `${reportId}-${fmt}`;
    if (reportId === "fines") {
      handle(key, () => {
        const data = buildFinesData();
        if (fmt === "pdf") { exportFinesPDF(data); } else { exportFinesExcel(data); }
      });
    } else if (reportId === "consolidated") {
      handle(key, () => {
        const data = buildConsolidatedData("Январь — Май 2026");
        if (fmt === "pdf") { exportPDF(data); } else { exportExcel(data); }
      });
    } else if (reportId === "shifts") {
      handle(key, () => {
        const data = buildShiftsData();
        if (fmt === "pdf") { exportFinesPDF(data); } else { exportFinesExcel(data); }
      });
    }
  };

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Отчёты</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {currentOrg?.shortName} · Генерация и скачивание документов
        </p>
      </div>

      {/* Status strip */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Данные актуальны на", val: today, icon: "Clock" },
          { label: "Организация", val: currentOrg?.shortName ?? "—", icon: "Building2" },
          { label: "На смене", val: `${empCount} чел.`, icon: "UserCheck" },
          { label: "Покрытие постов", val: `${Math.round((postsCovered / Math.max(posts.length, 1)) * 100)}%`, icon: "ShieldCheck" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl">
            <Icon name={s.icon} size={14} className="text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">{s.label}:</span>
            <span className="text-xs font-semibold text-foreground">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {REPORT_DEFS.map(rep => (
          <div key={rep.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            {/* Card header */}
            <div className="p-5 border-b border-border">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${rep.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon name={rep.icon} size={20} className={rep.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-sm leading-tight">{rep.title}</h3>
                    {rep.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-mono shrink-0">{rep.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rep.description}</p>
                </div>
              </div>
              {/* Stat */}
              <div className="flex items-baseline gap-1.5 px-3 py-2 bg-muted/40 rounded-xl">
                <span className={`text-2xl font-bold font-mono ${rep.iconColor}`}>{rep.stat}</span>
                <span className="text-xs text-muted-foreground">{rep.statLabel}</span>
              </div>
            </div>

            {/* Format buttons */}
            <div className="p-4 flex flex-col gap-2 flex-1 justify-end">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Скачать как</p>
              {rep.formats.map(f => {
                const key = `${rep.id}-${f.fmt}`;
                const isLoading = generating === key;
                return (
                  <button
                    key={f.fmt}
                    onClick={() => onExport(rep.id, f.fmt)}
                    disabled={!!generating}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left group
                      ${f.fmt === "pdf"
                        ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40"
                        : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40"}
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.fmt === "pdf" ? "bg-red-500/15" : "bg-emerald-500/15"}`}>
                      {isLoading
                        ? <Icon name="Loader2" size={15} className={`animate-spin ${f.fmt === "pdf" ? "text-red-400" : "text-emerald-400"}`} />
                        : <Icon name={f.fmt === "pdf" ? "FileText" : "Table"} size={15} className={f.fmt === "pdf" ? "text-red-400" : "text-emerald-400"} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${f.fmt === "pdf" ? "text-red-400" : "text-emerald-400"}`}>
                        {isLoading ? "Генерация..." : f.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{f.desc}</p>
                    </div>
                    {!isLoading && (
                      <Icon name="Download" size={14} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-primary/5 border border-primary/20 rounded-xl">
        <Icon name="Info" size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Отчёты формируются на основе текущих данных организации{" "}
          <span className="text-foreground font-medium">{currentOrg?.shortName}</span>.
          Для отчётов по другой организации переключитесь через меню в сайдбаре.
        </p>
      </div>
    </div>
  );
}

function Analytics() {
  const data = [{ l: "Пн", d: 6, n: 2 }, { l: "Вт", d: 5, n: 3 }, { l: "Ср", d: 7, n: 1 }, { l: "Чт", d: 4, n: 4 }, { l: "Пт", d: 6, n: 2 }, { l: "Сб", d: 3, n: 3 }, { l: "Вс", d: 4, n: 2 }];
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Аналитика</h2><p className="text-muted-foreground text-sm mt-1">Статистика смен</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Часов отработано", value: "1 248ч", trend: "+8%" }, { label: "Средняя явка", value: "94%", trend: "+2%" }, { label: "Покрытие постов", value: "87%", trend: "-3%" }, { label: "Инциденты", value: "2 шт", trend: "=0" }].map(k => (
          <div key={k.label} className="stat-card"><div className="text-2xl font-bold font-mono text-foreground mb-0.5">{k.value}</div><div className="text-xs text-muted-foreground mb-2">{k.label}</div><div className={`text-xs font-mono ${k.trend.startsWith("+") ? "text-emerald-400" : k.trend.startsWith("-") ? "text-red-400" : "text-muted-foreground"}`}>{k.trend}</div></div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-6">Смены по дням</h3>
        <div className="flex items-end gap-3" style={{ height: "140px" }}>
          {data.map(d => (<div key={d.l} className="flex-1 flex flex-col items-center gap-1 h-full">
            <div className="w-full flex flex-col-reverse gap-0.5 flex-1">
              <div className="w-full rounded-t bg-primary/40" style={{ height: `${(d.d / 10) * 100}%` }} />
              <div className="w-full rounded-t bg-indigo-500/40" style={{ height: `${(d.n / 10) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{d.l}</span>
          </div>))}
        </div>
      </div>
    </div>
  );
}

function ExportPage() {
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Экспорт</h2><p className="text-muted-foreground text-sm mt-1">Выгрузка данных</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[{ label: "Excel (.xlsx)", icon: "Table", desc: "Таблица смен" }, { label: "PDF отчёт", icon: "FileText", desc: "Документ с печатью" }, { label: "CSV данные", icon: "Database", desc: "Для интеграции" }, { label: "Отчёт по штрафам", icon: "BadgeAlert", desc: "История нарушений" }].map(f => (
          <button key={f.label} className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"><Icon name={f.icon} size={22} className="text-primary" /></div>
              <div className="flex-1"><p className="font-semibold text-foreground">{f.label}</p><p className="text-xs text-muted-foreground">{f.desc}</p></div>
              <Icon name="Download" size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Settings() {
  const { currentOrg } = useApp();
  const items = [
    { title: "Организация", fields: [{ label: "Название", value: currentOrg?.name ?? "" }, { label: "ИНН", value: currentOrg?.inn ?? "" }, { label: "Адрес", value: currentOrg?.address ?? "" }, { label: "Телефон", value: currentOrg?.phone ?? "" }, { label: "Лицензия", value: currentOrg?.license ?? "" }] },
    { title: "Смены", fields: [{ label: "Дневная", value: "08:00 – 20:00" }, { label: "Ночная", value: "20:00 – 08:00" }] },
    { title: "Уведомления", fields: [{ label: "Email", value: "admin@example.com" }, { label: "SMS-тревога", value: "+7 900 000-00-00" }] },
  ];
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Настройки</h2><p className="text-muted-foreground text-sm mt-1">{currentOrg?.shortName}</p></div>
      {items.map(s => (
        <div key={s.title} className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">{s.title}</h3>
          <div className="space-y-4">{s.fields.map(f => <div key={f.label} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center"><label className="text-sm text-muted-foreground">{f.label}</label><input defaultValue={f.value} className={inputCls} /></div>)}</div>
          <div className="mt-5 flex justify-end"><button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Сохранить</button></div>
        </div>
      ))}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function Shell() {
  const { session, logout, can, fines, posts, holding, currentOrg, isSuperAdmin, switchOrg } = useApp();
  const [active, setActive] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!session) return <LoginScreen />;

  // holding-only items visible only to superadmin
  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.holdingOnly) return isSuperAdmin();
    return !item.perm || can(item.perm as Parameters<typeof can>[0]);
  });
  const unresolved = posts.filter(p => p.status === "alert" || p.status === "vacant").length;

  const handleSwitchOrg = (orgId: number) => {
    switchOrg(orgId);
    setActive("dashboard");
    setSidebarOpen(false);
  };

  const renderSection = () => {
    switch (active) {
      case "dashboard":  return <Dashboard />;
      case "objects":    return <Objects />;
      case "placements": return <Placements />;
      case "employees":  return <Employees />;
      case "fines":      return <Fines />;
      case "reports":    return <Reports />;
      case "schedule":   return <Schedule />;
      case "export":     return <ExportPage />;
      case "analytics":  return <Analytics />;
      case "users":      return <UsersSection />;
      case "holding":    return <HoldingSection onSwitchOrg={handleSwitchOrg} />;
      case "settings":   return <Settings />;
    }
  };

  const handleNav = (k: Section) => { setActive(k); setSidebarOpen(false); };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Holding header */}
        <div className="px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0"><Icon name="Shield" size={18} className="text-primary" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm truncate">{holding.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">ИНН {holding.inn}</p>
            </div>
          </div>
          {/* Org switcher */}
          <OrgSwitcher />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => (
            <button key={item.key} onClick={() => handleNav(item.key)}
              className={`nav-item w-full ${active === item.key ? "active" : ""}`}>
              <Icon name={item.icon} size={18} />
              {item.label}
              {item.key === "fines" && fines.length > 0 && (
                <span className="ml-auto text-[10px] font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{fines.length}</span>
              )}
              {item.key === "placements" && unresolved > 0 && (
                <span className="ml-auto text-[10px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{unresolved}</span>
              )}
            </button>
          ))}

          {/* Divider before holding section */}
          {isSuperAdmin() && (
            <div className="mt-2 pt-2 border-t border-sidebar-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">Управление холдингом</p>
            </div>
          )}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0" style={{ backgroundColor: currentOrg?.color ? currentOrg.color + "30" : undefined, borderColor: currentOrg?.color, border: `1px solid ${currentOrg?.color ?? "transparent"}` }}>
              {session.user.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </div>
            <button onClick={logout} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" title="Выйти">
              <Icon name="LogOut" size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 shrink-0 bg-background/80 backdrop-blur-sm">
          <button className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground" onClick={() => setSidebarOpen(true)}><Icon name="Menu" size={20} /></button>
          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{NAV_ITEMS.find(n => n.key === active)?.label}</span>
            {currentOrg && (
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium" style={{ color: currentOrg.color, borderColor: currentOrg.color + "40", backgroundColor: currentOrg.color + "15" }}>
                {currentOrg.shortName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
              <span className="text-xs text-muted-foreground hidden sm:block">Система активна</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Icon name="Bell" size={18} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" key={active}>{renderSection()}</main>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}