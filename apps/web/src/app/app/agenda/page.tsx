"use client";

import { Suspense } from "react";
import { AgendaBoard } from "@/components/app/AgendaBoard";

export default function Page() {
  return (
    <Suspense>
      <AgendaBoard />
    </Suspense>
  );
}
