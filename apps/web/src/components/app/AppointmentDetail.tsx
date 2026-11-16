"use client";

import type { Appointment, AppointmentStatus, Employee } from "@petsystem/contracts";
import { FINAL_STATUSES, LABELS, NEXT_STATUS } from "@petsystem/contracts";
import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { agendaApi } from "@/lib/api";
import { hhmm, localIso, minuteOfDay, minutesOf, toDay } from "@/lib/dates";
import { brl, phone } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";

const STEP_ICON: Partial<Record<AppointmentStatus, IconName>> = {
  confirmado: "check",
  em_atendimento: "scissors",
  pronto: "bell",
  concluido: "check",
};
const TIME = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Detalhe do atendimento: avança o status, remarca e manda para o caixa. */
export function AppointmentDetail({
  appointment,
  employees,
  onClose,
  onChanged,
}: {
  appointment: Appointment | null;
  employees: Employee[];
  onClose: () => void;
  onChanged: (a: Appointment) => void;
}) {
  const { me } = useSession();
  const clinic = me?.shop.businessTypes.includes("clinica") ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const [draft, setDraft] = useState({ day: "", time: "", employeeId: "" });
  const a = appointment;

  async function setStatus(status: AppointmentStatus) {
    if (!a) return;
    setBusy(true);
    setError("");
    try {
      onChanged(await agendaApi.setStatus(a.id, status));
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  function startMove() {
    if (!a) return;
    setDraft({ day: toDay(new Date(a.startsAt)), time: hhmm(minuteOfDay(a.startsAt)), employeeId: a.employee?.id ?? "" });
    setMoving(true);
  }

  async function saveMove() {
    if (!a) return;
    setBusy(true);
    setError("");
    try {
      onChanged(
        await agendaApi.update(a.id, { startsAt: localIso(draft.day, minutesOf(draft.time)), employeeId: draft.employeeId || null }),
      );
      setMoving(false);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  const final = a ? FINAL_STATUSES.includes(a.status) : true;
  const forward = a ? NEXT_STATUS[a.status].filter((s) => s !== "cancelado" && s !== "faltou") : [];
  const close = () => {
    setMoving(false);
    setError("");
    onClose();
  };

  return (
    <Modal open={a !== null} title={a ? `${a.pet.name} · ${a.service.name}` : ""} onClose={close}>
      {a && (
        <div className="appt-detail">
          <div className={`status-pill st-${a.status}`}>{LABELS.status[a.status]}</div>
          <dl>
            <div><dt>Quando</dt><dd>{TIME.format(new Date(a.startsAt))} até {hhmm(minuteOfDay(a.endsAt))}</dd></div>
            <div><dt>Profissional</dt><dd>{a.employee?.name ?? "Sem profissional"}</dd></div>
            <div><dt>Tutor</dt><dd>{a.client.name}{a.client.phone ? ` · ${phone(a.client.phone)}` : ""}</dd></div>
            <div><dt>Pet</dt><dd>{a.pet.name}{a.pet.breed ? ` · ${a.pet.breed}` : ""}</dd></div>
            <div><dt>Valor</dt><dd className="num">{brl(a.price)}</dd></div>
            {a.notes && <div className="full"><dt>Observações</dt><dd>{a.notes}</dd></div>}
          </dl>

          {!final && !moving && (
            <div className="flow">
              {forward.map((s) => (
                <button key={s} className="btn" disabled={busy} onClick={() => setStatus(s)}>
                  {STEP_ICON[s] && <Icon name={STEP_ICON[s]!} size={16} />} {s === "concluido" ? "Concluir sem cobrar" : LABELS.status[s]}
                </button>
              ))}
            </div>
          )}

          {moving && (
            <div className="form-grid move">
              <label className="field"><span>Dia</span><input className="input" type="date" value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })} /></label>
              <label className="field"><span>Horário</span><input className="input" type="time" step={300} value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label>
              <label className="field full"><span>Profissional</span>
                <select className="select" value={draft.employeeId} onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}>
                  <option value="">Sem profissional definido</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </label>
              <div className="full form-actions">
                <button className="btn quiet" onClick={() => setMoving(false)}>Voltar</button>
                <button className="btn" disabled={busy} onClick={saveMove}>Salvar novo horário</button>
              </div>
            </div>
          )}
          {error && <p className="error" role="alert">{error}</p>}

          <div className="detail-actions">
            {clinic && a.employee && a.status !== "cancelado" && (
              <Link className="btn ghost" href={`/app/clinica/pet/?id=${a.pet.id}&atendimento=${a.id}`}><Icon name="stethoscope" size={16} /> Prontuário</Link>
            )}
            {!a.saleId && a.status !== "cancelado" && a.status !== "faltou" && (
              <Link className="btn ghost" href={`/app/vender/?atendimento=${a.id}`}><Icon name="cart" size={16} /> Cobrar no caixa</Link>
            )}
            {a.saleId && <span className="badge ok"><Icon name="check" size={14} /> Cobrado</span>}
            {!final && !moving && (
              <>
                <button className="btn quiet" onClick={startMove}><Icon name="clock" size={16} /> Remarcar</button>
                {NEXT_STATUS[a.status].includes("faltou") && <button className="btn quiet" disabled={busy} onClick={() => setStatus("faltou")}>Faltou</button>}
                <button className="btn quiet danger-text" disabled={busy} onClick={() => setStatus("cancelado")}>Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
