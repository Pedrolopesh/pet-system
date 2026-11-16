"use client";

import type { Report } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { BarChart } from "@/components/BarChart";
import { Icon } from "@/components/Icon";
import { EmptyState, Skeletons, StatCard } from "@/components/ui";
import { reportsApi } from "@/lib/api";
import { download, toCsv } from "@/lib/csv";
import { brl, dayLabel, percent } from "@/lib/format";
import { ApiError } from "@/lib/http";
import { friendly } from "@/lib/messages";

const PAY_COLORS: Record<string, string> = { pix: "#0d9488", credito: "#ba2bd2", debito: "#2563eb", dinheiro: "#d97706" };
const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default function ReportsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  // O resultado guarda o período pedido: trocar o período mostra o carregamento até a resposta chegar.
  const [result, setResult] = useState<{ days: number; report: Report } | null>(null);
  const report = result?.days === days ? result.report : null;
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    reportsApi.report(days).then((r) => setResult({ days, report: r }), (e) => (e instanceof ApiError && e.code === "PLAN_LIMIT" ? setLocked(true) : setError(friendly(e))));
  }, [days]);

  if (locked)
    return (
      <section className="card">
        <EmptyState icon="chart" title="Relatórios completos são do plano Pro" text="Receita por dia, lucro bruto, serviços campeões e ranking da equipe, com exportação para planilha.">
          <Link className="btn" href="/app/configuracoes/#plano">Ver planos</Link>
        </EmptyState>
      </section>
    );

  const share = (v: number) => (report?.revenue ? v / report.revenue : 0);
  const maxTop = Math.max(1, ...(report?.topProducts.map((p) => p.revenue) ?? [1]));
  const margin = report?.revenue ? Math.round((report.grossProfit / report.revenue) * 100) : 0;
  let acc = 0;
  const gradient = report?.byPayment.length
    ? `conic-gradient(${report.byPayment.map((p) => {
        const start = acc;
        acc += share(p.revenue);
        return `${PAY_COLORS[p.payment]} ${start * 360}deg ${acc * 360}deg`;
      }).join(", ")})`
    : "var(--line)";

  function exportCsv() {
    if (!report) return;
    const r = report;
    const rows: (string | number)[][] = [
      [`Relatório dos últimos ${r.days} dias`],
      ["Receita (R$)", money(r.revenue)],
      ["Vendas", r.sales],
      ["Ticket médio (R$)", money(r.averageTicket)],
      ["Lucro bruto (R$)", money(r.grossProfit)],
      [],
      ["Dia", "Receita (R$)", "Vendas"],
      ...r.byDay.map((d) => [d.day, money(d.revenue), d.sales]),
      [],
      ["Produto ou serviço", "Quantidade", "Receita (R$)"],
      ...r.topProducts.map((p) => [p.name, p.qty, money(p.revenue)]),
      [],
      ["Atendente", "Vendas", "Receita (R$)"],
      ...r.byEmployee.map((e) => [e.name, e.sales, money(e.revenue)]),
    ];
    download(`relatorio-${r.days}-dias.csv`, toCsv(rows));
  }

  return (
    <div className="stack-page reports">
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Período">
          {([7, 30, 90] as const).map((d) => <button key={d} className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>{d} dias</button>)}
        </div>
        <button className="btn ghost sm" disabled={!report} onClick={exportCsv}><Icon name="download" size={16} /> Exportar CSV</button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="stats">
        {report ? (
          <>
            <StatCard icon="chart" label="Receita" value={brl(report.revenue)} hint={report.revenueChange === null ? "sem período anterior" : `${percent(report.revenueChange)} vs. ${days} dias antes`} />
            <StatCard index={1} icon="receipt" tone="info" label="Vendas" value={String(report.sales)} hint={`ticket médio ${brl(report.averageTicket)}`} />
            <StatCard index={2} icon="sparkle" tone="ok" label="Lucro bruto" value={brl(report.grossProfit)} hint={`margem de ${margin}%`} />
            <StatCard index={3} icon="badge" tone="sun" label="Destaque da equipe" value={report.byEmployee[0]?.name.split(" ")[0] ?? "—"} hint={report.byEmployee[0] ? brl(report.byEmployee[0].revenue) : ""} />
          </>
        ) : (
          <Skeletons count={4} height={142} />
        )}
      </div>
      <section className="card panel rise">
        <h3>Receita por dia</h3>
        {report ? <BarChart key={days} points={report.byDay} height={220} /> : <div className="skeleton" style={{ height: 260 }} />}
      </section>
      <div className="cols">
        <section className="card panel rise">
          <h3>O que mais vendeu</h3>
          {report?.topProducts.length ? (
            <ol className="rank">
              {report.topProducts.map((p, i) => (
                <li key={p.productId}>
                  <span className="pos">{i + 1}</span>
                  <div className="bar-row">
                    <div className="label"><span>{p.name}</span><strong className="num">{brl(p.revenue)}</strong></div>
                    <div className="track"><span style={{ "--w": p.revenue / maxTop, "--i": i } as CSSProperties} /></div>
                    <small className="muted">{p.qty} un.</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : report ? <p className="muted">Sem vendas no período.</p> : null}
        </section>
        <div className="stack">
          <section className="card panel rise">
            <h3>Formas de pagamento</h3>
            {report?.byPayment.length ? (
              <div className="donut-row">
                <div className="donut" style={{ background: gradient }} role="img" aria-label="Divisão da receita por forma de pagamento"><span /></div>
                <ul className="legend">
                  {report.byPayment.map((p) => (
                    <li key={p.payment}><i style={{ background: PAY_COLORS[p.payment] }} /><span>{LABELS.payment[p.payment]}</span><strong className="num">{Math.round(share(p.revenue) * 100)}%</strong></li>
                  ))}
                </ul>
              </div>
            ) : report ? <p className="muted">Sem vendas no período.</p> : null}
          </section>
          <section className="card panel rise">
            <h3>Por categoria</h3>
            <ul className="cats">
              {report?.byCategory.map((c) => (
                <li key={c.category}>
                  <span>{LABELS.category[c.category]}</span>
                  <div className="track"><span style={{ "--w": share(c.revenue), "--i": 0 } as CSSProperties} /></div>
                  <strong className="num">{Math.round(share(c.revenue) * 100)}%</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {report && (
        <p className="muted small">
          Período: {dayLabel(report.byDay[0]?.day ?? "")} até hoje. Lucro bruto = receita − custo do que foi vendido (descontos já abatidos).
        </p>
      )}
    </div>
  );
}
