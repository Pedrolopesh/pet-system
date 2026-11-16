import type { Metadata } from "next";
import { SegmentPage } from "@/components/marketing/SegmentPage";
import { SEGMENTS } from "@/lib/segments";

const segment = SEGMENTS.find((s) => s.slug === "pet-shop")!;
export const metadata: Metadata = { title: "Sistema para pet shop e banho e tosa", description: segment.lead };
export default function Page() {
  return <SegmentPage segment={segment} />;
}
