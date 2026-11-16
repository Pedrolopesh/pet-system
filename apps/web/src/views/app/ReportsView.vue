<script setup lang="ts">
import type { Report } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import { computed, onMounted, ref, watch } from "vue";
import { reportsApi } from "@/api";
import BarChart from "@/components/BarChart.vue";
import Icon from "@/components/Icon.vue";
import StatCard from "@/components/StatCard.vue";
import { download, toCsv } from "@/lib/csv";
import { brl, dayLabel, percent } from "@/lib/format";
import { friendly } from "@/lib/messages";

const days = ref<7 | 30 | 90>(30);
const report = ref<Report | null>(null);
const error = ref("");
async function load() {
  error.value = "";
  try {
    report.value = await reportsApi.report(days.value);
  } catch (e) {
    error.value = friendly(e);
  }
}
onMounted(load);
watch(days, load);

const share = (v: number) => (report.value?.revenue ? v / report.value.revenue : 0);
const maxTop = computed(() => Math.max(1, ...(report.value?.topProducts.map((p) => p.revenue) ?? [1])));
const margin = computed(() =>
  report.value?.revenue ? Math.round((report.value.grossProfit / report.value.revenue) * 100) : 0,
);
const PAY_COLORS: Record<string, string> = {
  pix: "#0d9488",
  credito: "#ba2bd2",
  debito: "#2563eb",
  dinheiro: "#d97706",
};

const donut = computed(() => {
  let acc = 0;
  return (report.value?.byPayment ?? []).map((p) => {
    const start = acc;
    acc += share(p.revenue);
    return { ...p, start, end: acc };
  });
});
const gradient = computed(() =>
  donut.value.length
    ? `conic-gradient(${donut.value.map((d) => `${PAY_COLORS[d.payment]} ${d.start * 360}deg ${d.end * 360}deg`).join(", ")})`
    : "var(--line)",
);

