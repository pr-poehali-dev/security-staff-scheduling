import { useState } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import LoginScreen from "@/components/LoginScreen";
import OrgSwitcher from "@/components/OrgSwitcher";
import UsersSection from "@/components/UsersSection";
import HoldingSection from "@/components/HoldingSection";
import Icon from "@/components/ui/icon";
import type { Section, Location, Post, FineRecord, FineReason } from "@/types";

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
const EMPTY_LOC: Omit<Location, "id" | "orgId"> = { name: "", address: "", type: "office", posts: 1, contact: "", note: "" };

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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Контакт"><input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="+7 900 000-00-00" className={inputCls} /></Field>
            <Field label="Постов"><input type="number" min={1} max={99} value={form.posts} onChange={e => set("posts", parseInt(e.target.value) || 1)} className={inputCls} /></Field>
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

function Placements() {
  const { locations, posts, employees, assignPost, can } = useApp();
  const canEdit = can("placements:edit");
  const [assignPost2, setAssignPost2] = useState<Post | null>(null);
  const [fineSettings, setFineSettings] = useState(false);
  if (locations.length === 0) return <div className="section-enter text-center py-20"><Icon name="MapPin" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-muted-foreground">Добавьте объекты в разделе «Объекты»</p></div>;
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h2 className="text-2xl font-bold text-foreground">Расстановки</h2><p className="text-muted-foreground text-sm mt-1">Назначение охранников на посты</p></div>
        {canEdit && <button onClick={() => setFineSettings(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors"><Icon name="Settings2" size={15} /> Причины штрафов</button>}
      </div>
      {locations.map(loc => {
        const lp = posts.filter(p => p.locationId === loc.id);
        return (
          <div key={loc.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="Building2" size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">{loc.name}</h3>
              <span className="ml-auto text-xs text-muted-foreground font-mono">{lp.filter(p => p.status === "covered").length}/{lp.length} закрыто</span>
            </div>
            {lp.length === 0 ? <p className="text-xs text-muted-foreground py-3 text-center">Посты не назначены</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {lp.map(post => {
                  const emp = employees.find(e => e.id === post.officerId);
                  return (
                    <div key={post.id} className={`p-4 rounded-xl border ${post.status === "covered" ? "border-emerald-500/20 bg-emerald-500/5" : post.status === "alert" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                      <div className="flex items-start justify-between mb-2"><span className="font-medium text-sm text-foreground">{post.name}</span>{postBadge(post.status)}</div>
                      <p className="text-xs text-muted-foreground font-mono mb-2">{post.time}</p>
                      {emp ? (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                          <span className="text-xs text-foreground truncate">{emp.name}</span>
                        </div>
                      ) : <p className="text-xs text-amber-400 flex items-center gap-1 mb-3"><Icon name="UserX" size={11} /> Не назначен</p>}
                      {canEdit && (
                        <button onClick={() => setAssignPost2(post)} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all">
                          <Icon name="UserCog" size={12} />{emp ? "Заменить" : "Назначить"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {assignPost2 && <AssignModal post={assignPost2} onAssign={assignPost} onClose={() => setAssignPost2(null)} />}
      {fineSettings && <FineReasonsModal onClose={() => setFineSettings(false)} />}
    </div>
  );
}

function Employees() {
  const { employees } = useApp();
  const [filter, setFilter] = useState<"all" | "active" | "off" | "sick">("all");
  const filtered = filter === "all" ? employees : employees.filter(e => e.status === filter);
  const badge = (s: "active" | "off" | "sick") => s === "active" ? <span className="badge-active">На смене</span> : s === "sick" ? <span className="badge-danger">Больничный</span> : <span className="badge-inactive">Выходной</span>;
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-foreground">Сотрудники</h2><p className="text-muted-foreground text-sm mt-1">База охранников</p></div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"><Icon name="UserPlus" size={16} /> Добавить</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[{ k: "all", l: "Все" }, { k: "active", l: "На смене" }, { k: "off", l: "Выходной" }, { k: "sick", l: "Больничный" }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k as "all" | "active" | "off" | "sick")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{f.l}</button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
          <thead><tr className="border-b border-border">{["Сотрудник", "Должность", "Статус", "Смена", "Телефон"].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>)}</tr></thead>
          <tbody>{filtered.map(e => (
            <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">{e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div><span className="font-medium text-foreground text-sm">{e.name}</span></div></td>
              <td className="px-5 py-4 text-sm text-muted-foreground">{e.rank}</td>
              <td className="px-5 py-4">{badge(e.status)}</td>
              <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{e.shift}</td>
              <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{e.phone}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}

function Fines() {
  const { fines, employees, posts, locations, fineReasons } = useApp();
  const [filterEmp, setFilterEmp] = useState<number | "all">("all");
  const filtered = filterEmp === "all" ? fines : fines.filter(f => f.employeeId === filterEmp);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const totalAll = fines.reduce((s, f) => s + f.amount, 0);
  const byEmp = employees.map(e => ({ e, total: fines.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0), cnt: fines.filter(f => f.employeeId === e.id).length })).filter(x => x.cnt > 0).sort((a, b) => b.total - a.total);
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Штрафы</h2><p className="text-muted-foreground text-sm mt-1">История нарушений</p></div>
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

function Reports() {
  const reports = [
    { title: "Сводка за апрель 2026", date: "27.04.2026", type: "Месячный" },
    { title: "Отчёт по штрафам — апрель", date: "30.04.2026", type: "Штрафы" },
    { title: "Инцидент — Ворота въезда", date: "25.04.2026", type: "Инцидент" },
    { title: "Смены — 3я неделя апреля", date: "21.04.2026", type: "Еженедельный" },
  ];
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-foreground">Отчёты</h2><p className="text-muted-foreground text-sm mt-1">Сформированные отчёты</p></div><button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"><Icon name="Plus" size={16} /> Новый отчёт</button></div>
      <div className="bg-card border border-border rounded-xl divide-y divide-border/50">
        {reports.map((r, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.type === "Штрафы" ? "bg-red-500/10" : "bg-primary/10"}`}><Icon name={r.type === "Штрафы" ? "BadgeAlert" : "FileText"} size={18} className={r.type === "Штрафы" ? "text-red-400" : "text-primary"} /></div>
            <div className="flex-1 min-w-0"><p className="font-medium text-foreground text-sm">{r.title}</p><p className="text-xs text-muted-foreground mt-0.5">{r.date} · {r.type}</p></div>
            <span className="badge-active hidden sm:inline-flex">Готов</span>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Icon name="Download" size={16} /></button>
          </div>
        ))}
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