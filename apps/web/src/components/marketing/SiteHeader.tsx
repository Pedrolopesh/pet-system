"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useSession } from "@/lib/session";

export function SiteHeader() {
  const { me, restore } = useSession();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    void restore();
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [restore]);

  return (
    <header className={`site-top${scrolled ? " scrolled" : ""}`}>
      <div className="wrap bar">
        <Link href="/" aria-label="Pet System, início">
          <Logo />
        </Link>
        <nav aria-label="Principal">
          <Link className="link" href="/pet-shop/">Pet shop</Link>
          <Link className="link" href="/creche/">Creche</Link>
          <Link className="link" href="/clinica/">Clínica</Link>
          <Link className="link" href="/precos/">Preços</Link>
          {me ? (
            <Link className="btn sm" href="/app/">Abrir o sistema</Link>
          ) : (
            <Link className="btn sm ghost" href="/entrar/">Entrar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="wrap foot-row">
        <Logo />
        <nav aria-label="Rodapé">
          <Link href="/pet-shop/">Pet shop</Link>
          <Link href="/creche/">Creche</Link>
          <Link href="/clinica/">Clínica</Link>
          <Link href="/precos/">Preços</Link>
        </nav>
        <p>
          Projeto de portfólio de{" "}
          <a href="https://www.pedrolopes.tech" target="_blank" rel="noopener noreferrer">Pedro Lopes</a> ·{" "}
          <a href="https://github.com/Pedrolopesh/pet-system" target="_blank" rel="noopener noreferrer">código no GitHub</a>
        </p>
      </div>
    </footer>
  );
}
