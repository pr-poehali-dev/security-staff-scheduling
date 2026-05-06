import { useState } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────────────────────────
type Section =
  | "dashboard"
  | "objects"
  | "placements"
  | "employees"
  | "reports"
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
  officer: string | null;
  time: string;
  status: "covered" | "vacant" | "alert";
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
  { id: 1, name: "Главный вход", locationId: 1, officer: "Иванов С.А.", time: "08:00 – 20:00", status: "covered" },
  { id: 2, name: "Периметр (сев.)", locationId: 1, officer: "Петров А.В.", time: "08:00 – 20:00", status: "covered" },
  { id: 3, name: "Периметр (юж.)", locationId: 1, officer: null, time: "08:00 – 20:00", status: "vacant" },
  { id: 4, name: "КПП", locationId: 2, officer: "Смирнова Е.К.", time: "20:00 – 08:00", status: "covered" },
  { id: 5, name: "Склад", locationId: 2, officer: "Морозов А.Г.", time: "08:00 – 20:00", status: "covered" },
  { id: 6, name: "Ворота въезда", locationId: 2, officer: null, time: "08:00 – 20:00", status: "alert" },
  { id: 7, name: "Парковка", locationId: 3, officer: "Николаева И.Р.", time: "08:00 – 20:00", status: "covered" },
  { id: 8, name: "Главный вход", locationId: 3, officer: "Фёдорова Н.В.", time: "20:00 – 08:00", status: "covered" },
];

const navItems = [
  { key: "dashboard", label: "Главная", icon: "LayoutDashboard" },
  { key: "objects", label: "Объекты", icon: "Building2" },
  { key: "placements", label: "Расстановки", icon: "MapPin" },
  { key: "employees", label: "Сотрудники", icon: "Users" },
  { key: "reports", label: "Отчёты", icon: "FileText" },
  { key: "schedule", label: "График", icon: "CalendarDays" },
  { key: "export", label: "Экспорт", icon: "Download" },
  { key: "analytics", label: "Аналитика", icon: "BarChart3" },
  { key: "settings", label: "Настройки", icon: "Settings" },
] as const;

const TYPE_LABELS: Record<Location["type"], string> = {
  office: "Офис / БЦ",
  warehouse: "Склад",
  retail: "Торговый объект",
  industrial: "Промышленный",
  residential: "Жилой комплекс",
};

