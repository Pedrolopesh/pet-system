"use client";

import { useState } from "react";
import { kg } from "@/lib/clinic";

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });

/** Curva de peso: linha com pontos. Passe o mouse para ver cada medição. */
export function WeightChart({ points }: { points: { at: string; kg: number }[] }) {
  const [hover, setHover] = useState(points.length - 1);
  const W = 640;
  const H = 220;
  const P = 28;
  const min = Math.min(...points.map((p) => p.kg));
  const max = Math.max(...points.map((p) => p.kg));
  const span = max - min || 1;
  const x = (i: number) => P + (i / (points.length - 1)) * (W - P * 2);
  const y = (kg: number) => H - P - ((kg - min) / span) * (H - P * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.kg)}`).join(" ");
  const current = points[hover]!;
  return (
    <figure className="weight-chart">
      <figcaption>
        <strong className="num">{kg(current.kg)}</strong>
        <span className="muted"> em {DATE.format(new Date(current.at))}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Peso de ${min} a ${max} kg em ${points.length} medições`}>
        <path d={`${path} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`} className="area" />
        <path d={path} className="line" pathLength={1} />
        {points.map((p, i) => (
          <circle key={p.at} cx={x(i)} cy={y(p.kg)} r={i === hover ? 7 : 5} className={i === hover ? "on" : ""} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
            <title>{`${p.kg} kg em ${DATE.format(new Date(p.at))}`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}
