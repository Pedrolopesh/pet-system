<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { authApi } from "@/api";
import AppLogo from "@/components/AppLogo.vue";
import Icon, { type IconName } from "@/components/Icon.vue";
import { friendly } from "@/lib/messages";
import { useSession } from "@/stores/session";
import { useToast } from "@/stores/toast";

const router = useRouter();
const session = useSession();
const toast = useToast();
const scrolled = ref(false);
const entering = ref(false);
const onScroll = () => (scrolled.value = window.scrollY > 10);
onMounted(() => {
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  void session.restore();
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

async function tryDemo() {
  if (session.loggedIn) return router.push({ name: "dashboard" });
  entering.value = true;
  try {
    session.start(await authApi.demo());
    await router.push({ name: "dashboard" });
  } catch (e) {
    toast.push(friendly(e), "error");
  } finally {
    entering.value = false;
  }
}

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "cart",
    title: "Caixa rápido",
    text: "Busque o produto, monte o carrinho, escolha o pagamento e pronto. O estoque baixa sozinho.",
  },
  {
    icon: "box",
    title: "Estoque que avisa",
    text: "Defina o mínimo de cada produto e veja no painel o que precisa repor antes de faltar.",
  },
  {
    icon: "paw",
    title: "Clientes e seus pets",
    text: "Cadastre o tutor com todos os pets, raça e espécie, e veja o histórico de compras de cada um.",
  },
  {
    icon: "chart",
    title: "Relatórios de verdade",
    text: "Receita por dia, ticket médio, lucro bruto, produtos campeões e quem mais vendeu na equipe.",
  },
  {
    icon: "badge",
    title: "Equipe no controle",
    text: "Cada venda fica com o nome de quem atendeu. No fim do mês, o ranking sai pronto.",
  },
  {
    icon: "download",
    title: "Exporte para planilha",
    text: "Leve relatórios e vendas para o Excel ou Google Planilhas em um clique.",
  },
];

const steps = [
  { n: "1", title: "Crie a loja", text: "Nome da loja, e-mail e senha. Pode começar já com dados de exemplo." },
  { n: "2", title: "Cadastre o básico", text: "Produtos com preço, custo e estoque mínimo; equipe e clientes." },
  { n: "3", title: "Venda e acompanhe", text: "O painel mostra o dia, o mês e o que precisa de atenção." },
];
</script>

