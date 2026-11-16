"use client";

import { useState, type CSSProperties } from "react";
import { brl, dayLabel } from "@/lib/format";

type Point = { day: string; revenue: number; sales: number };

/** Barras de receita por dia. Passe o mouse (ou toque) para ver o valor. */
export function BarChart({ points, height = 200 }: { points: Point[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const step = Math.max(1, Math.ceil(points.length / 8));
  const active = hover ?? points.length - 1;
  const current = points[active];

  return (
    <figure className="chart" style={{ "--h": `${height}px` } as CSSProperties}>
      {current && (
        <figcaption className="tip">
          <strong className="num">{brl(current.revenue)}</strong>
          <span>
            {dayLabel(current.day)} · {current.sales} {current.sales === 1 ? "venda" : "vendas"}
          </span>
        </figcaption>
      )}
      <div className="bars" role="img" aria-label={`Receita por dia nos últimos ${points.length} dias`} onMouseLeave={() => setHover(null)}>
        {points.map((p, i) => (
          <button
            key={p.day}
            type="button"
            className={`bar${i === active ? " on" : ""}`}
            style={{ "--v": p.revenue / max, "--i": i } as CSSProperties}
            aria-label={`${dayLabel(p.day)}: ${brl(p.revenue)}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onClick={() => setHover(i)}
          >
            <span />
          </button>
        ))}
      </div>
      <div className="axis" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.day} style={{ visibility: (points.length - 1 - i) % step === 0 ? "visible" : "hidden" }}>
            {dayLabel(p.day).split(" ")[1]}
          </span>
        ))}
      </div>
    </figure>
  );
}
