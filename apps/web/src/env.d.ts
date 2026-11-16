/// <reference types="vite/client" />
import "vue-router";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
  }
}

declare module "vue-router" {
  interface RouteMeta {
    auth?: boolean;
    guest?: boolean;
    title?: string;
  }
}
