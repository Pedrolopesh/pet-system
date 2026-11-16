<script setup lang="ts">
import Icon, { type IconName } from "@/components/Icon.vue";

defineProps<{ icon?: IconName; title: string; text?: string }>();
</script>

<template>
  <div class="empty">
    <span class="ic"><Icon :name="icon ?? 'paw'" :size="26" /></span>
    <strong>{{ title }}</strong>
    <p v-if="text">{{ text }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 40px 20px;
  text-align: center;
  color: var(--muted);
  animation: rise 0.4s var(--ease) both;
}
.ic {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--brand-soft);
  color: var(--brand);
  margin-bottom: 4px;
}
strong {
  font-family: var(--display);
  font-size: 18px;
  color: var(--ink);
}
p {
  max-width: 360px;
}
</style>
