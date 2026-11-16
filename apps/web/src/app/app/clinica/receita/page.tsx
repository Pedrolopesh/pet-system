"use client";

import { Suspense } from "react";
import { Prescription } from "@/components/clinic/Prescription";

export default function Page() {
  return (
    <Suspense>
      <Prescription />
    </Suspense>
  );
}