<template>
  <div class="landing">
    <header class="top" :class="{ scrolled }">
      <div class="wrap bar">
        <RouterLink to="/" aria-label="Pet System, início"><AppLogo /></RouterLink>
        <nav aria-label="Principal">
          <a class="link" href="#recursos">Recursos</a>
          <a class="link" href="#como">Como funciona</a>
          <RouterLink v-if="session.loggedIn" class="btn sm" :to="{ name: 'dashboard' }">Abrir o sistema</RouterLink>
          <RouterLink v-else class="btn sm ghost" :to="{ name: 'login' }">Entrar</RouterLink>
        </nav>
      </div>
    </header>

    <section class="hero">
      <div class="wrap hero-grid">
        <div class="copy">
          <span class="eyebrow"><Icon name="sparkle" :size="16" /> Gestão de pet shop sem planilha</span>
          <h1>O balcão, o estoque e os <em>pets</em> da sua loja num lugar só.</h1>
          <p class="lead">
            Venda em segundos, saiba o que repor antes de faltar e conheça cada cliente pelo nome do pet. Teste agora
            numa loja de demonstração, sem cadastro.
          </p>
          <div class="ctas">
            <button class="btn lg" :disabled="entering" @click="tryDemo">
              {{ entering ? "Abrindo a loja..." : "Testar a demonstração" }} <Icon name="arrow" :size="18" />
            </button>
            <RouterLink class="btn lg ghost" :to="{ name: 'login', query: { criar: '1' } }"
              >Criar minha loja</RouterLink
            >
          </div>
          <p class="note">
            <Icon name="check" :size="16" /> A demo volta ao estado original todo dia. Fique à vontade para mexer.
          </p>
        </div>
        <div class="media" aria-hidden="true">
          <div class="frame">
            <video autoplay muted loop playsinline preload="metadata" poster="/img/hero-poster.webp">
              <source src="/hero.mp4" type="video/mp4" />
            </video>
          </div>
          <div class="float f1">
            <span class="ic"><Icon name="cart" :size="18" /></span>
            <div><small>Venda #436</small><strong>R$ 229,90 · Pix</strong></div>
          </div>
          <div class="float f2">
            <span class="ic warn"><Icon name="alert" :size="18" /></span>
            <div><small>Estoque baixo</small><strong>Ração Filhotes 3 kg</strong></div>
          </div>
          <div class="float f3">
            <span class="ic ok"><Icon name="paw" :size="18" /></span>
            <div><small>Cliente</small><strong>Ana · Thor, Golden</strong></div>
          </div>
        </div>
      </div>
    </section>

    <section id="recursos" class="section">
      <div class="wrap">
        <header v-reveal class="section-head">
          <span class="eyebrow">Recursos</span>
          <h2>Tudo que a rotina do pet shop pede, nada que atrapalhe.</h2>
        </header>
        <div class="features">
          <article v-for="(f, i) in features" :key="f.title" v-reveal="i * 70" class="feature card">
            <span class="ic"><Icon :name="f.icon" :size="22" /></span>
            <h3>{{ f.title }}</h3>
            <p>{{ f.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section band">
      <div class="wrap split">
        <div v-reveal class="photos">
          <img
            src="/img/balcao.webp"
            alt="Cachorro sentado no balcão de um pet shop"
            width="570"
            height="452"
            loading="lazy"
          />
          <img src="/img/pug-notebook.webp" alt="" width="438" height="455" loading="lazy" />
        </div>
        <div v-reveal="120">
          <span class="eyebrow">Feito para o balcão</span>
          <h2>Funciona no computador do caixa e no celular de quem está no salão.</h2>
          <ul class="checks">
            <li>
              <Icon name="check" :size="18" /> Vendas que nunca deixam o estoque negativo, nem com dois caixas ao mesmo
              tempo.
            </li>
            <li><Icon name="check" :size="18" /> Cada loja só enxerga os próprios dados.</li>
            <li><Icon name="check" :size="18" /> Senha protegida com argon2 e sessão que expira sozinha.</li>
          </ul>
        </div>
      </div>
    </section>

    <section id="como" class="section">
      <div class="wrap">
        <header v-reveal class="section-head">
          <span class="eyebrow">Como funciona</span>
          <h2>Três passos até a primeira venda.</h2>
        </header>
        <ol class="steps">
          <li v-for="(s, i) in steps" :key="s.n" v-reveal="i * 90" class="card">
            <span class="n">{{ s.n }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div v-reveal class="cta">
          <div>
            <h2>Abra a loja de demonstração e faça uma venda.</h2>
            <p>Leva menos de um minuto. Sem cadastro, sem cartão.</p>
          </div>
          <button class="btn lg light" :disabled="entering" @click="tryDemo">
            Testar agora <Icon name="arrow" :size="18" />
          </button>
        </div>
      </div>
    </section>

    <footer class="foot">
      <div class="wrap foot-row">
        <AppLogo />
        <p>
          Projeto de portfólio de
          <a href="https://www.pedrolopes.tech" target="_blank" rel="noopener noreferrer">Pedro Lopes</a> ·
          <a href="https://github.com/Pedrolopesh/pet-system" target="_blank" rel="noopener noreferrer"
            >código no GitHub</a
          >
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.top {
  position: sticky;
  top: 0;
  z-index: 30;
  transition:
    background 0.3s,
    box-shadow 0.3s;
}
.top.scrolled {
  background: rgba(250, 247, 251, 0.86);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 0 var(--line);
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}
.bar > a {
  text-decoration: none;
}
nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.link {
  padding: 8px 12px;
  font-weight: 700;
  color: var(--muted);
  text-decoration: none;
  border-radius: 10px;
  transition:
    color 0.2s,
    background 0.2s;
}
.link:hover {
  color: var(--brand-deep);
  background: var(--brand-mist);
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand-ink);
  font-size: 13px;
  font-weight: 800;
}

.hero {
  position: relative;
  padding: 40px 0 90px;
  overflow: hidden;
}
.hero::before {
  content: "";
  position: absolute;
  inset: -20% -10% auto auto;
  width: 60vw;
  height: 60vw;
  max-width: 820px;
  max-height: 820px;
  border-radius: 50%;
  background: radial-gradient(circle, #f3d6f9 0%, transparent 65%);
  z-index: -1;
}
.hero-grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 56px;
  align-items: center;
}
.copy {
  display: grid;
  gap: 22px;
  justify-items: start;
}
.copy > * {
  animation: rise 0.8s var(--ease) both;
}
.copy > :nth-child(2) {
  animation-delay: 0.06s;
}
.copy > :nth-child(3) {
  animation-delay: 0.12s;
}
.copy > :nth-child(4) {
  animation-delay: 0.18s;
}
.copy > :nth-child(5) {
  animation-delay: 0.24s;
}
h1 {
  font-size: clamp(36px, 5vw, 62px);
  line-height: 1.06;
}
h1 em {
  font-style: normal;
  color: var(--brand);
  position: relative;
  white-space: nowrap;
}
h1 em::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.04em;
  height: 0.22em;
  border-radius: 99px;
  background: var(--sun);
  opacity: 0.55;
  z-index: -1;
  transform-origin: left;
  animation: underline 0.9s 0.5s var(--ease) both;
}
.lead {
  font-size: 18px;
  color: var(--muted);
  max-width: 540px;
}
.ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.note {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}
.note svg {
  color: var(--ok);
}
.media {
  position: relative;
  animation: rise 0.9s 0.15s var(--ease) both;
}
.frame {
  border-radius: 32px;
  overflow: hidden;
  aspect-ratio: 4 / 4.4;
  box-shadow: var(--shadow);
  border: 8px solid #fff;
  transform: rotate(1.5deg);
}
.frame video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% center;
}
.float {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 10px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow);
  animation:
    pop-in 0.6s var(--ease) both,
    bob 6s ease-in-out infinite;
}
.float small {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--soft);
}
.float strong {
  font-size: 14px;
}
.float .ic {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--brand-soft);
  color: var(--brand-deep);
}
.float .ic.warn {
  background: var(--sun-soft);
  color: #8a5a00;
}
.float .ic.ok {
  background: var(--ok-soft);
  color: var(--ok);
}
.f1 {
  left: -36px;
  top: 12%;
  animation-delay: 0.5s, 0.5s;
}
.f2 {
  right: -20px;
  top: 46%;
  animation-delay:
    0.7s,
    -2s;
}
.f3 {
  left: 6%;
  bottom: -22px;
  animation-delay:
    0.9s,
    -4s;
}

