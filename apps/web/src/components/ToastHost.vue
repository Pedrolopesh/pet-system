<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import { useToast } from "@/stores/toast";

const toast = useToast();
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toast.items" :key="t.id" class="toast" :class="t.tone">
        <Icon :name="t.tone === 'error' ? 'alert' : 'check'" :size="18" />
        <span>{{ t.text }}</span>
        <button class="icon-btn" aria-label="Fechar aviso" @click="toast.dismiss(t.id)">
          <Icon name="close" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  display: grid;
  gap: 10px;
  width: min(380px, calc(100% - 40px));
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px 10px 16px;
  border-radius: 14px;
  background: var(--ink);
  color: #fff;
  font-weight: 600;
  box-shadow: var(--shadow);
}
.toast span {
  flex: 1;
}
.toast.ok svg:first-child {
  color: #7ee2a1;
}
.toast.error {
  background: var(--danger);
}
.toast .icon-btn {
  color: inherit;
  opacity: 0.7;
}
.toast .icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.3s,
    transform 0.35s var(--ease);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
