"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { agendaApi, clientsApi, employeesApi, productsApi, salesApi } from "@/lib/api";
import { addDays, toDay } from "@/lib/dates";
import { useSession } from "@/lib/session";

type Step = { id: string; icon: IconName; title: string; text: string; href: string; done: boolean };
const KEY = "petsystem.guide.hidden";

/**
 * Primeiros passos (inspirado na página de tutorial da versão antiga): o que falta para a loja
 * começar a rodar. Cada passo se marca sozinho quando é feito; some quando tudo estiver pronto.
 */
export function GettingStarted() {
  const { me } = useSession();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && localStorage.getItem(KEY) === "1");

  useEffect(() => {
    if (hidden || !me || me.shop.isDemo) return;
    const today = toDay(new Date());
    Promise.all([
      productsApi.list({ category: "servico" }),
      employeesApi.list(),
      clientsApi.list(),
      agendaApi.list(addDays(today, -15), 31),
      salesApi.list({ days: 366, pageSize: 1 }),
    ]).then(([services, team, clients, agenda, sales]) =>
      setSteps([
        { id: "services", icon: "box", title: "Cadastre seus serviços", text: "Banho, consulta, diária: com preço e duração.", href: "/app/produtos/", done: services.length > 0 },
        { id: "team", icon: "badge", title: "Cadastre a equipe", text: "Quem atende aparece como coluna na agenda.", href: "/app/equipe/", done: team.length > 0 },
        { id: "client", icon: "paw", title: "Cadastre um cliente e o pet", text: "O tutor e todos os pets dele.", href: "/app/clientes/?novo=1", done: clients.length > 0 },
        { id: "agenda", icon: "calendar", title: "Marque o primeiro atendimento", text: "Clique num horário vazio da agenda.", href: "/app/agenda/?novo=1", done: agenda.length > 0 },
        { id: "sale", icon: "cart", title: "Feche a primeira venda", text: "Cobre um atendimento ou um produto no caixa.", href: "/app/vender/", done: sales.total > 0 },
      ]),
      () => null,
    );
  }, [hidden, me]);

  if (hidden || !steps || steps.every((s) => s.done)) return null;
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="card panel guide rise">
      <header>
        <div>
          <h3>Primeiros passos</h3>
          <p className="muted small">{done} de {steps.length} feitos. Leva uns 10 minutos.</p>
        </div>
        <button
          className="icon-btn"
          aria-label="Esconder primeiros passos"
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setHidden(true);
          }}
        >
          <Icon name="close" size={18} />
        </button>
      </header>
      <div className="guide-bar" aria-hidden="true"><span style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="guide-steps">
        {steps.map((s) => (
          <li key={s.id} className={s.done ? "done" : ""}>
            <Link href={s.href}>
              <span className="g-ic">{s.done ? <Icon name="check" size={18} /> : <Icon name={s.icon} size={18} />}</span>
              <span><strong>{s.title}</strong><small>{s.text}</small></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