function exportCsv() {
  const r = report.value;
  if (!r) return;
  const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const rows: (string | number)[][] = [
    [`Relatório dos últimos ${r.days} dias`],
    ["Receita (R$)", money(r.revenue)],
    ["Vendas", r.sales],
    ["Ticket médio (R$)", money(r.averageTicket)],
    ["Lucro bruto (R$)", money(r.grossProfit)],
    [],
    ["Dia", "Receita (R$)", "Vendas"],
    ...r.byDay.map((d) => [d.day, money(d.revenue), d.sales]),
    [],
    ["Produto", "Quantidade", "Receita (R$)"],
    ...r.topProducts.map((p) => [p.name, p.qty, money(p.revenue)]),
    [],
    ["Atendente", "Vendas", "Receita (R$)"],
    ...r.byEmployee.map((e) => [e.name, e.sales, money(e.revenue)]),
  ];
  download(`relatorio-${r.days}-dias.csv`, toCsv(rows));
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="chips" role="group" aria-label="Período">
        <button v-for="d in [7, 30, 90] as const" :key="d" class="chip" :aria-pressed="days === d" @click="days = d">
          {{ d }} dias
        </button>
      </div>
      <button class="btn ghost sm" :disabled="!report" @click="exportCsv">
        <Icon name="download" :size="16" /> Exportar CSV
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="stats">
      <template v-if="report">
        <StatCard
          class="rise"
          icon="chart"
          label="Receita"
          :value="brl(report.revenue)"
          :hint="
            report.revenueChange === null
              ? 'sem período anterior'
              : `${percent(report.revenueChange)} vs. ${days} dias antes`
          "
        />
        <StatCard
          class="rise"
          style="--i: 1"
          icon="receipt"
          tone="info"
          label="Vendas"
          :value="String(report.sales)"
          :hint="`ticket médio ${brl(report.averageTicket)}`"
        />
        <StatCard
          class="rise"
          style="--i: 2"
          icon="sparkle"
          tone="ok"
          label="Lucro bruto"
          :value="brl(report.grossProfit)"
          :hint="`margem de ${margin}%`"
        />
        <StatCard
          class="rise"
          style="--i: 3"
          icon="badge"
          tone="sun"
          label="Destaque da equipe"
          :value="report.byEmployee[0]?.name.split(' ')[0] ?? '—'"
          :hint="report.byEmployee[0] ? brl(report.byEmployee[0].revenue) : ''"
        />
      </template>
      <template v-else><div v-for="i in 4" :key="i" class="skeleton" style="height: 142px" /></template>
    </div>

    <section class="card panel rise" style="--i: 2">
      <h3>Receita por dia</h3>
      <BarChart v-if="report" :key="days" :points="report.byDay" :height="220" />
    </section>

    <div class="cols">
      <section class="card panel rise" style="--i: 3">
        <h3>Produtos que mais venderam</h3>
        <ol v-if="report?.topProducts.length" class="rank">
          <li v-for="(p, i) in report.topProducts" :key="p.productId">
            <span class="pos">{{ i + 1 }}</span>
            <div class="bar-row">
              <div class="label">
                <span>{{ p.name }}</span
                ><strong class="num">{{ brl(p.revenue) }}</strong>
              </div>
              <div class="track"><span :style="{ '--w': p.revenue / maxTop, '--i': i }" /></div>
              <small class="muted">{{ p.qty }} un.</small>
            </div>
          </li>
        </ol>
        <p v-else class="muted">Sem vendas no período.</p>
      </section>

      <div class="stack">
        <section class="card panel rise" style="--i: 4">
          <h3>Formas de pagamento</h3>
          <div v-if="report?.byPayment.length" class="donut-row">
            <div
              class="donut"
              :style="{ background: gradient }"
              role="img"
              aria-label="Divisão da receita por forma de pagamento"
            >
              <span />
            </div>
            <ul class="legend">
              <li v-for="p in report.byPayment" :key="p.payment">
                <i :style="{ background: PAY_COLORS[p.payment] }" />
                <span>{{ LABELS.payment[p.payment] }}</span>
                <strong class="num">{{ Math.round(share(p.revenue) * 100) }}%</strong>
              </li>
            </ul>
          </div>
          <p v-else class="muted">Sem vendas no período.</p>
        </section>
        <section class="card panel rise" style="--i: 5">
          <h3>Por categoria</h3>
          <ul v-if="report?.byCategory.length" class="cats">
            <li v-for="c in report.byCategory" :key="c.category">
              <span>{{ LABELS.category[c.category] }}</span>
              <div class="track"><span :style="{ '--w': share(c.revenue), '--i': 0 }" /></div>
              <strong class="num">{{ Math.round(share(c.revenue) * 100) }}%</strong>
            </li>
          </ul>
        </section>
      </div>
    </div>
    <p v-if="report" class="muted foot">
      Período: {{ dayLabel(report.byDay[0]?.day ?? "") }} até hoje. Lucro bruto = receita − custo dos itens vendidos
      (descontos já abatidos).
    </p>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.panel {
  padding: 20px;
  min-width: 0;
}
.panel h3 {
  font-size: 18px;
  margin-bottom: 14px;
}
.cols {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 16px;
  align-items: start;
}
.stack {
  display: grid;
  gap: 16px;
}
.rank {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.rank li {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  align-items: start;
}
.pos {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 800;
  font-size: 13px;
}
.rank li:first-child .pos {
  background: var(--sun);
  color: var(--ink);
}
.bar-row {
  display: grid;
  gap: 4px;
}
.label {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
}
.track {
  height: 8px;
  border-radius: 99px;
  background: var(--brand-mist);
  overflow: hidden;
}
.track span {
  display: block;
  height: 100%;
  width: calc(var(--w) * 100%);
  border-radius: inherit;
  background: linear-gradient(90deg, #d98ae8, var(--brand));
  transform-origin: left;
  animation: grow-x 0.8s var(--ease) both;
  animation-delay: calc(var(--i) * 60ms + 0.2s);
}
.donut-row {
  display: flex;
  align-items: center;
  gap: 22px;
}
.donut {
  position: relative;
  flex: none;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  animation: spin-in 0.9s var(--ease) both;
}
.donut span {
  position: absolute;
  inset: 26px;
  border-radius: 50%;
  background: var(--surface);
}
.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  flex: 1;
}
.legend li {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 10px;
}
.legend i {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}
.cats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.cats li {
  display: grid;
  grid-template-columns: 90px 1fr 42px;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.cats strong {
  text-align: right;
}
.foot {
  font-size: 13px;
}
@keyframes grow-x {
  from {
    transform: scaleX(0);
  }
}
@keyframes spin-in {
  from {
    transform: rotate(-90deg) scale(0.8);
    opacity: 0;
  }
}
@media (max-width: 1100px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .cols {
    grid-template-columns: 1fr;
  }
}
</style>
