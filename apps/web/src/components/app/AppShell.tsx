"use client";

import { PERMISSIONS } from "@petsystem/contracts";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { useSession } from "@/lib/session";

type NavItem = { href: string; label: string; icon: IconName; needs?: keyof typeof PERMISSIONS; clinic?: true };
const NAV: NavItem[] = [
  { href: "/app/", label: "Painel", icon: "home" },
  { href: "/app/agenda/", label: "Agenda", icon: "calendar" },
  { href: "/app/clinica/", label: "Clínica", icon: "stethoscope", clinic: true },
  { href: "/app/vender/", label: "Vender", icon: "cart" },
  { href: "/app/vendas/", label: "Vendas", icon: "receipt" },
  { href: "/app/clientes/", label: "Clientes e pets", icon: "paw" },
  { href: "/app/produtos/", label: "Produtos e serviços", icon: "box" },
  { href: "/app/equipe/", label: "Equipe", icon: "badge" },
  { href: "/app/relatorios/", label: "Relatórios", icon: "chart", needs: "manageShop" },
  { href: "/app/configuracoes/", label: "Configurações", icon: "settings" },
];

const TITLES: Record<string, string> = {
  ...Object.fromEntries(NAV.map((n) => [n.href, n.label])),
  "/app/clinica/pet/": "Ficha clínica",
  "/app/clinica/receita/": "Receita",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { me, ready, restore, logout, can } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;

  useEffect(() => {
    if (!me) void restore();
  }, [me, restore]);
  useEffect(() => {
    if (ready && !me) router.replace(`/entrar/?next=${encodeURIComponent(path)}`);
  }, [ready, me, router, path]);
  useEffect(() => {
    document.title = `${TITLES[path] ?? "Pet System"} · Pet System`;
  }, [path]);

  if (!me)
    return (
      <div className="boot" aria-busy="true">
        <Logo />
      </div>
    );

  const trialDays =
    me.shop.plan === "teste" && me.shop.trialEndsAt
      ? Math.ceil((new Date(me.shop.trialEndsAt).getTime() - now) / 86_400_000)
      : null;

  return (
    <div className={`shell${open ? " open" : ""}`}>
      <aside className="side" aria-label="Menu do sistema">
        <Link href="/app/" className="brand"><Logo light /></Link>
        <nav>
          {NAV.filter((n) => (!n.needs || can(n.needs)) && (!n.clinic || me.shop.businessTypes.includes("clinica"))).map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`item${path === item.href || (item.href === "/app/clinica/" && path.startsWith("/app/clinica/")) ? " active" : ""}${item.href === "/app/vender/" ? " cta" : ""}`}>
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="who">
          <Avatar name={me.user.name} size={36} />
          <div className="who-text">
            <strong>{me.shop.name}</strong>
            <small>{me.user.name}</small>
          </div>
          <button
            className="icon-btn"
            aria-label="Sair"
            title="Sair"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu" aria-label="Abrir menu" onClick={() => setOpen((o) => !o)}>
            <Icon name="menu" />
          </button>
          <h1>{TITLES[path] ?? "Pet System"}</h1>
          {me.shop.isDemo ? (
            <span className="badge warn demo" title="Os dados voltam ao original todo dia às 4h">
              <Icon name="sparkle" size={14} /> Demonstração
            </span>
          ) : trialDays !== null ? (
            <Link href="/app/configuracoes/" className={`badge ${trialDays <= 3 ? "danger" : "warn"} demo`}>
              {trialDays > 0 ? `Teste: ${trialDays} ${trialDays === 1 ? "dia" : "dias"}` : "Teste encerrado"}
            </Link>
          ) : null}
          {path !== "/app/agenda/" && (
            <Link className="btn sm ghost hide-sm" href="/app/agenda/?novo=1"><Icon name="calendar" size={16} /> Agendar</Link>
          )}
          {path !== "/app/vender/" && (
            <Link className="btn sm" href="/app/vender/"><Icon name="plus" size={16} /> Venda</Link>
          )}
        </header>
        <main className="content" key={path}>
          {children}
        </main>
      </div>
    </div>
  );
}
