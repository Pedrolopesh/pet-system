"use client";

import type { PublicShop, TutorAppointment, TutorMe } from "@petsystem/contracts";
import { brl, LABELS } from "@petsystem/contracts";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, Skeletons } from "@/components/ui";
import { brDate } from "@/lib/clinic";
import { friendly } from "@/lib/messages";
import { useToast } from "@/lib/toast";
import { publicApi, tutorApi, tutorToken } from "@/lib/tutor";
import { PortalFrame } from "./PortalFrame";
import { TutorLogin } from "./TutorLogin";

const WHEN = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const SPECIES_ICON = { cao: "🐶", gato: "🐱", outro: "🐾" } as const;

export function TutorArea() {
  const slug = (useSearchParams().get("loja") ?? "").toLowerCase();
  const toast = useToast();
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [me, setMe] = useState<TutorMe | null>(null);
  const [state, setState] = useState<"loading" | "login" | "ready">(() => (tutorToken.get(slug) ? "loading" : "login"));
  const [failure, setFailure] = useState("");
  const [tab, setTab] = useState<"proximos" | "pets" | "historico">("proximos");
  const [newPet, setNewPet] = useState<{ name: string; species: "cao" | "gato" | "outro"; breed: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setMe(await tutorApi.me(slug));
      setState("ready");
    } catch {
      setState("login");
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    publicApi.shop(slug).then(setShop, (e) => setFailure(friendly(e)));
    if (!tutorToken.get(slug)) return;
    tutorApi.me(slug).then(
      (data) => {
        setMe(data);
        setState("ready");
      },
      () => setState("login"),
    );
  }, [slug]);

  async function cancel(a: TutorAppointment) {
    try {
      setMe(await tutorApi.cancel(slug, a.id));
      toast("Agendamento cancelado.");
    } catch (e) {
      toast(friendly(e), "error");
    }
  }
  async function addPet(e: FormEvent) {
    e.preventDefault();
    if (!newPet) return;
    try {
      setMe(await tutorApi.addPet(slug, newPet));
      setNewPet(null);
      toast("Pet cadastrado.");
    } catch (err) {
      toast(friendly(err), "error");
    }
  }

  if (!slug) return <PortalFrame slug=""><EmptyState icon="search" title="Loja não informada" text="Use o link que a loja enviou." /></PortalFrame>;
  if (failure) return <PortalFrame slug={slug}><EmptyState icon="calendar" title="Portal indisponível" text={failure} /></PortalFrame>;
  if (!shop || state === "loading") return <PortalFrame slug={slug} shopName={shop?.name}><Skeletons count={3} height={120} /></PortalFrame>;
  if (state === "login" || !me)
    return (
      <PortalFrame slug={slug} shopName={shop.name}>
        <div className="tutor-entry">
          <h1>Sua área em {shop.name}</h1>
          <p className="muted">Veja e cancele agendamentos, acompanhe as vacinas e cadastre seus pets.</p>
          <TutorLogin slug={slug} isDemo={shop.isDemo} onDone={() => void load()} />
        </div>
      </PortalFrame>
    );

  const row = (a: TutorAppointment, actions: boolean) => (
    <li key={a.id} className={`tutor-appt st-${a.status}`}>
      <div>
        <strong>{a.service} · {a.pet.name}</strong>
        <small>{WHEN.format(new Date(a.startsAt))}{a.professional ? ` · com ${a.professional}` : ""} · {brl(a.price)}</small>
      </div>
      <span className="badge gray">{LABELS.status[a.status]}</span>
      {actions && (a.cancellable ? (
        <button className="btn sm quiet danger-text" onClick={() => cancel(a)}>Cancelar</button>
      ) : (
        <small className="muted">Para cancelar, fale com a loja</small>
      ))}
    </li>
  );

  return (
    <PortalFrame slug={slug} shopName={shop.name}>
      <section className="tutor-home">
        <header className="tutor-hello rise">
          <div>
            <h1>Olá, {me.client.name.split(" ")[0]}!</h1>
            <p className="muted">{me.pets.map((p) => p.name).join(", ")} {me.pets.length === 1 ? "está" : "estão"} em boas mãos.</p>
          </div>
          <div className="row-center">
            <Link className="btn" href={`/agendar/?loja=${slug}`}><Icon name="calendar" size={16} /> Novo agendamento</Link>
            <button className="btn quiet" onClick={() => (tutorToken.clear(slug), setMe(null), setState("login"))}><Icon name="logout" size={16} /> Sair</button>
          </div>
        </header>
        <div className="segmented" role="tablist" aria-label="Seções">
          {([["proximos", `Próximos (${me.upcoming.length})`], ["pets", "Pets e vacinas"], ["historico", "Histórico"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === "proximos" && (
          <section className="card panel">
            {me.upcoming.length ? <ul className="tutor-list">{me.upcoming.map((a) => row(a, true))}</ul> : (
              <EmptyState icon="calendar" title="Nada agendado" text="Que tal marcar o próximo banho ou consulta?">
                <Link className="btn sm" href={`/agendar/?loja=${slug}`}>Agendar</Link>
              </EmptyState>
            )}
            <p className="muted small">Cancelamentos pelo portal até {shop.cancelNoticeHours} horas antes do horário.</p>
          </section>
        )}

        {tab === "pets" && (
          <div className="tutor-pets">
            {me.pets.map((p) => (
              <article key={p.id} className="card panel">
                <header><h3><span aria-hidden="true">{SPECIES_ICON[p.species]}</span> {p.name}</h3><span className="muted small">{p.breed || LABELS.species[p.species]}</span></header>
                {p.vaccines.length ? (
                  <ul className="tutor-vaccines">
                    {p.vaccines.map((v) => (
                      <li key={v.vaccine}>
                        <span><strong>{v.vaccine}</strong><small className="muted">Aplicada em {brDate(v.appliedAt)}</small></span>
                        {v.nextDoseAt ? (
                          <span className={`badge ${v.overdue ? "danger" : "ok"}`}>{v.overdue ? "Reforço vencido" : "Reforço"} {brDate(v.nextDoseAt)}</span>
                        ) : <span className="badge gray">sem reforço</span>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted small">Nenhuma vacina registrada pela loja.</p>}
              </article>
            ))}
            {newPet ? (
              <form className="card panel form" onSubmit={addPet}>
                <h3>Novo pet</h3>
                <div className="form-grid">
                  <label className="field"><span>Nome</span><input className="input" required maxLength={40} value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })} /></label>
                  <label className="field"><span>Espécie</span>
                    <select className="select" value={newPet.species} onChange={(e) => setNewPet({ ...newPet, species: e.target.value as "cao" | "gato" | "outro" })}>
                      <option value="cao">Cão</option><option value="gato">Gato</option><option value="outro">Outro</option>
                    </select>
                  </label>
                </div>
                <label className="field"><span>Raça (opcional)</span><input className="input" maxLength={40} value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })} /></label>
                <div className="form-actions"><button type="button" className="btn quiet" onClick={() => setNewPet(null)}>Cancelar</button><button className="btn">Salvar</button></div>
              </form>
            ) : (
              <button className="btn ghost add-pet" onClick={() => setNewPet({ name: "", species: "cao", breed: "" })}><Icon name="plus" size={16} /> Cadastrar outro pet</button>
            )}
          </div>
        )}

        {tab === "historico" && (
          <section className="card panel">
            {me.past.length ? <ul className="tutor-list">{me.past.map((a) => row(a, false))}</ul> : <EmptyState icon="receipt" title="Sem histórico ainda" />}
          </section>
        )}
      </section>
    </PortalFrame>
  );
}
