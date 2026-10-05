import { api, apiList, apiWithMeta, type Query } from "@/lib/api/client";
import type { SectionGrants, SectionInfo, Staff, StaffRole } from "@/types/api";

export const listStaff = (
  query: Query & { role?: string; status?: string; q?: string; page?: number; per_page?: number },
) => apiList<Staff>("/admin/staff", query);
export const getStaff = (id: string) => api<Staff>(`/admin/staff/${id}`);
export const createStaff = (body: { name: string; email: string; role: string }) =>
  api<Staff>("/admin/staff", { method: "POST", body });
/** The email is fixed once the account exists. */
export const updateStaff = (id: string, body: { name?: string; role?: string }) =>
  api<Staff>(`/admin/staff/${id}`, { method: "PATCH", body });
export const setStaffStatus = (id: string, status: "active" | "suspended") =>
  api<Staff>(`/admin/staff/${id}/status`, { method: "PUT", body: { status } });
export const sendStaffPasswordReset = (id: string) => api<null>(`/admin/staff/${id}/password-reset`, { method: "POST" });
export const resetStaffTwoFactor = (id: string) => api<Staff>(`/admin/staff/${id}/two-factor`, { method: "DELETE" });

// Roles: not paginated; meta.sections describes the access matrix.
export const listRoles = () => apiWithMeta<StaffRole[], { sections: SectionInfo[] }>("/admin/roles");
export const getRole = (id: string) => api<StaffRole>(`/admin/roles/${id}`);
export const createRole = (body: { name: string; sections: SectionGrants }) =>
  api<StaffRole>("/admin/roles", { method: "POST", body });
export const updateRole = (id: string, body: { name?: string; sections?: SectionGrants }) =>
  api<StaffRole>(`/admin/roles/${id}`, { method: "PATCH", body });
export const deleteRole = (id: string) => api<null>(`/admin/roles/${id}`, { method: "DELETE" });
