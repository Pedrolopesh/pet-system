import type { Segment } from "@/lib/segments";

const LABEL = { ok: "Concluído", now: "Em atendimento", next: "Confirmado" } as const;

/** Prévia da agenda de um segmento, desenhada em HTML (não é captura de tela). */
export function AgendaMock({ segment }: { segment: Segment }) {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-head">
        <span className="dots"><i /><i /><i /></span>
        <strong>Agenda de hoje</strong>
        <span className="badge">{segment.agenda.length} atendimentos</span>
      </div>
      <ul>
        {segment.agenda.map((a, i) => (
          <li key={a.time} className={`mock-row ${a.status}`} style={{ animationDelay: `${0.3 + i * 0.15}s` }}>
            <span className="time num">{a.time}</span>
            <div>
              <strong>{a.pet}</strong>
              <small>{a.service} · {a.who}</small>
            </div>
            <span className={`badge ${a.status === "ok" ? "ok" : a.status === "now" ? "warn" : ""}`}>{LABEL[a.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
