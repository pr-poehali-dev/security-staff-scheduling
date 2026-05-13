import type {
  Holding, Organization, Role, AppUser,
  Location, Employee, Post, FineReason, FineRecord,
} from "@/types";

// ─── Holding ──────────────────────────────────────────────────────────────────
export const INIT_HOLDING: Holding = {
  id: 1,
  name: "ГК «СекьюрГрупп»",
  inn: "7700000001",
};

// ─── Organizations ────────────────────────────────────────────────────────────
export const INIT_ORGS: Organization[] = [
  {
    id: 1, holdingId: 1,
    name: "ООО «Охранная Группа Центр»", shortName: "ОГ Центр",
    inn: "7701234567", address: "ул. Ленина, 1, Москва",
    phone: "+7 800 100-00-01", license: "ЧО-123456 / до 31.12.2027",
    color: "#6366f1",
  },
  {
    id: 2, holdingId: 1,
    name: "ООО «Охранная Группа Север»", shortName: "ОГ Север",
    inn: "7702345678", address: "пр. Победы, 5, Санкт-Петербург",
    phone: "+7 800 100-00-02", license: "ЧО-234567 / до 30.06.2026",
    color: "#0ea5e9",
  },
  {
    id: 3, holdingId: 1,
    name: "ООО «Охранная Группа Юг»", shortName: "ОГ Юг",
    inn: "7703456789", address: "ул. Красная, 10, Краснодар",
    phone: "+7 800 100-00-03", license: "ЧО-345678 / до 15.03.2028",
    color: "#10b981",
  },
];

// ─── Roles ────────────────────────────────────────────────────────────────────
export const INIT_ROLES: Role[] = [
  {
    id: 1, orgId: null, name: "Суперадминистратор", description: "Полный доступ ко всем организациям холдинга",
    isSystem: true,
    permissions: [
      "dashboard:view","objects:view","objects:edit",
      "placements:view","placements:edit",
      "employees:view","employees:edit",
      "fines:view","fines:edit",
      "reports:view","schedule:view","schedule:edit",
      "export:use","analytics:view",
      "users:view","users:edit","roles:view","roles:edit",
      "settings:edit","holding:view",
    ],
  },
  {
    id: 2, orgId: null, name: "Директор организации", description: "Полный доступ к своей организации, без управления холдингом",
    isSystem: true,
    permissions: [
      "dashboard:view","objects:view","objects:edit",
      "placements:view","placements:edit",
      "employees:view","employees:edit",
      "fines:view","fines:edit",
      "reports:view","schedule:view","schedule:edit",
      "export:use","analytics:view",
      "users:view","users:edit","roles:view",
      "settings:edit",
    ],
  },
  {
    id: 3, orgId: null, name: "Диспетчер", description: "Управление расстановками и просмотр данных",
    isSystem: true,
    permissions: [
      "dashboard:view","objects:view",
      "placements:view","placements:edit",
      "employees:view","fines:view","fines:edit",
      "reports:view","schedule:view","analytics:view",
    ],
  },
  {
    id: 4, orgId: null, name: "Аналитик", description: "Только просмотр: отчёты, аналитика, график",
    isSystem: true,
    permissions: [
      "dashboard:view","objects:view","employees:view",
      "fines:view","reports:view","schedule:view",
      "analytics:view","export:use",
    ],
  },
];

// ─── Users ────────────────────────────────────────────────────────────────────
export const INIT_USERS: AppUser[] = [
  {
    id: 1, holdingId: 1, orgIds: [1, 2, 3],
    name: "Алексей Демидов", email: "admin@securgroup.ru", phone: "+7 900 000-00-00",
    avatarInitials: "АД", roleIds: [1], isActive: true, lastLogin: "2026-05-06",
  },
  {
    id: 2, holdingId: 1, orgIds: [1],
    name: "Марина Орлова", email: "orlova@og-center.ru", phone: "+7 900 001-00-01",
    avatarInitials: "МО", roleIds: [2], isActive: true, lastLogin: "2026-05-05",
  },
  {
    id: 3, holdingId: 1, orgIds: [1],
    name: "Дмитрий Савин", email: "savin@og-center.ru", phone: "+7 900 002-00-02",
    avatarInitials: "ДС", roleIds: [3], isActive: true, lastLogin: "2026-05-06",
  },
  {
    id: 4, holdingId: 1, orgIds: [2],
    name: "Ольга Карпова", email: "karpova@og-sever.ru", phone: "+7 900 003-00-03",
    avatarInitials: "ОК", roleIds: [2], isActive: true, lastLogin: "2026-04-30",
  },
  {
    id: 5, holdingId: 1, orgIds: [3],
    name: "Николай Рябов", email: "ryabov@og-yug.ru", phone: "+7 900 004-00-04",
    avatarInitials: "НР", roleIds: [3], isActive: false, lastLogin: "2026-04-15",
  },
];

