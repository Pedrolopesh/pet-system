import nextConfig from "eslint-config-next";
import prettier from "eslint-config-prettier";

const config = [
  { ignores: ["out/**", ".next/**", "next-env.d.ts"] },
  ...nextConfig,
  prettier,
  { rules: { "@next/next/no-img-element": "off" } },
];

export default config;
