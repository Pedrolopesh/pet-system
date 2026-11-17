import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "@/components/portal/BookingFlow";

export const metadata: Metadata = { title: "Agendar online", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <BookingFlow />
    </Suspense>
  );
}
