"use client";

import type { Account, BusinessType, InviteLink } from "@petsystem/contracts";
import { BUSINESS_TYPES, brl, LABELS, PLAN_INFO, PLAN_LIMITS } from "@petsystem/contracts";
import { BookingSettingsCard } from "@/components/app/BookingSettingsCard";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { Avatar, Skeletons } from "@/components/ui";
import { accountApi } from "@/lib/api";
import { when } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";

export default function SettingsPage() {
  const { me, can, reload } = useSession();
  const toast = useToast();
  const owner = can("manageAccount");
  const manager = can("manageShop");
  const [account, setAccount] = useState<Account | null>(null);
  const [shop, setShop] = useState({ name: "", opensAt: "08:00", closesAt: "19:00", businessTypes: [] as BusinessType[] });
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState<InviteLink | null>(null);
  const [inviteRole, setInviteRole] = useState<"gerente" | "atendente">("atendente");
  const [now] = useState(() => Date.now());

  const load = useCallback(() => {
    accountApi.get().then((a) => {
      setAccount(a);
      setShop({ name: a.shop.name, opensAt: a.shop.opensAt, closesAt: a.shop.closesAt, businessTypes: a.shop.businessTypes });
    }, (e) => toast(friendly(e), "error"));
  }, [toast]);
  useEffect(load, [load]);

  async function saveShop(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await accountApi.updateShop(shop);
      await reload();
      toast("Dados da loja salvos.");
    } catch (err) {
      toast(friendly(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function choosePlan(plan: "basico" | "pro") {
    try {
      await accountApi.changePlan(plan);
      await reload();
      load();
      toast(`Plano ${PLAN_INFO[plan].name} ativado.`);
    } catch (err) {
      toast(friendly(err), "error");
    }
  }

  async function createInvite() {
    try {
      setLink(await accountApi.invite(inviteRole));
      load();
    } catch (err) {
      toast(friendly(err), "error");
    }
  }

  const inviteUrl = link ? `${window.location.origin}/convite/?t=${link.token}` : "";
  async function copy() {
    await navigator.clipboard.writeText(inviteUrl);
    toast("Link copiado. Envie para a pessoa pelo WhatsApp ou e-mail.");
  }

  async function act(fn: () => Promise<void>, done: string) {
    try {
      await fn();
      load();
      toast(done);
    } catch (err) {
      toast(friendly(err), "error");
    }
  }

  if (!account || !me) return <div className="settings"><Skeletons count={3} height={200} /></div>;
  const plan = account.shop.plan;
  const trialDays = plan === "teste" && account.shop.trialEndsAt ? Math.ceil((new Date(account.shop.trialEndsAt).getTime() - now) / 86_400_000) : null;
  const toggleType = (t: BusinessType) =>
    setShop((s) => ({
      ...s,
      businessTypes: s.businessTypes.includes(t) ? (s.businessTypes.length > 1 ? s.businessTypes.filter((x) => x !== t) : s.businessTypes) : [...s.businessTypes, t],
    }));

  return (
    <div className="settings">
      <section className="card panel rise">
        <header><h3>Sua loja</h3></header>
        <form className="form-grid" onSubmit={saveShop}>
          <label className="field full"><span>Nome</span><input className="input" required maxLength={80} disabled={!manager} value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} /></label>
          <div className="field full">
            <span>Tipos de negócio</span>
            <div className="chips">
              {BUSINESS_TYPES.map((t) => (
                <button key={t} type="button" className="chip" disabled={!manager} aria-pressed={shop.businessTypes.includes(t)} onClick={() => toggleType(t)}>{LABELS.business[t]}</button>
              ))}
            </div>
          </div>
          <label className="field"><span>Abre às</span><input className="input" type="time" disabled={!manager} value={shop.opensAt} onChange={(e) => setShop({ ...shop, opensAt: e.target.value })} /></label>
          <label className="field"><span>Fecha às</span><input className="input" type="time" disabled={!manager} value={shop.closesAt} onChange={(e) => setShop({ ...shop, closesAt: e.target.value })} /></label>
          {manager && <div className="full form-actions"><button className="btn" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button></div>}
        </form>
      </section>

      <BookingSettingsCard shop={account.shop} canEdit={manager && !me.shop.isDemo} onSaved={async () => (await reload(), load())} />

      <section className="card panel rise" id="plano">
        <header>
          <h3>Plano</h3>
          <span className={`badge ${plan === "teste" ? "warn" : "ok"}`}>
            {me.shop.isDemo
              ? "Demonstração: tudo liberado"
              : plan === "teste"
                ? trialDays === null || trialDays > 0
                  ? `Teste grátis${trialDays ? `: ${trialDays} dias` : ""}`
                  : "Teste encerrado"
                : `Plano ${PLAN_INFO[plan].name}`}
          </span>
        </header>
        <p className="muted small">
          Em uso: {account.usage.users} {account.usage.users === 1 ? "usuário" : "usuários"} e {account.usage.professionals} profissionais ativos.
          {me.shop.isDemo && " Na demonstração, a troca de plano fica desligada."}
        </p>
        <div className="plan-options">
          {(["basico", "pro"] as const).map((key) => {
            const info = PLAN_INFO[key];
            const limits = PLAN_LIMITS[key];
            return (
              <div key={key} className={`plan-option${plan === key ? " current" : ""}`}>
                <div className="plan-top"><strong>{info.name}</strong><span className="num">{brl(info.price)}/mês</span></div>
                <ul>{info.highlights.map((h) => <li key={h}><Icon name="check" size={16} /> {h}</li>)}</ul>
                <small className="muted">{limits.users === null ? "Usuários ilimitados" : `Até ${limits.users} usuários`} · {limits.professionals === null ? "profissionais ilimitados" : `até ${limits.professionals} profissionais`}</small>
                {owner && plan !== key && !me.shop.isDemo && <button className={`btn sm${key === "pro" ? "" : " ghost"}`} onClick={() => choosePlan(key)}>Escolher {info.name}</button>}
                {plan === key && <span className="badge ok">Plano atual</span>}
              </div>
            );
          })}
        </div>
        <p className="muted small">A cobrança ainda não está ativa: nesta fase, a escolha de plano é liberada sem pagamento.</p>
      </section>

      <section className="card panel rise">
        <header><h3>Pessoas com acesso</h3></header>
        <ul className="members">
          {account.members.map((m) => (
            <li key={m.id}>
              <Avatar name={m.name} size={36} />
              <div className="who">
                <strong>{m.name}{m.id === me.user.id && <small className="muted"> (você)</small>}</strong>
                <small className="muted">{m.email} · {m.lastLoginAt ? `último acesso ${when(m.lastLoginAt)}` : "ainda não entrou"}</small>
              </div>
              {owner && m.role !== "dono" ? (
                <>
                  <select className="select sm" aria-label={`Papel de ${m.name}`} value={m.role} onChange={(e) => act(() => accountApi.changeRole(m.id, e.target.value as "gerente" | "atendente"), "Papel atualizado.")}>
                    <option value="gerente">Gerente</option>
                    <option value="atendente">Atendente</option>
                  </select>
                  <button className="icon-btn" aria-label={`Remover ${m.name}`} onClick={() => act(() => accountApi.removeMember(m.id), `${m.name} não tem mais acesso.`)}><Icon name="trash" size={16} /></button>
                </>
              ) : (
                <span className="badge gray">{LABELS.userRole[m.role]}</span>
              )}
            </li>
          ))}
        </ul>
        {owner && !me.shop.isDemo && (
          <div className="invite">
            <h4>Convidar alguém</h4>
            <p className="muted small">Gerentes cadastram produtos e equipe e veem relatórios. Atendentes vendem e cuidam da agenda e dos clientes.</p>
            <div className="invite-row">
              <div className="segmented" role="group" aria-label="Papel do convite">
                <button type="button" aria-pressed={inviteRole === "atendente"} onClick={() => setInviteRole("atendente")}>Atendente</button>
                <button type="button" aria-pressed={inviteRole === "gerente"} onClick={() => setInviteRole("gerente")}>Gerente</button>
              </div>
              <button className="btn" onClick={createInvite}><Icon name="link" size={16} /> Gerar link de convite</button>
            </div>
            {link && (
              <div className="invite-link rise">
                <input className="input" readOnly value={inviteUrl} aria-label="Link do convite" onFocus={(e) => e.target.select()} />
                <button className="btn ghost" onClick={copy}><Icon name="copy" size={16} /> Copiar</button>
                <small className="muted">Vale por 7 dias e para uma pessoa só.</small>
              </div>
            )}
            {account.invites.length > 0 && (
              <ul className="pending">
                {account.invites.map((i) => (
                  <li key={i.id}>
                    <span>Convite de {LABELS.userRole[i.role].toLowerCase()} · vence {when(i.expiresAt)}</span>
                    <button className="btn sm quiet" onClick={() => act(() => accountApi.revokeInvite(i.id), "Convite cancelado.")}>Cancelar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
