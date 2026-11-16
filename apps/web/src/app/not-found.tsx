import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="nf">
      <Link href="/"><Logo /></Link>
      <p className="code" aria-hidden="true">404</p>
      <h1>Esse caminho o farejador não achou.</h1>
      <p className="muted">A página não existe ou mudou de lugar.</p>
      <div className="row">
        <Link className="btn" href="/">Voltar ao início</Link>
        <Link className="btn ghost" href="/app/">Abrir o sistema</Link>
      </div>
    </main>
  );
}
