<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authApi } from "@/api";
import AppLogo from "@/components/AppLogo.vue";
import Icon from "@/components/Icon.vue";
import { friendly } from "@/lib/messages";
import { useSession } from "@/stores/session";

const route = useRoute();
const router = useRouter();
const session = useSession();

const mode = ref<"login" | "signup">(route.query.criar ? "signup" : "login");
const busy = ref<"form" | "demo" | null>(null);
const error = ref("");
const form = reactive({ shopName: "", name: "", email: "", password: "", withSampleData: true });
const expired = computed(() => route.query.expirou === "1");

function next() {
  const target =
    typeof route.query.next === "string" && route.query.next.startsWith("/app") ? route.query.next : "/app";
  return router.replace(target);
}

async function submit() {
  error.value = "";
  busy.value = "form";
  try {
    const res =
      mode.value === "login"
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.signup({ ...form });
    session.start(res);
    await next();
  } catch (e) {
    error.value = friendly(e);
  } finally {
    busy.value = null;
  }
}

async function demo() {
  error.value = "";
  busy.value = "demo";
  try {
    session.start(await authApi.demo());
    await next();
  } catch (e) {
    error.value = friendly(e);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <main class="auth">
    <section class="side" aria-hidden="true">
      <RouterLink to="/" class="back"><AppLogo light /></RouterLink>
      <div class="quote">
        <img src="/img/carrinho.webp" alt="" width="570" height="452" />
        <p>Venda, estoque, clientes e pets no mesmo lugar.</p>
        <small>A loja de demonstração tem 60 dias de vendas para você explorar.</small>
      </div>
    </section>

    <section class="panel">
      <RouterLink to="/" class="mobile-logo"><AppLogo /></RouterLink>
      <div class="box">
        <h1>{{ mode === "login" ? "Entrar na sua loja" : "Criar minha loja" }}</h1>
        <p class="muted">
          {{
            mode === "login"
              ? "Use o e-mail e a senha do cadastro."
              : "Leva um minuto. Você pode começar com dados de exemplo."
          }}
        </p>
        <p v-if="expired" class="badge warn">Sua sessão expirou. Entre de novo.</p>

        <div class="tabs" role="tablist" aria-label="Entrar ou criar conta">
          <button role="tab" :aria-selected="mode === 'login'" @click="((mode = 'login'), (error = ''))">Entrar</button>
          <button role="tab" :aria-selected="mode === 'signup'" @click="((mode = 'signup'), (error = ''))">
            Criar loja
          </button>
          <span class="pill" :class="mode" />
        </div>

        <form class="form" @submit.prevent="submit">
          <Transition name="swap" mode="out-in">
            <div v-if="mode === 'signup'" key="s" class="extra">
              <label class="field"
                ><span>Nome da loja</span
                ><input v-model="form.shopName" class="input" required maxlength="80" autocomplete="organization"
              /></label>
              <label class="field"
                ><span>Seu nome</span
                ><input v-model="form.name" class="input" required maxlength="80" autocomplete="name"
              /></label>
            </div>
            <div v-else key="l" />
          </Transition>
          <label class="field"
            ><span>E-mail</span
            ><input v-model="form.email" class="input" type="email" required maxlength="254" autocomplete="email"
          /></label>
          <label class="field">
            <span>Senha</span>
            <input
              v-model="form.password"
              class="input"
              type="password"
              required
              :minlength="mode === 'signup' ? 8 : 1"
              maxlength="128"
              :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
            />
            <small v-if="mode === 'signup'" class="muted">Pelo menos 8 caracteres.</small>
          </label>
          <label v-if="mode === 'signup'" class="check">
            <input v-model="form.withSampleData" type="checkbox" /> Começar com produtos, clientes e vendas de exemplo
          </label>
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button class="btn lg" :disabled="busy !== null">
            {{ busy === "form" ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar loja e entrar" }}
          </button>
        </form>

        <div class="divider"><span>ou</span></div>
        <button class="btn lg ghost demo" :disabled="busy !== null" @click="demo">
          <Icon name="sparkle" :size="18" />
          {{ busy === "demo" ? "Abrindo a demonstração..." : "Entrar na loja de demonstração" }}
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth {
  min-height: 100svh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.side {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 36px;
  color: #fff;
  background:
    radial-gradient(90% 60% at 100% 0%, #d76ce9 0%, transparent 60%),
    linear-gradient(160deg, var(--brand-deep), #4a0f5c);
  overflow: hidden;
}
.back {
  text-decoration: none;
}
.quote {
  display: grid;
  gap: 16px;
  max-width: 420px;
  animation: rise 0.8s 0.1s var(--ease) both;
}
.quote img {
  width: 220px;
  height: 220px;
  object-fit: cover;
  border-radius: 50%;
  border: 6px solid rgba(255, 255, 255, 0.25);
}
.quote p {
  font-family: var(--display);
  font-size: 28px;
  line-height: 1.25;
}
.quote small {
  opacity: 0.75;
}
.panel {
  display: grid;
  place-items: center;
  padding: 40px 24px;
}
.mobile-logo {
  display: none;
  text-decoration: none;
}
.box {
  width: min(420px, 100%);
  display: grid;
  gap: 14px;
  animation: rise 0.6s var(--ease) both;
}
h1 {
  font-size: 32px;
}
.tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 14px;
  background: #f1e8f4;
  margin-top: 6px;
}
.tabs button {
  position: relative;
  z-index: 1;
  min-height: 40px;
  border: 0;
  background: none;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.25s;
}
.tabs button[aria-selected="true"] {
  color: var(--brand-deep);
}
.tabs .pill {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 11px;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.35s var(--ease);
}
.tabs .pill.signup {
  transform: translateX(100%);
}
.form,
.extra {
  display: grid;
  gap: 14px;
}
.check {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  color: var(--muted);
}
.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--brand);
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--soft);
  font-size: 13px;
}
.divider::before,
.divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}
.demo svg {
  color: var(--brand);
}
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.2s,
    transform 0.25s var(--ease);
}
.swap-enter-from,
.swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (max-width: 860px) {
  .auth {
    grid-template-columns: 1fr;
  }
  .side {
    display: none;
  }
  .panel {
    place-items: start center;
    gap: 24px;
  }
  .mobile-logo {
    display: block;
  }
}
</style>
