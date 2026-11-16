"use client";

import type { Appointment, Client, Employee, Product } from "@petsystem/contracts";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { agendaApi } from "@/lib/api";
import { hhmm, localIso, minutesOf } from "@/lib/dates";
import { brl } from "@/lib/format";
import { friendly } from "@/lib/messages";

export type Draft = { day: string; minute: number; employeeId: string | null };

/** Novo agendamento: tutor → pet → serviço → profissional → horário. */
export function AppointmentForm({
  draft,
  clients,
  services,
  employees,
  opensAt,
  closesAt,
  onClose,
  onSaved,
}: {
  draft: Draft | null;
  clients: Client[];
  services: Product[];
  employees: Employee[];
  opensAt: string;
  closesAt: string;
  onClose: () => void;
  onSaved: (a: Appointment) => void;
}) {
  return (
    <Modal open={draft !== null} title="Novo agendamento" onClose={onClose} wide>
      {draft && (
        <Form
          key={`${draft.day}-${draft.minute}-${draft.employeeId}`}
          draft={draft}
          clients={clients}
          services={services}
          employees={employees}
          opensAt={opensAt}
          closesAt={closesAt}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function Form({
  draft,
  clients,
  services,
  employees,
  opensAt,
  closesAt,
  onSaved,
}: {
  draft: Draft;
  clients: Client[];
  services: Product[];
  employees: Employee[];
  opensAt: string;
  closesAt: string;
  onSaved: (a: Appointment) => void;
}) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState(draft.employeeId ?? "");
  const [day, setDay] = useState(draft.day);
  const [time, setTime] = useState(hhmm(draft.minute));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const client = clients.find((c) => c.id === clientId);
  const service = services.find((s) => s.id === serviceId);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 6);
    return clients
      .filter((c) => c.name.toLowerCase().includes(q) || c.pets.some((p) => p.name.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [clients, query]);

  function pickClient(c: Client) {
    setClientId(c.id);
    setPetId(c.pets.length === 1 ? c.pets[0]!.id : "");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!client) return setError("Escolha o tutor.");
    if (!petId) return setError("Escolha o pet.");
    if (!service) return setError("Escolha o serviço.");
    setBusy(true);
    try {
      const created = await agendaApi.create({
        clientId,
        petId,
        serviceId,
        employeeId: employeeId || null,
        startsAt: localIso(day, minutesOf(time)),
        notes,
      });
      onSaved(created);
    } catch (err) {
      setError(friendly(err));
      setBusy(false);
    }
  }

  return (
    <form id="appointment-form" className="form-grid" onSubmit={submit}>
      <div className="field full">
        <span>Tutor ou pet</span>
        {client ? (
          <div className="picked">
            <strong>{client.name}</strong>
            <button type="button" className="btn sm quiet" onClick={() => (setClientId(""), setPetId(""))}>Trocar</button>
          </div>
        ) : (
          <>
            <input className="input" autoFocus placeholder="Busque pelo nome do tutor ou do pet" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="client-options">
              {matches.map((c) => (
                <button type="button" key={c.id} className="option" onClick={() => pickClient(c)}>
                  <strong>{c.name}</strong>
                  <small>{c.pets.map((p) => p.name).join(", ") || "sem pets"}</small>
                </button>
              ))}
              {!matches.length && (
                <p className="muted small">
                  Ninguém encontrado. <Link href="/app/clientes/?novo=1">Cadastrar cliente</Link>
                </p>
              )}
            </div>
          </>
        )}
      </div>
      {client && (
        <div className="field full">
          <span>Pet</span>
          {client.pets.length ? (
            <div className="chips">
              {client.pets.map((p) => (
                <button type="button" key={p.id} className="chip" aria-pressed={petId === p.id} onClick={() => setPetId(p.id)}>
                  {p.name}{p.breed ? ` · ${p.breed}` : ""}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">Este tutor ainda não tem pets. Cadastre o pet na tela de clientes.</p>
          )}
        </div>
      )}
      <label className="field full"><span>Serviço</span>
        <select className="select" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name} · {s.durationMinutes ?? 60} min · {brl(s.price)}</option>
          ))}
        </select>
      </label>
      <label className="field"><span>Profissional</span>
        <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Sem profissional definido</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>
      <div className="form-grid two-inline">
        <label className="field"><span>Dia</span><input className="input" type="date" required value={day} onChange={(e) => setDay(e.target.value)} /></label>
        <label className="field"><span>Horário</span><input className="input" type="time" required step={300} min={opensAt} max={closesAt} value={time} onChange={(e) => setTime(e.target.value)} /></label>
      </div>
      <label className="field full"><span>Observações</span>
        <textarea className="input" rows={2} maxLength={500} placeholder="Ex.: tosa bebê, alergia a frango" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && <p className="error full" role="alert">{error}</p>}
      <div className="full form-actions">
        <button className="btn" disabled={busy}>{busy ? "Agendando..." : "Agendar"}</button>
      </div>
    </form>
  );
}
