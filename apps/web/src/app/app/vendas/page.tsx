"use client";

import type { Page, Sale } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { EmptyState, Skeletons } from "@/components/ui";
import { salesApi } from "@/lib/api";
import { download, toCsv } from "@/lib/csv";
import { brl, dateTime, when } from "@/lib/format";
import { friendly } from "@/lib/messages";

const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default function SalesPage() {
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data: Page<Sale> } | null>(null);
  const key = `${days}-${page}`;
  const data = result?.key === key ? result.data : null;
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Sale | null>(null);

  useEffect(() => {
    salesApi.list({ days, page, pageSize: 15 }).then((d) => setResult({ key: `${days}-${page}`, data: d }), (e) => setError(friendly(e)));
  }, [days, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  async function exportCsv() {
    let list: Sale[] = [];
    for (let p = 1; p <= 20; p++) {
      const res = await salesApi.list({ days, pageSize: 100, page: p });
      list = list.concat(res.items);
      if (list.length >= res.total) break;
    }
    const rows: (string | number)[][] = [["Número", "Data", "Cliente", "Atendente", "Pagamento", "Itens", "Desconto (R$)", "Total (R$)"]];
    for (const s of list) {
      rows.push([s.number, dateTime(s.at), s.client?.name ?? "Avulso", s.employee.name, LABELS.payment[s.payment], s.items.map((i) => `${i.qty}x ${i.name}`).join(", "), money(s.discount), money(s.total)]);
    }
    download(`vendas-${days}-dias.csv`, toCsv(rows));
  }

  return (
    <div className="stack-page">
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Período">
          {[1, 7, 30, 90].map((d) => (
            <button key={d} className="chip" aria-pressed={days === d} onClick={() => (setDays(d), setPage(1))}>{d === 1 ? "Hoje" : `${d} dias`}</button>
          ))}
        </div>
        <button className="btn ghost sm" disabled={!data?.total} onClick={exportCsv}><Icon name="download" size={16} /> Exportar CSV</button>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="card">
        {!data ? (
          <div style={{ padding: 20, display: "grid", gap: 10 }}><Skeletons count={6} height={44} /></div>
        ) : data.items.length ? (
          <table className="table stack">
            <thead>
              <tr><th>Venda</th><th>Cliente</th><th>Atendente</th><th>Pagamento</th><th className="right">Total</th></tr>
            </thead>
            <tbody>
              {data.items.map((s, i) => (
                <tr key={s.id} className="rise clickable" style={{ "--i": i } as CSSProperties} tabIndex={0} onClick={() => setOpen(s)} onKeyDown={(e) => e.key === "Enter" && setOpen(s)}>
                  <td><strong>#{s.number}</strong><br /><small className="muted">{when(s.at)}</small></td>
                  <td>{s.client?.name ?? "Avulso"}</td>
                  <td data-hide-mobile>{s.employee.name}</td>
                  <td data-hide-mobile><span className="badge gray">{LABELS.payment[s.payment]}</span></td>
                  <td className="right num"><strong>{brl(s.total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon="receipt" title="Nenhuma venda no período" text="Escolha um período maior ou faça uma venda.">
            <Link className="btn sm" href="/app/vender/">Nova venda</Link>
          </EmptyState>
        )}
      </section>
      {data && pages > 1 && (
        <nav className="pager" aria-label="Páginas">
          <button className="btn ghost sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <span className="muted">Página {page} de {pages} · {data.total} vendas</span>
          <button className="btn ghost sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</button>
        </nav>
      )}
      <Modal open={open !== null} title={open ? `Venda #${open.number}` : ""} onClose={() => setOpen(null)}>
        {open && (
          <div className="sale-detail">
            <dl>
              <div><dt>Data</dt><dd>{dateTime(open.at)}</dd></div>
              <div><dt>Cliente</dt><dd>{open.client?.name ?? "Avulso"}</dd></div>
              <div><dt>Atendente</dt><dd>{open.employee.name}</dd></div>
              <div><dt>Pagamento</dt><dd>{LABELS.payment[open.payment]}</dd></div>
            </dl>
            <ul>
              {open.items.map((i) => <li key={i.productId}><span>{i.qty}× {i.name}</span><span className="num">{brl(i.qty * i.unitPrice)}</span></li>)}
              {open.discount > 0 && <li className="muted"><span>Desconto</span><span className="num">− {brl(open.discount)}</span></li>}
              <li className="total"><span>Total</span><span className="num">{brl(open.total)}</span></li>
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
