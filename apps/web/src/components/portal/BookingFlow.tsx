"use client";

import type { PublicService, PublicShop, TutorMe } from "@petsystem/contracts";
import { brl } from "@petsystem/contracts";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, Skeletons } from "@/components/ui";
import { addDays, localIso, minutesOf, shortDay, toDay } from "@/lib/dates";
import { friendly } from "@/lib/messages";
import { publicApi, tutorApi, tutorToken } from "@/lib/tutor";
import { PortalFrame } from "./PortalFrame";
import { TutorLogin } from "./TutorLogin";

type Step = 1 | 2 | 3 | 4;
const LONG = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function BookingFlow() {
  const slug = (useSearchParams().get("loja") ?? "").toLowerCase();
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [failure, setFailure] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<PublicService | null>(null);
  const [day, setDay] = useState(toDay(new Date()));
  const [slots, setSlots] = useState<{ key: string; list: string[] } | null>(null);
  const [time, setTime] = useState("");
  const [me, setMe] = useState<TutorMe | null>(null);
  const [petId, setPetId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    publicApi.shop(slug).then(setShop, (e) => setFailure(friendly(e)));
  }, [slug]);

  const loadMe = useCallback(async () => {
    if (!tutorToken.get(slug)) return null;
    try {
      const data = await tutorApi.me(slug);
      setMe(data);
      setPetId((p) => p || data.pets[0]?.id || "");
      return data;
    } catch {
      return null;
    }
  }, [slug]);
  // Já entrou antes neste navegador: carrega o tutor (o setState acontece só na resposta).
  useEffect(() => {
    if (!slug || !tutorToken.get(slug)) return;
    tutorApi.me(slug).then(
      (data) => {
        setMe(data);
        setPetId((p) => p || data.pets[0]?.id || "");
      },
      () => null,
    );
  }, [slug]);

  const slotsKey = service ? `${service.id}-${day}` : "";
  useEffect(() => {
    if (!service) return;
    publicApi.slots(slug, service.id, day).then((s) => setSlots({ key: `${service.id}-${day}`, list: s.slots }), (e) => setError(friendly(e)));
  }, [slug, service, day]);
  const daySlots = slots?.key === slotsKey ? slots.list : null;

  const days = useMemo(() => {
    const n = Math.min(shop?.bookingWindowDays ?? 14, 21);
    return Array.from({ length: n + 1 }, (_, i) => addDays(toDay(new Date()), i));
  }, [shop]);

  async function confirm() {
    if (!service || !time || !petId) return;
    setBusy(true);
    setError("");
    try {
      const updated = await tutorApi.book(slug, { petId, serviceId: service.id, startsAt: localIso(day, minutesOf(time)), notes });
      setMe(updated);
      setDone(true);
    } catch (e) {
      setError(friendly(e));
      // horário pode ter acabado de ser ocupado: atualiza a lista
      publicApi.slots(slug, service.id, day).then((s) => setSlots({ key: `${service.id}-${day}`, list: s.slots }), () => null);
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  if (!slug) return <PortalFrame slug=""><EmptyState icon="search" title="Loja não informada" text="Use o link de agendamento que a loja enviou." /></PortalFrame>;
  if (failure) return <PortalFrame slug={slug}><EmptyState icon="calendar" title="Agendamento indisponível" text={failure} /></PortalFrame>;
  if (!shop) return <PortalFrame slug={slug}><Skeletons count={3} height={120} /></PortalFrame>;

  if (done && service)
    return (
      <PortalFrame slug={slug} shopName={shop.name}>
        <section className="booking-done card rise">
          <span className="ok-ic"><Icon name="check" size={34} /></span>
          <h1>Agendado!</h1>
          <p>
            <strong>{service.name}</strong> para <strong>{me?.pets.find((p) => p.id === petId)?.name}</strong>
            <br />
            {cap(LONG.format(new Date(`${day}T12:00:00`)))} às {time}
          </p>
          <p className="muted small">A loja pode confirmar o horário. Você acompanha e cancela pela sua área (até {shop.cancelNoticeHours} h antes).</p>
          <div className="row-center">
            <Link className="btn" href={`/portal/?loja=${slug}`}>Ver meus agendamentos</Link>
            <button className="btn ghost" onClick={() => (setDone(false), setStep(1), setTime(""), setService(null))}>Agendar outro</button>
          </div>
        </section>
      </PortalFrame>
    );

  const stepLabel = ["Serviço", "Dia e horário", "Identificação", "Confirmar"];
  return (
    <PortalFrame slug={slug} shopName={shop.name}>
      <section className="booking">
        <header className="booking-head rise">
          <h1>Agende online em {shop.name}</h1>
          <p className="muted">Escolha o serviço, o horário e pronto. Sem ligação, sem esperar resposta.</p>
          {shop.isDemo && <p className="badge warn">Loja de demonstração: os agendamentos somem todo dia às 4h.</p>}
        </header>
        <ol className="steps-bar" aria-label="Etapas">
          {stepLabel.map((l, i) => (
            <li key={l} className={i + 1 === step ? "on" : i + 1 < step ? "done" : ""}>
              <span>{i + 1 < step ? <Icon name="check" size={14} /> : i + 1}</span> {l}
            </li>
          ))}
        </ol>

        {step === 1 && (
          shop.services.length ? (
            <div className="service-list">
              {shop.services.map((s, i) => (
                <button key={s.id} className="service-card card rise" style={{ "--i": i } as CSSProperties} onClick={() => (setService(s), setTime(""), setStep(2))}>
                  <strong>{s.name}</strong>
                  <span className="muted small"><Icon name="clock" size={14} /> {s.durationMinutes} min</span>
                  <span className="price num">{brl(s.price)}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon="calendar" title="Nenhum serviço online agora" text="Fale direto com a loja para agendar." />
          )
        )}

        {step === 2 && service && (
          <div className="card panel rise">
            <p className="picked-line">
              <strong>{service.name}</strong> · {service.durationMinutes} min · {brl(service.price)}
              <button className="btn sm quiet" onClick={() => setStep(1)}>Trocar</button>
            </p>
            <div className="day-strip" role="group" aria-label="Dia">
              {days.map((d) => (
                <button key={d} className="day-chip" aria-pressed={d === day} onClick={() => (setDay(d), setTime(""))}>
                  <small>{shortDay(d).split(" ")[0]}</small>
                  <strong>{d.slice(8)}</strong>
                </button>
              ))}
            </div>
            <h3 className="day-title">{cap(LONG.format(new Date(`${day}T12:00:00`)))}</h3>
            {daySlots === null ? (
              <div className="slot-grid"><Skeletons count={8} height={42} /></div>
            ) : daySlots.length ? (
              <div className="slot-grid">
                {daySlots.map((t) => (
                  <button key={t} className="slot-btn num" aria-pressed={t === time} onClick={() => setTime(t)}>{t}</button>
                ))}
              </div>
            ) : (
              <p className="muted">Nenhum horário livre neste dia. Tente outro.</p>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            <div className="form-actions">
              <button className="btn lg" disabled={!time} onClick={() => (setError(""), setStep(me ? 4 : 3))}>Continuar <Icon name="arrow" size={18} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <TutorLogin
            slug={slug}
            isDemo={shop.isDemo}
            onDone={async () => {
              const data = await loadMe();
              if (data) setStep(4);
            }}
          />
        )}

        {step === 4 && service && me && (
          <div className="card panel rise">
            <h3>Confirme o agendamento</h3>
            <dl className="confirm">
              <div><dt>Serviço</dt><dd>{service.name} · {brl(service.price)}</dd></div>
              <div><dt>Quando</dt><dd>{cap(LONG.format(new Date(`${day}T12:00:00`)))} às {time}</dd></div>
              <div><dt>Tutor</dt><dd>{me.client.name}</dd></div>
            </dl>
            <div className="field">
              <span>Para qual pet?</span>
              <div className="chips">
                {me.pets.map((p) => (
                  <button key={p.id} className="chip" aria-pressed={petId === p.id} onClick={() => setPetId(p.id)}>{p.name}</button>
                ))}
              </div>
            </div>
            <label className="field"><span>Observação para a loja (opcional)</span>
              <textarea className="input" rows={2} maxLength={300} placeholder="Ex.: ele fica nervoso com secador" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="form-actions">
              <button className="btn quiet" onClick={() => setStep(2)}>Voltar</button>
              <button className="btn lg" disabled={busy || !petId} onClick={confirm}>{busy ? "Agendando..." : "Confirmar agendamento"}</button>
            </div>
            <p className="muted small">Não é você? <button className="link-btn" onClick={() => (tutorToken.clear(slug), setMe(null), setStep(3))}>Entrar com outro e-mail</button></p>
          </div>
        )}
      </section>
    </PortalFrame>
  );
}
