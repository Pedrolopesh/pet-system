"use client";

import type { Shop } from "@petsystem/contracts";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { accountApi } from "@/lib/api";
import { friendly } from "@/lib/messages";
import { useToast } from "@/lib/toast";

/** Agendamento online: liga/desliga, endereço público e prazos. */
export function BookingSettingsCard({ shop, canEdit, onSaved }: { shop: Shop; canEdit: boolean; onSaved: () => Promise<void> | void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    bookingEnabled: shop.bookingEnabled,
    slug: shop.slug ?? "",
    bookingNoticeHours: String(shop.bookingNoticeHours),
    cancelNoticeHours: String(shop.cancelNoticeHours),
    bookingWindowDays: String(shop.bookingWindowDays),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/agendar/?loja=${shop.slug ?? ""}`;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await accountApi.updateBooking({
        bookingEnabled: form.bookingEnabled,
        slug: form.slug,
        bookingNoticeHours: Number(form.bookingNoticeHours),
        cancelNoticeHours: Number(form.cancelNoticeHours),
        bookingWindowDays: Number(form.bookingWindowDays),
      });
      await onSaved();
      toast(form.bookingEnabled ? "Agendamento online ligado." : "Configurações salvas.");
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card panel rise" id="agendamento">
      <header>
        <div>
          <h3>Agendamento online</h3>
          <p className="muted small">Seus clientes agendam sozinhos pelo link, só nos serviços marcados como online e nos horários livres.</p>
        </div>
        <span className={`badge ${shop.bookingEnabled ? "ok" : "gray"}`}>{shop.bookingEnabled ? "Ligado" : "Desligado"}</span>
      </header>
      {shop.bookingEnabled && shop.slug && (
        <div className="invite-link">
          <input className="input" readOnly value={url} aria-label="Link de agendamento" onFocus={(e) => e.target.select()} />
          <button className="btn ghost" type="button" onClick={async () => (await navigator.clipboard.writeText(url), toast("Link copiado. Coloque na bio do Instagram e no WhatsApp."))}><Icon name="copy" size={16} /> Copiar</button>
          <small className="muted">
            <Link href={`/agendar/?loja=${shop.slug}`} target="_blank">Abrir a página de agendamento</Link> ·{" "}
            <Link href={`/portal/?loja=${shop.slug}`} target="_blank">área do tutor</Link>
          </small>
        </div>
      )}
      {shop.isDemo && <p className="muted small">Na demonstração estas configurações ficam travadas, para o link continuar funcionando para todo mundo.</p>}
      <form className="form-grid booking-form" onSubmit={save}>
        <label className="check-row full">
          <input type="checkbox" disabled={!canEdit} checked={form.bookingEnabled} onChange={(e) => setForm({ ...form, bookingEnabled: e.target.checked })} />
          Aceitar agendamentos pelo link
        </label>
        <label className="field full"><span>Endereço da página</span>
          <div className="slug-input"><span className="muted">/agendar/?loja=</span><input className="input" disabled={!canEdit} required pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" maxLength={40} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} /></div>
          <small className="muted">Letras minúsculas, números e hífen.</small>
        </label>
        <label className="field"><span>Antecedência mínima (horas)</span><input className="input" type="number" min={0} max={72} disabled={!canEdit} value={form.bookingNoticeHours} onChange={(e) => setForm({ ...form, bookingNoticeHours: e.target.value })} /></label>
        <label className="field"><span>Cancelar até (horas antes)</span><input className="input" type="number" min={0} max={72} disabled={!canEdit} value={form.cancelNoticeHours} onChange={(e) => setForm({ ...form, cancelNoticeHours: e.target.value })} /></label>
        <label className="field"><span>Agenda aberta por (dias)</span><input className="input" type="number" min={1} max={90} disabled={!canEdit} value={form.bookingWindowDays} onChange={(e) => setForm({ ...form, bookingWindowDays: e.target.value })} /></label>
        <p className="muted small full">Quais serviços aparecem online e quem faz cada um você define em <Link href="/app/produtos/">Produtos e serviços</Link>.</p>
        {error && <p className="error full" role="alert">{error}</p>}
        {canEdit && <div className="full form-actions"><button className="btn" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button></div>}
      </form>
    </section>
  );
}
