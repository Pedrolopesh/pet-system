"use client";

import { Suspense } from "react";
import { PosBoard } from "@/components/app/PosBoard";

export default function Page() {
  return (
    <Suspense>
      <PosBoard />
    </Suspense>
  );
}
