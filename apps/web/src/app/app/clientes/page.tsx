"use client";

import { Suspense } from "react";
import { ClientsBoard } from "@/components/app/ClientsBoard";

export default function Page() {
  return (
    <Suspense>
      <ClientsBoard />
    </Suspense>
  );
}
