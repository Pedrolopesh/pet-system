import type { Metadata } from "next";
import { Suspense } from "react";
import { TutorArea } from "@/components/portal/TutorArea";

export const metadata: Metadata = { title: "Área do tutor", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <TutorArea />
    </Suspense>
  );
}