const TYPE_COLORS: Record<Location["type"], string> = {
  office: "text-primary bg-primary/10 border-primary/20",
  warehouse: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  retail: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  industrial: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  residential: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusBadge = (status: Employee["status"]) => {
  if (status === "active") return <span className="badge-active">На смене</span>;
  if (status === "sick") return <span className="badge-danger">Больничный</span>;
  return <span className="badge-inactive">Выходной</span>;
};

const postBadge = (status: Post["status"]) => {
  if (status === "covered") return <span className="badge-active">Закрыт</span>;
  if (status === "alert") return <span className="badge-danger">Тревога</span>;
  return <span className="badge-warning">Вакантен</span>;
};

// ─── Location Form Modal ───────────────────────────────────────────────────────
const EMPTY_LOCATION: Omit<Location, "id"> = {
  name: "", address: "", type: "office", posts: 1, contact: "", note: "",
};

interface LocationModalProps {
  initial: Omit<Location, "id"> | null;
  onSave: (data: Omit<Location, "id">) => void;
  onClose: () => void;
  title: string;
}

function LocationModal({ initial, onSave, onClose, title }: LocationModalProps) {
  const [form, setForm] = useState<Omit<Location, "id">>(initial ?? EMPTY_LOCATION);

  const set = (key: keyof typeof form, val: string | number) =>
    setForm(f => ({ ...f, [key]: val }));

  const valid = form.name.trim().length > 0 && form.address.trim().length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg section-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Название <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Объект Д"
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Тип</label>
              <select
                value={form.type}
                onChange={e => set("type", e.target.value as Location["type"])}
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Адрес <span className="text-red-400">*</span>
            </label>
            <input
              value={form.address}
              onChange={e => set("address", e.target.value)}
              placeholder="ул. Примерная, 1, Москва"
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Контакт объекта</label>
              <input
                value={form.contact}
                onChange={e => set("contact", e.target.value)}
                placeholder="+7 900 000-00-00"
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Кол-во постов</label>
              <input
                type="number"
                min={1}
                max={99}
                value={form.posts}
                onChange={e => set("posts", parseInt(e.target.value) || 1)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Примечание</label>
            <textarea
              value={form.note}
              onChange={e => set("note", e.target.value)}
              placeholder="Особые условия, описание объекта..."
              rows={2}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
interface DeleteModalProps {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}

function DeleteModal({ name, onConfirm, onClose }: DeleteModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
          <Icon name="Trash2" size={22} className="text-red-400" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить объект?</h3>
        <p className="text-sm text-muted-foreground mb-6">
          «{name}» будет удалён из системы. Все посты этого объекта также будут удалены. Это действие нельзя отменить.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            Удалить
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Objects Section ──────────────────────────────────────────────────────────
interface ObjectsProps {
  locations: Location[];
  posts: Post[];
  onAdd: (data: Omit<Location, "id">) => void;
  onEdit: (id: number, data: Omit<Location, "id">) => void;
  onDelete: (id: number) => void;
}

function Objects({ locations, posts, onAdd, onEdit, onDelete }: ObjectsProps) {
  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<Location | null>(null);
  const [search, setSearch] = useState("");

  const filtered = locations.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.address.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (loc: Location) => { setTarget(loc); setModal("edit"); };
  const openDelete = (loc: Location) => { setTarget(loc); setModal("delete"); };
  const closeModal = () => { setModal(null); setTarget(null); };

  const postCount = (id: number) => posts.filter(p => p.locationId === id);
  const coveredCount = (id: number) => posts.filter(p => p.locationId === id && p.status === "covered").length;

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Объекты</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {locations.length} {locations.length === 1 ? "объект" : locations.length < 5 ? "объекта" : "объектов"} под охраной
          </p>
        </div>
        <button
          onClick={() => setModal("add")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          <Icon name="Plus" size={16} />
          Добавить объект
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию или адресу..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Icon name="Building2" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">
            {search ? "Ничего не найдено" : "Объекты ещё не добавлены"}
          </p>
          {!search && (
            <button
              onClick={() => setModal("add")}
              className="mt-4 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Добавить первый объект
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(loc => {
            const locPosts = postCount(loc.id);
            const covered = coveredCount(loc.id);
            const hasAlert = locPosts.some(p => p.status === "alert");
            const pct = locPosts.length > 0 ? Math.round((covered / locPosts.length) * 100) : 0;

            return (
              <div
                key={loc.id}
                className={`bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20
                  ${hasAlert ? "border-red-500/30" : "border-border hover:border-border/80"}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-bold text-foreground text-base truncate">{loc.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{loc.address}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg border font-medium shrink-0 ${TYPE_COLORS[loc.type]}`}>
                    {TYPE_LABELS[loc.type]}
                  </span>
                </div>

                {/* Alert banner */}
                {hasAlert && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-3 text-xs text-red-400">
                    <Icon name="AlertTriangle" size={13} />
                    Есть пост в режиме тревоги
                  </div>
                )}

                {/* Coverage bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Покрытие постов</span>
                    <span className="font-mono text-foreground">{covered}/{locPosts.length > 0 ? locPosts.length : loc.posts}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : "bg-amber-500"}`}
                      style={{ width: `${locPosts.length > 0 ? pct : 0}%` }}
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  {loc.contact && (
                    <span className="flex items-center gap-1">
                      <Icon name="Phone" size={11} /> {loc.contact}
                    </span>
                  )}
                  {loc.note && (
                    <span className="flex items-center gap-1 truncate">
                      <Icon name="Info" size={11} /> {loc.note}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border/60">
                  <button
                    onClick={() => openEdit(loc)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted hover:bg-secondary text-foreground text-xs font-medium transition-colors"
                  >
                    <Icon name="Pencil" size={13} />
                    Редактировать
                  </button>
                  <button
                    onClick={() => openDelete(loc)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 text-xs font-medium transition-colors"
                  >
                    <Icon name="Trash2" size={13} />
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal === "add" && (
        <LocationModal
          title="Новый объект"
          initial={null}
          onSave={data => { onAdd(data); closeModal(); }}
          onClose={closeModal}
        />
      )}
      {modal === "edit" && target && (
        <LocationModal
          title={`Редактировать — ${target.name}`}
          initial={{ name: target.name, address: target.address, type: target.type, posts: target.posts, contact: target.contact, note: target.note }}
          onSave={data => { onEdit(target.id, data); closeModal(); }}
          onClose={closeModal}
        />
      )}
      {modal === "delete" && target && (
        <DeleteModal
          name={target.name}
          onConfirm={() => { onDelete(target.id); closeModal(); }}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
interface DashboardProps {
  locations: Location[];
  employees: Employee[];
  posts: Post[];
}

function Dashboard({ locations, employees, posts }: DashboardProps) {
  const active = employees.filter((e) => e.status === "active").length;
  const covered = posts.filter((p) => p.status === "covered").length;
  const vacant = posts.filter((p) => p.status === "vacant").length;
  const alertCount = posts.filter((p) => p.status === "alert").length;

  return (
    <div className="section-enter space-y-6">
      <div className="relative rounded-2xl overflow-hidden border border-border p-8 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="relative z-10">
          <p className="text-xs font-mono text-primary uppercase tracking-widest mb-2">06 мая 2026 / Среда</p>
          <h1 className="text-3xl font-bold text-foreground mb-1">Добро пожаловать</h1>
          <p className="text-muted-foreground">SecureOps — система управления охраной · {locations.length} объектов</p>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5">
          <Icon name="Shield" size={160} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "На смене", value: active, icon: "UserCheck", color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Постов закрыто", value: covered, icon: "ShieldCheck", color: "text-primary", bg: "bg-primary/10" },
          { label: "Вакантных постов", value: vacant, icon: "ShieldOff", color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Тревоги", value: alertCount, icon: "AlertTriangle", color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <Icon name={s.icon} size={20} className={s.color} />
            </div>
            <div className={`text-3xl font-bold font-mono ${s.color} mb-1`}>{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Тревоги и вакансии</h3>
            <Icon name="Bell" size={16} className="text-muted-foreground" />
          </div>
          {posts.filter(p => p.status !== "covered").length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Все посты закрыты</p>
          ) : (
            <div className="space-y-2">
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
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Объекты</h3>
            <Icon name="Building2" size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {locations.map(loc => {
              const locPosts = posts.filter(p => p.locationId === loc.id);
              const cov = locPosts.filter(p => p.status === "covered").length;
              return (
                <div key={loc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${locPosts.some(p => p.status === "alert") ? "bg-red-400" : cov === locPosts.length && locPosts.length > 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{cov}/{locPosts.length > 0 ? locPosts.length : loc.posts}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Placements ───────────────────────────────────────────────────────────────
interface PlacementsProps {
  locations: Location[];
  posts: Post[];
}

function Placements({ locations, posts }: PlacementsProps) {
  const [selected, setSelected] = useState<Post | null>(null);

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
      <div>
        <h2 className="text-2xl font-bold text-foreground">Расстановки</h2>
        <p className="text-muted-foreground text-sm mt-1">Назначение охранников на посты по объектам</p>
      </div>

      {locations.map(loc => {
        const locPosts = posts.filter(p => p.locationId === loc.id);
        return (
          <div key={loc.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="Building2" size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">{loc.name}</h3>
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {locPosts.filter(p => p.status === "covered").length}/{locPosts.length} постов закрыто
              </span>
            </div>
            {locPosts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Посты не назначены</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {locPosts.map(post => (
                  <button
                    key={post.id}
                    onClick={() => setSelected(post)}
                    className={`text-left p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02]
                      ${post.status === "covered" ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40" :
                        post.status === "alert" ? "border-red-500/30 bg-red-500/5 hover:border-red-500/50" :
                        "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40"}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm text-foreground">{post.name}</span>
                      {postBadge(post.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 font-mono">{post.time}</p>
                    {post.officer ? (
                      <p className="text-xs text-foreground flex items-center gap-1">
                        <Icon name="User" size={11} /> {post.officer}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-400 flex items-center gap-1">
                        <Icon name="UserX" size={11} /> Не назначен
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md section-enter"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-foreground">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Объект</span><span className="font-medium">{locations.find(l => l.id === selected.locationId)?.name ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Время</span><span className="font-mono">{selected.time}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Охранник</span><span className="font-medium">{selected.officer ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Статус</span>{postBadge(selected.status)}</div>
            </div>
            <div className="mt-6 flex gap-3">
              <button className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                Изменить назначение
              </button>
              <button onClick={() => setSelected(null)} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary transition-colors">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Employees ────────────────────────────────────────────────────────────────
interface EmployeesProps {
  employees: Employee[];
}

function Employees({ employees }: EmployeesProps) {
  const [filter, setFilter] = useState<"all" | "active" | "off" | "sick">("all");
  const filtered = filter === "all" ? employees : employees.filter(e => e.status === filter);

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Сотрудники</h2>
          <p className="text-muted-foreground text-sm mt-1">База охранников и их текущий статус</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          <Icon name="UserPlus" size={16} />
          Добавить
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Все" },
          { key: "active", label: "На смене" },
          { key: "off", label: "Выходной" },
          { key: "sick", label: "Больничный" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as "all" | "active" | "off" | "sick")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                {["Сотрудник", "Должность", "Статус", "Локация / Смена", "Телефон"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium text-foreground text-sm">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{e.rank}</td>
                  <td className="px-5 py-4">{statusBadge(e.status)}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-foreground">{e.location}</p>
                    <p className="text-xs font-mono text-muted-foreground">{e.shift}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{e.phone}</td>
                </tr>
              ))}
            </tbody>
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
        <div>
          <h2 className="text-2xl font-bold text-foreground">График смен</h2>
          <p className="text-muted-foreground text-sm mt-1">Неделя 5 — 11 мая 2026</p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground items-center">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/30 inline-block" /> Дневная</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500/40 inline-block" /> Ночная</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted inline-block" /> Выходной</span>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-44">Сотрудник</th>
                {days.map((d, i) => (
                  <th key={d} className={`text-center text-xs font-medium uppercase tracking-wider px-3 py-3 ${i === 2 ? "text-primary" : "text-muted-foreground"}`}>
                    {d}
                    {i === 2 && <span className="block w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(schedule).map(([name, shifts]) => (
                <tr key={name} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-foreground whitespace-nowrap">{name}</td>
                  {shifts.map((s, ci) => (
                    <td key={ci} className="px-2 py-3 text-center">
                      {s === "Дн" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-primary/20 text-primary text-xs font-mono font-semibold">Дн</span>}
                      {s === "Ноч" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">Ноч</span>}
                      {s === null && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-muted/50"><span className="w-1.5 h-1.5 rounded-full bg-border" /></span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
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
    { title: "Пропуски и опоздания — апрель", date: "20.04.2026", type: "Кадровый", size: "72 КБ" },
    { title: "Сводка за март 2026", date: "31.03.2026", type: "Месячный", size: "162 КБ" },
  ];
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Отчёты</h2>
          <p className="text-muted-foreground text-sm mt-1">Сформированные и архивные отчёты</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} />
          Новый отчёт
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl divide-y divide-border/50">
        {reports.map((r, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="FileText" size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.date} · {r.type} · {r.size}</p>
            </div>
            <span className="badge-active hidden sm:inline-flex">Готов</span>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="Download" size={16} />
            </button>
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
        <h3 className="font-semibold text-foreground mb-6">Распределение смен по дням</h3>
        <div className="flex items-end gap-3" style={{ height: "140px" }}>
          {data.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full">
              <div className="w-full flex flex-col-reverse gap-0.5 flex-1">
                <div className="w-full rounded-t bg-primary/40 transition-all duration-700" style={{ height: `${(d.day / max) * 100}%` }} />
                <div className="w-full rounded-t bg-indigo-500/40 transition-all duration-700" style={{ height: `${(d.night / max) * 100}%` }} />
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
    { label: "Word документ", icon: "FileType", desc: "Редактируемый шаблон отчёта" },
  ];
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Экспорт</h2><p className="text-muted-foreground text-sm mt-1">Выгрузка данных в различных форматах</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {formats.map(f => (
          <button key={f.label} className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group">
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
      <div><h2 className="text-2xl font-bold text-foreground">Настройки</h2><p className="text-muted-foreground text-sm mt-1">Конфигурация системы и параметры организации</p></div>
      {[
        { title: "Организация", items: [{ label: "Название", value: "ООО «Охранная Группа»" }, { label: "Лицензия", value: "ЧО-123456 / до 31.12.2027" }, { label: "Контакт", value: "+7 800 123-45-67" }] },
        { title: "Смены", items: [{ label: "Дневная смена", value: "08:00 – 20:00" }, { label: "Ночная смена", value: "20:00 – 08:00" }, { label: "Мин. охранников на объект", value: "2" }] },
        { title: "Уведомления", items: [{ label: "Email для отчётов", value: "admin@example.com" }, { label: "SMS-тревога", value: "+7 900 000-00-00" }] },
      ].map(section => (
        <div key={section.title} className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">{section.title}</h3>
          <div className="space-y-4">
            {section.items.map(item => (
              <div key={item.label} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 items-center">
                <label className="text-sm text-muted-foreground">{item.label}</label>
                <input defaultValue={item.value} className="bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">Сохранить</button>
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

  // ── Global State ──
  const [locations, setLocations] = useState<Location[]>(INIT_LOCATIONS);
  const [employees] = useState<Employee[]>(INIT_EMPLOYEES);
  const [posts] = useState<Post[]>(INIT_POSTS);

  // ── Location CRUD ──
  const addLocation = (data: Omit<Location, "id">) => {
    const id = Math.max(0, ...locations.map(l => l.id)) + 1;
    setLocations(prev => [...prev, { id, ...data }]);
  };

  const editLocation = (id: number, data: Omit<Location, "id">) => {
    setLocations(prev => prev.map(l => l.id === id ? { id, ...data } : l));
  };

  const deleteLocation = (id: number) => {
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  const handleNav = (key: Section) => { setActive(key); setSidebarOpen(false); };

  const renderSection = () => {
    switch (active) {
      case "dashboard": return <Dashboard locations={locations} employees={employees} posts={posts} />;
      case "objects": return <Objects locations={locations} posts={posts} onAdd={addLocation} onEdit={editLocation} onDelete={deleteLocation} />;
      case "placements": return <Placements locations={locations} posts={posts} />;
      case "employees": return <Employees employees={employees} />;
      case "reports": return <Reports />;
      case "schedule": return <Schedule />;
      case "export": return <ExportPage />;
      case "analytics": return <Analytics />;
      case "settings": return <Settings />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key as Section)}
              className={`nav-item w-full ${active === item.key ? "active" : ""}`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
              {item.key === "objects" && (
                <span className="ml-auto text-xs font-mono text-muted-foreground">{locations.length}</span>
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
            <span className="text-sm font-medium text-foreground">
              {navItems.find(n => n.key === active)?.label}
            </span>
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
    </div>
  );
}
