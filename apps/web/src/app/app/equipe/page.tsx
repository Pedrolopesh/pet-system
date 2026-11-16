"use client";

import type { Employee } from "@petsystem/contracts";
import { LABELS, ROLES } from "@petsystem/contracts";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { Avatar, EmptyState, Skeletons } from "@/components/ui";
import { employeesApi } from "@/lib/api";
import { brl } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";

export default function TeamPage() {
  const toast = useToast();
  const { can } = useSession();
  const manage = can("manageShop");
  const [list, setList] = useState<Employee[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", role: "atendente" as Employee["role"], active: true });
  const [error, setError] = useState("");

  useEffect(() => {
    employeesApi.list().then(setList, (e) => toast(friendly(e), "error"));
  }, [toast]);

  const ranked = [...(list ?? [])].sort((a, b) => Number(b.active) - Number(a.active) || b.revenueThisMonth - a.revenueThisMonth);
  const top = Math.max(1, ...(list ?? []).map((e) => e.revenueThisMonth));
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());

  function openForm(e?: Employee) {
    setEditing(e ?? null);
    setForm({ name: e?.name ?? "", role: e?.role ?? "atendente", active: e?.active ?? true });
    setError("");
    setFormOpen(true);
  }
  async function save(ev: FormEvent) {
    ev.preventDefault();
    try {
      if (editing) {
        const updated = await employeesApi.update(editing.id, form);
        setList((all) => all?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
      } else {
        const created = await employeesApi.create(form);
        setList((all) => [...(all ?? []), created]);
      }
      toast("Equipe atualizada.");
      setFormOpen(false);
    } catch (err) {
      setError(friendly(err));
    }
  }

  return (
    <div className="stack-page">
      <div className="toolbar">
        <p className="muted">Profissionais que atendem e vendem. Ranking de {month}. Quem está inativo não aparece no caixa nem na agenda.</p>
        {manage && <button className="btn" onClick={() => openForm()}><Icon name="plus" size={18} /> Adicionar profissional</button>}
      </div>
      <p className="muted small">
        Para dar acesso ao sistema a alguém, envie um convite em <Link href="/app/configuracoes/">Configurações</Link>.
      </p>
      {!list ? (
        <div className="team-grid"><Skeletons count={4} height={150} /></div>
      ) : list.length ? (
        <div className="team-grid">
          {ranked.map((e, i) => (
            <article key={e.id} className={`member card rise${e.active ? "" : " off"}`} style={{ "--i": i } as CSSProperties}>
              {i === 0 && e.active && e.revenueThisMonth > 0 && <span className="crown" title="Mais vendas no mês">🏆</span>}
              <div className="head">
                <Avatar name={e.name} size={46} />
                <div>
                  <strong>{e.name}</strong>
                  <span className={`badge${e.active ? "" : " gray"}`}>{LABELS.role[e.role]}{e.active ? "" : " · inativo"}</span>
                </div>
                {manage && <button className="icon-btn" aria-label={`Editar ${e.name}`} onClick={() => openForm(e)}><Icon name="edit" size={18} /></button>}
              </div>
              <div className="nums">
                <div><small>Vendas</small><strong className="num">{e.salesThisMonth}</strong></div>
                <div><small>Receita</small><strong className="num">{brl(e.revenueThisMonth)}</strong></div>
              </div>
              <div className="meter" aria-hidden="true"><span style={{ "--w": e.revenueThisMonth / top } as CSSProperties} /></div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon="badge" title="Ninguém na equipe" text="Cadastre quem atende para registrar vendas e montar a agenda.">
          {manage && <button className="btn sm" onClick={() => openForm()}>Adicionar profissional</button>}
        </EmptyState>
      )}
      <Modal open={formOpen} title={editing ? "Editar profissional" : "Novo profissional"} onClose={() => setFormOpen(false)} footer={<button className="btn" form="emp-form">Salvar</button>}>
        <form id="emp-form" className="form-grid" onSubmit={save}>
          <label className="field full"><span>Nome</span><input className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>Função</span>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Employee["role"] })}>
              {ROLES.map((r) => <option key={r} value={r}>{LABELS.role[r]}</option>)}
            </select>
          </label>
          <label className="check-row field-end"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo (aparece no caixa e na agenda)</label>
          {error && <p className="error full">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
