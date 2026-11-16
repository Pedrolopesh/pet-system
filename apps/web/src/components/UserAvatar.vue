<script setup lang="ts">
import { computed } from "vue";
import { initials } from "@/lib/format";

const props = defineProps<{ name: string; size?: number }>();
const TONES = ["#ba2bd2", "#2563eb", "#0d9488", "#d97706", "#db2777", "#7c3aed", "#15803d"];
const tone = computed(() => TONES[[...props.name].reduce((h, c) => h + c.charCodeAt(0), 0) % TONES.length]);
</script>

<template>
  <span
    class="avatar"
    :style="{
      background: tone,
      width: `${size ?? 36}px`,
      height: `${size ?? 36}px`,
      fontSize: `${(size ?? 36) * 0.38}px`,
    }"
    aria-hidden="true"
  >
    {{ initials(name) }}
  </span>
</template>

<style scoped>
.avatar {
  flex: none;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.02em;
}
</style>
