import { useState } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────────────────────────
type Section =
  | "dashboard"
  | "objects"
  | "placements"
  | "employees"
  | "reports"
  | "fines"
  | "schedule"
  | "export"
  | "analytics"
  | "settings";

interface Location {
  id: number;
  name: string;
  address: string;
  type: "office" | "warehouse" | "retail" | "industrial" | "residential";
  posts: number;
  contact: string;
  note: string;
}

interface Employee {
  id: number;
  name: string;
  rank: string;
  status: "active" | "off" | "sick";
  location: string;
  shift: string;
  phone: string;
}

interface Post {
  id: number;
  name: string;
  locationId: number;
  officerId: number | null;
  time: string;
  status: "covered" | "vacant" | "alert";
}

interface FineReason {
  id: number;
  label: string;
  amount: number; // рублей
  color: string;
}

interface FineRecord {
  id: number;
  date: string;       // ISO date string
  employeeId: number;
  postId: number;
  reasonId: number;
  note: string;
  amount: number;     // фактический размер (может быть переопределён)
}

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INIT_LOCATIONS: Location[] = [
  { id: 1, name: "Объект А", address: "ул. Ленина, 10, Москва", type: "office", posts: 3, contact: "+7 900 100-00-01", note: "Бизнес-центр класса А" },
  { id: 2, name: "Объект Б", address: "ул. Промышленная, 5, Москва", type: "warehouse", posts: 3, contact: "+7 900 100-00-02", note: "Складской комплекс" },
  { id: 3, name: "Объект В", address: "пр. Мира, 22, Москва", type: "retail", posts: 2, contact: "+7 900 100-00-03", note: "Торговый центр" },
];

const INIT_EMPLOYEES: Employee[] = [
  { id: 1, name: "Иванов Сергей А.", rank: "Ст. охранник", status: "active", location: "Объект А — Главный вход", shift: "08:00 – 20:00", phone: "+7 900 123-45-67" },
  { id: 2, name: "Петров Андрей В.", rank: "Охранник", status: "active", location: "Объект А — Периметр", shift: "08:00 – 20:00", phone: "+7 900 234-56-78" },
  { id: 3, name: "Смирнова Елена К.", rank: "Охранник", status: "active", location: "Объект Б — КПП", shift: "20:00 – 08:00", phone: "+7 900 345-67-89" },
  { id: 4, name: "Козлов Дмитрий И.", rank: "Охранник", status: "off", location: "—", shift: "Выходной", phone: "+7 900 456-78-90" },
  { id: 5, name: "Николаева Ирина Р.", rank: "Ст. охранник", status: "active", location: "Объект В — Парковка", shift: "08:00 – 20:00", phone: "+7 900 567-89-01" },
  { id: 6, name: "Волков Павел С.", rank: "Охранник", status: "sick", location: "—", shift: "Больничный", phone: "+7 900 678-90-12" },
  { id: 7, name: "Морозов Алексей Г.", rank: "Охранник", status: "active", location: "Объект Б — Склад", shift: "08:00 – 20:00", phone: "+7 900 789-01-23" },
  { id: 8, name: "Фёдорова Наталья В.", rank: "Охранник", status: "active", location: "Объект В — Главный вход", shift: "20:00 – 08:00", phone: "+7 900 890-12-34" },
];

const INIT_POSTS: Post[] = [
  { id: 1, name: "Главный вход",    locationId: 1, officerId: 1, time: "08:00 – 20:00", status: "covered" },
  { id: 2, name: "Периметр (сев.)", locationId: 1, officerId: 2, time: "08:00 – 20:00", status: "covered" },
  { id: 3, name: "Периметр (юж.)",  locationId: 1, officerId: null, time: "08:00 – 20:00", status: "vacant" },
  { id: 4, name: "КПП",             locationId: 2, officerId: 3, time: "20:00 – 08:00", status: "covered" },
  { id: 5, name: "Склад",           locationId: 2, officerId: 7, time: "08:00 – 20:00", status: "covered" },
  { id: 6, name: "Ворота въезда",   locationId: 2, officerId: null, time: "08:00 – 20:00", status: "alert"  },
  { id: 7, name: "Парковка",        locationId: 3, officerId: 5, time: "08:00 – 20:00", status: "covered" },
  { id: 8, name: "Главный вход",    locationId: 3, officerId: 8, time: "20:00 – 08:00", status: "covered" },
];

