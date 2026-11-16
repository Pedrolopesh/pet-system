import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { AgendaMock } from "@/components/marketing/AgendaMock";
import { DemoButton } from "@/components/marketing/DemoButton";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";
import { Reveal } from "@/components/Reveal";
import { SEGMENTS } from "@/lib/segments";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "calendar", title: "Agenda sem conflito", text: "Banho, tosa, consulta, vacina e diária de creche com duração certa. Dois atendimentos no mesmo horário do mesmo profissional não passam." },
  { icon: "cart", title: "Caixa rápido", text: "Busque o produto, some os atendimentos do dia, escolha o pagamento e pronto. O estoque baixa sozinho." },
  { icon: "paw", title: "Clientes e seus pets", text: "O tutor com todos os pets, raça e espécie, e o histórico de atendimentos e compras de cada um." },
  { icon: "box", title: "Estoque que avisa", text: "Ração, farmácia e acessórios com estoque mínimo. O painel mostra o que repor antes de faltar." },
  { icon: "link", title: "Agendamento online", text: "Um link para a bio do Instagram: o tutor vê os horários livres e agenda sozinho, com login por código no e-mail." },
  { icon: "users", title: "Equipe com permissões", text: "Convide gerentes e atendentes por link. Cada um vê o que precisa, e só o dono mexe no plano." },
  { icon: "chart", title: "Relatórios de verdade", text: "Receita por dia, ticket médio, lucro bruto, serviços campeões e quem mais vendeu." },
];

export default function Home() {
  const [first] = SEGMENTS;
  return (
    <div className="landing">
      <SiteHeader />
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="copy">
            <span className="eyebrow"><Icon name="sparkle" size={16} /> Para pet shops, creches e clínicas</span>
            <h1>
              A agenda, o caixa e os <em>pets</em> do seu negócio num lugar só.
            </h1>
            <p className="lead">
              O Pet System organiza o dia de quem cuida de animais: horários sem conflito, atendimento do check-in à cobrança e
              o histórico de cada pet a um toque. Teste numa loja de demonstração, sem cadastro.
            </p>
            <div className="ctas">
              <DemoButton />
              <Link className="btn lg ghost" href="/entrar/?criar=1">Começar 14 dias grátis</Link>
            </div>
            <p className="note"><Icon name="check" size={16} /> Sem cartão de crédito. A demo volta ao estado original todo dia.</p>
            <Link className="note link-note" href="/agendar/?loja=patas-e-cia"><Icon name="calendar" size={16} /> Ver como o tutor agenda online →</Link>
          </div>
          <div className="media" aria-hidden="true">
            <div className="frame">
              <video autoPlay muted loop playsInline preload="metadata" poster="/img/hero-poster.webp">
                <source src="/hero.mp4" type="video/mp4" />
              </video>
            </div>
            {first && <AgendaMock segment={first} />}
          </div>
        </div>
      </section>

      <section className="section" id="segmentos">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">Para quem é</span>
            <h2>Um sistema, três jeitos de cuidar.</h2>
          </Reveal>
          <div className="segments">
            {SEGMENTS.map((s, i) => (
              <Reveal key={s.slug} delay={i * 80}>
                <Link className="segment card" href={`/${s.slug}/`}>
                  <span className="seg-ic"><Icon name={s.icon} size={26} /></span>
                  <h3>{s.name}</h3>
                  <p>{s.lead}</p>
                  <span className="more">Ver como funciona <Icon name="arrow" size={16} /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section band" id="recursos">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">Recursos</span>
            <h2>Tudo que a rotina pede, nada que atrapalhe.</h2>
          </Reveal>
          <div className="features">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60} className="feature card">
                <span className="ic"><Icon name={f.icon} size={22} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <Reveal className="photos">
            <img src="/img/balcao.webp" alt="Cachorro sentado no balcão de um pet shop" width={570} height={452} loading="lazy" />
            <img src="/img/pug-notebook.webp" alt="" width={438} height={455} loading="lazy" />
          </Reveal>
          <Reveal delay={120}>
            <span className="eyebrow">Seguro e confiável</span>
            <h2>Seus dados e os dos seus clientes, bem guardados.</h2>
            <ul className="checks">
              <li><Icon name="check" size={18} /> Cada negócio só enxerga os próprios dados.</li>
              <li><Icon name="check" size={18} /> Estoque e agenda nunca ficam inconsistentes, nem com dois caixas ao mesmo tempo.</li>
              <li><Icon name="check" size={18} /> Senhas protegidas com argon2 e sessão que expira sozinha.</li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal className="cta">
            <div>
              <h2>Abra a loja de demonstração e marque um banho.</h2>
              <p>Leva menos de um minuto. Sem cadastro, sem cartão.</p>
            </div>
            <DemoButton label="Testar agora" className="btn lg light" />
          </Reveal>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
