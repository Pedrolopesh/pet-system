import type { NextConfig } from "next";

/**
 * Site estático (`next build` gera `out/`): as páginas de venda saem prontas no build e a área
 * logada roda no navegador falando com a API. Cabeçalhos de segurança em `public/_headers`.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // Só no `next dev`: permite abrir pelo IP da rede local (teste no celular).
  allowedDevOrigins: ["127.0.0.1", "192.168.0.*"],
};

export default nextConfig;