.section {
  padding: 90px 0;
}
.section-head {
  display: grid;
  justify-items: start;
  gap: 14px;
  max-width: 640px;
  margin-bottom: 40px;
}
.section-head h2,
.split h2 {
  font-size: clamp(28px, 3.4vw, 40px);
}
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.feature {
  padding: 26px;
  transition:
    transform 0.35s var(--ease),
    box-shadow 0.35s,
    border-color 0.3s;
}
.feature:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow);
  border-color: var(--brand-soft);
}
.feature .ic {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--brand-soft);
  color: var(--brand-deep);
  margin-bottom: 16px;
  transition: transform 0.4s var(--ease);
}
.feature:hover .ic {
  transform: rotate(-8deg) scale(1.08);
}
.feature h3 {
  font-size: 20px;
  margin-bottom: 6px;
}
.feature p {
  color: var(--muted);
}

.band {
  background: #fff;
  border-block: 1px solid var(--line);
}
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}
.split .eyebrow {
  margin-bottom: 14px;
}
.photos {
  position: relative;
  aspect-ratio: 1.15;
}
.photos img {
  position: absolute;
  border-radius: 24px;
  object-fit: cover;
  box-shadow: var(--shadow);
}
.photos img:first-child {
  left: 0;
  top: 0;
  width: 72%;
  height: 74%;
}
.photos img:last-child {
  right: 0;
  bottom: 0;
  width: 50%;
  height: 52%;
  border: 6px solid #fff;
  background: #fff;
  object-fit: contain;
}
.checks {
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
  display: grid;
  gap: 14px;
}
.checks li {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 8px;
  font-size: 16px;
}
.checks svg {
  color: #fff;
  background: var(--ok);
  border-radius: 50%;
  padding: 3px;
  width: 22px;
  height: 22px;
  margin-top: 1px;
}

.steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  counter-reset: s;
}
.steps li {
  padding: 26px;
}
.steps .n {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-family: var(--display);
  font-size: 20px;
  margin-bottom: 14px;
}
.steps h3 {
  font-size: 20px;
  margin-bottom: 6px;
}
.steps p {
  color: var(--muted);
}

.cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 44px;
  border-radius: 28px;
  color: #fff;
  background:
    radial-gradient(120% 140% at 100% 0%, #d76ce9 0%, transparent 55%),
    linear-gradient(135deg, var(--brand-deep), var(--brand));
  box-shadow: var(--shadow);
}
.cta h2 {
  font-size: clamp(26px, 3vw, 36px);
  margin-bottom: 8px;
}
.cta p {
  opacity: 0.85;
}
.btn.light {
  background: #fff;
  color: var(--brand-deep);
  box-shadow: none;
}
.btn.light:hover {
  background: var(--sun);
  color: var(--ink);
}

.foot {
  padding: 30px 0 40px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 14px;
}
.foot-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.foot a {
  color: var(--brand-deep);
  font-weight: 700;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.9);
  }
}
@keyframes bob {
  50% {
    translate: 0 -8px;
  }
}
@keyframes underline {
  from {
    transform: scaleX(0);
  }
}

@media (max-width: 960px) {
  .hero-grid,
  .split {
    grid-template-columns: 1fr;
  }
  .media {
    max-width: 520px;
    margin: 20px auto 0;
  }
  .features {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 640px) {
  .link {
    display: none;
  }
  .hero {
    padding-top: 20px;
  }
  .ctas .btn {
    flex: 1 1 100%;
  }
  .features,
  .steps {
    grid-template-columns: 1fr;
  }
  .f1 {
    left: -6px;
  }
  .f2 {
    right: -6px;
  }
  .cta {
    flex-direction: column;
    align-items: flex-start;
    padding: 30px 24px;
  }
  .section {
    padding: 64px 0;
  }
}
</style>
