"use client";

import type { Appointment, Dashboard, Note } from "@petsystem/contracts";
import { LABELS, NOTE_PRIORITIES } from "@petsystem/contracts";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { GettingStarted } from "@/components/app/GettingStarted";
import { BarChart } from "@/components/BarChart";
import { Icon } from "@/components/Icon";
import { Avatar, EmptyState, Skeletons, StatCard } from "@/components/ui";
import { agendaApi, notesApi, reportsApi } from "@/lib/api";
import { toDay } from "@/lib/dates";
import { brl, when } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function DashboardPage() {
  const { me } = useSession();
  const toast = useToast();
  const [data, setData] = useState<Dashboard | null>(null);
  const [today, setToday] = useState<Appointment[] | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Note["priority"]>("normal");
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    Promise.all([reportsApi.dashboard(), notesApi.list(), agendaApi.list(toDay(new Date()))]).then(
      ([d, n, a]) => {
        setData(d);
        setNotes(n);
        setToday(a.filter((x) => x.status !== "cancelado"));
      },
      (e) => setError(friendly(e)),
    );
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const upcoming = today?.filter((a) => new Date(a.endsAt).getTime() >= now && a.status !== "concluido" && a.status !== "faltou") ?? [];
  const inShop = today?.filter((a) => a.status === "em_atendimento" || a.status === "pronto").length ?? 0;

  async function addNote(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    try {
      const created = await notesApi.create(value, priority);
      setNotes((all) => [created, ...all].sort((a, b) => Number(a.done) - Number(b.done) || NOTE_PRIORITIES.indexOf(a.priority) - NOTE_PRIORITIES.indexOf(b.priority)));
    } catch (err) {
      toast(friendly(err), "error");
    }
  }
  async function toggle(n: Note) {
    setNotes((all) => all.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)));
    try {
      await notesApi.update(n.id, { done: !n.done });
    } catch (err) {
      setNotes((all) => all.map((x) => (x.id === n.id ? n : x)));
      toast(friendly(err), "error");
    }
  }
  async function remove(n: Note) {
    setNotes((all) => all.filter((x) => x.id !== n.id));
    try {
      await notesApi.remove(n.id);
    } catch (err) {
      toast(friendly(err), "error");
    }
  }

  return (
    <div className="dash">
      <section className="hello rise">
        <h2>{greeting}, {me?.user.name.split(" ")[0]}!</h2>
        <p className="muted">Este é o resumo de {me?.shop.name}.</p>
      </section>
      {error && <p className="error">{error}</p>}
      <GettingStarted />

      <div className="stats">
        {data && today ? (
          <>
            <StatCard index={0} icon="calendar" label="Atendimentos hoje" value={String(today.length)} hint={inShop ? `${inShop} na loja agora` : `${upcoming.length} ainda por vir`} />
            <StatCard index={1} icon="cart" tone="ok" label="Vendas hoje" value={brl(data.today.revenue)} hint={`${data.today.sales} ${data.today.sales === 1 ? "venda" : "vendas"}`} />
            <StatCard index={2} icon="chart" tone="info" label="Receita no mês" value={brl(data.month.revenue)} hint={`ticket médio ${brl(data.month.averageTicket)}`} />
            <StatCard index={3} icon="alert" tone="sun" label="Estoque baixo" value={String(data.lowStock.length)} hint={data.lowStock.length ? "produtos para repor" : "tudo em dia"} />
          </>
        ) : (
          <Skeletons count={4} height={142} />
        )}
      </div>

      <div className="grid">
        <section className="card panel rise" style={{ ["--i" as string]: 2 }}>
          <header>
            <h3>Próximos atendimentos</h3>
            <Link className="btn sm quiet" href="/app/agenda/">Abrir agenda</Link>
          </header>
          {!today ? (
            <Skeletons count={3} height={56} />
          ) : upcoming.length ? (
            <ul className="next-list">
              {upcoming.slice(0, 6).map((a) => (
                <li key={a.id} className={`st-${a.status}`}>
                  <span className="time num">{TIME.format(new Date(a.startsAt))}</span>
                  <div>
                    <strong>{a.pet.name} <small className="muted">· {a.client.name}</small></strong>
                    <small>{a.service.name}{a.employee ? ` · ${a.employee.name}` : ""}</small>
                  </div>
                  <span className="badge gray">{LABELS.status[a.status]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="calendar" title="Agenda livre pelo resto do dia" text="Nenhum atendimento por vir hoje.">
              <Link className="btn sm" href="/app/agenda/?novo=1">Agendar</Link>
            </EmptyState>
          )}
        </section>

        <section className="card panel rise" style={{ ["--i" as string]: 3 }}>
          <header><h3>Avisos da equipe</h3></header>
          <form className="add-note" onSubmit={addNote}>
            <input className="input" maxLength={200} placeholder="Ex.: ligar para o fornecedor" aria-label="Novo aviso" value={text} onChange={(e) => setText(e.target.value)} />
            <select className="select" aria-label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value as Note["priority"])}>
              {NOTE_PRIORITIES.map((p) => <option key={p} value={p}>{LABELS.priority[p]}</option>)}
            </select>
            <button className="btn" aria-label="Adicionar aviso"><Icon name="plus" size={18} /></button>
          </form>
          {notes.length ? (
            <ul className="notes">
              {notes.map((n) => (
                <li key={n.id} className={`${n.done ? "done " : ""}p-${n.priority}`}>
                  <label>
                    <input type="checkbox" checked={n.done} onChange={() => toggle(n)} />
                    <span>{n.text}</span>
                  </label>
                  {n.priority !== "normal" && !n.done && <span className={`badge ${n.priority === "urgente" ? "danger" : "warn"}`}>{LABELS.priority[n.priority]}</span>}
                  <button className="icon-btn" aria-label={`Apagar aviso: ${n.text}`} onClick={() => remove(n)}><Icon name="trash" size={16} /></button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Nenhum aviso. Anote o que a equipe não pode esquecer.</p>
          )}
        </section>

        <section className="card panel chart-panel rise" style={{ ["--i" as string]: 4 }}>
          <header><h3>Receita dos últimos 14 dias</h3></header>
          {data ? <BarChart points={data.last14Days} height={180} /> : <div className="skeleton" style={{ height: 230 }} />}
        </section>

        <section className="card panel rise" style={{ ["--i" as string]: 5 }}>
          <header>
            <h3>Repor estoque</h3>
            <Link className="btn sm quiet" href="/app/produtos/?baixo=1">Ver todos</Link>
          </header>
          {data?.lowStock.length ? (
            <ul className="low">
              {data.lowStock.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <span className="name">{p.name}</span>
                  <span className={`badge ${p.stock === 0 ? "danger" : "warn"}`}>{p.stock} / mín. {p.minStock}</span>
                </li>
              ))}
            </ul>
          ) : data ? (
            <EmptyState icon="check" title="Estoque em dia" text="Nenhum produto abaixo do mínimo." />
          ) : null}
        </section>

        <section className="card panel rise wide-panel" style={{ ["--i" as string]: 6 }}>
          <header>
            <h3>Últimas vendas</h3>
            <Link className="btn sm quiet" href="/app/vendas/">Ver todas</Link>
          </header>
          {data?.recentSales.length ? (
            <ul className="sales-list">
              {data.recentSales.map((s) => (
                <li key={s.id}>
                  <Avatar name={s.client?.name ?? "Cliente avulso"} size={34} />
                  <div className="who">
                    <strong>{s.client?.name ?? "Cliente avulso"}</strong>
                    <small>#{s.number} · {when(s.at)} · {LABELS.payment[s.payment]}</small>
                  </div>
                  <strong className="num">{brl(s.total)}</strong>
                </li>
              ))}
            </ul>
          ) : data ? (
            <EmptyState icon="cart" title="Nenhuma venda ainda" text="As vendas aparecem aqui assim que você fechar a primeira.">
              <Link className="btn sm" href="/app/vender/">Fazer uma venda</Link>
            </EmptyState>
          ) : null}
        </section>
      </div>
    </div>
  );
}
