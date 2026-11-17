import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/lib/toast";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/marketing.css";
import "@/styles/app.css";

// Baixadas no build e servidas pelo próprio site (sem Google Fonts em produção).
const display = Fredoka({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display", display: "swap" });
const body = Nunito_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://pet-sytem.netlify.app"),
  title: { default: "Pet System · Gestão para pet shops, creches e clínicas", template: "%s · Pet System" },
  description:
    "Agenda, caixa, estoque, clientes e pets num lugar só. Feito para pet shops, creches e clínicas veterinárias. Teste grátis por 14 dias.",
  icons: { icon: "/favicon.svg" },
  openGraph: { images: ["/img/hero-poster.webp"], locale: "pt_BR", siteName: "Pet System" },
};

export const viewport: Viewport = { themeColor: "#ba2bd2" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
