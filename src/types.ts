// ─── Holding & Organizations ──────────────────────────────────────────────────
export interface Holding {
  id: number;
  name: string;
  inn: string;
  logo?: string;
}

export interface Organization {
  id: number;
  holdingId: number;
  name: string;
  shortName: string;
  inn: string;
  address: string;
  phone: string;
  license: string;
  color: string; // accent для разделения в UI
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────
export type Permission =
  | "dashboard:view"
  | "objects:view" | "objects:edit"
  | "placements:view" | "placements:edit"
  | "employees:view" | "employees:edit"
  | "fines:view" | "fines:edit"
  | "reports:view"
  | "schedule:view" | "schedule:edit"
  | "export:use"
  | "analytics:view"
  | "users:view" | "users:edit"
  | "roles:view" | "roles:edit"
  | "settings:edit"
  | "holding:view";

export const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: "dashboard:view",    label: "Просмотр главной",          group: "Главная" },
  { key: "objects:view",      label: "Просмотр объектов",          group: "Объекты" },
  { key: "objects:edit",      label: "Управление объектами",       group: "Объекты" },
  { key: "placements:view",   label: "Просмотр расстановок",       group: "Расстановки" },
  { key: "placements:edit",   label: "Изменение расстановок",      group: "Расстановки" },
  { key: "employees:view",    label: "Просмотр сотрудников",       group: "Сотрудники" },
  { key: "employees:edit",    label: "Управление сотрудниками",    group: "Сотрудники" },
  { key: "fines:view",        label: "Просмотр штрафов",           group: "Штрафы" },
  { key: "fines:edit",        label: "Начисление штрафов",         group: "Штрафы" },
  { key: "reports:view",      label: "Просмотр отчётов",           group: "Отчёты" },
  { key: "schedule:view",     label: "Просмотр графика",           group: "График" },
  { key: "schedule:edit",     label: "Редактирование графика",     group: "График" },
  { key: "export:use",        label: "Экспорт данных",             group: "Экспорт" },
  { key: "analytics:view",    label: "Просмотр аналитики",         group: "Аналитика" },
  { key: "users:view",        label: "Просмотр пользователей",     group: "Пользователи" },
  { key: "users:edit",        label: "Управление пользователями",  group: "Пользователи" },
  { key: "roles:view",        label: "Просмотр ролей",             group: "Роли" },
  { key: "roles:edit",        label: "Управление ролями",          group: "Роли" },
  { key: "settings:edit",     label: "Настройки организации",      group: "Настройки" },
  { key: "holding:view",      label: "Управление холдингом",       group: "Холдинг" },
];

export interface Role {
  id: number;
  orgId: number | null; // null = системная роль холдинга
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean; // нельзя удалить
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface AppUser {
  id: number;
  holdingId: number;
  orgIds: number[];          // к каким организациям имеет доступ
  name: string;
  email: string;
  phone: string;
  avatarInitials: string;
  roleIds: number[];         // id ролей
  isActive: boolean;
  lastLogin: string;         // ISO date
}

// ─── Domain types ─────────────────────────────────────────────────────────────
export interface Location {
  id: number;
  orgId: number;
  name: string;
  address: string;
  type: "office" | "warehouse" | "retail" | "industrial" | "residential";
  posts: number;
  contact: string;
  note: string;
  hourlyRate: number;    // тариф охранника за час на объекте, ₽
}

export interface Employee {
  id: number;
  orgId: number;
  name: string;
  rank: string;
  status: "active" | "off" | "sick";
  location: string;
  shift: string;
  phone: string;
  hireDate: string;          // ISO date — дата приёма
  yearsExp: number;          // стаж в годах
  seniorityBonus: number;    // надбавка за выслугу, ₽/час
  note: string;
}

export interface Post {
  id: number;
  orgId: number;
  name: string;
  locationId: number;
  officerId: number | null;
  time: string;
  status: "covered" | "vacant" | "alert";
  // Фактическое заступление
  confirmedAt: string | null;    // ISO datetime — когда оператор подтвердил
  confirmedBy: string | null;    // имя оператора
  actualStartTime: string | null; // фактическое время заступления (HH:MM)
  actualHours: number | null;    // фактически отработано часов (null = смена не завершена)
}

export interface FineReason {
  id: number;
  orgId: number;
  label: string;
  amount: number;
  color: string;
}

export interface FineRecord {
  id: number;
  orgId: number;
  date: string;
  employeeId: number;
  postId: number;
  reasonId: number;
  note: string;
  amount: number;
}

// ─── Auth Session ─────────────────────────────────────────────────────────────
export interface AuthSession {
  user: AppUser;
  currentOrgId: number;
}

export type Section =
  | "dashboard" | "objects" | "placements" | "employees"
  | "reports" | "fines" | "schedule" | "export" | "analytics"
  | "users" | "holding" | "settings";