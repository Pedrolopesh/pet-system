<script setup lang="ts">
import type { Employee } from "@petsystem/contracts";
import { LABELS, ROLES } from "@petsystem/contracts";
import { computed, onMounted, reactive, ref } from "vue";
import { employeesApi } from "@/api";
import AppModal from "@/components/AppModal.vue";
import EmptyState from "@/components/EmptyState.vue";
import Icon from "@/components/Icon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { brl } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useToast } from "@/stores/toast";

const toast = useToast();
const list = ref<Employee[]>([]);
const loading = ref(true);
onMounted(async () => {
  try {
    list.value = await employeesApi.list();
  } catch (e) {
    toast.push(friendly(e), "error");
  } finally {
    loading.value = false;
  }
});

const ranked = computed(() =>
  [...list.value].sort((a, b) => Number(b.active) - Number(a.active) || b.revenueThisMonth - a.revenueThisMonth),
);
const top = computed(() => Math.max(1, ...list.value.map((e) => e.revenueThisMonth)));
const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());

const formOpen = ref(false);
const editing = ref<Employee | null>(null);
const form = reactive({ name: "", role: "atendente" as Employee["role"], active: true });
const error = ref("");
function openForm(e?: Employee) {
  editing.value = e ?? null;
  Object.assign(form, { name: e?.name ?? "", role: e?.role ?? "atendente", active: e?.active ?? true });
  error.value = "";
  formOpen.value = true;
}
async function save() {
  try {
    if (editing.value) {
      const updated = await employeesApi.update(editing.value.id, { ...form });
      list.value = list.value.map((x) => (x.id === updated.id ? updated : x));
    } else {
      list.value.push(await employeesApi.create({ ...form }));
    }
    toast.push("Equipe atualizada.");
    formOpen.value = false;
  } catch (e) {
    error.value = friendly(e);
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <p class="muted">Ranking de vendas de {{ month }}. Quem está inativo não aparece no caixa.</p>
      <button class="btn" @click="openForm()"><Icon name="plus" :size="18" /> Adicionar pessoa</button>
    </div>
    <div v-if="loading" class="grid"><div v-for="i in 4" :key="i" class="skeleton" style="height: 150px" /></div>
    <TransitionGroup v-else-if="list.length" tag="div" name="list" class="grid">
      <article
        v-for="(e, i) in ranked"
        :key="e.id"
        class="member card rise"
        :class="{ off: !e.active }"
        :style="{ '--i': i }"
      >
        <span v-if="i === 0 && e.active && e.revenueThisMonth > 0" class="crown" title="Mais vendas no mês">🏆</span>
        <div class="head">
          <UserAvatar :name="e.name" :size="46" />
          <div>
            <strong>{{ e.name }}</strong>
            <span class="badge" :class="e.active ? '' : 'gray'"
              >{{ LABELS.role[e.role] }}{{ e.active ? "" : " · inativo" }}</span
            >
          </div>
          <button class="icon-btn" :aria-label="`Editar ${e.name}`" @click="openForm(e)">
            <Icon name="edit" :size="18" />
          </button>
        </div>
        <div class="nums">
          <div>
            <small>Vendas</small><strong class="num">{{ e.salesThisMonth }}</strong>
          </div>
          <div>
            <small>Receita</small><strong class="num">{{ brl(e.revenueThisMonth) }}</strong>
          </div>
        </div>
        <div class="meter" aria-hidden="true"><span :style="{ '--w': e.revenueThisMonth / top }" /></div>
      </article>
    </TransitionGroup>
    <EmptyState
      v-else
      icon="badge"
      title="Ninguém na equipe"
      text="Cadastre quem atende no balcão para registrar as vendas."
    >
      <button class="btn sm" @click="openForm()">Adicionar pessoa</button>
    </EmptyState>

    <AppModal :open="formOpen" :title="editing ? 'Editar pessoa' : 'Nova pessoa na equipe'" @close="formOpen = false">
      <form id="emp-form" class="form-grid" @submit.prevent="save">
        <label class="field full"
          ><span>Nome</span><input v-model="form.name" class="input" required maxlength="80"
        /></label>
        <label class="field"
          ><span>Função</span>
          <select v-model="form.role" class="select">
            <option v-for="r in ROLES" :key="r" :value="r">{{ LABELS.role[r] }}</option>
          </select>
        </label>
        <label class="field check"><input v-model="form.active" type="checkbox" /> Ativo (aparece no caixa)</label>
        <p v-if="error" class="error full">{{ error }}</p>
      </form>
      <template #footer><button class="btn" form="emp-form">Salvar</button></template>
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
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.member {
  position: relative;
  display: grid;
  gap: 16px;
  padding: 18px;
  transition:
    transform 0.25s var(--ease),
    box-shadow 0.25s;
}
.member:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}
.member.off {
  opacity: 0.6;
}
.crown {
  position: absolute;
  top: -12px;
  right: 14px;
  font-size: 24px;
  animation: pop 0.6s 0.3s var(--ease) both;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.head div {
  flex: 1;
  display: grid;
  justify-items: start;
  gap: 4px;
}
.nums {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.nums div {
  display: grid;
}
.nums small {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
.nums strong {
  font-family: var(--display);
  font-size: 20px;
}
.meter {
  height: 8px;
  border-radius: 99px;
  background: var(--brand-mist);
  overflow: hidden;
}
.meter span {
  display: block;
  height: 100%;
  width: calc(var(--w) * 100%);
  border-radius: inherit;
  background: linear-gradient(90deg, #d98ae8, var(--brand));
  transform-origin: left;
  animation: grow-x 0.9s 0.2s var(--ease) both;
}
.check {
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: end;
  min-height: 44px;
  font-weight: 600;
}
.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--brand);
}
@keyframes grow-x {
  from {
    transform: scaleX(0);
  }
}
</style>
