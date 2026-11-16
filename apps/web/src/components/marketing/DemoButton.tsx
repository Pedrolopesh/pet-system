"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { authApi } from "@/lib/api";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";

/** Entra na loja de demonstração (sem cadastro). */
export function DemoButton({ label = "Testar a demonstração", className = "btn lg" }: { label?: string; className?: string }) {
  const router = useRouter();
  const { me, start } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (me) return router.push("/app/");
    setBusy(true);
    try {
      start(await authApi.demo());
      router.push("/app/");
    } catch (e) {
      toast(friendly(e), "error");
      setBusy(false);
    }
  }
  return (
    <button className={className} disabled={busy} onClick={go}>
      {busy ? "Abrindo a loja..." : label} <Icon name="arrow" size={18} />
    </button>
  );
}
