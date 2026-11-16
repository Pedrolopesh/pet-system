import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";

/** Moldura das páginas do tutor: nome da loja no topo e links de agendar e área do tutor. */
export function PortalFrame({ shopName, slug, children }: { shopName?: string; slug: string; children: ReactNode }) {
  return (
    <div className="portal">
      <header className="portal-top">
        <div className="wrap portal-bar">
          <div className="portal-brand">
            <span className="portal-mark" aria-hidden="true"><Icon name="paw" size={20} /></span>
            <strong>{shopName ?? " "}</strong>
          </div>
          <nav>
            <Link className="btn sm quiet" href={`/agendar/?loja=${slug}`}><Icon name="calendar" size={16} /> Agendar</Link>
            <Link className="btn sm ghost" href={`/portal/?loja=${slug}`}><Icon name="users" size={16} /> Minha área</Link>
          </nav>
        </div>
      </header>
      <main className="wrap portal-main">{children}</main>
      <footer className="portal-foot">
        Agendamento online por <Link href="/"><Logo /></Link>
      </footer>
    </div>
  );
}
