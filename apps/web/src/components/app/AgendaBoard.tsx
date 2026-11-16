"use client";

import type { Appointment, Client, Employee, Product } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { agendaApi, clientsApi, employeesApi, productsApi } from "@/lib/api";
import { addDays, hhmm, layoutOverlaps, longDay, minuteOfDay, minutesOf, shortDay, toDay, weekStart } from "@/lib/dates";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";
import { AppointmentDetail } from "./AppointmentDetail";
import { AppointmentForm, type Draft } from "./AppointmentForm";

const ROW = 30; // minutos por linha da grade
const PX = 2; // pixels por minuto
const NONE = "__none";

export function AgendaBoard() {
  const { me } = useSession();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<"dia" | "semana">("dia");
  const [day, setDay] = useState(toDay(new Date()));
  // Atendimentos do período carregado; trocar de dia mostra o carregamento até a resposta chegar.
  const [loaded, setLoaded] = useState<{ key: string; items: Appointment[] } | null>(null);
  const [tick, setTick] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [draft, setDraft] = useState<Draft | null>(() => {
    // Atalho "Agendar" do topo: abre o formulário no próximo horário livre de hoje.
    if (params.get("novo") !== "1") return null;
    const d = new Date();
    const o = minutesOf(me?.shop.opensAt ?? "08:00");
    const c = minutesOf(me?.shop.closesAt ?? "19:00");
    const m = Math.min(Math.max(Math.ceil((d.getHours() * 60 + d.getMinutes()) / 30) * 30, o), c - 30);
    return { day: toDay(d), minute: m, employeeId: null };
  });
  const [open, setOpen] = useState<Appointment | null>(null);
  const [now, setNow] = useState(() => new Date());

  const opens = minutesOf(me?.shop.opensAt ?? "08:00");
  const closes = minutesOf(me?.shop.closesAt ?? "19:00");
  const from = view === "dia" ? day : weekStart(day);

  useEffect(() => {
    Promise.all([employeesApi.list(), productsApi.list({ category: "servico" }), clientsApi.list()]).then(
      ([e, s, c]) => {
        setEmployees(e.filter((x) => x.active));
        setServices(s);
        setClients(c);
      },
      (err) => toast(friendly(err), "error"),
    );
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [toast]);

  const key = `${view}-${from}-${tick}`;
  const items = loaded?.key === key ? loaded.items : null;
  const load = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    agendaApi.list(from, view === "dia" ? 1 : 7).then(
      (list) => setLoaded({ key: `${view}-${from}-${tick}`, items: list }),
      (err) => toast(friendly(err), "error"),
    );
  }, [from, view, tick, toast]);

  // Atalho "Agendar" do topo abre o formulário já no horário mais próximo.
  useEffect(() => {
    if (params.get("novo") === "1") router.replace("/app/agenda/");
  }, [params, router]);

  // Colunas: profissionais com agenda + "sem profissional" quando houver atendimento assim.
  const visible = useMemo(() => items?.filter((a) => a.status !== "cancelado") ?? [], [items]);
  const columns = useMemo(() => {
    // Banho/tosa e veterinária sempre têm coluna; os demais, só quando têm atendimento no período.
    const pros = employees.filter((e) => ["banho", "veterinario"].includes(e.role) || visible.some((a) => a.employee?.id === e.id));
    const cols = pros.map((e) => ({ id: e.id, name: e.name, role: LABELS.role[e.role] }));
    if (visible.some((a) => !a.employee) || cols.length === 0) cols.push({ id: NONE, name: "Sem profissional", role: "Creche e encaixes" });
    return cols;
  }, [employees, visible]);

  const rows = Array.from({ length: Math.ceil((closes - opens) / ROW) }, (_, i) => opens + i * ROW);
  const isToday = day === toDay(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();

  function onSaved(a: Appointment) {
    setDraft(null);
    toast(`${a.pet.name} agendado para ${hhmm(minuteOfDay(a.startsAt))}.`);
    load();
  }
  function onChanged(a: Appointment) {
    setOpen(a);
    setLoaded((s) => (s ? { ...s, items: s.items.map((x) => (x.id === a.id ? a : x)) } : s));
    if (toDay(new Date(a.startsAt)) !== day && view === "dia") load();
  }

  const card = (a: Appointment, style?: CSSProperties) => (
    <button key={a.id} className={`appt st-${a.status}`} style={style} onClick={() => setOpen(a)}>
      <span className="t num">{hhmm(minuteOfDay(a.startsAt))}</span>
      <strong>{a.pet.name}</strong>
      <small>{a.service.name}</small>
    </button>
  );

  return (
    <div className="agenda">
      <div className="agenda-bar">
        <div className="nav-days">
          <button className="icon-btn" aria-label="Anterior" onClick={() => setDay(addDays(day, view === "dia" ? -1 : -7))}><Icon name="left" /></button>
          <button className="btn sm ghost" onClick={() => setDay(toDay(new Date()))}>Hoje</button>
          <button className="icon-btn" aria-label="Próximo" onClick={() => setDay(addDays(day, view === "dia" ? 1 : 7))}><Icon name="right" /></button>
          <h2>{view === "dia" ? longDay(day) : `Semana de ${shortDay(from)}`}</h2>
        </div>
        <div className="segmented" role="group" aria-label="Visualização">
          <button aria-pressed={view === "dia"} onClick={() => setView("dia")}>Dia</button>
          <button aria-pressed={view === "semana"} onClick={() => setView("semana")}>Semana</button>
        </div>
        <button className="btn" onClick={() => setDraft({ day, minute: Math.max(opens, Math.min(closes - ROW, Math.ceil(nowMinute / ROW) * ROW)), employeeId: null })}>
          <Icon name="plus" size={18} /> Agendar
        </button>
      </div>

      {view === "dia" ? (
        <>
          <div className="day-grid card" style={{ "--cols": columns.length, "--px": PX } as CSSProperties}>
            <div className="grid-head">
              <span />
              {columns.map((c) => (
                <div key={c.id} className="col-head"><strong>{c.name}</strong><small>{c.role}</small></div>
              ))}
            </div>
            <div className="grid-body" style={{ height: (closes - opens) * PX }}>
              <div className="hours">
                {rows.map((m) => <span key={m} style={{ top: (m - opens) * PX }}>{m % 60 === 0 ? hhmm(m) : ""}</span>)}
              </div>
              {columns.map((c) => {
                const mine = visible.filter((a) => (c.id === NONE ? !a.employee : a.employee?.id === c.id));
                const laid = layoutOverlaps(mine.map((a) => ({ a, start: minuteOfDay(a.startsAt), end: minuteOfDay(a.endsAt) })));
                return (
                  <div key={c.id} className="col">
                    {rows.map((m) => (
                      <button
                        key={m}
                        className="slot"
                        style={{ top: (m - opens) * PX, height: ROW * PX }}
                        aria-label={`Agendar às ${hhmm(m)} com ${c.name}`}
                        onClick={() => setDraft({ day, minute: m, employeeId: c.id === NONE ? null : c.id })}
                      />
                    ))}
                    {laid.map(({ a, start, end, col, cols }, i) =>
                      card(a, {
                        top: (Math.max(start, opens) - opens) * PX,
                        height: Math.max(26, (Math.min(end, closes) - Math.max(start, opens)) * PX - 3),
                        left: `calc(${(col / cols) * 100}% + 3px)`,
                        width: `calc(${100 / cols}% - 6px)`,
                        animationDelay: `${i * 30}ms`,
                      }),
                    )}
                  </div>
                );
              })}
              {isToday && nowMinute >= opens && nowMinute <= closes && (
                <div className="now-line" style={{ top: (nowMinute - opens) * PX }} aria-hidden="true"><span /></div>
              )}
            </div>
            {!items && <div className="grid-loading skeleton" />}
          </div>

          <div className="day-list">
            {items === null ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : visible.length ? (
              <ul>
                {visible.map((a) => (
                  <li key={a.id}>
                    <button className={`list-appt st-${a.status}`} onClick={() => setOpen(a)}>
                      <span className="t num">{hhmm(minuteOfDay(a.startsAt))}</span>
                      <div>
                        <strong>{a.pet.name} <small className="muted">· {a.client.name}</small></strong>
                        <small>{a.service.name}{a.employee ? ` · ${a.employee.name}` : ""}</small>
                      </div>
                      <span className="badge gray">{LABELS.status[a.status]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="calendar" title="Nenhum atendimento neste dia" text="Toque em Agendar para marcar o primeiro." />
            )}
          </div>
        </>
      ) : (
        <div className="week">
          {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => {
            const list = visible.filter((a) => toDay(new Date(a.startsAt)) === d);
            return (
              <section key={d} className={`week-day card${d === toDay(now) ? " today" : ""}`}>
                <header>
                  <button className="link-btn" onClick={() => (setDay(d), setView("dia"))}>{shortDay(d)}</button>
                  <span className="badge gray">{list.length}</span>
                </header>
                {items === null ? <div className="skeleton" style={{ height: 80 }} /> : list.map((a) => card(a))}
              </section>
            );
          })}
        </div>
      )}

      <AppointmentForm
        draft={draft}
        clients={clients}
        services={services}
        employees={employees}
        opensAt={me?.shop.opensAt ?? "08:00"}
        closesAt={me?.shop.closesAt ?? "19:00"}
        onClose={() => setDraft(null)}
        onSaved={onSaved}
      />
      <AppointmentDetail appointment={open} employees={employees} onClose={() => setOpen(null)} onChanged={onChanged} />
    </div>
  );
}
