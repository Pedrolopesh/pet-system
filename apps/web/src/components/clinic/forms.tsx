"use client";

import type { ClinicalPet, Employee, MedicalRecord, PrescriptionItem, RecordKind } from "@petsystem/contracts";
import { LABELS, PET_SEX, RECORD_KINDS, VACCINES } from "@petsystem/contracts";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { clinicApi } from "@/lib/api";
import { parseDecimal } from "@/lib/clinic";
import { addDays, toDay } from "@/lib/dates";
import { friendly } from "@/lib/messages";

export type RecordDraft = {
  record?: MedicalRecord;
  appointmentId: string | null;
  kind: RecordKind;
  vetId: string | null;
  title?: string;
};

type Rx = PrescriptionItem & { key: string };
let seq = 0;
const nextKey = () => `rx-${seq++}`;
const newRx = (): Rx => ({ key: nextKey(), medication: "", dosage: "", frequency: "", duration: "", instructions: "" });

/** Registro do prontuário (novo ou correção). */
export function RecordForm({
  draft,
  petId,
  vets,
  onClose,
  onSaved,
}: {
  draft: RecordDraft | null;
  petId: string;
  vets: Employee[];
  onClose: () => void;
  onSaved: (r: MedicalRecord, wasNew: boolean) => void;
}) {
  return (
    <Modal
      open={draft !== null}
      title={draft?.record ? "Corrigir registro" : draft?.title ? `Atendimento: ${draft.title}` : "Novo atendimento"}
      wide
      onClose={onClose}
      footer={<button className="btn" form="record-form">Salvar no prontuário</button>}
    >
      {draft && <RecordFields key={draft.record?.id ?? "novo"} draft={draft} petId={petId} vets={vets} onSaved={onSaved} />}
    </Modal>
  );
}

