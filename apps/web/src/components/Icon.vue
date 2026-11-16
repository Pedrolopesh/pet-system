<script setup lang="ts">
/** Ícones de traço (24×24), desenhados aqui para não depender de biblioteca. */
const PATHS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  cart: "M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2M10 20.5h.01M17 20.5h.01",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  users:
    "M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  badge: "M12 3l2.5 2H18v3.5L20 11l-2 2.5V17h-3.5L12 19l-2.5-2H6v-3.5L4 11l2-2.5V5h3.5zM9.5 11.5l1.7 1.7 3.3-3.4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  close: "M6 6l12 12M18 6 6 18",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  check: "M5 12.5 10 17 19 7",
  logout: "M15 4h4v16h-4M10 17l5-5-5-5M15 12H3",
  menu: "M4 6h16M4 12h16M4 18h16",
  paw: "M12 20c-3 0-5-1.6-5-3.6 0-2.4 2.4-4.4 5-4.4s5 2 5 4.4c0 2-2 3.6-5 3.6zM6 11.5a2 2.5 0 1 0 0-.1M18 11.5a2 2.5 0 1 0 0-.1M9.5 7a2 2.5 0 1 0 0-.1M14.5 7a2 2.5 0 1 0 0-.1",
  alert: "M12 3 2 20h20zM12 10v4M12 17.5h.01",
  download: "M12 4v12M7 11l5 5 5-5M4 20h16",
  arrow: "M5 12h14M13 6l6 6-6 6",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  restock: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
} as const;

export type IconName = keyof typeof PATHS;
defineProps<{ name: IconName; size?: number }>();
</script>

<template>
  <svg
    :width="size ?? 20"
    :height="size ?? 20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="PATHS[name]" />
  </svg>
</template>
