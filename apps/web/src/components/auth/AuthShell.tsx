import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

/** Moldura das telas de entrada: lado roxo com a marca e o formulário à direita. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth">
      <section className="auth-side" aria-hidden="true">
        <Link href="/" className="back">
          <Logo light />
        </Link>
        <div className="quote">
          <img src="/img/carrinho.webp" alt="" width={570} height={452} />
          <p>Agenda, caixa, estoque e pets no mesmo lugar.</p>
          <small>Para pet shops, creches e clínicas veterinárias.</small>
        </div>
      </section>
      <section className="auth-panel">
        <Link href="/" className="mobile-logo">
          <Logo />
        </Link>
        <div className="auth-box">{children}</div>
      </section>
    </main>
  );
}
