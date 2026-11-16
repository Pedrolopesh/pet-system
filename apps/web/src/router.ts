import { createRouter, createWebHistory } from "vue-router";
import { useSession } from "@/stores/session";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash, behavior: "smooth", top: 80 } : { top: 0 }),
  routes: [
    { path: "/", name: "home", component: () => import("@/views/LandingView.vue") },
    { path: "/entrar", name: "login", component: () => import("@/views/LoginView.vue"), meta: { guest: true } },
    {
      path: "/app",
      component: () => import("@/views/app/AppLayout.vue"),
      meta: { auth: true },
      children: [
        {
          path: "",
          name: "dashboard",
          component: () => import("@/views/app/DashboardView.vue"),
          meta: { auth: true, title: "Painel" },
        },
        {
          path: "vender",
          name: "pos",
          component: () => import("@/views/app/PosView.vue"),
          meta: { auth: true, title: "Vender" },
        },
        {
          path: "vendas",
          name: "sales",
          component: () => import("@/views/app/SalesView.vue"),
          meta: { auth: true, title: "Vendas" },
        },
        {
          path: "produtos",
          name: "products",
          component: () => import("@/views/app/ProductsView.vue"),
          meta: { auth: true, title: "Produtos" },
        },
        {
          path: "clientes",
          name: "clients",
          component: () => import("@/views/app/ClientsView.vue"),
          meta: { auth: true, title: "Clientes" },
        },
        {
          path: "equipe",
          name: "team",
          component: () => import("@/views/app/TeamView.vue"),
          meta: { auth: true, title: "Equipe" },
        },
        {
          path: "relatorios",
          name: "reports",
          component: () => import("@/views/app/ReportsView.vue"),
          meta: { auth: true, title: "Relatórios" },
        },
      ],
    },
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("@/views/NotFoundView.vue") },
  ],
});

router.beforeEach(async (to) => {
  const session = useSession();
  if (to.meta.auth || to.meta.guest) await session.restore();
  if (to.meta.auth && !session.loggedIn) return { name: "login", query: { next: to.fullPath } };
  if (to.meta.guest && session.loggedIn) return { name: "dashboard" };
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Pet System` : "Pet System · Gestão de pet shop";
});

export default router;
