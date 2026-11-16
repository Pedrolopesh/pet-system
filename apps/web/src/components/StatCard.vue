<script setup lang="ts">
import Icon, { type IconName } from "@/components/Icon.vue";

defineProps<{ label: string; value: string; hint?: string; icon: IconName; tone?: "brand" | "sun" | "ok" | "info" }>();
</script>

<template>
  <article class="stat card" :class="tone ?? 'brand'">
    <span class="ic"><Icon :name="icon" :size="20" /></span>
    <p class="label">{{ label }}</p>
    <p class="value num">{{ value }}</p>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </article>
</template>

<style scoped>
.stat {
  position: relative;
  padding: 18px 20px;
  overflow: hidden;
  transition:
    transform 0.3s var(--ease),
    box-shadow 0.3s;
}
.stat:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}
.ic {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  margin-bottom: 12px;
  background: var(--brand-soft);
  color: var(--brand-deep);
}
.sun .ic {
  background: var(--sun-soft);
  color: #8a5a00;
}
.ok .ic {
  background: var(--ok-soft);
  color: var(--ok);
}
.info .ic {
  background: #e7efff;
  color: var(--info);
}
.label {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}
.value {
  font-family: var(--display);
  font-size: clamp(22px, 2.4vw, 28px);
  font-weight: 600;
  margin-top: 2px;
}
.hint {
  font-size: 12px;
  color: var(--soft);
  margin-top: 2px;
}
</style>
