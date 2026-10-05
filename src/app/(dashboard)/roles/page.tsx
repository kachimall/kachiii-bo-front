import type { Metadata } from "next";
import { RolesList } from "./roles-list";

export const metadata: Metadata = { title: "Roles" };

export default function RolesPage() {
  return <RolesList />;
}