// ─── Org 1 data ───────────────────────────────────────────────────────────────
export const INIT_LOCATIONS: Location[] = [
  { id: 1, orgId: 1, name: "Объект А", address: "ул. Ленина, 10, Москва",        type: "office",      posts: 3, contact: "+7 900 100-00-01", note: "Бизнес-центр класса А",  hourlyRate: 220 },
  { id: 2, orgId: 1, name: "Объект Б", address: "ул. Промышленная, 5, Москва",   type: "warehouse",   posts: 3, contact: "+7 900 100-00-02", note: "Складской комплекс",      hourlyRate: 200 },
  { id: 3, orgId: 1, name: "Объект В", address: "пр. Мира, 22, Москва",          type: "retail",      posts: 2, contact: "+7 900 100-00-03", note: "Торговый центр",           hourlyRate: 210 },
  { id: 4, orgId: 2, name: "Объект С-1", address: "пр. Невский, 100, СПб",      type: "office",      posts: 2, contact: "+7 900 200-00-01", note: "Офис класса Б",           hourlyRate: 230 },
  { id: 5, orgId: 2, name: "Объект С-2", address: "ул. Заводская, 3, СПб",      type: "industrial",  posts: 4, contact: "+7 900 200-00-02", note: "Завод",                    hourlyRate: 240 },
  { id: 6, orgId: 3, name: "Объект Ю-1", address: "ул. Красная, 55, Краснодар", type: "retail",      posts: 2, contact: "+7 900 300-00-01", note: "ТРЦ",                      hourlyRate: 195 },
];

export const INIT_EMPLOYEES: Employee[] = [
  // Org 1
  { id: 1,  orgId: 1, name: "Иванов Сергей А.",   rank: "Ст. охранник", status: "active", location: "Объект А — Главный вход", shift: "08:00 – 20:00", phone: "+7 900 123-45-67", hireDate: "2018-03-15", yearsExp: 8,  seniorityBonus: 40, note: "" },
  { id: 2,  orgId: 1, name: "Петров Андрей В.",    rank: "Охранник",     status: "active", location: "Объект А — Периметр",     shift: "08:00 – 20:00", phone: "+7 900 234-56-78", hireDate: "2021-07-01", yearsExp: 5,  seniorityBonus: 25, note: "" },
  { id: 3,  orgId: 1, name: "Смирнова Елена К.",   rank: "Охранник",     status: "active", location: "Объект Б — КПП",          shift: "20:00 – 08:00", phone: "+7 900 345-67-89", hireDate: "2022-01-10", yearsExp: 4,  seniorityBonus: 20, note: "" },
  { id: 4,  orgId: 1, name: "Козлов Дмитрий И.",  rank: "Охранник",     status: "off",    location: "—",                       shift: "Выходной",      phone: "+7 900 456-78-90", hireDate: "2023-05-20", yearsExp: 3,  seniorityBonus: 15, note: "" },
  { id: 5,  orgId: 1, name: "Николаева Ирина Р.",  rank: "Ст. охранник", status: "active", location: "Объект В — Парковка",     shift: "08:00 – 20:00", phone: "+7 900 567-89-01", hireDate: "2016-11-05", yearsExp: 10, seniorityBonus: 50, note: "" },
  { id: 6,  orgId: 1, name: "Волков Павел С.",     rank: "Охранник",     status: "sick",   location: "—",                       shift: "Больничный",    phone: "+7 900 678-90-12", hireDate: "2024-02-14", yearsExp: 2,  seniorityBonus: 0,  note: "Больничный лист до 20.05" },
  { id: 7,  orgId: 1, name: "Морозов Алексей Г.",  rank: "Охранник",     status: "active", location: "Объект Б — Склад",        shift: "08:00 – 20:00", phone: "+7 900 789-01-23", hireDate: "2020-09-01", yearsExp: 6,  seniorityBonus: 30, note: "" },
  { id: 8,  orgId: 1, name: "Фёдорова Наталья В.", rank: "Охранник",     status: "active", location: "Объект В — Главный вход", shift: "20:00 – 08:00", phone: "+7 900 890-12-34", hireDate: "2019-06-15", yearsExp: 7,  seniorityBonus: 35, note: "" },
  // Org 2
  { id: 9,  orgId: 2, name: "Громов Илья К.",     rank: "Ст. охранник", status: "active", location: "Объект С-1 — Вход",       shift: "08:00 – 20:00", phone: "+7 900 111-00-01", hireDate: "2017-04-10", yearsExp: 9,  seniorityBonus: 45, note: "" },
  { id: 10, orgId: 2, name: "Зайцева Анна П.",    rank: "Охранник",     status: "active", location: "Объект С-2 — КПП",        shift: "08:00 – 20:00", phone: "+7 900 111-00-02", hireDate: "2022-08-22", yearsExp: 4,  seniorityBonus: 20, note: "" },
  // Org 3
  { id: 11, orgId: 3, name: "Тихонов Роман В.",   rank: "Охранник",     status: "active", location: "Объект Ю-1 — Вход",       shift: "08:00 – 20:00", phone: "+7 900 222-00-01", hireDate: "2021-03-01", yearsExp: 5,  seniorityBonus: 25, note: "" },
];

