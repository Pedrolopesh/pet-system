<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import Icon from "@/components/Icon.vue";

/** Modal com <dialog> nativo: foco preso, Esc fecha e o fundo fica inerte. */
const props = defineProps<{ open: boolean; title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    await nextTick();
    const el = dialog.value;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      el.querySelector<HTMLElement>("[autofocus], input, select, textarea")?.focus();
    } else if (!open && el.open) el.close();
  },
  { immediate: true },
);
onBeforeUnmount(() => dialog.value?.open && dialog.value.close());

function onBackdrop(e: MouseEvent) {
  if (e.target === dialog.value) emit("close");
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal"
    :class="{ wide }"
    :aria-label="title"
    @cancel.prevent="emit('close')"
    @click="onBackdrop"
  >
    <div class="box">
      <header>
        <h2>{{ title }}</h2>
        <button type="button" class="icon-btn" aria-label="Fechar" @click="emit('close')"><Icon name="close" /></button>
      </header>
      <div class="body"><slot /></div>
      <footer v-if="$slots.footer"><slot name="footer" /></footer>
    </div>
  </dialog>
</template>

<style scoped>
.modal {
  padding: 0;
  border: 0;
  border-radius: 22px;
  width: min(560px, calc(100% - 24px));
  max-height: min(88vh, 860px);
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 30px 80px -20px rgba(50, 10, 70, 0.45);
}
.modal.wide {
  width: min(760px, calc(100% - 24px));
}
.modal[open] {
  animation: dialog-in 0.32s var(--ease);
}
.modal::backdrop {
  background: rgba(36, 27, 43, 0.45);
  backdrop-filter: blur(3px);
  animation: fade 0.25s ease;
}
.box {
  display: flex;
  flex-direction: column;
  max-height: inherit;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 8px;
}
header h2 {
  font-size: 22px;
}
.body {
  padding: 12px 22px 22px;
  overflow-y: auto;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--line);
  background: var(--brand-mist);
  border-radius: 0 0 22px 22px;
}
@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }
}
@keyframes fade {
  from {
    opacity: 0;
  }
}
@media (max-width: 560px) {
  .modal {
    margin: auto 0 0;
    width: 100%;
    max-width: 100%;
    border-radius: 22px 22px 0 0;
  }
  .modal[open] {
    animation: sheet-in 0.35s var(--ease);
  }
  footer {
    border-radius: 0;
  }
  @keyframes sheet-in {
    from {
      transform: translateY(40%);
      opacity: 0;
    }
  }
}
</style>
