"use client";

import type { ClinicalFile, Employee, MedicalRecord, Vaccination } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, Skeletons } from "@/components/ui";
import { agendaApi, clinicApi, employeesApi } from "@/lib/api";
import { age, brDate, kg } from "@/lib/clinic";
import { toDay } from "@/lib/dates";
import { dateTime, phone } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useToast } from "@/lib/toast";
import { HealthForm, RecordForm, type RecordDraft, VaccineForm } from "./forms";
import { WeightChart } from "./WeightChart";

const SPECIES_ICON = { cao: "🐶", gato: "🐱", outro: "🐾" } as const;
type Tab = "historico" | "vacinas" | "peso";

export function PetFile() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const petId = params.get("id") ?? "";
  const [file, setFile] = useState<ClinicalFile | null>(null);
  const [error, setError] = useState("");
  const [vets, setVets] = useState<Employee[]>([]);
  const [tab, setTab] = useState<Tab>("historico");
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null);
  const [vaccineOpen, setVaccineOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  const load = useCallback(() => {
    if (!petId) return;
    clinicApi.file(petId).then(setFile, (e) => setError(friendly(e)));
  }, [petId]);
  useEffect(load, [load]);

  useEffect(() => {
    employeesApi.list().then((list) => {
      const active = list.filter((e) => e.active);
      setVets(active.filter((e) => e.role === "veterinario").length ? active.filter((e) => e.role === "veterinario") : active);
    }, () => null);
  }, []);

  // Veio da agenda ("Prontuário"): abre um registro novo já ligado ao atendimento.
  useEffect(() => {
    const appointmentId = params.get("atendimento");
    if (!appointmentId) return;
    agendaApi.get(appointmentId).then((a) => {
      setRecordDraft({
        appointmentId: a.id,
        kind: /vacina/i.test(a.service.name) ? "vacinacao" : "consulta",
        vetId: a.employee?.id ?? null,
        title: `${a.service.name} de ${new Date(a.startsAt).toLocaleDateString("pt-BR")}`,
      });
      router.replace(`/app/clinica/pet/?id=${petId}`);
    }, (e) => toast(friendly(e), "error"));
  }, [params, petId, router, toast]);

  const timeline = useMemo(() => {
    if (!file) return [];
    const items: ({ type: "record"; at: string; record: MedicalRecord } | { type: "vaccine"; at: string; vaccine: Vaccination })[] = [
      ...file.records.map((r) => ({ type: "record" as const, at: r.at, record: r })),
      ...file.vaccinations.filter((v) => !file.records.some((r) => r.kind === "vacinacao" && r.at.slice(0, 10) === v.appliedAt)).map((v) => ({ type: "vaccine" as const, at: `${v.appliedAt}T12:00:00`, vaccine: v })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }, [file]);

  if (!petId) return <EmptyState icon="paw" title="Pet não informado" text="Abra a ficha pela tela da clínica." />;
  if (error) return <p className="error">{error}</p>;
  if (!file) return <div className="stack-page"><Skeletons count={3} height={160} /></div>;

  const { pet } = file;
  const lastWeight = file.weights.at(-1);
  const today = toDay(new Date());

  async function removeVaccine(v: Vaccination) {
    try {
      await clinicApi.removeVaccination(v.id);
      toast("Lançamento removido.");
      load();
    } catch (e) {
      toast(friendly(e), "error");
    }
  }

  return (
    <div className="pet-file">
      <Link className="crumb" href="/app/clinica/"><Icon name="left" size={16} /> Clínica</Link>
      <section className="card pet-head rise">
        <span className="big-emoji" aria-hidden="true">{SPECIES_ICON[pet.species]}</span>
        <div className="pet-id">
          <h2>{pet.name}</h2>
          <p className="muted">
            {[pet.breed || LABELS.species[pet.species], age(pet.birthDate), pet.sex ? LABELS.sex[pet.sex] : null, pet.neutered === null ? null : pet.neutered ? "castrado(a)" : "não castrado(a)"]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="small">
            Tutor: <strong>{pet.client.name}</strong>{pet.client.phone ? ` · ${phone(pet.client.phone)}` : ""}
            {lastWeight ? <> · Último peso: <strong className="num">{kg(lastWeight.kg)}</strong></> : null}
          </p>
        </div>
        <div className="pet-actions">
          <button className="btn" onClick={() => setRecordDraft({ appointmentId: null, kind: "consulta", vetId: vets[0]?.id ?? null })}><Icon name="plus" size={16} /> Novo atendimento</button>
          <button className="btn ghost" onClick={() => setVaccineOpen(true)}><Icon name="sparkle" size={16} /> Registrar vacina</button>
          <button className="btn quiet" onClick={() => setHealthOpen(true)}><Icon name="edit" size={16} /> Ficha de saúde</button>
        </div>
        {pet.allergies && (
          <p className="allergy" role="alert"><Icon name="alert" size={18} /> <strong>Atenção:</strong> {pet.allergies}</p>
        )}
      </section>

      <div className="segmented tabs-x" role="tablist" aria-label="Seções da ficha">
        {([["historico", "Histórico"], ["vacinas", `Vacinas (${file.vaccinations.length})`], ["peso", "Peso"]] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "historico" && (
        timeline.length ? (
          <ol className="timeline">
            {timeline.map((item, i) =>
              item.type === "record" ? (
                <li key={item.record.id} className="rise" style={{ ["--i" as string]: Math.min(i, 10) }}>
                  <RecordCard record={item.record} onEdit={() => setRecordDraft({ record: item.record, appointmentId: item.record.appointmentId, kind: item.record.kind, vetId: item.record.vet?.id ?? null })} />
                </li>
              ) : (
                <li key={item.vaccine.id} className="rise vaccine-item" style={{ ["--i" as string]: Math.min(i, 10) }}>
                  <div className="tl-dot vac"><Icon name="sparkle" size={14} /></div>
                  <div className="card tl-card">
                    <div className="tl-head"><span className="badge ok">Vacina</span><strong>{item.vaccine.vaccine}</strong><span className="muted small">{brDate(item.vaccine.appliedAt)}</span></div>
                    <p className="small muted">{item.vaccine.batch && `Lote ${item.vaccine.batch} · `}{item.vaccine.nextDoseAt ? `Reforço em ${brDate(item.vaccine.nextDoseAt)}` : "Sem reforço agendado"}</p>
                  </div>
                </li>
              ),
            )}
          </ol>
        ) : (
          <EmptyState icon="stethoscope" title="Nenhum atendimento registrado" text="Registre a primeira consulta ou vacina deste pet." />
        )
      )}

      {tab === "vacinas" && (
        <section className="card">
          {file.vaccinations.length ? (
            <table className="table stack">
              <thead><tr><th>Vacina</th><th>Aplicada em</th><th>Reforço</th><th>Lote</th><th /></tr></thead>
              <tbody>
                {file.vaccinations.map((v) => {
                  const superseded = file.vaccinations.some((o) => o.vaccine === v.vaccine && o.appliedAt > v.appliedAt);
                  const status = !v.nextDoseAt || superseded ? null : v.nextDoseAt < today ? "vencida" : "em dia";
                  return (
                    <tr key={v.id}>
                      <td><strong>{v.vaccine}</strong></td>
                      <td>{brDate(v.appliedAt)}</td>
                      <td>
                        {v.nextDoseAt ? brDate(v.nextDoseAt) : "—"}{" "}
                        {status && <span className={`badge ${status === "vencida" ? "danger" : "ok"}`}>{status}</span>}
                        {superseded && <span className="badge gray">reforçada</span>}
                      </td>
                      <td data-hide-mobile>{v.batch || "—"}</td>
                      <td className="right">
                        {v.removable && <button className="icon-btn" aria-label={`Apagar lançamento de ${v.vaccine}`} onClick={() => removeVaccine(v)}><Icon name="trash" size={16} /></button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="sparkle" title="Nenhuma vacina registrada" text="Registre as vacinas para receber os lembretes de reforço.">
              <button className="btn sm" onClick={() => setVaccineOpen(true)}>Registrar vacina</button>
            </EmptyState>
          )}
        </section>
      )}

      {tab === "peso" && (
        <section className="card panel">
          {file.weights.length >= 2 ? (
            <WeightChart points={file.weights} />
          ) : (
            <EmptyState icon="chart" title="Poucos registros de peso" text="O gráfico aparece a partir de dois atendimentos com peso." />
          )}
        </section>
      )}

      <RecordForm
        draft={recordDraft}
        petId={pet.id}
        vets={vets}
        onClose={() => setRecordDraft(null)}
        onSaved={(r, wasNew) => {
          setRecordDraft(null);
          toast(wasNew ? "Atendimento registrado no prontuário." : "Registro corrigido.");
          load();
          if (wasNew && r.prescription.length) toast("A receita já pode ser impressa pelo histórico.", "info");
        }}
      />
      <VaccineForm
        open={vaccineOpen}
        pet={pet}
        vets={vets}
        onClose={() => setVaccineOpen(false)}
        onSaved={() => {
          setVaccineOpen(false);
          toast("Vacina registrada.");
          load();
        }}
      />
      <HealthForm
        open={healthOpen}
        pet={pet}
        onClose={() => setHealthOpen(false)}
        onSaved={() => {
          setHealthOpen(false);
          toast("Ficha de saúde atualizada.");
          load();
        }}
      />
    </div>
  );
}

function RecordCard({ record: r, onEdit }: { record: MedicalRecord; onEdit: () => void }) {
  return (
    <>
      <div className={`tl-dot kind-${r.kind}`}><Icon name="stethoscope" size={14} /></div>
      <article className="card tl-card">
        <div className="tl-head">
          <span className="badge">{LABELS.recordKind[r.kind]}</span>
          <span className="muted small">{dateTime(r.at)}{r.vet ? ` · ${r.vet.name}` : ""}</span>
          <span className="vitals">
            {r.weightKg !== null && <span className="chip-static num">{kg(r.weightKg)}</span>}
            {r.temperatureC !== null && <span className="chip-static num">{r.temperatureC.toLocaleString("pt-BR")} °C</span>}
          </span>
        </div>
        <dl className="soap">
          {r.complaint && <div><dt>Queixa</dt><dd>{r.complaint}</dd></div>}
          {r.exam && <div><dt>Exame</dt><dd>{r.exam}</dd></div>}
          {r.diagnosis && <div><dt>Diagnóstico</dt><dd>{r.diagnosis}</dd></div>}
          {r.treatment && <div><dt>Conduta</dt><dd>{r.treatment}</dd></div>}
        </dl>
        {r.prescription.length > 0 && (
          <div className="rx">
            <strong><Icon name="receipt" size={14} /> Receita</strong>
            <ul>
              {r.prescription.map((p, i) => (
                <li key={i}><strong>{p.medication}</strong>{[p.dosage, p.frequency, p.duration].filter(Boolean).length ? ` — ${[p.dosage, p.frequency, p.duration].filter(Boolean).join(", ")}` : ""}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="tl-actions">
          {r.prescription.length > 0 && <Link className="btn sm ghost" href={`/app/clinica/receita/?id=${r.id}`}><Icon name="receipt" size={14} /> Imprimir receita</Link>}
          {r.editable ? (
            <button className="btn sm quiet" onClick={onEdit}><Icon name="edit" size={14} /> Corrigir</button>
          ) : (
            <span className="muted small" title="Registros só podem ser corrigidos nas primeiras 24 horas">🔒 Registro fechado</span>
          )}
          {r.author && <span className="muted small">registrado por {r.author.name}</span>}
        </div>
      </article>
    </>
  );
}