function RecordFields({ draft, petId, vets, onSaved }: { draft: RecordDraft; petId: string; vets: Employee[]; onSaved: (r: MedicalRecord, wasNew: boolean) => void }) {
  const r = draft.record;
  const [kind, setKind] = useState<RecordKind>(draft.kind);
  const [vetId, setVetId] = useState(draft.vetId ?? "");
  const [weight, setWeight] = useState(r?.weightKg?.toString().replace(".", ",") ?? "");
  const [temp, setTemp] = useState(r?.temperatureC?.toString().replace(".", ",") ?? "");
  const [text, setText] = useState({ complaint: r?.complaint ?? "", exam: r?.exam ?? "", diagnosis: r?.diagnosis ?? "", treatment: r?.treatment ?? "" });
  const [rx, setRx] = useState<Rx[]>(() => r?.prescription.map((p) => ({ ...p, key: nextKey() })) ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const weightKg = parseDecimal(weight);
    const temperatureC = parseDecimal(temp);
    if (Number.isNaN(weightKg) || Number.isNaN(temperatureC)) return setError("Peso e temperatura com números, ex.: 12,5 e 38,6.");
    setBusy(true);
    setError("");
    const body = {
      kind,
      vetId: vetId || null,
      appointmentId: draft.appointmentId,
      weightKg,
      temperatureC,
      ...text,
      prescription: rx.filter((p) => p.medication.trim()).map(({ key: _key, ...p }) => p),
    };
    try {
      const saved = r ? await clinicApi.updateRecord(r.id, body) : await clinicApi.createRecord(petId, body);
      onSaved(saved, !r);
    } catch (err) {
      setError(friendly(err));
      setBusy(false);
    }
  }
  const setT = (k: keyof typeof text, v: string) => setText((t) => ({ ...t, [k]: v }));
  const setItem = (key: string, patch: Partial<Rx>) => setRx((all) => all.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  return (
    <form id="record-form" className="form-grid record-form" onSubmit={submit}>
      <div className="field full">
        <span>Tipo</span>
        <div className="chips">
          {RECORD_KINDS.map((k) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{LABELS.recordKind[k]}</button>)}
        </div>
      </div>
      <label className="field"><span>Veterinário(a)</span>
        <select className="select" value={vetId} onChange={(e) => setVetId(e.target.value)}>
          <option value="">Não informado</option>
          {vets.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </label>
      <div className="form-grid two-inline">
        <label className="field"><span>Peso (kg)</span><input className="input" inputMode="decimal" placeholder="12,5" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
        <label className="field"><span>Temperatura (°C)</span><input className="input" inputMode="decimal" placeholder="38,6" value={temp} onChange={(e) => setTemp(e.target.value)} /></label>
      </div>
      <label className="field full"><span>Queixa principal</span><textarea className="input" rows={2} maxLength={2000} value={text.complaint} onChange={(e) => setT("complaint", e.target.value)} /></label>
      <label className="field full"><span>Exame clínico</span><textarea className="input" rows={3} maxLength={4000} value={text.exam} onChange={(e) => setT("exam", e.target.value)} /></label>
      <label className="field full"><span>Diagnóstico</span><textarea className="input" rows={2} maxLength={2000} value={text.diagnosis} onChange={(e) => setT("diagnosis", e.target.value)} /></label>
      <label className="field full"><span>Conduta e orientações</span><textarea className="input" rows={3} maxLength={4000} value={text.treatment} onChange={(e) => setT("treatment", e.target.value)} /></label>
      <fieldset className="full rx-form">
        <legend>Receita</legend>
        {rx.map((p, i) => (
          <div key={p.key} className="rx-row">
            <input className="input" placeholder="Medicamento" maxLength={120} aria-label={`Medicamento ${i + 1}`} value={p.medication} onChange={(e) => setItem(p.key, { medication: e.target.value })} />
            <input className="input" placeholder="Dose" maxLength={120} aria-label={`Dose ${i + 1}`} value={p.dosage} onChange={(e) => setItem(p.key, { dosage: e.target.value })} />
            <input className="input" placeholder="Frequência" maxLength={120} aria-label={`Frequência ${i + 1}`} value={p.frequency} onChange={(e) => setItem(p.key, { frequency: e.target.value })} />
            <input className="input" placeholder="Duração" maxLength={120} aria-label={`Duração ${i + 1}`} value={p.duration} onChange={(e) => setItem(p.key, { duration: e.target.value })} />
            <input className="input wide" placeholder="Instruções (opcional)" maxLength={500} aria-label={`Instruções ${i + 1}`} value={p.instructions} onChange={(e) => setItem(p.key, { instructions: e.target.value })} />
            <button type="button" className="icon-btn" aria-label={`Remover item ${i + 1}`} onClick={() => setRx((all) => all.filter((x) => x.key !== p.key))}><Icon name="trash" size={16} /></button>
          </div>
        ))}
        <button type="button" className="btn ghost sm" onClick={() => setRx((all) => [...all, newRx()])}><Icon name="plus" size={16} /> Adicionar medicamento</button>
      </fieldset>
      <p className="muted small full">O registro pode ser corrigido nas primeiras 24 horas. Depois disso fica fechado, como um prontuário em papel.</p>
      {error && <p className="error full" role="alert">{error}</p>}
      {busy && <p className="muted small full">Salvando...</p>}
    </form>
  );
}

/** Vacina aplicada; o reforço é sugerido pelo tipo de vacina e pode ser ajustado. */
export function VaccineForm({ open, pet, vets, onClose, onSaved }: { open: boolean; pet: ClinicalPet; vets: Employee[]; onClose: () => void; onSaved: () => void }) {
  return (
    <Modal open={open} title={`Registrar vacina · ${pet.name}`} onClose={onClose} footer={<button className="btn" form="vaccine-form">Registrar</button>}>
      {open && <VaccineFields pet={pet} vets={vets} onSaved={onSaved} />}
    </Modal>
  );
}

function VaccineFields({ pet, vets, onSaved }: { pet: ClinicalPet; vets: Employee[]; onSaved: () => void }) {
  const options = VACCINES.filter((v) => v.species === "ambos" || v.species === pet.species);
  const today = toDay(new Date());
  const [vaccine, setVaccine] = useState(options[0]?.name ?? "");
  const [custom, setCustom] = useState("");
  const [appliedAt, setAppliedAt] = useState(today);
  const [nextDoseAt, setNextDoseAt] = useState(addDays(today, options[0]?.boosterDays ?? 365));
  const [batch, setBatch] = useState("");
  const [vetId, setVetId] = useState(vets[0]?.id ?? "");
  const [error, setError] = useState("");

  function pick(name: string, applied = appliedAt) {
    setVaccine(name);
    const days = VACCINES.find((v) => v.name === name)?.boosterDays;
    if (days) setNextDoseAt(addDays(applied, days));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const name = vaccine === "__outra" ? custom.trim() : vaccine;
    if (!name) return setError("Informe a vacina.");
    try {
      await clinicApi.addVaccination(pet.id, { vaccine: name, appliedAt, nextDoseAt: nextDoseAt || null, batch, vetId: vetId || null });
      onSaved();
    } catch (err) {
      setError(friendly(err));
    }
  }

  return (
    <form id="vaccine-form" className="form-grid" onSubmit={submit}>
      <label className="field full"><span>Vacina</span>
        <select className="select" value={vaccine} onChange={(e) => pick(e.target.value)}>
          {options.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
          <option value="__outra">Outra</option>
        </select>
      </label>
      {vaccine === "__outra" && <label className="field full"><span>Nome da vacina</span><input className="input" required maxLength={80} value={custom} onChange={(e) => setCustom(e.target.value)} /></label>}
      <label className="field"><span>Aplicada em</span><input className="input" type="date" required value={appliedAt} onChange={(e) => (setAppliedAt(e.target.value), pick(vaccine, e.target.value))} /></label>
      <label className="field"><span>Próximo reforço</span><input className="input" type="date" value={nextDoseAt} onChange={(e) => setNextDoseAt(e.target.value)} /></label>
      <label className="field"><span>Lote</span><input className="input" maxLength={40} value={batch} onChange={(e) => setBatch(e.target.value)} /></label>
      <label className="field"><span>Veterinário(a)</span>
        <select className="select" value={vetId} onChange={(e) => setVetId(e.target.value)}>
          <option value="">Não informado</option>
          {vets.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </label>
      <p className="muted small full">O reforço é uma sugestão de 1 ano. Ajuste conforme o protocolo da clínica e a idade do animal.</p>
      {error && <p className="error full" role="alert">{error}</p>}
    </form>
  );
}

export function HealthForm({ open, pet, onClose, onSaved }: { open: boolean; pet: ClinicalPet; onClose: () => void; onSaved: () => void }) {
  return (
    <Modal open={open} title={`Ficha de saúde · ${pet.name}`} onClose={onClose} footer={<button className="btn" form="health-form">Salvar</button>}>
      {open && <HealthFields pet={pet} onSaved={onSaved} />}
    </Modal>
  );
}

function HealthFields({ pet, onSaved }: { pet: ClinicalPet; onSaved: () => void }) {
  const [birthDate, setBirthDate] = useState(pet.birthDate ?? "");
  const [sex, setSex] = useState(pet.sex ?? "");
  const [neutered, setNeutered] = useState(pet.neutered === null ? "" : pet.neutered ? "sim" : "nao");
  const [allergies, setAllergies] = useState(pet.allergies);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await clinicApi.updateHealth(pet.id, {
        birthDate: birthDate || null,
        sex: (sex || null) as ClinicalPet["sex"],
        neutered: neutered === "" ? null : neutered === "sim",
        allergies,
      });
      onSaved();
    } catch (err) {
      setError(friendly(err));
    }
  }

  return (
    <form id="health-form" className="form-grid" onSubmit={submit}>
      <label className="field"><span>Nascimento</span><input className="input" type="date" max={toDay(new Date())} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label>
      <label className="field"><span>Sexo</span>
        <select className="select" value={sex} onChange={(e) => setSex(e.target.value)}>
          <option value="">Não informado</option>
          {PET_SEX.map((s) => <option key={s} value={s}>{LABELS.sex[s]}</option>)}
        </select>
      </label>
      <label className="field"><span>Castrado(a)</span>
        <select className="select" value={neutered} onChange={(e) => setNeutered(e.target.value)}>
          <option value="">Não informado</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </label>
      <label className="field full"><span>Alergias e alertas</span>
        <textarea className="input" rows={2} maxLength={300} placeholder="Ex.: alergia a dipirona; agressivo ao contido" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
        <small className="muted">Aparece em destaque no topo da ficha.</small>
      </label>
      {error && <p className="error full" role="alert">{error}</p>}
    </form>
  );
}