export const INIT_POSTS: Post[] = [
  // Org 1
  { id: 1, orgId: 1, name: "Главный вход",    locationId: 1, officerId: 1, time: "08:00 – 20:00", status: "covered" },
  { id: 2, orgId: 1, name: "Периметр (сев.)", locationId: 1, officerId: 2, time: "08:00 – 20:00", status: "covered" },
  { id: 3, orgId: 1, name: "Периметр (юж.)",  locationId: 1, officerId: null, time: "08:00 – 20:00", status: "vacant"  },
  { id: 4, orgId: 1, name: "КПП",             locationId: 2, officerId: 3, time: "20:00 – 08:00", status: "covered" },
  { id: 5, orgId: 1, name: "Склад",           locationId: 2, officerId: 7, time: "08:00 – 20:00", status: "covered" },
  { id: 6, orgId: 1, name: "Ворота въезда",   locationId: 2, officerId: null, time: "08:00 – 20:00", status: "alert"   },
  { id: 7, orgId: 1, name: "Парковка",        locationId: 3, officerId: 5, time: "08:00 – 20:00", status: "covered" },
  { id: 8, orgId: 1, name: "Главный вход",    locationId: 3, officerId: 8, time: "20:00 – 08:00", status: "covered" },
  // Org 2
  { id: 9,  orgId: 2, name: "Главный вход",   locationId: 4, officerId: 9,  time: "08:00 – 20:00", status: "covered" },
  { id: 10, orgId: 2, name: "КПП",            locationId: 5, officerId: 10, time: "08:00 – 20:00", status: "covered" },
  { id: 11, orgId: 2, name: "Периметр",       locationId: 5, officerId: null, time: "20:00 – 08:00", status: "vacant" },
  // Org 3
  { id: 12, orgId: 3, name: "Главный вход",   locationId: 6, officerId: 11, time: "08:00 – 20:00", status: "covered" },
  { id: 13, orgId: 3, name: "Парковка",       locationId: 6, officerId: null, time: "08:00 – 20:00", status: "vacant" },
];

export const INIT_FINE_REASONS: FineReason[] = [
  { id: 1, orgId: 1, label: "Опоздание на смену",          amount: 500,  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { id: 2, orgId: 1, label: "Самовольное оставление поста", amount: 2000, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  { id: 3, orgId: 1, label: "Нарушение внешнего вида",     amount: 300,  color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  { id: 4, orgId: 1, label: "Нарушение регламента",        amount: 1000, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { id: 5, orgId: 1, label: "Сон на посту",                amount: 3000, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  { id: 6, orgId: 1, label: "Отказ от замены",             amount: 1500, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  { id: 7, orgId: 2, label: "Опоздание на смену",          amount: 500,  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { id: 8, orgId: 2, label: "Нарушение внешнего вида",     amount: 300,  color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  { id: 9, orgId: 3, label: "Опоздание на смену",          amount: 500,  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
];

export const INIT_FINES: FineRecord[] = [
  { id: 1, orgId: 1, date: "2026-04-25", employeeId: 4, postId: 3, reasonId: 1, note: "Опоздал на 40 минут", amount: 500 },
  { id: 2, orgId: 1, date: "2026-04-20", employeeId: 6, postId: 6, reasonId: 2, note: "Ушёл с поста без предупреждения", amount: 2000 },
  { id: 3, orgId: 1, date: "2026-04-18", employeeId: 2, postId: 2, reasonId: 3, note: "Без нагрудного знака", amount: 300 },
  { id: 4, orgId: 2, date: "2026-04-22", employeeId: 9, postId: 9, reasonId: 7, note: "Опоздание 20 мин", amount: 500 },
];