"use client";

import type { Appointment, Client, DueVaccine } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, Skeletons } from "@/components/ui";
import { agendaApi, clientsApi, clinicApi, employeesApi } from "@/lib/api";
import { brDate, reminderLink } from "@/lib/clinic";
import { hhmm, minuteOfDay, toDay } from "@/lib/dates";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";

const SPECIES_ICON = { cao: "🐶", gato: "🐱", outro: "🐾" } as const;

export default function ClinicPage() {
  const { me } = useSession();
  const toast = useToast();
  const [due, setDue] = useState<DueVaccine[] | null>(null);
  const [today, setToday] = useState<Appointment[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [days, setDays] = useState(30);

  useEffect(() => {
    Promise.all([employeesApi.list(), agendaApi.list(toDay(new Date())), clientsApi.list()]).then(([team, list, c]) => {
      const vets = new Set(team.filter((e) => e.role === "veterinario").map((e) => e.id));
      setToday(list.filter((a) => a.employee && vets.has(a.employee.id) && a.status !== "cancelado"));
      setClients(c);
    }, (e) => toast(friendly(e), "error"));
  }, [toast]);

  useEffect(() => {
    clinicApi.due(days).then(setDue, (e) => toast(friendly(e), "error"));
  }, [days, toast]);

  const pets = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return clients
      .flatMap((c) => c.pets.map((p) => ({ ...p, client: c })))
      .filter((p) => p.name.toLowerCase().includes(term) || p.client.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [clients, q]);

  const overdue = due?.filter((d) => d.overdue) ?? [];
  const upcoming = due?.filter((d) => !d.overdue) ?? [];

  const dueRow = (d: DueVaccine) => {
    const link = reminderLink(d, me?.shop.name ?? "clínica");
    return (
      <li key={d.id}>
        <Link href={`/app/clinica/pet/?id=${d.pet.id}`} className="due-main">
          <span className="emoji" aria-hidden="true">{SPECIES_ICON[d.pet.species]}</span>
          <span>
            <strong>{d.pet.name} <small className="muted">· {d.client.name}</small></strong>
            <small>{d.vaccine} · {d.overdue ? "venceu" : "vence"} em {brDate(d.nextDoseAt)}</small>
          </span>
        </Link>
        {link ? (
          <a className="btn sm ghost wa" href={link} target="_blank" rel="noopener noreferrer"><Icon name="bell" size={14} /> Lembrar</a>
        ) : (
          <span className="muted small">sem telefone</span>
        )}
      </li>
    );
  };

  return (
    <div className="clinic">
      <div className="clinic-grid">
        <section className="card panel rise">
          <header><h3>Atendimentos clínicos de hoje</h3><Link className="btn sm quiet" href="/app/agenda/">Agenda</Link></header>
          {!today ? (
            <Skeletons count={3} height={56} />
          ) : today.length ? (
            <ul className="clinic-today">
              {today.map((a) => (
                <li key={a.id} className={`st-${a.status}`}>
                  <span className="time num">{hhmm(minuteOfDay(a.startsAt))}</span>
                  <div>
                    <strong>{a.pet.name} <small className="muted">· {a.client.name}</small></strong>
                    <small>{a.service.name} · {LABELS.status[a.status]}</small>
                  </div>
                  <Link className="btn sm" href={`/app/clinica/pet/?id=${a.pet.id}&atendimento=${a.id}`}>
                    <Icon name="stethoscope" size={14} /> Prontuário
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="stethoscope" title="Nenhuma consulta hoje" text="As consultas e vacinas da agenda dos veterinários aparecem aqui." />
          )}
        </section>

        <section className="card panel rise" style={{ ["--i" as string]: 1 }}>
          <header><h3>Abrir ficha de um pet</h3></header>
          <div className="search">
            <Icon name="search" size={18} />
            <input className="input" placeholder="Nome do pet ou do tutor" aria-label="Buscar pet" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {q && (
            <ul className="pet-results">
              {pets.map((p) => (
                <li key={p.id}>
                  <Link href={`/app/clinica/pet/?id=${p.id}`}>
                    <span className="emoji" aria-hidden="true">{SPECIES_ICON[p.species]}</span>
                    <span><strong>{p.name}</strong><small className="muted">{p.breed || LABELS.species[p.species]} · {p.client.name}</small></span>
                  </Link>
                </li>
              ))}
              {!pets.length && <li className="muted small">Nenhum pet encontrado.</li>}
            </ul>
          )}
        </section>
      </div>

      <section className="card panel rise" style={{ ["--i" as string]: 2 }}>
        <header>
          <div>
            <h3>Reforços de vacina</h3>
            <p className="muted small">O botão Lembrar abre o WhatsApp com a mensagem pronta para o tutor.</p>
          </div>
          <div className="segmented" role="group" aria-label="Janela">
            {[15, 30, 60].map((d) => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{d} dias</button>)}
          </div>
        </header>
        {!due ? (
          <Skeletons count={4} height={52} />
        ) : due.length ? (
          <div className="due-cols">
            <div>
              <h4 className="due-title overdue"><Icon name="alert" size={16} /> Vencidas ({overdue.length})</h4>
              {overdue.length ? <ul className="due-list">{overdue.map(dueRow)}</ul> : <p className="muted small">Nenhuma vacina vencida.</p>}
            </div>
            <div>
              <h4 className="due-title"><Icon name="calendar" size={16} /> Vencem em até {days} dias ({upcoming.length})</h4>
              {upcoming.length ? <ul className="due-list">{upcoming.map(dueRow)}</ul> : <p className="muted small">Nada vencendo nesse período.</p>}
            </div>
          </div>
        ) : (
          <EmptyState icon="check" title="Vacinas em dia" text="Nenhum reforço vencido ou vencendo nesse período." />
        )}
      </section>
    </div>
  );
}
