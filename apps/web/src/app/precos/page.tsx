import { brl, PLAN_INFO, TRIAL_DAYS } from "@petsystem/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Preços",
  description: `Planos Básico e Pro para pet shops, creches e clínicas. ${TRIAL_DAYS} dias grátis, sem cartão.`,
};

const FAQ = [
  { q: "Preciso de cartão para testar?", a: `Não. Você usa tudo do plano Pro por ${TRIAL_DAYS} dias. Depois escolhe o plano que fizer sentido.` },
  { q: "O que acontece quando o teste acaba?", a: "Sua loja continua funcionando com os limites do Básico até você escolher um plano. Nada é apagado." },
  { q: "Posso usar para pet shop e creche ao mesmo tempo?", a: "Pode. No cadastro você marca todos os tipos de negócio, e a agenda e os serviços se ajustam." },
  { q: "Meus clientes conseguem agendar sozinhos?", a: "Ainda não. O agendamento online pelo tutor está nos próximos passos do produto." },
];

export default function Pricing() {
  return (
    <div className="landing">
      <SiteHeader />
      <section className="section pricing">
        <div className="wrap">
          <Reveal className="section-head center">
            <span className="eyebrow">Preços</span>
            <h1>Comece grátis. Pague só quando fizer sentido.</h1>
            <p className="lead">{TRIAL_DAYS} dias com tudo liberado, sem cartão de crédito.</p>
          </Reveal>
          <div className="plans">
            {(["basico", "pro"] as const).map((key, i) => {
              const plan = PLAN_INFO[key];
              return (
                <Reveal key={key} delay={i * 100} className={`plan card${key === "pro" ? " featured" : ""}`}>
                  {key === "pro" && <span className="badge warn tag">Mais escolhido</span>}
                  <h2>{plan.name}</h2>
                  <p className="price num">
                    {brl(plan.price)}
                    <small>/mês</small>
                  </p>
                  <ul>
                    {plan.highlights.map((h) => (
                      <li key={h}><Icon name="check" size={18} /> {h}</li>
                    ))}
                  </ul>
                  <Link className={`btn lg${key === "pro" ? "" : " ghost"}`} href="/entrar/?criar=1">Começar teste grátis</Link>
                </Reveal>
              );
            })}
          </div>
          <p className="muted center small-note">A cobrança das assinaturas ainda não está ativa: durante esta fase, os planos são liberados sem pagamento.</p>
          <div className="faq">
            <h2>Perguntas frequentes</h2>
            {FAQ.map((f) => (
              <details key={f.q} className="card">
                <summary>{f.q}<Icon name="plus" size={18} /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
