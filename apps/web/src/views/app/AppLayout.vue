<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppLogo from "@/components/AppLogo.vue";
import Icon, { type IconName } from "@/components/Icon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { useSession } from "@/stores/session";

const session = useSession();
const route = useRoute();
const router = useRouter();
const open = ref(false);
watch(
  () => route.fullPath,
  () => (open.value = false),
);

const nav: { to: string; label: string; icon: IconName }[] = [
  { to: "dashboard", label: "Painel", icon: "home" },
  { to: "pos", label: "Vender", icon: "cart" },
  { to: "sales", label: "Vendas", icon: "receipt" },
  { to: "products", label: "Produtos", icon: "box" },
  { to: "clients", label: "Clientes", icon: "paw" },
  { to: "team", label: "Equipe", icon: "badge" },
  { to: "reports", label: "Relatórios", icon: "chart" },
];
const title = computed(() => (route.meta.title as string | undefined) ?? "Painel");

async function logout() {
  await session.logout();
  await router.push({ name: "home" });
}
</script>

<template>
  <div class="shell" :class="{ open }">
    <aside class="side" aria-label="Menu do sistema">
      <RouterLink :to="{ name: 'dashboard' }" class="brand"><AppLogo light /></RouterLink>
      <nav>
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="{ name: item.to }"
          class="item"
          :class="{ cta: item.to === 'pos' }"
        >
          <Icon :name="item.icon" :size="20" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div v-if="session.me" class="who">
        <UserAvatar :name="session.me.user.name" :size="36" />
        <div class="who-text">
          <strong>{{ session.me.shop.name }}</strong>
          <small>{{ session.me.user.name }}</small>
        </div>
        <button class="icon-btn" aria-label="Sair" title="Sair" @click="logout">
          <Icon name="logout" :size="18" />
        </button>
      </div>
    </aside>
    <div class="scrim" @click="open = false" />

    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu" aria-label="Abrir menu" @click="open = !open"><Icon name="menu" /></button>
        <h1>{{ title }}</h1>
        <span v-if="session.me?.shop.isDemo" class="badge warn demo" title="Os dados voltam ao original todo dia às 4h">
          <Icon name="sparkle" :size="14" /> Loja de demonstração
        </span>
        <RouterLink v-if="route.name !== 'pos'" class="btn sm" :to="{ name: 'pos' }"
          ><Icon name="plus" :size="16" /> Nova venda</RouterLink
        >
      </header>
      <main class="content">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.name" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 100svh;
}
.side {
  position: sticky;
  top: 0;
  height: 100svh;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 22px 16px;
  color: #fff;
  background:
    radial-gradient(120% 50% at 0% 0%, rgba(215, 108, 233, 0.45), transparent 60%),
    linear-gradient(180deg, #5b1470, #3d0c4c);
}
.brand {
  padding: 4px 8px;
  text-decoration: none;
}
nav {
  display: grid;
  gap: 4px;
}
.item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 700;
  text-decoration: none;
  transition:
    background 0.2s,
    color 0.2s,
    transform 0.15s;
}
.item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.item:active {
  transform: scale(0.98);
}
.item.router-link-exact-active {
  background: #fff;
  color: var(--brand-ink);
  box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.5);
}
.item.router-link-exact-active svg {
  color: var(--brand);
}
.item.cta:not(.router-link-exact-active) svg {
  color: var(--sun);
}
.who {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}
.who-text {
  flex: 1;
  min-width: 0;
  display: grid;
}
.who strong,
.who small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.who strong {
  font-size: 13px;
}
.who small {
  font-size: 12px;
  opacity: 0.7;
}
.who .icon-btn {
  color: rgba(255, 255, 255, 0.75);
}
.who .icon-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.main {
  min-width: 0;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 68px;
  padding: 0 28px;
  background: rgba(250, 247, 251, 0.88);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.topbar h1 {
  font-size: 22px;
  margin-right: auto;
}
.menu {
  display: none;
}
.content {
  padding: 26px 28px 60px;
  max-width: 1280px;
}
.scrim {
  display: none;
}
@media (max-width: 960px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .side {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    width: 270px;
    transform: translateX(-100%);
    transition: transform 0.35s var(--ease);
  }
  .shell.open .side {
    transform: none;
    box-shadow: var(--shadow);
  }
  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(36, 27, 43, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }
  .shell.open .scrim {
    opacity: 1;
    pointer-events: auto;
  }
  .menu {
    display: inline-grid;
  }
  .topbar {
    padding: 0 14px;
  }
  .content {
    padding: 18px 14px 50px;
  }
}
@media (max-width: 560px) {
  .demo {
    display: none;
  }
}
</style>
