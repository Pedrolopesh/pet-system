import type { Metadata } from "next";
import { SegmentPage } from "@/components/marketing/SegmentPage";
import { SEGMENTS } from "@/lib/segments";

const segment = SEGMENTS.find((s) => s.slug === "creche")!;
export const metadata: Metadata = { title: "Sistema para creche e hotel de cães", description: segment.lead };
export default function Page() {
  return <SegmentPage segment={segment} />;
}
