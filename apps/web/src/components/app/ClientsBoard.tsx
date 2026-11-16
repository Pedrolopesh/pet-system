"use client";

import type { Client, ClientDetail, Pet, Sale } from "@petsystem/contracts";
import { LABELS, SPECIES } from "@petsystem/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { Avatar, EmptyState, Skeletons } from "@/components/ui";
import { clientsApi, salesApi } from "@/lib/api";
import { brl, phone, shortDate, when } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";

const SPECIES_ICON: Record<Pet["species"], string> = { cao: "🐶", gato: "🐱", outro: "🐾" };
type PetForm = { id?: string; key: string; name: string; species: Pet["species"]; breed: string };
const newPet = (): PetForm => ({ key: Math.random().toString(36).slice(2), name: "", species: "cao", breed: "" });

export function ClientsBoard() {
  const toast = useToast();
  const { me } = useSession();
  const clinic = me?.shop.businessTypes.includes("clinica") ?? false;
  const params = useSearchParams();
  const router = useRouter();
  const [list, setList] = useState<Client[] | null>(null);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [history, setHistory] = useState<Sale[]>([]);
  // Atalho "cadastrar cliente" (vindo da agenda) já abre o formulário.
  const [formOpen, setFormOpen] = useState(() => params.get("novo") === "1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", pets: [newPet()] });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback((term: string) => clientsApi.list(term).then(setList, (e) => toast(friendly(e), "error")), [toast]);
  // Busca no servidor (nome, telefone ou nome do pet) com uma pequena espera ao digitar.
  useEffect(() => {
    const t = setTimeout(() => void load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  async function openDetail(c: Client) {
    setDetail({ ...c, stats: { purchases: 0, spent: 0, lastPurchaseAt: null } });
    setHistory([]);
    setConfirmDelete(false);
    try {
      const [d, s] = await Promise.all([clientsApi.get(c.id), salesApi.list({ clientId: c.id, days: 366, pageSize: 10 })]);
      setDetail(d);
      setHistory(s.items);
    } catch (e) {
      toast(friendly(e), "error");
    }
  }

  const openForm = useCallback((c?: Client) => {
    setEditingId(c?.id ?? null);
    setForm({
      name: c?.name ?? "",
      phone: c ? phone(c.phone) : "",
      email: c?.email ?? "",
      notes: c?.notes ?? "",
      pets: c ? c.pets.map((p) => ({ ...p, key: p.id })) : [newPet()],
    });
    setFormError("");
    setDetail(null);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (params.get("novo") === "1") router.replace("/app/clientes/");
  }, [params, router]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = { ...form, pets: form.pets.filter((p) => p.name.trim()).map(({ id, name, species, breed }) => ({ id, name, species, breed })) };
    try {
      if (editingId) {
        const updated = await clientsApi.update(editingId, body);
        setList((all) => all?.map((c) => (c.id === updated.id ? updated : c)) ?? null);
        toast("Cliente atualizado.");
      } else {
        const created = await clientsApi.create(body);
        setList((all) => [created, ...(all ?? [])]);
        toast("Cliente cadastrado.");
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(friendly(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: ClientDetail) {
    try {
      await clientsApi.remove(c.id);
      setList((all) => all?.filter((x) => x.id !== c.id) ?? null);
      setDetail(null);
      toast("Cliente apagado.");
    } catch (e) {
      toast(friendly(e), "error");
    }
  }

  const setPet = (key: string, patch: Partial<PetForm>) =>
    setForm((f) => ({ ...f, pets: f.pets.map((p) => (p.key === key ? { ...p, ...patch } : p)) }));

  return (
    <div className="stack-page">
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input className="input" type="search" placeholder="Buscar por nome, telefone ou pet" aria-label="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn" onClick={() => openForm()}><Icon name="plus" size={18} /> Novo cliente</button>
      </div>

      {!list ? (
        <div className="client-cards"><Skeletons count={6} height={120} /></div>
      ) : list.length ? (
        <div className="client-cards">
          {list.map((c, i) => (
            <button key={c.id} className="client card rise" style={{ "--i": Math.min(i, 12) } as CSSProperties} onClick={() => openDetail(c)}>
              <div className="head">
                <Avatar name={c.name} size={42} />
                <div><strong>{c.name}</strong><small className="muted">{c.phone ? phone(c.phone) : "sem telefone"}</small></div>
              </div>
              <div className="pets">
                {c.pets.map((p) => <span key={p.id} className="pet"><span aria-hidden="true">{SPECIES_ICON[p.species]}</span> {p.name}</span>)}
                {!c.pets.length && <span className="muted small">Sem pets cadastrados</span>}
              </div>
            </button>
          ))}
        </div>
      ) : q ? (
        <EmptyState icon="search" title="Ninguém encontrado" text={`Nenhum cliente ou pet com “${q}”.`} />
      ) : (
        <EmptyState icon="paw" title="Nenhum cliente ainda" text="Cadastre o tutor e os pets para agendar e ver o histórico de cada um.">
          <button className="btn sm" onClick={() => openForm()}>Cadastrar cliente</button>
        </EmptyState>
      )}

      <Modal
        open={detail !== null}
        title={detail?.name ?? ""}
        wide
        onClose={() => setDetail(null)}
        footer={
          detail &&
          (confirmDelete ? (
            <>
              <span className="muted small grow">Apagar {detail.name} e os pets? As vendas ficam no histórico, sem o nome.</span>
              <button className="btn quiet" onClick={() => setConfirmDelete(false)}>Voltar</button>
              <button className="btn danger" onClick={() => remove(detail)}>Apagar</button>
            </>
          ) : (
            <>
              <button className="btn quiet" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={16} /> Apagar</button>
              <button className="btn" onClick={() => openForm(detail)}><Icon name="edit" size={16} /> Editar</button>
            </>
          ))
        }
      >
        {detail && (
          <div className="client-detail">
            <div className="kpis">
              <div><small>Compras</small><strong className="num">{detail.stats.purchases}</strong></div>
              <div><small>Total gasto</small><strong className="num">{brl(detail.stats.spent)}</strong></div>
              <div><small>Última compra</small><strong>{detail.stats.lastPurchaseAt ? shortDate(detail.stats.lastPurchaseAt) : "—"}</strong></div>
            </div>
            <p className="info">{detail.phone ? phone(detail.phone) : "Sem telefone"} · {detail.email || "sem e-mail"}</p>
            {detail.notes && <p className="muted">{detail.notes}</p>}
            <h3>Pets</h3>
            <div className="pet-cards">
              {detail.pets.map((p) => (
                <div key={p.id} className="pet-card">
                  <span className="emoji" aria-hidden="true">{SPECIES_ICON[p.species]}</span>
                  <div><strong>{p.name}</strong><small className="muted">{LABELS.species[p.species]}{p.breed ? ` · ${p.breed}` : ""}</small></div>
                  {clinic && <Link className="btn sm ghost" href={`/app/clinica/pet/?id=${p.id}`}>Ficha clínica</Link>}
                </div>
              ))}
              {!detail.pets.length && <p className="muted">Nenhum pet cadastrado.</p>}
            </div>
            <h3>Últimas compras</h3>
            {history.length ? (
              <ul className="hist">
                {history.map((s) => (
                  <li key={s.id}>
                    <span>#{s.number} · {when(s.at)}</span>
                    <span className="muted items">{s.items.map((i) => i.name).join(", ")}</span>
                    <strong className="num">{brl(s.total)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhuma compra registrada.</p>
            )}
          </div>
        )}
      </Modal>

      <Modal open={formOpen} title={editingId ? "Editar cliente" : "Novo cliente"} wide onClose={() => setFormOpen(false)} footer={<button className="btn" form="client-form" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>}>
        <form id="client-form" className="form-grid" onSubmit={save}>
          <label className="field full"><span>Nome do tutor</span><input className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>Telefone (com DDD)</span><input className="input" inputMode="tel" placeholder="(48) 99999-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="field"><span>E-mail</span><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field full"><span>Observações</span><textarea className="input" rows={2} maxLength={500} placeholder="Ex.: Thor tem alergia a frango" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <fieldset className="full pets-form">
            <legend>Pets</legend>
            {form.pets.map((p, i) => (
              <div key={p.key} className="pet-row">
                <input className="input" placeholder="Nome" maxLength={40} aria-label={`Nome do pet ${i + 1}`} value={p.name} onChange={(e) => setPet(p.key, { name: e.target.value })} />
                <select className="select" aria-label={`Espécie do pet ${i + 1}`} value={p.species} onChange={(e) => setPet(p.key, { species: e.target.value as Pet["species"] })}>
                  {SPECIES.map((s) => <option key={s} value={s}>{LABELS.species[s]}</option>)}
                </select>
                <input className="input" placeholder="Raça" maxLength={40} aria-label={`Raça do pet ${i + 1}`} value={p.breed} onChange={(e) => setPet(p.key, { breed: e.target.value })} />
                <button type="button" className="icon-btn" aria-label={`Remover pet ${i + 1}`} onClick={() => setForm({ ...form, pets: form.pets.filter((x) => x.key !== p.key) })}><Icon name="trash" size={16} /></button>
              </div>
            ))}
            <button type="button" className="btn ghost sm" onClick={() => setForm({ ...form, pets: [...form.pets, newPet()] })}><Icon name="plus" size={16} /> Adicionar pet</button>
          </fieldset>
          {formError && <p className="error full" role="alert">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
}