const INIT_FINE_REASONS: FineReason[] = [
  { id: 1, label: "Опоздание на смену",        amount: 500,  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { id: 2, label: "Самовольное оставление поста", amount: 2000, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  { id: 3, label: "Нарушение внешнего вида",   amount: 300,  color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  { id: 4, label: "Нарушение регламента",      amount: 1000, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { id: 5, label: "Сон на посту",              amount: 3000, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  { id: 6, label: "Отказ от замены",           amount: 1500, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
];

const INIT_FINES: FineRecord[] = [
  { id: 1, date: "2026-04-25", employeeId: 4, postId: 3, reasonId: 1, note: "Опоздал на 40 минут", amount: 500 },
  { id: 2, date: "2026-04-20", employeeId: 6, postId: 6, reasonId: 2, note: "Ушёл с поста без предупреждения", amount: 2000 },
  { id: 3, date: "2026-04-18", employeeId: 2, postId: 2, reasonId: 3, note: "Без нагрудного знака", amount: 300 },
];

// ─── Navigation ───────────────────────────────────────────────────────────────
const navItems = [
  { key: "dashboard",  label: "Главная",     icon: "LayoutDashboard" },
  { key: "objects",    label: "Объекты",     icon: "Building2" },
  { key: "placements", label: "Расстановки", icon: "MapPin" },
  { key: "employees",  label: "Сотрудники",  icon: "Users" },
  { key: "reports",    label: "Отчёты",      icon: "FileText" },
  { key: "fines",      label: "Штрафы",      icon: "BadgeAlert" },
  { key: "schedule",   label: "График",      icon: "CalendarDays" },
  { key: "export",     label: "Экспорт",     icon: "Download" },
  { key: "analytics",  label: "Аналитика",   icon: "BarChart3" },
  { key: "settings",   label: "Настройки",   icon: "Settings" },
] as const;

const TYPE_LABELS: Record<Location["type"], string> = {
  office: "Офис / БЦ", warehouse: "Склад", retail: "Торговый объект",
  industrial: "Промышленный", residential: "Жилой комплекс",
};
const TYPE_COLORS: Record<Location["type"], string> = {
  office: "text-primary bg-primary/10 border-primary/20",
  warehouse: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  retail: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  industrial: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  residential: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

const statusBadge = (status: Employee["status"]) => {
  if (status === "active") return <span className="badge-active">На смене</span>;
  if (status === "sick")   return <span className="badge-danger">Больничный</span>;
  return <span className="badge-inactive">Выходной</span>;
};
const postBadge = (status: Post["status"]) => {
  if (status === "covered") return <span className="badge-active">Закрыт</span>;
  if (status === "alert")   return <span className="badge-danger">Тревога</span>;
  return <span className="badge-warning">Вакантен</span>;
};

// ─── InputField ───────────────────────────────────────────────────────────────
function InputField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors";

// ─── Location CRUD ────────────────────────────────────────────────────────────
const EMPTY_LOC: Omit<Location, "id"> = { name: "", address: "", type: "office", posts: 1, contact: "", note: "" };

function LocationModal({ initial, onSave, onClose, title }: {
  initial: Omit<Location, "id"> | null; onSave: (d: Omit<Location, "id">) => void; onClose: () => void; title: string;
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
            <InputField label="Название" required>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Объект Д" className={inputCls} />
            </InputField>
            <InputField label="Тип">
              <select value={form.type} onChange={e => set("type", e.target.value as Location["type"])} className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </InputField>
          </div>
          <InputField label="Адрес" required>
            <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="ул. Примерная, 1, Москва" className={inputCls} />
          </InputField>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Контакт">
              <input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="+7 900 000-00-00" className={inputCls} />
            </InputField>
            <InputField label="Постов">
              <input type="number" min={1} max={99} value={form.posts} onChange={e => set("posts", parseInt(e.target.value) || 1)} className={inputCls} />
            </InputField>
          </div>
          <InputField label="Примечание">
            <textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Особые условия..." />
          </InputField>
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
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
          <Icon name="Trash2" size={22} className="text-red-400" />
        </div>
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

// ─── Assign Officer Modal ─────────────────────────────────────────────────────
interface AssignModalProps {
  post: Post;
  location: Location | undefined;
  employees: Employee[];
  fineReasons: FineReason[];
  onAssign: (postId: number, employeeId: number | null, fine: Omit<FineRecord, "id" | "date" | "postId"> | null) => void;
  onClose: () => void;
}

function AssignModal({ post, location, employees, fineReasons, onAssign, onClose }: AssignModalProps) {
  const currentEmployee = employees.find(e => e.id === post.officerId) ?? null;

  const [selectedId, setSelectedId] = useState<number | null>(post.officerId);
  const [withFine, setWithFine] = useState(false);
  const [reasonId, setReasonId] = useState<number>(fineReasons[0]?.id ?? 1);
  const [fineAmount, setFineAmount] = useState<number>(fineReasons[0]?.amount ?? 500);
  const [fineNote, setFineNote] = useState("");

  // auto-fill amount when reason changes
  const handleReasonChange = (id: number) => {
    setReasonId(id);
    const r = fineReasons.find(r => r.id === id);
    if (r) setFineAmount(r.amount);
  };

  const isReplacement = currentEmployee !== null && selectedId !== post.officerId;
  const isVacant = selectedId === null;

  const handleSave = () => {
    const fine: Omit<FineRecord, "id" | "date" | "postId"> | null =
      withFine && currentEmployee
        ? { employeeId: currentEmployee.id, reasonId, note: fineNote, amount: fineAmount }
        : null;
    onAssign(post.id, selectedId, fine);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg section-enter" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg text-foreground">Назначение на пост</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {post.name} · {location?.name ?? "—"} · <span className="font-mono">{post.time}</span>
        </p>

        {/* Current officer */}
        {currentEmployee && (
          <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl mb-5">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {currentEmployee.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{currentEmployee.name}</p>
              <p className="text-xs text-muted-foreground">{currentEmployee.rank} · сейчас на посту</p>
            </div>
            <Icon name="ArrowRight" size={16} className="text-muted-foreground" />
          </div>
        )}

        {/* Select new officer */}
        <InputField label="Назначить сотрудника">
          <select
            value={selectedId ?? ""}
            onChange={e => setSelectedId(e.target.value === "" ? null : Number(e.target.value))}
            className={inputCls}
          >
            <option value="">— Снять охранника (вакантный пост) —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.rank}{e.id === post.officerId ? " (текущий)" : ""}
              </option>
            ))}
          </select>
        </InputField>

        {/* Fine block — shown when there's a replacement */}
        {isReplacement && currentEmployee && (
          <div className="mt-5 border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setWithFine(v => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${withFine ? "bg-primary" : "bg-muted border border-border"}`}>
                {withFine && <Icon name="Check" size={12} className="text-primary-foreground" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Начислить штраф сотруднику</p>
                <p className="text-xs text-muted-foreground">{currentEmployee.name} — при замене можно зафиксировать нарушение</p>
              </div>
            </button>

            {withFine && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                <InputField label="Причина штрафа">
                  <select value={reasonId} onChange={e => handleReasonChange(Number(e.target.value))} className={inputCls}>
                    {fineReasons.map(r => (
                      <option key={r.id} value={r.id}>{r.label} — {fmt(r.amount)}</option>
                    ))}
                  </select>
                </InputField>
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Размер штрафа, ₽">
                    <input
                      type="number" min={0} step={100}
                      value={fineAmount}
                      onChange={e => setFineAmount(Number(e.target.value))}
                      className={inputCls}
                    />
                  </InputField>
                  <InputField label="Примечание">
                    <input
                      value={fineNote}
                      onChange={e => setFineNote(e.target.value)}
                      placeholder="Уточнение..."
                      className={inputCls}
                    />
                  </InputField>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                  <Icon name="AlertTriangle" size={13} />
                  Штраф {fmt(fineAmount)} будет записан в историю нарушений
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remove warning */}
        {isVacant && currentEmployee && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
            <Icon name="Info" size={13} />
            Пост будет помечен как вакантный. Охранник снимается без штрафа.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            {isReplacement ? "Заменить" : isVacant ? "Снять охранника" : "Назначить"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Fine Reason Settings ─────────────────────────────────────────────────────
interface FineReasonsModalProps {
  reasons: FineReason[];
  onChange: (reasons: FineReason[]) => void;
  onClose: () => void;
}
function FineReasonsModal({ reasons, onChange, onClose }: FineReasonsModalProps) {
  const [list, setList] = useState<FineReason[]>(reasons);

  const update = (id: number, key: keyof FineReason, val: string | number) =>
    setList(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));

  const add = () => setList(prev => [...prev, {
    id: Math.max(0, ...prev.map(r => r.id)) + 1,
    label: "Новое нарушение", amount: 500, color: "text-orange-400 bg-orange-500/10 border-orange-500/20"
  }]);

  const remove = (id: number) => setList(prev => prev.filter(r => r.id !== id));

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
              <div className="flex-1 min-w-0">
                <input
                  value={r.label}
                  onChange={e => update(r.id, "label", e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground focus:outline-none border-b border-transparent focus:border-border pb-0.5 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number" min={0} step={100}
                  value={r.amount}
                  onChange={e => update(r.id, "amount", Number(e.target.value))}
                  className="w-24 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-mono text-right focus:outline-none focus:border-primary/50"
                />
                <span className="text-xs text-muted-foreground">₽</span>
                <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Icon name="X" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex gap-3 shrink-0">
          <button onClick={add} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary transition-colors">
            <Icon name="Plus" size={15} /> Добавить нарушение
          </button>
          <button onClick={() => { onChange(list); onClose(); }} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Сохранить</button>
        </div>
      </div>
    </div>
  );
}

// ─── Objects Section ──────────────────────────────────────────────────────────
function Objects({ locations, posts, onAdd, onEdit, onDelete }: {
  locations: Location[]; posts: Post[];
  onAdd: (d: Omit<Location, "id">) => void;
  onEdit: (id: number, d: Omit<Location, "id">) => void;
  onDelete: (id: number) => void;
}) {
  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<Location | null>(null);
  const [search, setSearch] = useState("");

  const filtered = locations.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.address.toLowerCase().includes(search.toLowerCase())
  );
  const close = () => { setModal(null); setTarget(null); };

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Объекты</h2>
          <p className="text-muted-foreground text-sm mt-1">{locations.length} объектов под охраной</p>
        </div>
        <button onClick={() => setModal("add")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0">
          <Icon name="Plus" size={16} /> Добавить объект
        </button>
      </div>

      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Icon name="X" size={14} /></button>}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Icon name="Building2" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">{search ? "Ничего не найдено" : "Объекты ещё не добавлены"}</p>
          {!search && <button onClick={() => setModal("add")} className="mt-4 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Добавить первый</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(loc => {
            const lp = posts.filter(p => p.locationId === loc.id);
            const cov = lp.filter(p => p.status === "covered").length;
            const hasAlert = lp.some(p => p.status === "alert");
            const pct = lp.length > 0 ? Math.round((cov / lp.length) * 100) : 0;
            return (
              <div key={loc.id} className={`bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 ${hasAlert ? "border-red-500/30" : "border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-bold text-foreground text-base truncate">{loc.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{loc.address}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg border font-medium shrink-0 ${TYPE_COLORS[loc.type]}`}>{TYPE_LABELS[loc.type]}</span>
                </div>
                {hasAlert && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-3 text-xs text-red-400">
                    <Icon name="AlertTriangle" size={13} /> Есть пост в режиме тревоги
                  </div>
                )}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Покрытие</span>
                    <span className="font-mono text-foreground">{cov}/{lp.length > 0 ? lp.length : loc.posts}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${lp.length > 0 ? pct : 0}%` }} />
                  </div>
                </div>
                {loc.contact && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4"><Icon name="Phone" size={11} /> {loc.contact}</p>}
                <div className="flex gap-2 pt-3 border-t border-border/60">
                  <button onClick={() => { setTarget(loc); setModal("edit"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted hover:bg-secondary text-foreground text-xs font-medium transition-colors">
                    <Icon name="Pencil" size={13} /> Редактировать
                  </button>
                  <button onClick={() => { setTarget(loc); setModal("delete"); }} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 text-xs transition-colors">
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal === "add" && <LocationModal title="Новый объект" initial={null} onSave={d => { onAdd(d); close(); }} onClose={close} />}
      {modal === "edit" && target && <LocationModal title={`Редактировать — ${target.name}`} initial={target} onSave={d => { onEdit(target.id, d); close(); }} onClose={close} />}
      {modal === "delete" && target && <DeleteModal name={target.name} onConfirm={() => { onDelete(target.id); close(); }} onClose={close} />}
    </div>
  );
}

// ─── Placements Section ───────────────────────────────────────────────────────
interface PlacementsProps {
  locations: Location[];
  posts: Post[];
  employees: Employee[];
  fineReasons: FineReason[];
  onAssign: (postId: number, employeeId: number | null, fine: Omit<FineRecord, "id" | "date" | "postId"> | null) => void;
  onOpenFineSettings: () => void;
}

function Placements({ locations, posts, employees, fineReasons, onAssign, onOpenFineSettings }: PlacementsProps) {
  const [assignPost, setAssignPost] = useState<Post | null>(null);

  if (locations.length === 0) {
    return (
      <div className="section-enter text-center py-20">
        <Icon name="MapPin" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground">Сначала добавьте объекты в разделе «Объекты»</p>
      </div>
    );
  }

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Расстановки</h2>
          <p className="text-muted-foreground text-sm mt-1">Назначение и замена охранников на постах</p>
        </div>
        <button onClick={onOpenFineSettings} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors">
          <Icon name="Settings2" size={15} /> Причины штрафов
        </button>
      </div>

      {locations.map(loc => {
        const lp = posts.filter(p => p.locationId === loc.id);
        return (
          <div key={loc.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="Building2" size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">{loc.name}</h3>
              <span className="text-xs text-muted-foreground font-mono ml-auto">
                {lp.filter(p => p.status === "covered").length}/{lp.length} закрыто
              </span>
            </div>
            {lp.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Посты не назначены</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {lp.map(post => {
                  const emp = employees.find(e => e.id === post.officerId);
                  return (
                    <div
                      key={post.id}
                      className={`p-4 rounded-xl border transition-all duration-200
                        ${post.status === "covered" ? "border-emerald-500/20 bg-emerald-500/5" :
                          post.status === "alert" ? "border-red-500/30 bg-red-500/5" :
                          "border-amber-500/20 bg-amber-500/5"}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm text-foreground">{post.name}</span>
                        {postBadge(post.status)}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mb-2">{post.time}</p>

                      {emp ? (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="text-xs text-foreground truncate">{emp.name}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-400 flex items-center gap-1 mb-3">
                          <Icon name="UserX" size={11} /> Не назначен
                        </p>
                      )}

                      <button
                        onClick={() => setAssignPost(post)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Icon name="UserCog" size={12} />
                        {emp ? "Заменить" : "Назначить"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {assignPost && (
        <AssignModal
          post={assignPost}
          location={locations.find(l => l.id === assignPost.locationId)}
          employees={employees}
          fineReasons={fineReasons}
          onAssign={onAssign}
          onClose={() => setAssignPost(null)}
        />
      )}
    </div>
  );
}

// ─── Fines Section ────────────────────────────────────────────────────────────
interface FinesProps {
  fines: FineRecord[];
  employees: Employee[];
  posts: Post[];
  locations: Location[];
  fineReasons: FineReason[];
  onOpenFineSettings: () => void;
}

function Fines({ fines, employees, posts, locations, fineReasons, onOpenFineSettings }: FinesProps) {
  const [filterEmp, setFilterEmp] = useState<number | "all">("all");

  const filtered = filterEmp === "all" ? fines : fines.filter(f => f.employeeId === filterEmp);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  const totalAll = fines.reduce((s, f) => s + f.amount, 0);

  // per-employee totals
  const byEmployee = employees.map(e => ({
    employee: e,
    total: fines.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0),
    count: fines.filter(f => f.employeeId === e.id).length,
  })).filter(x => x.count > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Штрафы</h2>
          <p className="text-muted-foreground text-sm mt-1">История нарушений и начисленных штрафов</p>
        </div>
        <button onClick={onOpenFineSettings} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors">
          <Icon name="Settings2" size={15} /> Справочник нарушений
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
            <Icon name="BadgeAlert" size={20} className="text-red-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-red-400 mb-1">{fines.length}</div>
          <div className="text-sm text-muted-foreground">Всего нарушений</div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <Icon name="CircleDollarSign" size={20} className="text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 mb-1">{fmt(totalAll)}</div>
          <div className="text-sm text-muted-foreground">Сумма штрафов</div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Icon name="Users" size={20} className="text-primary" />
          </div>
          <div className="text-3xl font-bold font-mono text-primary mb-1">{byEmployee.length}</div>
          <div className="text-sm text-muted-foreground">Сотрудников нарушили</div>
        </div>
      </div>

      {/* Top offenders */}
      {byEmployee.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Топ нарушителей</h3>
          <div className="space-y-2">
            {byEmployee.map((x, i) => (
              <div key={x.employee.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {x.employee.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{x.employee.name}</p>
                  <p className="text-xs text-muted-foreground">{x.count} {x.count === 1 ? "нарушение" : x.count < 5 ? "нарушения" : "нарушений"}</p>
                </div>
                <span className="text-sm font-mono font-semibold text-red-400">{fmt(x.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
          <h3 className="font-semibold text-foreground mr-2">История</h3>
          <select
            value={filterEmp}
            onChange={e => setFilterEmp(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">Все сотрудники</option>
            {employees.filter(e => fines.some(f => f.employeeId === e.id)).map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{sorted.length} записей</span>
        </div>

        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="CheckCircle2" size={36} className="text-emerald-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm text-muted-foreground">Нарушений не зафиксировано</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border">
                  {["Дата", "Сотрудник", "Пост / Объект", "Причина", "Примечание", "Штраф"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(f => {
                  const emp = employees.find(e => e.id === f.employeeId);
                  const post = posts.find(p => p.id === f.postId);
                  const loc = post ? locations.find(l => l.id === post.locationId) : null;
                  const reason = fineReasons.find(r => r.id === f.reasonId);
                  return (
                    <tr key={f.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 text-xs font-mono text-muted-foreground whitespace-nowrap">{fmtDate(f.date)}</td>
                      <td className="px-5 py-4">
                        {emp ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <span className="text-sm text-foreground">{emp.name}</span>
                          </div>
                        ) : <span className="text-sm text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-foreground">{post?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{loc?.name ?? "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        {reason
                          ? <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${reason.color}`}>{reason.label}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground max-w-[160px] truncate">{f.note || "—"}</td>
                      <td className="px-5 py-4 text-sm font-mono font-semibold text-red-400 whitespace-nowrap">{fmt(f.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td colSpan={5} className="px-5 py-3 text-sm font-semibold text-foreground text-right">Итого по фильтру:</td>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-red-400">{fmt(sorted.reduce((s, f) => s + f.amount, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ locations, employees, posts, fines }: {
  locations: Location[]; employees: Employee[]; posts: Post[]; fines: FineRecord[];
}) {
  const active = employees.filter(e => e.status === "active").length;
  const covered = posts.filter(p => p.status === "covered").length;
  const vacant = posts.filter(p => p.status === "vacant").length;
  const alertCount = posts.filter(p => p.status === "alert").length;
  const finesMonth = fines.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="section-enter space-y-6">
      <div className="relative rounded-2xl overflow-hidden border border-border p-8 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="relative z-10">
          <p className="text-xs font-mono text-primary uppercase tracking-widest mb-2">06 мая 2026 / Среда</p>
          <h1 className="text-3xl font-bold text-foreground mb-1">Добро пожаловать</h1>
          <p className="text-muted-foreground">SecureOps — {locations.length} объектов под охраной</p>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5"><Icon name="Shield" size={160} /></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "На смене",        value: active,      icon: "UserCheck",         color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Постов закрыто",  value: covered,     icon: "ShieldCheck",       color: "text-primary",     bg: "bg-primary/10" },
          { label: "Вакантных",       value: vacant,      icon: "ShieldOff",         color: "text-amber-400",   bg: "bg-amber-500/10" },
          { label: "Тревоги",         value: alertCount,  icon: "AlertTriangle",     color: "text-red-400",     bg: "bg-red-500/10" },
          { label: "Штрафы (всего)",  value: fmt(finesMonth), icon: "BadgeAlert",    color: "text-rose-400",    bg: "bg-rose-500/10" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <Icon name={s.icon} size={20} className={s.color} />
            </div>
            <div className={`text-2xl font-bold font-mono ${s.color} mb-1 truncate`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Тревоги и вакансии</h3>
            <Icon name="Bell" size={16} className="text-muted-foreground" />
          </div>
          {posts.filter(p => p.status !== "covered").length === 0
            ? <p className="text-sm text-muted-foreground py-4 text-center">Все посты закрыты</p>
            : <div className="space-y-2">
              {posts.filter(p => p.status !== "covered").map(p => {
                const loc = locations.find(l => l.id === p.locationId);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{loc?.name ?? "—"} · {p.time}</p>
                    </div>
                    {postBadge(p.status)}
                  </div>
                );
              })}
            </div>
          }
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Объекты</h3>
            <Icon name="Building2" size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {locations.map(loc => {
              const lp = posts.filter(p => p.locationId === loc.id);
              const cov = lp.filter(p => p.status === "covered").length;
              return (
                <div key={loc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${lp.some(p => p.status === "alert") ? "bg-red-400" : cov === lp.length && lp.length > 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                  </div>
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

// ─── Employees ────────────────────────────────────────────────────────────────
function Employees({ employees }: { employees: Employee[] }) {
  const [filter, setFilter] = useState<"all" | "active" | "off" | "sick">("all");
  const filtered = filter === "all" ? employees : employees.filter(e => e.status === filter);
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-foreground">Сотрудники</h2><p className="text-muted-foreground text-sm mt-1">База охранников и их текущий статус</p></div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"><Icon name="UserPlus" size={16} /> Добавить</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[{ key: "all", label: "Все" }, { key: "active", label: "На смене" }, { key: "off", label: "Выходной" }, { key: "sick", label: "Больничный" }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as "all" | "active" | "off" | "sick")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{f.label}</button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead><tr className="border-b border-border">{["Сотрудник", "Должность", "Статус", "Локация / Смена", "Телефон"].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(e => (
              <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">{e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div><span className="font-medium text-foreground text-sm">{e.name}</span></div></td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{e.rank}</td>
                <td className="px-5 py-4">{statusBadge(e.status)}</td>
                <td className="px-5 py-4"><p className="text-sm text-foreground">{e.location}</p><p className="text-xs font-mono text-muted-foreground">{e.shift}</p></td>
                <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{e.phone}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
function Schedule() {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const schedule: Record<string, (string | null)[]> = {
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-2xl font-bold text-foreground">График смен</h2><p className="text-muted-foreground text-sm mt-1">Неделя 5 — 11 мая 2026</p></div>
        <div className="flex gap-4 text-xs text-muted-foreground items-center">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/30 inline-block" /> Дневная</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500/40 inline-block" /> Ночная</span>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead><tr className="border-b border-border"><th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-44">Сотрудник</th>
              {days.map((d, i) => <th key={d} className={`text-center text-xs font-medium uppercase tracking-wider px-3 py-3 ${i === 2 ? "text-primary" : "text-muted-foreground"}`}>{d}{i === 2 && <span className="block w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}</th>)}
            </tr></thead>
            <tbody>{Object.entries(schedule).map(([name, shifts]) => (
              <tr key={name} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-foreground whitespace-nowrap">{name}</td>
                {shifts.map((s, ci) => <td key={ci} className="px-2 py-3 text-center">
                  {s === "Дн" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-primary/20 text-primary text-xs font-mono font-semibold">Дн</span>}
                  {s === "Ноч" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">Ноч</span>}
                  {s === null && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-muted/50"><span className="w-1.5 h-1.5 rounded-full bg-border" /></span>}
                </td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports() {
  const reports = [
    { title: "Сводка за апрель 2026", date: "27.04.2026", type: "Месячный", size: "148 КБ" },
    { title: "Инцидент — Объект Б, ворота", date: "25.04.2026", type: "Инцидент", size: "56 КБ" },
    { title: "Смены — 3я неделя апреля", date: "21.04.2026", type: "Еженедельный", size: "98 КБ" },
    { title: "Отчёт по штрафам — апрель", date: "30.04.2026", type: "Штрафы", size: "64 КБ" },
    { title: "Сводка за март 2026", date: "31.03.2026", type: "Месячный", size: "162 КБ" },
  ];
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-foreground">Отчёты</h2><p className="text-muted-foreground text-sm mt-1">Сформированные и архивные отчёты</p></div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"><Icon name="Plus" size={16} /> Новый отчёт</button>
      </div>
      <div className="bg-card border border-border rounded-xl divide-y divide-border/50">
        {reports.map((r, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.type === "Штрафы" ? "bg-red-500/10" : "bg-primary/10"}`}>
              <Icon name={r.type === "Штрафы" ? "BadgeAlert" : "FileText"} size={18} className={r.type === "Штрафы" ? "text-red-400" : "text-primary"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.date} · {r.type} · {r.size}</p>
            </div>
            <span className={r.type === "Штрафы" ? "badge-danger hidden sm:inline-flex" : "badge-active hidden sm:inline-flex"}>Готов</span>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Icon name="Download" size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function Analytics() {
  const data = [
    { label: "Пн", day: 6, night: 2 }, { label: "Вт", day: 5, night: 3 },
    { label: "Ср", day: 7, night: 1 }, { label: "Чт", day: 4, night: 4 },
    { label: "Пт", day: 6, night: 2 }, { label: "Сб", day: 3, night: 3 },
    { label: "Вс", day: 4, night: 2 },
  ];
  const max = 10;
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Аналитика</h2><p className="text-muted-foreground text-sm mt-1">Статистика смен и покрытия объектов</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Часов отработано", value: "1 248", suffix: "ч", trend: "+8%" },
          { label: "Средняя явка", value: "94", suffix: "%", trend: "+2%" },
          { label: "Покрытие постов", value: "87", suffix: "%", trend: "-3%" },
          { label: "Инциденты", value: "2", suffix: "шт", trend: "=0" },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div className="text-2xl font-bold font-mono text-foreground mb-0.5">{k.value}<span className="text-sm text-muted-foreground ml-1">{k.suffix}</span></div>
            <div className="text-xs text-muted-foreground mb-2">{k.label}</div>
            <div className={`text-xs font-mono ${k.trend.startsWith("+") ? "text-emerald-400" : k.trend.startsWith("-") ? "text-red-400" : "text-muted-foreground"}`}>{k.trend} к прошлой неделе</div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-6">Распределение смен</h3>
        <div className="flex items-end gap-3" style={{ height: "140px" }}>
          {data.map(d => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full">
              <div className="w-full flex flex-col-reverse gap-0.5 flex-1">
                <div className="w-full rounded-t bg-primary/40" style={{ height: `${(d.day / max) * 100}%` }} />
                <div className="w-full rounded-t bg-indigo-500/40" style={{ height: `${(d.night / max) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground font-mono shrink-0">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
function ExportPage() {
  const formats = [
    { label: "Excel (.xlsx)", icon: "Table", desc: "Таблица смен и сотрудников" },
    { label: "PDF отчёт", icon: "FileText", desc: "Готовый документ с печатью" },
    { label: "CSV данные", icon: "Database", desc: "Сырые данные для интеграции" },
    { label: "Отчёт по штрафам", icon: "BadgeAlert", desc: "История нарушений за период" },
  ];
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Экспорт</h2><p className="text-muted-foreground text-sm mt-1">Выгрузка данных в различных форматах</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {formats.map(f => (
          <button key={f.label} className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icon name={f.icon} size={22} className="text-primary" />
              </div>
              <div className="flex-1"><p className="font-semibold text-foreground">{f.label}</p><p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p></div>
              <Icon name="Download" size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings() {
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Настройки</h2><p className="text-muted-foreground text-sm mt-1">Конфигурация системы</p></div>
      {[
        { title: "Организация", items: [{ label: "Название", value: "ООО «Охранная Группа»" }, { label: "Лицензия", value: "ЧО-123456 / до 31.12.2027" }, { label: "Контакт", value: "+7 800 123-45-67" }] },
        { title: "Смены", items: [{ label: "Дневная смена", value: "08:00 – 20:00" }, { label: "Ночная смена", value: "20:00 – 08:00" }] },
        { title: "Уведомления", items: [{ label: "Email для отчётов", value: "admin@example.com" }, { label: "SMS-тревога", value: "+7 900 000-00-00" }] },
      ].map(section => (
        <div key={section.title} className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">{section.title}</h3>
          <div className="space-y-4">
            {section.items.map(item => (
              <div key={item.label} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 items-center">
                <label className="text-sm text-muted-foreground">{item.label}</label>
                <input defaultValue={item.value} className={inputCls} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Сохранить</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fineReasonModal, setFineReasonModal] = useState(false);

  // ── Global State ──
  const [locations, setLocations] = useState<Location[]>(INIT_LOCATIONS);
  const [employees] = useState<Employee[]>(INIT_EMPLOYEES);
  const [posts, setPosts] = useState<Post[]>(INIT_POSTS);
  const [fineReasons, setFineReasons] = useState<FineReason[]>(INIT_FINE_REASONS);
  const [fines, setFines] = useState<FineRecord[]>(INIT_FINES);

  // ── Location CRUD ──
  const addLocation = (data: Omit<Location, "id">) =>
    setLocations(prev => [...prev, { id: Math.max(0, ...prev.map(l => l.id)) + 1, ...data }]);
  const editLocation = (id: number, data: Omit<Location, "id">) =>
    setLocations(prev => prev.map(l => l.id === id ? { id, ...data } : l));
  const deleteLocation = (id: number) =>
    setLocations(prev => prev.filter(l => l.id !== id));

  // ── Assignment ──
  const handleAssign = (
    postId: number,
    employeeId: number | null,
    fine: Omit<FineRecord, "id" | "date" | "postId"> | null
  ) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newStatus: Post["status"] = employeeId !== null ? "covered" : "vacant";
      return { ...p, officerId: employeeId, status: newStatus };
    }));
    if (fine) {
      const today = new Date().toISOString().slice(0, 10);
      setFines(prev => [...prev, {
        id: Math.max(0, ...prev.map(f => f.id)) + 1,
        date: today,
        postId,
        ...fine,
      }]);
    }
  };

  const handleNav = (key: Section) => { setActive(key); setSidebarOpen(false); };

  const renderSection = () => {
    switch (active) {
      case "dashboard":  return <Dashboard locations={locations} employees={employees} posts={posts} fines={fines} />;
      case "objects":    return <Objects locations={locations} posts={posts} onAdd={addLocation} onEdit={editLocation} onDelete={deleteLocation} />;
      case "placements": return <Placements locations={locations} posts={posts} employees={employees} fineReasons={fineReasons} onAssign={handleAssign} onOpenFineSettings={() => setFineReasonModal(true)} />;
      case "employees":  return <Employees employees={employees} />;
      case "reports":    return <Reports />;
      case "fines":      return <Fines fines={fines} employees={employees} posts={posts} locations={locations} fineReasons={fineReasons} onOpenFineSettings={() => setFineReasonModal(true)} />;
      case "schedule":   return <Schedule />;
      case "export":     return <ExportPage />;
      case "analytics":  return <Analytics />;
      case "settings":   return <Settings />;
    }
  };

  // badge for fines nav item
  const unresolved = posts.filter(p => p.status === "alert" || p.status === "vacant").length;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Icon name="Shield" size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">SecureOps</p>
              <p className="text-xs text-muted-foreground font-mono">{locations.length} объектов</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.key} onClick={() => handleNav(item.key as Section)}
              className={`nav-item w-full ${active === item.key ? "active" : ""}`}>
              <Icon name={item.icon} size={18} />
              {item.label}
              {item.key === "objects" && <span className="ml-auto text-xs font-mono text-muted-foreground">{locations.length}</span>}
              {item.key === "fines" && fines.length > 0 && (
                <span className="ml-auto text-[10px] font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{fines.length}</span>
              )}
              {item.key === "placements" && unresolved > 0 && (
                <span className="ml-auto text-[10px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{unresolved}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">АД</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Администратор</p>
              <p className="text-xs text-muted-foreground">Главный диспетчер</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 shrink-0 bg-background/80 backdrop-blur-sm">
          <button className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Icon name="Menu" size={20} />
          </button>
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground">{navItems.find(n => n.key === active)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">Система активна</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="Bell" size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6" key={active}>
          {renderSection()}
        </main>
      </div>

      {fineReasonModal && (
        <FineReasonsModal
          reasons={fineReasons}
          onChange={setFineReasons}
          onClose={() => setFineReasonModal(false)}
        />
      )}
    </div>
  );
}
