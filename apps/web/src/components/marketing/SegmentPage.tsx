import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import type { Segment } from "@/lib/segments";
import { SEGMENTS } from "@/lib/segments";
import { AgendaMock } from "./AgendaMock";
import { DemoButton } from "./DemoButton";
import { SiteFooter, SiteHeader } from "./SiteHeader";

export function SegmentPage({ segment }: { segment: Segment }) {
  const others = SEGMENTS.filter((s) => s.slug !== segment.slug);
  return (
    <div className="landing">
      <SiteHeader />
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="copy">
            <span className="eyebrow"><Icon name={segment.icon} size={16} /> {segment.name}</span>
            <h1>{segment.title}</h1>
            <p className="lead">{segment.lead}</p>
            <div className="ctas">
              <Link className="btn lg" href={`/entrar/?criar=1&tipo=${segment.type}`}>Começar 14 dias grátis</Link>
              <DemoButton label="Ver a demonstração" className="btn lg ghost" />
            </div>
          </div>
          <div className="media">
            <AgendaMock segment={segment} />
          </div>
        </div>
      </section>
      <section className="section band">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">Na rotina de {segment.name.toLowerCase()}</span>
            <h2>Feito para o seu dia a dia.</h2>
          </Reveal>
          <div className="features two">
            {segment.features.map((f, i) => (
              <Reveal key={f.title} delay={i * 70} className="feature card">
                <span className="ic"><Icon name={f.icon} size={22} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="eyebrow">Tem mais de um serviço?</span>
            <h2>Combine pet shop, creche e clínica na mesma conta.</h2>
          </Reveal>
          <div className="segments two">
            {others.map((s) => (
              <Link key={s.slug} className="segment card" href={`/${s.slug}/`}>
                <span className="seg-ic"><Icon name={s.icon} size={26} /></span>
                <h3>{s.name}</h3>
                <p>{s.lead}</p>
                <span className="more">Ver como funciona <Icon name="arrow" size={16} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
