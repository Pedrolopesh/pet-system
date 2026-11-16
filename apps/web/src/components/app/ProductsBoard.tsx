"use client";

import type { Category, Product, StockAdjust } from "@petsystem/contracts";
import { CATEGORIES, LABELS, parseMoney, toMoneyInput } from "@petsystem/contracts";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { EmptyState, Skeletons } from "@/components/ui";
import { productsApi } from "@/lib/api";
import { brl } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/toast";

const EMPTY = { name: "", category: "racao" as Category, price: "", cost: "", stock: "0", minStock: "0", duration: "60" };

export function ProductsBoard() {
  const params = useSearchParams();
  const { can } = useSession();
  const manage = can("manageShop");
  const toast = useToast();
  const [list, setList] = useState<Product[] | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [onlyLow, setOnlyLow] = useState(params.get("baixo") === "1");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [adj, setAdj] = useState({ qty: "1", reason: "entrada" as StockAdjust["reason"] });
  const [adjError, setAdjError] = useState("");

  useEffect(() => {
    productsApi.list({ includeInactive: true }).then(setList, (e) => toast(friendly(e), "error"));
  }, [toast]);

  const isLow = (p: Product) => p.stock !== null && p.stock <= p.minStock;
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (list ?? []).filter(
      (p) => (showInactive || p.active) && (category === "all" || p.category === category) && (!onlyLow || isLow(p)) && (!term || p.name.toLowerCase().includes(term)),
    );
  }, [list, q, category, onlyLow, showInactive]);
  const margin = (p: Product) => (p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0);
  const replace = (p: Product) => setList((all) => all?.map((x) => (x.id === p.id ? p : x)) ?? null);

  function openForm(p?: Product) {
    setEditing(p ?? null);
    setForm(
      p
        ? { name: p.name, category: p.category, price: toMoneyInput(p.price), cost: toMoneyInput(p.cost), stock: String(p.stock ?? 0), minStock: String(p.minStock), duration: String(p.durationMinutes ?? 60) }
        : EMPTY,
    );
    setFormError("");
    setFormOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const price = parseMoney(form.price);
    const cost = parseMoney(form.cost);
    if (price === null || cost === null) return setFormError("Preço e custo no formato 12,90.");
    const service = form.category === "servico";
    const minStock = service ? 0 : Math.max(0, Math.trunc(Number(form.minStock) || 0));
    const durationMinutes = service ? Math.max(10, Math.trunc(Number(form.duration) || 60)) : null;
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        replace(await productsApi.update(editing.id, { name: form.name, category: form.category, price, cost, minStock, durationMinutes }));
        toast("Produto atualizado.");
      } else {
        const created = await productsApi.create({
          name: form.name,
          category: form.category,
          price,
          cost,
          stock: service ? null : Math.max(0, Math.trunc(Number(form.stock) || 0)),
          minStock,
          durationMinutes,
        });
        setList((all) => [...(all ?? []), created].sort((a, b) => a.name.localeCompare(b.name)));
        toast(service ? "Serviço cadastrado. Ele já aparece na agenda." : "Produto cadastrado.");
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(friendly(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Product) {
    try {
      const updated = await productsApi.update(p.id, { active: !p.active });
      replace(updated);
      setFormOpen(false);
      toast(updated.active ? "Produto reativado." : "Produto desativado. Ele some do caixa e da agenda.");
    } catch (err) {
      toast(friendly(err), "error");
    }
  }

  async function saveAdjust(e: FormEvent) {
    e.preventDefault();
    const p = adjusting!;
    const n = Math.trunc(Number(adj.qty));
    if (!n) return setAdjError("Informe uma quantidade.");
    const delta = adj.reason === "entrada" ? Math.abs(n) : adj.reason === "perda" ? -Math.abs(n) : n;
    try {
      const updated = await productsApi.adjust(p.id, { delta, reason: adj.reason });
      replace(updated);
      toast(`Estoque de ${p.name}: ${updated.stock} un.`);
      setAdjusting(null);
    } catch (err) {
      setAdjError(friendly(err));
    }
  }

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="stack-page">
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input className="input" type="search" placeholder="Buscar produto ou serviço" aria-label="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {manage && <button className="btn" onClick={() => openForm()}><Icon name="plus" size={18} /> Novo</button>}
      </div>
      <div className="toolbar">
        <div className="chips scroll-x" role="group" aria-label="Categoria">
          <button className="chip" aria-pressed={category === "all"} onClick={() => setCategory("all")}>Tudo</button>
          {CATEGORIES.map((c) => <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{LABELS.category[c]}</button>)}
        </div>
        <div className="chips scroll-x">
          <button className="chip" aria-pressed={onlyLow} onClick={() => setOnlyLow(!onlyLow)}><Icon name="alert" size={14} /> Estoque baixo</button>
          <button className="chip" aria-pressed={showInactive} onClick={() => setShowInactive(!showInactive)}>Mostrar desativados</button>
        </div>
      </div>
      <section className="card">
        {!list ? (
          <div style={{ padding: 20, display: "grid", gap: 10 }}><Skeletons count={8} height={44} /></div>
        ) : visible.length ? (
          <table className="table stack">
            <thead>
              <tr><th>Produto</th><th>Categoria</th><th className="right">Preço</th><th className="right">Margem</th><th className="right">Estoque / duração</th><th /></tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr key={p.id} className={`rise${p.active ? "" : " off"}`} style={{ "--i": Math.min(i, 14) } as CSSProperties}>
                  <td><strong>{p.name}</strong> {!p.active && <span className="badge gray">desativado</span>}</td>
                  <td data-hide-mobile><span className="badge gray">{LABELS.category[p.category]}</span></td>
                  <td className="right num">{brl(p.price)}</td>
                  <td className="right num" data-hide-mobile>{margin(p)}%</td>
                  <td className="right">
                    {p.stock === null ? (
                      <span className="muted small"><Icon name="clock" size={14} /> {p.durationMinutes ?? 60} min</span>
                    ) : (
                      <span className={`badge ${p.stock === 0 ? "danger" : isLow(p) ? "warn" : "ok"}`}>{p.stock} un.</span>
                    )}
                  </td>
                  <td className="right actions">
                    {manage && p.stock !== null && (
                      <button className="icon-btn" aria-label={`Ajustar estoque de ${p.name}`} title="Ajustar estoque" onClick={() => (setAdjusting(p), setAdj({ qty: "1", reason: "entrada" }), setAdjError(""))}><Icon name="restock" size={18} /></button>
                    )}
                    {manage && <button className="icon-btn" aria-label={`Editar ${p.name}`} title="Editar" onClick={() => openForm(p)}><Icon name="edit" size={18} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : list.length ? (
          <EmptyState icon="search" title="Nada com esses filtros" text="Tente outra busca ou limpe os filtros." />
        ) : (
          <EmptyState icon="box" title="Nenhum produto ainda" text="Cadastre produtos e serviços para vender e agendar.">
            {manage && <button className="btn sm" onClick={() => openForm()}>Cadastrar</button>}
          </EmptyState>
        )}
      </section>

      <Modal
        open={formOpen}
        title={editing ? "Editar" : "Novo produto ou serviço"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            {editing && <button className="btn quiet" type="button" onClick={() => toggleActive(editing)}>{editing.active ? "Desativar" : "Reativar"}</button>}
            <button className="btn" form="product-form" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
          </>
        }
      >
        <form id="product-form" className="form-grid" onSubmit={save}>
          <label className="field full"><span>Nome</span><input className="input" required maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="field"><span>Categoria</span>
            <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{LABELS.category[c]}</option>)}
            </select>
          </label>
          <label className="field"><span>Preço (R$)</span><input className="input" inputMode="decimal" placeholder="0,00" required value={form.price} onChange={(e) => set("price", e.target.value)} /></label>
          <label className="field"><span>Custo (R$)</span><input className="input" inputMode="decimal" placeholder="0,00" required value={form.cost} onChange={(e) => set("cost", e.target.value)} /></label>
          {form.category === "servico" ? (
            <label className="field"><span>Duração na agenda (min)</span><input className="input" type="number" min={10} max={720} step={5} value={form.duration} onChange={(e) => set("duration", e.target.value)} /></label>
          ) : (
            <>
              {!editing && <label className="field"><span>Estoque inicial</span><input className="input" type="number" min={0} step={1} value={form.stock} onChange={(e) => set("stock", e.target.value)} /></label>}
              <label className="field"><span>Estoque mínimo</span><input className="input" type="number" min={0} step={1} value={form.minStock} onChange={(e) => set("minStock", e.target.value)} /></label>
            </>
          )}
          {formError && <p className="error full" role="alert">{formError}</p>}
        </form>
      </Modal>

      <Modal open={adjusting !== null} title="Ajustar estoque" onClose={() => setAdjusting(null)} footer={<button className="btn" form="adjust-form">Confirmar ajuste</button>}>
        {adjusting && (
          <form id="adjust-form" className="form-grid" onSubmit={saveAdjust}>
            <p className="full"><strong>{adjusting.name}</strong><br /><span className="muted">Estoque atual: {adjusting.stock} un.</span></p>
            <div className="field full">
              <span>Motivo</span>
              <div className="chips" role="group" aria-label="Motivo">
                {(["entrada", "perda", "correcao"] as const).map((r) => (
                  <button key={r} type="button" className="chip" aria-pressed={adj.reason === r} onClick={() => setAdj({ ...adj, reason: r })}>
                    {r === "entrada" ? "Entrada (compra)" : r === "perda" ? "Perda / avaria" : "Correção (+/−)"}
                  </button>
                ))}
              </div>
            </div>
            <label className="field full">
              <span>Quantidade</span>
              <input className="input" type="number" step={1} min={adj.reason === "correcao" ? undefined : 1} required value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: e.target.value })} />
              {adj.reason === "correcao" && <small className="muted">Use número negativo para tirar do estoque.</small>}
            </label>
            {adjError && <p className="error full" role="alert">{adjError}</p>}
          </form>
        )}
      </Modal>
    </div>
  );
}
