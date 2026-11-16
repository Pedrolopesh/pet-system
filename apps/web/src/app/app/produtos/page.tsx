"use client";

import { Suspense } from "react";
import { ProductsBoard } from "@/components/app/ProductsBoard";

export default function Page() {
  return (
    <Suspense>
      <ProductsBoard />
    </Suspense>
  );
}
