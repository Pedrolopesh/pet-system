"use client";

import type { Appointment, Category, Client, Employee, Payment, Product, Sale } from "@petsystem/contracts";
import { CATEGORIES, LABELS, parseMoney, PAYMENTS } from "@petsystem/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { EmptyState, Skeletons } from "@/components/ui";
import { agendaApi, clientsApi, employeesApi, productsApi, salesApi } from "@/lib/api";
import { hhmm, minuteOfDay, toDay } from "@/lib/dates";
import { brl } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useToast } from "@/lib/toast";

type Line = { product: Product; qty: number };

export function PosBoard() {
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [toBill, setToBill] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [cart, setCart] = useState<Line[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [payment, setPayment] = useState<Payment>("pix");
  const [discountText, setDiscountText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Sale | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    Promise.all([productsApi.list(), clientsApi.list(), employeesApi.list(), agendaApi.list(toDay(new Date()))])
      .then(([p, c, e, a]) => {
        setProducts(p);
        setClients(c);
        const active = e.filter((x) => x.active);
        setEmployees(active);
        setEmployeeId(active.find((x) => x.role === "atendente" || x.role === "gerente")?.id ?? active[0]?.id ?? "");
        // Para cobrar: atendimentos de hoje que já começaram (em atendimento, prontos ou concluídos) e ainda sem venda.
        setToBill(a.filter((x) => !x.saleId && ["em_atendimento", "pronto", "concluido"].includes(x.status)));
      }, (err) => setError(friendly(err)))
      .finally(() => setLoading(false));
  }, []);

  // Veio da agenda com "Cobrar no caixa": já coloca o atendimento no carrinho.
  useEffect(() => {
    const id = params.get("atendimento");
    if (!id || loading) return;
    agendaApi.get(id).then((a) => {
      if (!a.saleId) addAppointment(a);
      router.replace("/app/vender/");
    }, (err) => toast(friendly(err), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, loading]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => (category === "all" || p.category === category) && (!term || p.name.toLowerCase().includes(term)));
  }, [products, category, q]);
  const inCart = (p: Product) => cart.find((l) => l.product.id === p.id)?.qty ?? 0;
  const available = (p: Product) => (p.stock === null ? Infinity : p.stock - inCart(p));
  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discount = discountText.trim() ? parseMoney(discountText) : 0;
  const discountInvalid = discount === null || discount > subtotal;
  const total = subtotal - (discountInvalid ? 0 : (discount ?? 0));
  const items = cart.reduce((s, l) => s + l.qty, 0);

  function add(p: Product) {
    if (available(p) <= 0) return toast(`Sem estoque de ${p.name}.`, "error");
    setCart((c) => (c.some((l) => l.product.id === p.id) ? c.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { product: p, qty: 1 }]));
  }
  function change(line: Line, delta: number) {
    if (delta > 0 && available(line.product) <= 0) return;
    setCart((c) => c.map((l) => (l === line ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));
  }
  function addAppointment(a: Appointment) {
    if (appointments.some((x) => x.id === a.id)) return;
    const service = products.find((p) => p.id === a.service.id);
    if (!service) return toast("O serviço deste atendimento está desativado.", "error");
    setAppointments((all) => [...all, a]);
    add(service);
    setClientId(a.client.id);
    if (a.employee) setEmployeeId(a.employee.id);
  }

  async function finish() {
    setError("");
    if (!employeeId) return setError("Escolha quem está atendendo.");
    if (discountInvalid) return setError("Confira o desconto.");
    setBusy(true);
    try {
      const sale = await salesApi.create({
        items: cart.map((l) => ({ productId: l.product.id, qty: l.qty })),
        clientId: clientId || null,
        employeeId,
        payment,
        discount: discount ?? 0,
        appointmentIds: appointments.map((a) => a.id),
      });
      setProducts((all) => all.map((p) => {
        const l = cart.find((x) => x.product.id === p.id);
        return l && p.stock !== null ? { ...p, stock: p.stock - l.qty } : p;
      }));
      setToBill((all) => all.filter((a) => !appointments.some((x) => x.id === a.id)));
      setDone(sale);
      setCart([]);
      setAppointments([]);
      setDiscountText("");
      setClientId("");
      setCartOpen(false);
    } catch (err) {
      setError(friendly(err));
      productsApi.list().then(setProducts, () => null);
    } finally {
      setBusy(false);
    }
  }

  const pending = toBill.filter((a) => !appointments.some((x) => x.id === a.id));

  return (
    <div className="pos">
      <section className="catalog">
        {pending.length > 0 && (
          <div className="to-bill card rise">
            <strong><Icon name="calendar" size={18} /> Atendimentos de hoje para cobrar</strong>
            <div className="chips">
              {pending.map((a) => (
                <button key={a.id} className="chip" onClick={() => addAppointment(a)}>
                  {hhmm(minuteOfDay(a.startsAt))} · {a.pet.name} · {a.service.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="search">
          <Icon name="search" size={18} />
          <input className="input" type="search" placeholder="Buscar produto ou serviço" aria-label="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips scroll-x" role="group" aria-label="Categoria">
          <button className="chip" aria-pressed={category === "all"} onClick={() => setCategory("all")}>Tudo</button>
          {CATEGORIES.map((c) => (
            <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{LABELS.category[c]}</button>
          ))}
        </div>
        {loading ? (
          <div className="tiles"><Skeletons count={9} height={118} /></div>
        ) : visible.length ? (
          <div className="tiles">
            {visible.map((p, i) => (
              <button
                key={p.id}
                className={`tile rise${available(p) <= 0 ? " out" : ""}${inCart(p) ? " picked" : ""}`}
                style={{ "--i": Math.min(i, 12) } as CSSProperties}
                disabled={available(p) <= 0}
                onClick={() => add(p)}
              >
                <span className="cat">{LABELS.category[p.category]}</span>
                <strong className="name">{p.name}</strong>
                <span className="row">
                  <span className="price num">{brl(p.price)}</span>
                  {p.stock === null ? (
                    <span className="badge gray">serviço</span>
                  ) : (
                    <span className={`badge ${available(p) <= 0 ? "danger" : p.stock <= p.minStock ? "warn" : "gray"}`}>{available(p)} un.</span>
                  )}
                </span>
                {inCart(p) > 0 && <span className="qty">{inCart(p)}</span>}
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon="search" title="Nada encontrado" text="Tente outro nome ou outra categoria." />
        )}
      </section>

      <aside className={`cart card${cartOpen ? " open" : ""}`} aria-label="Carrinho">
        <button className="cart-toggle" aria-expanded={cartOpen} onClick={() => setCartOpen((o) => !o)}>
          <span><Icon name="cart" size={18} /> {items} {items === 1 ? "item" : "itens"}</span>
          <strong className="num">{brl(total)}</strong>
        </button>
        <div className="cart-body">
          <h2>Carrinho</h2>
          {appointments.length > 0 && (
            <p className="billing-note">
              <Icon name="calendar" size={16} /> Cobrando {appointments.length === 1 ? "o atendimento" : "os atendimentos"} de {appointments.map((a) => a.pet.name).join(", ")}
            </p>
          )}
          {cart.length ? (
            <ul className="lines">
              {cart.map((l) => (
                <li key={l.product.id}>
                  <div className="ln">
                    <strong>{l.product.name}</strong>
                    <small className="muted num">{brl(l.product.price)} cada</small>
                  </div>
                  <div className="stepper">
                    <button className="icon-btn" aria-label={`Tirar um ${l.product.name}`} onClick={() => change(l, -1)}><Icon name={l.qty === 1 ? "trash" : "minus"} size={16} /></button>
                    <span className="num">{l.qty}</span>
                    <button className="icon-btn" aria-label={`Mais um ${l.product.name}`} disabled={available(l.product) <= 0} onClick={() => change(l, 1)}><Icon name="plus" size={16} /></button>
                  </div>
                  <strong className="num sum">{brl(l.product.price * l.qty)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="cart" title="Carrinho vazio" text="Toque nos produtos ou num atendimento de hoje." />
          )}
          <div className="form">
            <label className="field"><span>Cliente</span>
              <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Cliente avulso</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.pets.length ? ` · ${c.pets.map((p) => p.name).join(", ")}` : ""}</option>)}
              </select>
            </label>
            <label className="field"><span>Atendente</span>
              <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <div className="field">
              <span>Pagamento</span>
              <div className="pay" role="group" aria-label="Forma de pagamento">
                {PAYMENTS.map((p) => (
                  <button key={p} type="button" aria-pressed={payment === p} onClick={() => setPayment(p)}>{LABELS.payment[p]}</button>
                ))}
              </div>
            </div>
            <label className="field"><span>Desconto (R$)</span>
              <input className="input" inputMode="decimal" placeholder="0,00" aria-invalid={discountText !== "" && discountInvalid} value={discountText} onChange={(e) => setDiscountText(e.target.value)} />
            </label>
          </div>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd className="num">{brl(subtotal)}</dd></div>
            {!!discount && !discountInvalid && <div><dt>Desconto</dt><dd className="num">− {brl(discount)}</dd></div>}
            <div className="grand"><dt>Total</dt><dd className="num">{brl(total)}</dd></div>
          </dl>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn lg finish" disabled={!cart.length || busy} onClick={finish}>
            {busy ? "Fechando..." : `Fechar venda · ${brl(total)}`}
          </button>
        </div>
      </aside>

      <Modal
        open={done !== null}
        title="Venda concluída"
        onClose={() => setDone(null)}
        footer={
          <>
            <Link className="btn ghost" href="/app/vendas/">Ver vendas</Link>
            <button className="btn" autoFocus onClick={() => setDone(null)}>Nova venda</button>
          </>
        }
      >
        {done && (
          <div className="receipt">
            <span className="ok-ic"><Icon name="check" size={30} /></span>
            <p className="muted">Venda #{done.number} · {LABELS.payment[done.payment]}</p>
            <p className="big num">{brl(done.total)}</p>
            <ul>
              {done.items.map((i) => (
                <li key={i.productId}><span>{i.qty}× {i.name}</span><span className="num">{brl(i.unitPrice * i.qty)}</span></li>
              ))}
            </ul>
            {done.client && <p className="muted">Cliente: {done.client.name}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
