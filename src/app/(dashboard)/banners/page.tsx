import type { Metadata } from "next";
import { BannersList } from "./banners-list";

export const metadata: Metadata = { title: "Banners" };

export default function BannersPage() {
  return <BannersList />;
}
