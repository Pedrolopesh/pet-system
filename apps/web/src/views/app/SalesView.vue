<script setup lang="ts">
import type { Page, Sale } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import { onMounted, ref, watch } from "vue";
import { salesApi } from "@/api";
import AppModal from "@/components/AppModal.vue";
import EmptyState from "@/components/EmptyState.vue";
import Icon from "@/components/Icon.vue";
import { download, toCsv } from "@/lib/csv";
import { brl, dateTime, when } from "@/lib/format";
import { friendly } from "@/lib/messages";

const days = ref(7);
const page = ref(1);
const data = ref<Page<Sale> | null>(null);
const loading = ref(false);
const error = ref("");
const open = ref<Sale | null>(null);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    data.value = await salesApi.list({ days: days.value, page: page.value, pageSize: 15 });
  } catch (e) {
    error.value = friendly(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(days, () => {
  page.value = 1;
  void load();
});
watch(page, load);

const pages = () => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize)) : 1);

async function exportCsv() {
  const all = await salesApi.list({ days: days.value, pageSize: 100, page: 1 });
  const rows: (string | number)[][] = [
    ["Número", "Data", "Cliente", "Atendente", "Pagamento", "Itens", "Desconto (R$)", "Total (R$)"],
  ];
  let p = 1;
  let list = all.items;
  while (list.length < all.total && p < 20) {
    p++;
    list = list.concat((await salesApi.list({ days: days.value, pageSize: 100, page: p })).items);
  }
  for (const s of list) {
    rows.push([
      s.number,
      dateTime(s.at),
      s.client?.name ?? "Avulso",
      s.employee.name,
      LABELS.payment[s.payment],
      s.items.map((i) => `${i.qty}x ${i.name}`).join(", "),
      (s.discount / 100).toFixed(2).replace(".", ","),
      (s.total / 100).toFixed(2).replace(".", ","),
    ]);
  }
  download(`vendas-${days.value}-dias.csv`, toCsv(rows));
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="chips" role="group" aria-label="Período">
        <button v-for="d in [1, 7, 30, 90]" :key="d" class="chip" :aria-pressed="days === d" @click="days = d">
          {{ d === 1 ? "Hoje" : `${d} dias` }}
        </button>
      </div>
      <button class="btn ghost sm" :disabled="!data?.total" @click="exportCsv">
        <Icon name="download" :size="16" /> Exportar CSV
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="card">
      <table v-if="data?.items.length" class="table stack">
        <thead>
          <tr>
            <th>Venda</th>
            <th>Cliente</th>
            <th>Atendente</th>
            <th>Pagamento</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <TransitionGroup tag="tbody" name="list">
          <tr
            v-for="(s, i) in data.items"
            :key="s.id"
            class="rise clickable"
            :style="{ '--i': i }"
            tabindex="0"
            @click="open = s"
            @keydown.enter="open = s"
          >
            <td>
              <strong>#{{ s.number }}</strong
              ><br /><small class="muted">{{ when(s.at) }}</small>
            </td>
            <td>{{ s.client?.name ?? "Avulso" }}</td>
            <td data-hide-mobile>{{ s.employee.name }}</td>
            <td data-hide-mobile>
              <span class="badge gray">{{ LABELS.payment[s.payment] }}</span>
            </td>
            <td class="right num">
              <strong>{{ brl(s.total) }}</strong>
            </td>
          </tr>
        </TransitionGroup>
      </table>
      <div v-else-if="loading" style="padding: 20px; display: grid; gap: 10px">
        <div v-for="i in 6" :key="i" class="skeleton" style="height: 44px" />
      </div>
      <EmptyState
        v-else
        icon="receipt"
        title="Nenhuma venda no período"
        text="Escolha um período maior ou faça uma venda."
      >
        <RouterLink class="btn sm" :to="{ name: 'pos' }">Nova venda</RouterLink>
      </EmptyState>
    </section>

    <nav v-if="data && pages() > 1" class="pager" aria-label="Páginas">
      <button class="btn ghost sm" :disabled="page === 1" @click="page--">Anterior</button>
      <span class="muted">Página {{ page }} de {{ pages() }} · {{ data.total }} vendas</span>
      <button class="btn ghost sm" :disabled="page >= pages()" @click="page++">Próxima</button>
    </nav>

    <AppModal :open="open !== null" :title="open ? `Venda #${open.number}` : ''" @close="open = null">
      <div v-if="open" class="detail">
        <dl>
          <div>
            <dt>Data</dt>
            <dd>{{ dateTime(open.at) }}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{{ open.client?.name ?? "Avulso" }}</dd>
          </div>
          <div>
            <dt>Atendente</dt>
            <dd>{{ open.employee.name }}</dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>{{ LABELS.payment[open.payment] }}</dd>
          </div>
        </dl>
        <ul>
          <li v-for="i in open.items" :key="i.productId">
            <span>{{ i.qty }}× {{ i.name }}</span
            ><span class="num">{{ brl(i.qty * i.unitPrice) }}</span>
          </li>
          <li v-if="open.discount" class="muted">
            <span>Desconto</span><span class="num">− {{ brl(open.discount) }}</span>
          </li>
          <li class="total">
            <span>Total</span><span class="num">{{ brl(open.total) }}</span>
          </li>
        </ul>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
}
.clickable {
  cursor: pointer;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  font-size: 14px;
}
.detail dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0 0 16px;
}
.detail dt {
  font-size: 12px;
  font-weight: 800;
  color: var(--soft);
  text-transform: uppercase;
}
.detail dd {
  margin: 0;
  font-weight: 600;
}
.detail ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}
.detail li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.detail .total {
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-family: var(--display);
  font-size: 20px;
  font-weight: 600;
}
</style>
