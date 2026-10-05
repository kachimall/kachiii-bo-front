import type { Metadata } from "next";
import { RoleDetail } from "./role-detail";

export const metadata: Metadata = { title: "Role" };

export default async function RolePage({ params }: PageProps<"/roles/[id]">) {
  const { id } = await params;
  return <RoleDetail id={id} />;
}
