import type { reveal } from "./lib/reveal";

declare module "vue" {
  interface GlobalDirectives {
    vReveal: typeof reveal;
  }
}

export {};
