"use client";

import { LABELS, type UserRole } from "@petsystem/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authApi } from "@/lib/api";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";

/** Aceite de convite: o token vem na URL (?t=...) e nunca é guardado. */
export function InviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { start } = useSession();
  const token = params.get("t") ?? "";
  const [preview, setPreview] = useState<{ shopName: string; role: string } | null>(null);
  const [failure, setFailure] = useState("");
  const invalid = token ? failure : "Link de convite incompleto.";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi.invitePreview(token).then(setPreview, (e) => setFailure(friendly(e)));
  }, [token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      start(await authApi.acceptInvite({ token, ...form }));
      router.replace("/app/");
    } catch (err) {
      setError(friendly(err));
      setBusy(false);
    }
  }

  if (invalid)
    return (
      <>
        <h1>Convite indisponível</h1>
        <p className="muted">{invalid}</p>
        <Link className="btn ghost" href="/entrar/">Ir para o login</Link>
      </>
    );
  if (!preview) return <div className="skeleton" style={{ height: 240 }} />;
  return (
    <>
      <h1>Entrar na equipe</h1>
      <p className="muted">
        Você foi convidado para <strong>{preview.shopName}</strong> como{" "}
        <strong>{LABELS.userRole[preview.role as UserRole] ?? preview.role}</strong>. Crie seu acesso:
      </p>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Seu nome</span>
          <input className="input" required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field"><span>E-mail</span>
          <input className="input" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field"><span>Senha</span>
          <input className="input" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <small className="muted">Pelo menos 8 caracteres.</small>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn lg" disabled={busy}>{busy ? "Aguarde..." : "Criar acesso e entrar"}</button>
      </form>
    </>
  );
}
