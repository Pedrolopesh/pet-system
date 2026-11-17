"use client";

import type { PrescriptionDoc } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { clinicApi } from "@/lib/api";
import { age, kg } from "@/lib/clinic";
import { phone } from "@/lib/format";
import { friendly } from "@/lib/messages";

const LONG = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

/** Receita pronta para imprimir (ou salvar em PDF pelo navegador). */
export function Prescription() {
  const id = useSearchParams().get("id") ?? "";
  const [doc, setDoc] = useState<PrescriptionDoc | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (id) clinicApi.prescription(id).then(setDoc, (e) => setError(friendly(e)));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!doc) return <div className="skeleton" style={{ height: 500 }} />;
  const { pet, record, shop } = doc;
  return (
    <div className="rx-page">
      <div className="rx-toolbar no-print">
        <Link className="btn quiet" href={`/app/clinica/pet/?id=${pet.id}`}><Icon name="left" size={16} /> Voltar à ficha</Link>
        <button className="btn" onClick={() => window.print()}><Icon name="receipt" size={16} /> Imprimir ou salvar PDF</button>
      </div>
      <article className="rx-sheet">
        <header>
          <Logo />
          <div>
            <strong>{shop.name}</strong>
            <small>Receituário</small>
          </div>
        </header>
        <section className="rx-who">
          <div><small>Paciente</small><strong>{pet.name}</strong><span>{LABELS.species[pet.species]}{pet.breed ? ` · ${pet.breed}` : ""}{pet.sex ? ` · ${LABELS.sex[pet.sex]}` : ""} · {age(pet.birthDate)}{record.weightKg ? ` · ${kg(record.weightKg)}` : ""}</span></div>
          <div><small>Tutor(a)</small><strong>{pet.client.name}</strong><span>{pet.client.phone ? phone(pet.client.phone) : ""}</span></div>
        </section>
        {pet.allergies && <p className="rx-alert">Alergias e alertas: {pet.allergies}</p>}
        <ol className="rx-items">
          {record.prescription.map((p, i) => (
            <li key={i}>
              <strong>{p.medication}</strong>
              <span>{[p.dosage, p.frequency, p.duration].filter(Boolean).join(" · ")}</span>
              {p.instructions && <em>{p.instructions}</em>}
            </li>
          ))}
        </ol>
        {record.treatment && <p className="rx-notes"><strong>Orientações:</strong> {record.treatment}</p>}
        <footer>
          <span>{LONG.format(new Date(record.at))}</span>
          <div className="sign">
            <span className="line" />
            <strong>{record.vet?.name ?? "Médico(a)-veterinário(a)"}</strong>
            <small>Assinatura e CRMV</small>
          </div>
        </footer>
      </article>
    </div>
  );
}
