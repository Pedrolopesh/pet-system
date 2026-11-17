import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { InviteForm } from "@/components/auth/InviteForm";

export const metadata: Metadata = { title: "Convite para a equipe", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell>
      <Suspense>
        <InviteForm />
      </Suspense>
    </AuthShell>
  );
}
