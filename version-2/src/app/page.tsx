import type { Metadata } from "next";
import SiteV2 from "@/v2/SiteV2";

// Variant 2: the community story (apartment community aerial, the technician and the Ora van, the flat
// mark, the Ora Academy).
export const metadata: Metadata = {
  title: "Ora — Home maintenance, done properly",
};

export default function Home() {
  return <SiteV2 />;
}
