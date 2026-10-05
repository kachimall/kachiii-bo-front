import type { Metadata } from "next";
import { SettingsPage as Settings } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <Settings />;
}
