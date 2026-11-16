<script setup lang="ts">
defineProps<{ light?: boolean }>();
</script>

<template>
  <span class="logo" :class="{ light }">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="var(--brand)" />
      <g fill="#fff">
        <ellipse cx="32" cy="40" rx="11" ry="9.5" />
        <ellipse cx="18.5" cy="28" rx="4.6" ry="6" />
        <ellipse cx="45.5" cy="28" rx="4.6" ry="6" />
        <ellipse cx="25.5" cy="18.5" rx="4.4" ry="5.8" />
        <ellipse cx="38.5" cy="18.5" rx="4.4" ry="5.8" />
      </g>
    </svg>
    <span>Pet<b>System</b></span>
  </span>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--display);
  font-size: 21px;
  font-weight: 600;
  color: var(--ink);
}
.logo svg {
  width: 34px;
  height: 34px;
  transition: transform 0.4s var(--ease);
}
.logo:hover svg {
  transform: rotate(-10deg) scale(1.05);
}
.logo b {
  color: var(--brand);
  font-weight: 600;
}
.logo.light {
  color: #fff;
}
.logo.light b {
  color: #f5c6ff;
}
</style>
