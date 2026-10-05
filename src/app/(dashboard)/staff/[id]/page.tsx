import type { Metadata } from "next";
import { StaffDetail } from "./staff-detail";

export const metadata: Metadata = { title: "Staff member" };

export default async function StaffMemberPage({ params }: PageProps<"/staff/[id]">) {
  const { id } = await params;
  return <StaffDetail id={id} />;
}
