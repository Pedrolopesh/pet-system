import { defineStore } from "pinia";
import { ref } from "vue";

export type Toast = { id: number; text: string; tone: "ok" | "error" | "info" };

/** Avisos rápidos no canto da tela (somem sozinhos). */
export const useToast = defineStore("toast", () => {
  const items = ref<Toast[]>([]);
  let next = 1;
  function push(text: string, tone: Toast["tone"] = "ok") {
    const id = next++;
    items.value.push({ id, text, tone });
    setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
  }
  function dismiss(id: number) {
    items.value = items.value.filter((t) => t.id !== id);
  }
  return { items, push, dismiss };
});
