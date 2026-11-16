"use client";

import { Suspense } from "react";
import { PetFile } from "@/components/clinic/PetFile";

export default function Page() {
  return (
    <Suspense>
      <PetFile />
    </Suspense>
  );
}
