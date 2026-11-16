<script setup lang="ts">
import type { Category, Product, StockAdjust } from "@petsystem/contracts";
import { CATEGORIES, LABELS, parseMoney, toMoneyInput } from "@petsystem/contracts";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { productsApi } from "@/api";
import AppModal from "@/components/AppModal.vue";
import EmptyState from "@/components/EmptyState.vue";
import Icon from "@/components/Icon.vue";
import { brl } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useToast } from "@/stores/toast";

const route = useRoute();
const toast = useToast();
const list = ref<Product[]>([]);
const loading = ref(true);
const q = ref("");
const category = ref<Category | "all">("all");
const onlyLow = ref(route.query.baixo === "1");
const showInactive = ref(false);

async function load() {
  loading.value = true;
  try {
    list.value = await productsApi.list({ includeInactive: true });
  } catch (e) {
    toast.push(friendly(e), "error");
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const isLow = (p: Product) => p.stock !== null && p.stock <= p.minStock;
const visible = computed(() => {
  const term = q.value.trim().toLowerCase();
  return list.value.filter(
    (p) =>
      (showInactive.value || p.active) &&
      (category.value === "all" || p.category === category.value) &&
      (!onlyLow.value || isLow(p)) &&
      (!term || p.name.toLowerCase().includes(term)),
  );
});
const margin = (p: Product) => (p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0);

// --- formulário de produto ---
const editing = ref<Product | null>(null);
const formOpen = ref(false);
const form = reactive({ name: "", category: "racao" as Category, price: "", cost: "", stock: "0", minStock: "0" });
const formError = ref("");
const saving = ref(false);

function openForm(p?: Product) {
  editing.value = p ?? null;
  Object.assign(form, {
    name: p?.name ?? "",
    category: p?.category ?? "racao",
    price: p ? toMoneyInput(p.price) : "",
    cost: p ? toMoneyInput(p.cost) : "",
    stock: String(p?.stock ?? 0),
    minStock: String(p?.minStock ?? 0),
  });
  formError.value = "";
  formOpen.value = true;
}

async function save() {
  const price = parseMoney(form.price);
  const cost = parseMoney(form.cost);
  if (price === null || cost === null) return (formError.value = "Preço e custo no formato 12,90.");
  const minStock = Math.max(0, Math.trunc(Number(form.minStock) || 0));
  saving.value = true;
  formError.value = "";
  try {
    if (editing.value) {
      const updated = await productsApi.update(editing.value.id, {
        name: form.name,
        category: form.category,
        price,
        cost,
        minStock,
      });
      list.value = list.value.map((p) => (p.id === updated.id ? updated : p));
      toast.push("Produto atualizado.");
    } else {
      const service = form.category === "servico";
      const created = await productsApi.create({
        name: form.name,
        category: form.category,
        price,
        cost,
        stock: service ? null : Math.max(0, Math.trunc(Number(form.stock) || 0)),
        minStock: service ? 0 : minStock,
      });
      list.value = [...list.value, created].sort((a, b) => a.name.localeCompare(b.name));
      toast.push("Produto cadastrado.");
    }
    formOpen.value = false;
  } catch (e) {
    formError.value = friendly(e);
  } finally {
    saving.value = false;
  }
}

async function toggleActive(p: Product) {
  try {
    const updated = await productsApi.update(p.id, { active: !p.active });
    list.value = list.value.map((x) => (x.id === p.id ? updated : x));
    toast.push(updated.active ? "Produto reativado." : "Produto desativado. Ele some do caixa.");
  } catch (e) {
    toast.push(friendly(e), "error");
  }
}

// --- ajuste de estoque ---
const adjusting = ref<Product | null>(null);
const adj = reactive({ qty: "1", reason: "entrada" as StockAdjust["reason"] });
const adjError = ref("");
function openAdjust(p: Product) {
  adjusting.value = p;
  adj.qty = "1";
  adj.reason = "entrada";
  adjError.value = "";
}
async function saveAdjust() {
  const p = adjusting.value!;
  const n = Math.trunc(Number(adj.qty));
  if (!n) return (adjError.value = "Informe uma quantidade.");
  const delta = adj.reason === "entrada" ? Math.abs(n) : adj.reason === "perda" ? -Math.abs(n) : n;
  try {
    const updated = await productsApi.adjust(p.id, { delta, reason: adj.reason });
    list.value = list.value.map((x) => (x.id === p.id ? updated : x));
    toast.push(`Estoque de ${p.name}: ${updated.stock} un.`);
    adjusting.value = null;
  } catch (e) {
    adjError.value = friendly(e);
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="search">
        <Icon name="search" :size="18" />
        <input v-model="q" class="input" type="search" placeholder="Buscar produto" aria-label="Buscar produto" />
      </div>
      <button class="btn" @click="openForm()"><Icon name="plus" :size="18" /> Novo produto</button>
    </div>
    <div class="filters">
      <div class="chips" role="group" aria-label="Categoria">
        <button class="chip" :aria-pressed="category === 'all'" @click="category = 'all'">Tudo</button>
        <button v-for="c in CATEGORIES" :key="c" class="chip" :aria-pressed="category === c" @click="category = c">
          {{ LABELS.category[c] }}
        </button>
      </div>
      <div class="chips">
        <button class="chip" :aria-pressed="onlyLow" @click="onlyLow = !onlyLow">
          <Icon name="alert" :size="14" /> Estoque baixo
        </button>
        <button class="chip" :aria-pressed="showInactive" @click="showInactive = !showInactive">
          Mostrar desativados
        </button>
      </div>
    </div>

    <section class="card">
      <table v-if="visible.length" class="table stack">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th class="right">Preço</th>
            <th class="right">Margem</th>
            <th class="right">Estoque</th>
            <th />
          </tr>
        </thead>
        <TransitionGroup tag="tbody" name="list">
          <tr
            v-for="(p, i) in visible"
            :key="p.id"
            class="rise"
            :class="{ off: !p.active }"
            :style="{ '--i': Math.min(i, 14) }"
          >
            <td>
              <strong>{{ p.name }}</strong> <span v-if="!p.active" class="badge gray">desativado</span>
            </td>
            <td data-hide-mobile>
              <span class="badge gray">{{ LABELS.category[p.category] }}</span>
            </td>
            <td class="right num">{{ brl(p.price) }}</td>
            <td class="right num" data-hide-mobile>{{ margin(p) }}%</td>
            <td class="right">
              <span v-if="p.stock === null" class="muted">—</span>
              <span v-else class="badge" :class="p.stock === 0 ? 'danger' : isLow(p) ? 'warn' : 'ok'"
                >{{ p.stock }} un.</span
              >
            </td>
            <td class="right actions">
              <button
                v-if="p.stock !== null"
                class="icon-btn"
                :aria-label="`Ajustar estoque de ${p.name}`"
                title="Ajustar estoque"
                @click="openAdjust(p)"
              >
                <Icon name="restock" :size="18" />
              </button>
              <button class="icon-btn" :aria-label="`Editar ${p.name}`" title="Editar" @click="openForm(p)">
                <Icon name="edit" :size="18" />
              </button>
            </td>
          </tr>
        </TransitionGroup>
      </table>
      <div v-else-if="loading" style="padding: 20px; display: grid; gap: 10px">
        <div v-for="i in 8" :key="i" class="skeleton" style="height: 44px" />
      </div>
      <EmptyState
        v-else-if="list.length"
        icon="search"
        title="Nada com esses filtros"
        text="Tente outra busca ou limpe os filtros."
      />
      <EmptyState
        v-else
        icon="box"
        title="Nenhum produto ainda"
        text="Cadastre o primeiro produto ou serviço para começar a vender."
      >
        <button class="btn sm" @click="openForm()">Cadastrar produto</button>
      </EmptyState>
    </section>

    <AppModal :open="formOpen" :title="editing ? 'Editar produto' : 'Novo produto'" @close="formOpen = false">
      <form id="product-form" class="form-grid" @submit.prevent="save">
        <label class="field full"
          ><span>Nome</span><input v-model="form.name" class="input" required maxlength="80"
        /></label>
        <label class="field"
          ><span>Categoria</span>
          <select v-model="form.category" class="select">
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ LABELS.category[c] }}</option>
          </select>
        </label>
        <label class="field"
          ><span>Preço de venda (R$)</span
          ><input v-model="form.price" class="input" inputmode="decimal" placeholder="0,00" required
        /></label>
        <label class="field"
          ><span>Custo (R$)</span
          ><input v-model="form.cost" class="input" inputmode="decimal" placeholder="0,00" required
        /></label>
        <template v-if="form.category !== 'servico'">
          <label v-if="!editing" class="field"
            ><span>Estoque inicial</span><input v-model="form.stock" class="input" type="number" min="0" step="1"
          /></label>
          <label class="field"
            ><span>Estoque mínimo</span><input v-model="form.minStock" class="input" type="number" min="0" step="1"
          /></label>
        </template>
        <p v-else class="muted full">Serviços (banho, tosa) não controlam estoque.</p>
        <p v-if="formError" class="error full" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <button v-if="editing" class="btn quiet" type="button" @click="(toggleActive(editing), (formOpen = false))">
          {{ editing.active ? "Desativar" : "Reativar" }}
        </button>
        <button class="btn" form="product-form" :disabled="saving">{{ saving ? "Salvando..." : "Salvar" }}</button>
      </template>
    </AppModal>

    <AppModal :open="adjusting !== null" title="Ajustar estoque" @close="adjusting = null">
      <form v-if="adjusting" id="adjust-form" class="form-grid" @submit.prevent="saveAdjust">
        <p class="full">
          <strong>{{ adjusting.name }}</strong><br />
          <span class="muted">Estoque atual: {{ adjusting.stock }} un.</span>
        </p>
        <div class="field full">
          <span>Motivo</span>
          <div class="chips" role="group" aria-label="Motivo">
            <button type="button" class="chip" :aria-pressed="adj.reason === 'entrada'" @click="adj.reason = 'entrada'">
              Entrada (compra)
            </button>
            <button type="button" class="chip" :aria-pressed="adj.reason === 'perda'" @click="adj.reason = 'perda'">
              Perda / avaria
            </button>
            <button
              type="button"
              class="chip"
              :aria-pressed="adj.reason === 'correcao'"
              @click="adj.reason = 'correcao'"
            >
              Correção (+/−)
            </button>
          </div>
        </div>
        <label class="field full">
          <span>Quantidade</span>
          <input
            v-model="adj.qty"
            class="input"
            type="number"
            step="1"
            :min="adj.reason === 'correcao' ? undefined : 1"
            required
          />
          <small v-if="adj.reason === 'correcao'" class="muted">Use número negativo para tirar do estoque.</small>
        </label>
        <p v-if="adjError" class="error full" role="alert">{{ adjError }}</p>
      </form>
      <template #footer>
        <button class="btn" form="adjust-form">Confirmar ajuste</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
}
.toolbar {
  display: flex;
  gap: 10px;
}
.search {
  position: relative;
  flex: 1;
}
.search svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--soft);
}
.search .input {
  padding-left: 42px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
tr.off td {
  opacity: 0.55;
}
.actions {
  white-space: nowrap;
}
@media (max-width: 720px) {
  .toolbar .btn {
    padding: 0 12px;
  }
  .filters .chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .chip {
    flex: none;
  }
}
</style>
