<script setup lang="ts">
import type { Dashboard, Note } from "@petsystem/contracts";
import { LABELS } from "@petsystem/contracts";
import { onMounted, ref } from "vue";
import { notesApi, reportsApi } from "@/api";
import BarChart from "@/components/BarChart.vue";
import EmptyState from "@/components/EmptyState.vue";
import Icon from "@/components/Icon.vue";
import StatCard from "@/components/StatCard.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { brl, when } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useSession } from "@/stores/session";
import { useToast } from "@/stores/toast";

const session = useSession();
const toast = useToast();
const data = ref<Dashboard | null>(null);
const notes = ref<Note[]>([]);
const newNote = ref("");
const error = ref("");

const hour = new Date().getHours();
const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

onMounted(async () => {
  try {
    [data.value, notes.value] = await Promise.all([reportsApi.dashboard(), notesApi.list()]);
  } catch (e) {
    error.value = friendly(e);
  }
});

async function addNote() {
  const text = newNote.value.trim();
  if (!text) return;
  newNote.value = "";
  try {
    notes.value.unshift(await notesApi.create(text));
  } catch (e) {
    toast.push(friendly(e), "error");
  }
}
async function toggle(n: Note) {
  n.done = !n.done;
  try {
    await notesApi.update(n.id, { done: n.done });
  } catch (e) {
    n.done = !n.done;
    toast.push(friendly(e), "error");
  }
}
async function remove(n: Note) {
  notes.value = notes.value.filter((x) => x.id !== n.id);
  try {
    await notesApi.remove(n.id);
  } catch (e) {
    toast.push(friendly(e), "error");
  }
}
</script>

<template>
  <div class="dash">
    <section class="hello rise">
      <div>
        <h2>{{ greeting }}, {{ session.me?.user.name.split(" ")[0] }}!</h2>
        <p class="muted">Este é o resumo da {{ session.me?.shop.name }}.</p>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="stats">
      <template v-if="data">
        <StatCard
          class="rise"
          style="--i: 0"
          icon="cart"
          label="Vendas hoje"
          :value="brl(data.today.revenue)"
          :hint="`${data.today.sales} ${data.today.sales === 1 ? 'venda' : 'vendas'}`"
        />
        <StatCard
          class="rise"
          style="--i: 1"
          icon="chart"
          tone="ok"
          label="Receita no mês"
          :value="brl(data.month.revenue)"
          :hint="`${data.month.sales} vendas`"
        />
        <StatCard
          class="rise"
          style="--i: 2"
          icon="receipt"
          tone="info"
          label="Ticket médio"
          :value="brl(data.month.averageTicket)"
          hint="neste mês"
        />
        <StatCard
          class="rise"
          style="--i: 3"
          icon="alert"
          tone="sun"
          label="Estoque baixo"
          :value="String(data.lowStock.length)"
          :hint="data.lowStock.length ? 'produtos para repor' : 'tudo em dia'"
        />
      </template>
      <template v-else>
        <div v-for="i in 4" :key="i" class="skeleton" style="height: 142px" />
      </template>
    </div>

    <div class="grid">
      <section class="card panel chart-panel rise" style="--i: 2">
        <header><h3>Receita dos últimos 14 dias</h3></header>
        <BarChart v-if="data" :points="data.last14Days" :height="190" />
        <div v-else class="skeleton" style="height: 240px" />
      </section>

      <section class="card panel rise" style="--i: 3">
        <header>
          <h3>Repor estoque</h3>
          <RouterLink class="btn sm quiet" :to="{ name: 'products', query: { baixo: '1' } }">Ver todos</RouterLink>
        </header>
        <ul v-if="data?.lowStock.length" class="low">
          <li v-for="p in data.lowStock.slice(0, 5)" :key="p.id">
            <span class="name">{{ p.name }}</span>
            <span class="badge" :class="p.stock === 0 ? 'danger' : 'warn'">{{ p.stock }} / mín. {{ p.minStock }}</span>
          </li>
        </ul>
        <EmptyState v-else-if="data" icon="check" title="Estoque em dia" text="Nenhum produto abaixo do mínimo." />
      </section>

      <section class="card panel rise" style="--i: 4">
        <header>
          <h3>Últimas vendas</h3>
          <RouterLink class="btn sm quiet" :to="{ name: 'sales' }">Ver todas</RouterLink>
        </header>
        <ul v-if="data?.recentSales.length" class="sales">
          <li v-for="s in data.recentSales" :key="s.id">
            <UserAvatar :name="s.client?.name ?? 'Cliente avulso'" :size="34" />
            <div class="who">
              <strong>{{ s.client?.name ?? "Cliente avulso" }}</strong>
              <small>#{{ s.number }} · {{ when(s.at) }} · {{ LABELS.payment[s.payment] }}</small>
            </div>
            <strong class="num">{{ brl(s.total) }}</strong>
          </li>
        </ul>
        <EmptyState
          v-else-if="data"
          icon="cart"
          title="Nenhuma venda ainda"
          text="As vendas aparecem aqui assim que você fechar a primeira."
        >
          <RouterLink class="btn sm" :to="{ name: 'pos' }">Fazer uma venda</RouterLink>
        </EmptyState>
      </section>

      <section class="card panel rise" style="--i: 5">
        <header><h3>Avisos da equipe</h3></header>
        <form class="add" @submit.prevent="addNote">
          <input
            v-model="newNote"
            class="input"
            maxlength="200"
            placeholder="Ex.: ligar para o fornecedor"
            aria-label="Novo aviso"
          />
          <button class="btn" aria-label="Adicionar aviso"><Icon name="plus" :size="18" /></button>
        </form>
        <TransitionGroup v-if="notes.length" tag="ul" name="list" class="notes">
          <li v-for="n in notes" :key="n.id" :class="{ done: n.done }">
            <label>
              <input type="checkbox" :checked="n.done" @change="toggle(n)" />
              <span>{{ n.text }}</span>
            </label>
            <button class="icon-btn" :aria-label="`Apagar aviso: ${n.text}`" @click="remove(n)">
              <Icon name="trash" :size="16" />
            </button>
          </li>
        </TransitionGroup>
        <p v-else class="muted small">Nenhum aviso. Anote aqui o que a equipe não pode esquecer.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dash {
  display: grid;
  gap: 22px;
}
.hello h2 {
  font-size: 28px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 16px;
}
.panel {
  padding: 20px;
  min-width: 0;
}
.panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.panel h3 {
  font-size: 18px;
}
.low,
.sales,
.notes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.low li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}
.low li:last-child {
  border: 0;
}
.low .name {
  font-weight: 600;
}
.sales li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 8px;
  margin: 0 -8px;
  border-radius: 12px;
  transition: background 0.2s;
}
.sales li:hover {
  background: var(--brand-mist);
}
.sales .who {
  flex: 1;
  min-width: 0;
  display: grid;
}
.sales .who strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sales small {
  color: var(--muted);
  font-size: 12px;
}
.add {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.add .btn {
  padding: 0 12px;
}
.notes li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--brand-mist);
}
.notes label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.notes input {
  width: 18px;
  height: 18px;
  accent-color: var(--brand);
}
.notes li.done span {
  color: var(--soft);
  text-decoration: line-through;
}
.small {
  font-size: 13px;
}
@media (max-width: 1100px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 420px) {
  .stats {
    gap: 10px;
  }
}
</style>
