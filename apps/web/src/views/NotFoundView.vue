<script setup lang="ts">
import AppLogo from "@/components/AppLogo.vue";
</script>

<template>
  <main class="nf">
    <RouterLink to="/"><AppLogo /></RouterLink>
    <p class="code" aria-hidden="true">404</p>
    <h1>Esse caminho o farejador não achou.</h1>
    <p class="muted">A página não existe ou mudou de lugar.</p>
    <div class="row">
      <RouterLink class="btn" to="/">Voltar ao início</RouterLink>
      <RouterLink class="btn ghost" :to="{ name: 'dashboard' }">Abrir o sistema</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.nf {
  min-height: 100svh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 14px;
  padding: 24px;
  text-align: center;
}
.nf > a {
  text-decoration: none;
  margin-bottom: 20px;
}
.code {
  font-family: var(--display);
  font-size: clamp(90px, 20vw, 160px);
  line-height: 1;
  color: var(--brand);
  animation: pop 0.8s var(--ease);
}
h1 {
  font-size: clamp(24px, 4vw, 34px);
}
.row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 10px;
}
</style>
