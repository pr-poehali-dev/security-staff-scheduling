import { createContext, useContext, useState, type ReactNode } from "react";
import type {
  Holding, Organization, Role, AppUser,
  Location, Employee, Post, FineReason, FineRecord,
  AuthSession, Permission,
} from "@/types";
import {
  INIT_HOLDING, INIT_ORGS, INIT_ROLES, INIT_USERS,
  INIT_LOCATIONS, INIT_EMPLOYEES, INIT_POSTS,
  INIT_FINE_REASONS, INIT_FINES,
} from "@/data";

interface AppContextValue {
  // Auth
  session: AuthSession | null;
  login: (userId: number, orgId: number) => void;
  logout: () => void;
  switchOrg: (orgId: number) => void;
  can: (p: Permission) => boolean;
  isSuperAdmin: () => boolean;

  // Holding & Orgs
  holding: Holding;
  orgs: Organization[];
  addOrg: (d: Omit<Organization, "id" | "holdingId">) => void;
  editOrg: (id: number, d: Omit<Organization, "id" | "holdingId">) => void;
  deleteOrg: (id: number) => void;
  currentOrg: Organization | undefined;

  // Roles
  roles: Role[];
  addRole: (d: Omit<Role, "id">) => void;
  editRole: (id: number, d: Omit<Role, "id">) => void;
  deleteRole: (id: number) => void;

  // Users
  users: AppUser[];
  addUser: (d: Omit<AppUser, "id" | "holdingId" | "lastLogin">) => void;
  editUser: (id: number, d: Partial<AppUser>) => void;
  deleteUser: (id: number) => void;

  // Domain (scoped to currentOrgId)
  locations: Location[];
  addLocation: (d: Omit<Location, "id" | "orgId">) => void;
  editLocation: (id: number, d: Omit<Location, "id" | "orgId">) => void;
  deleteLocation: (id: number) => void;

  employees: Employee[];
  addEmployee: (d: Omit<Employee, "id" | "orgId">) => void;
  editEmployee: (id: number, d: Omit<Employee, "id" | "orgId">) => void;
  deleteEmployee: (id: number) => void;

  posts: Post[];
  assignPost: (postId: number, officerId: number | null, fine: Omit<FineRecord, "id" | "date" | "postId" | "orgId"> | null) => void;

  fineReasons: FineReason[];
  setFineReasons: (reasons: FineReason[]) => void;

  fines: FineRecord[];

  // Global (all orgs) — for holding view
  allLocations: Location[];
  allEmployees: Employee[];
  allPosts: Post[];
  allFines: FineRecord[];
}

const Ctx = createContext<AppContextValue | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppProvider");
  return v;
}

