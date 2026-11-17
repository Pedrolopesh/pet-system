"use client";

import { BUSINESS_TYPES, type BusinessType, LABELS } from "@petsystem/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { authApi } from "@/lib/api";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";

const TYPE_ICON: Record<BusinessType, IconName> = { petshop: "scissors", creche: "home2", clinica: "stethoscope" };

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { me, start, restore } = useSession();
  const presetType = params.get("tipo");
  const [mode, setMode] = useState<"login" | "signup">(params.get("criar") ? "signup" : "login");
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    shopName: "",
    name: "",
    email: "",
    password: "",
    withSampleData: true,
    businessTypes: (BUSINESS_TYPES as readonly string[]).includes(presetType ?? "")
      ? [presetType as BusinessType]
      : (["petshop"] as BusinessType[]),
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => {
    const target = params.get("next");
    router.replace(target?.startsWith("/app") ? target : "/app/");
  };

  // Já logado: vai direto para o sistema.
  useEffect(() => {
    void restore().then((ok) => ok && router.replace("/app/"));
  }, [restore, router]);
  useEffect(() => {
    if (me) router.replace("/app/");
  }, [me, router]);

  function toggleType(t: BusinessType) {
    const has = form.businessTypes.includes(t);
    if (has && form.businessTypes.length === 1) return;
    set("businessTypes", has ? form.businessTypes.filter((x) => x !== t) : [...form.businessTypes, t]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("form");
    try {
      const res =
        mode === "login" ? await authApi.login({ email: form.email, password: form.password }) : await authApi.signup(form);
      start(res);
      next();
    } catch (err) {
      setError(friendly(err));
      setBusy(null);
    }
  }

  async function demo() {
    setError("");
    setBusy("demo");
    try {
      start(await authApi.demo());
      next();
    } catch (err) {
      setError(friendly(err));
      setBusy(null);
    }
  }

  return (
    <>
      <h1>{mode === "login" ? "Entrar no Pet System" : "Criar minha conta"}</h1>
      <p className="muted">
        {mode === "login" ? "Use o e-mail e a senha do cadastro." : "14 dias grátis com tudo liberado. Sem cartão."}
      </p>
      {params.get("expirou") && <p className="badge warn">Sua sessão expirou. Entre de novo.</p>}

      <div className="tabs" role="tablist" aria-label="Entrar ou criar conta">
        <button role="tab" aria-selected={mode === "login"} onClick={() => (setMode("login"), setError(""))}>Entrar</button>
        <button role="tab" aria-selected={mode === "signup"} onClick={() => (setMode("signup"), setError(""))}>Criar conta</button>
        <span className={`pill ${mode}`} />
      </div>

      <form className="form" onSubmit={submit}>
        {mode === "signup" && (
          <div className="extra">
            <fieldset className="types">
              <legend>O que o seu negócio faz?</legend>
              {BUSINESS_TYPES.map((t) => (
                <label key={t} className={`type${form.businessTypes.includes(t) ? " on" : ""}`}>
                  <input type="checkbox" checked={form.businessTypes.includes(t)} onChange={() => toggleType(t)} />
                  <Icon name={TYPE_ICON[t]} size={20} />
                  <span>{LABELS.business[t]}</span>
                </label>
              ))}
            </fieldset>
            <label className="field"><span>Nome do negócio</span>
              <input className="input" required maxLength={80} autoComplete="organization" value={form.shopName} onChange={(e) => set("shopName", e.target.value)} />
            </label>
            <label className="field"><span>Seu nome</span>
              <input className="input" required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </label>
          </div>
        )}
        <label className="field"><span>E-mail</span>
          <input className="input" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            className="input"
            type="password"
            required
            minLength={mode === "signup" ? 8 : 1}
            maxLength={128}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
          {mode === "signup" && <small className="muted">Pelo menos 8 caracteres.</small>}
        </label>
        {mode === "signup" && (
          <label className="check-row small">
            <input type="checkbox" checked={form.withSampleData} onChange={(e) => set("withSampleData", e.target.checked)} />
            Começar com serviços, clientes e agenda de exemplo
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn lg" disabled={busy !== null}>
          {busy === "form" ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta e começar"}
        </button>
      </form>

      <div className="divider"><span>ou</span></div>
      <button className="btn lg ghost demo" disabled={busy !== null} onClick={demo}>
        <Icon name="sparkle" size={18} /> {busy === "demo" ? "Abrindo a demonstração..." : "Entrar na loja de demonstração"}
      </button>
    </>
  );
}
