"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { friendly } from "@/lib/messages";
import { publicApi, tutorApi, tutorToken } from "@/lib/tutor";

/**
 * Entrada do tutor sem senha: e-mail → código de 6 dígitos → (se for novo) nome, telefone e o pet.
 * Na loja de demonstração há um atalho para entrar como um tutor de exemplo.
 */
export function TutorLogin({ slug, isDemo, onDone }: { slug: string; isDemo: boolean; onDone: () => void }) {
  const [step, setStep] = useState<"email" | "code" | "profile">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [profile, setProfile] = useState({ name: "", phone: "", pet: { name: "", species: "cao" as "cao" | "gato" | "outro", breed: "" } });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault();
    void run(async () => {
      await publicApi.requestCode(slug, email);
      setStep("code");
    });
  };
  const verify = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const session = await publicApi.verify(slug, email, code);
      tutorToken.set(slug, session.token);
      if (session.registered) onDone();
      else setStep("profile");
    });
  };
  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const session = await tutorApi.profile(slug, profile);
      tutorToken.set(slug, session.token);
      onDone();
    });
  };
  const demo = () =>
    void run(async () => {
      tutorToken.set(slug, (await publicApi.demo(slug)).token);
      onDone();
    });

  return (
    <div className="tutor-login card">
      {step === "email" && (
        <form onSubmit={sendCode} className="form">
          <h3>Entre com seu e-mail</h3>
          <p className="muted small">Enviamos um código de 6 dígitos. Sem senha para lembrar.</p>
          <label className="field"><span>E-mail</span><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn lg" disabled={busy}>{busy ? "Enviando..." : "Receber código"}</button>
          {isDemo && (
            <button type="button" className="btn ghost" disabled={busy} onClick={demo}>
              <Icon name="sparkle" size={16} /> Entrar como tutor de exemplo
            </button>
          )}
        </form>
      )}
      {step === "code" && (
        <form onSubmit={verify} className="form">
          <h3>Digite o código</h3>
          <p className="muted small">Enviamos para <strong>{email}</strong>. Ele vale por 10 minutos.</p>
          <label className="field"><span>Código</span>
            <input className="input code-input" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn lg" disabled={busy || code.length !== 6}>{busy ? "Conferindo..." : "Entrar"}</button>
          <div className="row-between">
            <button type="button" className="btn sm quiet" onClick={() => (setStep("email"), setCode(""))}>Trocar e-mail</button>
            <button type="button" className="btn sm quiet" disabled={busy} onClick={() => sendCode()}>Reenviar código</button>
          </div>
        </form>
      )}
      {step === "profile" && (
        <form onSubmit={saveProfile} className="form">
          <h3>Primeira vez por aqui?</h3>
          <p className="muted small">Só o básico para a loja te conhecer e saber quem é o seu pet.</p>
          <label className="field"><span>Seu nome</span><input className="input" required maxLength={80} autoComplete="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
          <label className="field"><span>Telefone com DDD</span><input className="input" required inputMode="tel" autoComplete="tel" placeholder="(48) 99999-0000" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
          <div className="form-grid">
            <label className="field"><span>Nome do pet</span><input className="input" required maxLength={40} value={profile.pet.name} onChange={(e) => setProfile({ ...profile, pet: { ...profile.pet, name: e.target.value } })} /></label>
            <label className="field"><span>Espécie</span>
              <select className="select" value={profile.pet.species} onChange={(e) => setProfile({ ...profile, pet: { ...profile.pet, species: e.target.value as "cao" | "gato" | "outro" } })}>
                <option value="cao">Cão</option><option value="gato">Gato</option><option value="outro">Outro</option>
              </select>
            </label>
          </div>
          <label className="field"><span>Raça (opcional)</span><input className="input" maxLength={40} value={profile.pet.breed} onChange={(e) => setProfile({ ...profile, pet: { ...profile.pet, breed: e.target.value } })} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn lg" disabled={busy}>{busy ? "Salvando..." : "Continuar"}</button>
        </form>
      )}
    </div>
  );
}
