<script setup lang="ts">
import { computed, ref } from "vue";
import { brl, dayLabel } from "@/lib/format";

/** Barras de receita por dia, em SVG. Passe o mouse (ou toque) para ver o valor. */
const props = defineProps<{ points: { day: string; revenue: number; sales: number }[]; height?: number }>();
const hover = ref<number | null>(null);
const max = computed(() => Math.max(1, ...props.points.map((p) => p.revenue)));
const step = computed(() => Math.max(1, Math.ceil(props.points.length / 8)));
const active = computed(() => (hover.value === null ? props.points.length - 1 : hover.value));
const current = computed(() => props.points[active.value]);
</script>

<template>
  <figure class="chart" :style="{ '--h': `${height ?? 200}px` }">
    <figcaption v-if="current" class="tip">
      <strong class="num">{{ brl(current.revenue) }}</strong>
      <span>{{ dayLabel(current.day) }} · {{ current.sales }} {{ current.sales === 1 ? "venda" : "vendas" }}</span>
    </figcaption>
    <div
      class="bars"
      role="img"
      :aria-label="`Receita por dia nos últimos ${points.length} dias`"
      @mouseleave="hover = null"
    >
      <button
        v-for="(p, i) in points"
        :key="p.day"
        type="button"
        class="bar"
        :class="{ on: i === active }"
        :style="{ '--v': p.revenue / max, '--i': i }"
        :aria-label="`${dayLabel(p.day)}: ${brl(p.revenue)}`"
        @mouseenter="hover = i"
        @focus="hover = i"
        @click="hover = i"
      >
        <span />
      </button>
    </div>
    <div class="axis" aria-hidden="true">
      <span
        v-for="(p, i) in points"
        :key="p.day"
        :style="{ visibility: (points.length - 1 - i) % step === 0 ? 'visible' : 'hidden' }"
      >
        {{ dayLabel(p.day).split(" ")[1] }}
      </span>
    </div>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
}
.tip {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.tip strong {
  font-family: var(--display);
  font-size: 26px;
  font-weight: 600;
}
.tip span {
  color: var(--muted);
  font-size: 13px;
}
.bars {
  display: flex;
  align-items: flex-end;
  gap: clamp(2px, 0.6vw, 6px);
  height: var(--h);
}
.bar {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.bar span {
  width: 100%;
  height: max(3px, calc(var(--v) * 100%));
  border-radius: 6px 6px 3px 3px;
  background: linear-gradient(180deg, #d98ae8, var(--brand-soft));
  transform-origin: bottom;
  animation: grow 0.7s var(--ease) both;
  animation-delay: calc(var(--i) * 25ms);
  transition: background 0.2s;
}
.bar.on span,
.bar:hover span {
  background: linear-gradient(180deg, var(--brand), #d36be6);
}
.axis {
  display: flex;
  gap: clamp(2px, 0.6vw, 6px);
  margin-top: 8px;
  font-size: 11px;
  color: var(--soft);
}
.axis span {
  flex: 1;
  text-align: center;
}
@keyframes grow {
  from {
    transform: scaleY(0);
  }
}
</style>