function maxId<T extends { id: number }>(arr: T[]) {
  return arr.length === 0 ? 0 : Math.max(...arr.map(x => x.id));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [holding] = useState<Holding>(INIT_HOLDING);
  const [orgs, setOrgs] = useState<Organization[]>(INIT_ORGS);
  const [roles, setRoles] = useState<Role[]>(INIT_ROLES);
  const [users, setUsers] = useState<AppUser[]>(INIT_USERS);
  const [session, setSession] = useState<AuthSession | null>(null);

  const [allLocations, setAllLocations] = useState<Location[]>(INIT_LOCATIONS);
  const [allEmployees, setAllEmployees] = useState<Employee[]>(INIT_EMPLOYEES);
  const [allPosts, setAllPosts] = useState<Post[]>(INIT_POSTS);
  const [allFineReasons, setAllFineReasons] = useState<FineReason[]>(INIT_FINE_REASONS);
  const [allFines, setAllFines] = useState<FineRecord[]>(INIT_FINES);

  const currentOrgId = session?.currentOrgId ?? 0;
  const currentOrg = orgs.find(o => o.id === currentOrgId);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = (userId: number, orgId: number) => {
    const user = users.find(u => u.id === userId);
    if (user) setSession({ user, currentOrgId: orgId });
  };

  const logout = () => setSession(null);

  const switchOrg = (orgId: number) => {
    if (!session) return;
    setSession(s => s ? { ...s, currentOrgId: orgId } : s);
  };

  // ── Permissions ──────────────────────────────────────────────────────────
  const getUserPermissions = (user: AppUser): Set<Permission> => {
    const perms = new Set<Permission>();
    user.roleIds.forEach(rid => {
      const role = roles.find(r => r.id === rid);
      role?.permissions.forEach(p => perms.add(p));
    });
    return perms;
  };

  const can = (p: Permission): boolean => {
    if (!session) return false;
    return getUserPermissions(session.user).has(p);
  };

  const isSuperAdmin = () => {
    if (!session) return false;
    return session.user.roleIds.some(rid => roles.find(r => r.id === rid)?.permissions.includes("holding:view"));
  };

  // ── Orgs CRUD ────────────────────────────────────────────────────────────
  const addOrg = (d: Omit<Organization, "id" | "holdingId">) =>
    setOrgs(prev => [...prev, { id: maxId(prev) + 1, holdingId: holding.id, ...d }]);
  const editOrg = (id: number, d: Omit<Organization, "id" | "holdingId">) =>
    setOrgs(prev => prev.map(o => o.id === id ? { id, holdingId: holding.id, ...d } : o));
  const deleteOrg = (id: number) =>
    setOrgs(prev => prev.filter(o => o.id !== id));

  // ── Roles CRUD ───────────────────────────────────────────────────────────
  const addRole = (d: Omit<Role, "id">) =>
    setRoles(prev => [...prev, { id: maxId(prev) + 1, ...d }]);
  const editRole = (id: number, d: Omit<Role, "id">) =>
    setRoles(prev => prev.map(r => r.id === id ? { id, ...d } : r));
  const deleteRole = (id: number) =>
    setRoles(prev => prev.filter(r => r.id !== id));

  // ── Users CRUD ───────────────────────────────────────────────────────────
  const addUser = (d: Omit<AppUser, "id" | "holdingId" | "lastLogin">) =>
    setUsers(prev => [...prev, { id: maxId(prev) + 1, holdingId: holding.id, lastLogin: new Date().toISOString().slice(0, 10), ...d }]);
  const editUser = (id: number, d: Partial<AppUser>) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...d } : u));
  const deleteUser = (id: number) =>
    setUsers(prev => prev.filter(u => u.id !== id));

  // ── Scoped domain data ───────────────────────────────────────────────────
  const locations = allLocations.filter(l => l.orgId === currentOrgId);
  const employees = allEmployees.filter(e => e.orgId === currentOrgId);
  const posts = allPosts.filter(p => p.orgId === currentOrgId);
  const fineReasons = allFineReasons.filter(r => r.orgId === currentOrgId);
  const fines = allFines.filter(f => f.orgId === currentOrgId);

  const addLocation = (d: Omit<Location, "id" | "orgId">) =>
    setAllLocations(prev => [...prev, { id: maxId(prev) + 1, orgId: currentOrgId, ...d }]);
  const editLocation = (id: number, d: Omit<Location, "id" | "orgId">) =>
    setAllLocations(prev => prev.map(l => l.id === id ? { id, orgId: currentOrgId, ...d } : l));
  const deleteLocation = (id: number) =>
    setAllLocations(prev => prev.filter(l => l.id !== id));

  const addEmployee = (d: Omit<Employee, "id" | "orgId">) =>
    setAllEmployees(prev => [...prev, { id: maxId(prev) + 1, orgId: currentOrgId, ...d }]);
  const editEmployee = (id: number, d: Omit<Employee, "id" | "orgId">) =>
    setAllEmployees(prev => prev.map(e => e.id === id ? { id, orgId: currentOrgId, ...d } : e));
  const deleteEmployee = (id: number) =>
    setAllEmployees(prev => prev.filter(e => e.id !== id));

  const assignPost = (
    postId: number,
    officerId: number | null,
    fine: Omit<FineRecord, "id" | "date" | "postId" | "orgId"> | null
  ) => {
    setAllPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const status: Post["status"] = officerId !== null ? "covered" : "vacant";
      return { ...p, officerId, status };
    }));
    if (fine) {
      const today = new Date().toISOString().slice(0, 10);
      setAllFines(prev => [...prev, { id: maxId(prev) + 1, orgId: currentOrgId, date: today, postId, ...fine }]);
    }
  };

  const setFineReasons = (reasons: FineReason[]) =>
    setAllFineReasons(prev => [...prev.filter(r => r.orgId !== currentOrgId), ...reasons]);

  const value: AppContextValue = {
    session, login, logout, switchOrg, can, isSuperAdmin,
    holding, orgs, addOrg, editOrg, deleteOrg, currentOrg,
    roles, addRole, editRole, deleteRole,
    users, addUser, editUser, deleteUser,
    locations, addLocation, editLocation, deleteLocation,
    employees, addEmployee, editEmployee, deleteEmployee,
    posts, assignPost,
    fineReasons, setFineReasons,
    fines,
    allLocations, allEmployees, allPosts, allFines,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}