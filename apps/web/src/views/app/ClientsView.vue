<script setup lang="ts">
import type { Client, ClientDetail, Pet, Sale } from "@petsystem/contracts";
import { LABELS, SPECIES } from "@petsystem/contracts";
import { onMounted, reactive, ref, watch } from "vue";
import { clientsApi, salesApi } from "@/api";
import AppModal from "@/components/AppModal.vue";
import EmptyState from "@/components/EmptyState.vue";
import Icon from "@/components/Icon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { brl, phone, shortDate, when } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useToast } from "@/stores/toast";

const toast = useToast();
const list = ref<Client[]>([]);
const loading = ref(true);
const q = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;

async function load() {
  loading.value = true;
  try {
    list.value = await clientsApi.list(q.value);
  } catch (e) {
    toast.push(friendly(e), "error");
  } finally {
    loading.value = false;
  }
}
onMounted(load);
// Busca no servidor (nome, telefone ou nome do pet) com uma pequena espera ao digitar.
watch(q, () => {
  clearTimeout(timer);
  timer = setTimeout(load, 250);
});

const SPECIES_ICON: Record<Pet["species"], string> = { cao: "🐶", gato: "🐱", outro: "🐾" };

// --- detalhe ---
const detail = ref<ClientDetail | null>(null);
const history = ref<Sale[]>([]);
async function openDetail(c: Client) {
  detail.value = { ...c, stats: { purchases: 0, spent: 0, lastPurchaseAt: null } };
  history.value = [];
  try {
    const [d, s] = await Promise.all([
      clientsApi.get(c.id),
      salesApi.list({ clientId: c.id, days: 366, pageSize: 10 }),
    ]);
    detail.value = d;
    history.value = s.items;
  } catch (e) {
    toast.push(friendly(e), "error");
  }
}

// --- formulário ---
type PetForm = { id?: string; name: string; species: Pet["species"]; breed: string };
const formOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ name: "", phone: "", email: "", notes: "", pets: [] as PetForm[] });
const formError = ref("");
const saving = ref(false);

function openForm(c?: Client) {
  editingId.value = c?.id ?? null;
  Object.assign(form, {
    name: c?.name ?? "",
    phone: c ? phone(c.phone) : "",
    email: c?.email ?? "",
    notes: c?.notes ?? "",
    pets: c ? c.pets.map((p) => ({ ...p })) : [{ name: "", species: "cao", breed: "" }],
  });
  formError.value = "";
  detail.value = null;
  formOpen.value = true;
}

async function save() {
  saving.value = true;
  formError.value = "";
  const body = { ...form, pets: form.pets.filter((p) => p.name.trim()) };
  try {
    if (editingId.value) {
      const updated = await clientsApi.update(editingId.value, body);
      list.value = list.value.map((c) => (c.id === updated.id ? updated : c));
      toast.push("Cliente atualizado.");
    } else {
      const created = await clientsApi.create(body);
      list.value = [created, ...list.value];
      toast.push("Cliente cadastrado.");
    }
    formOpen.value = false;
  } catch (e) {
    formError.value = friendly(e);
  } finally {
    saving.value = false;
  }
}

async function remove(c: ClientDetail) {
  if (!window.confirm(`Apagar ${c.name} e os pets? As vendas continuam no histórico, sem o nome.`)) return;
  try {
    await clientsApi.remove(c.id);
    list.value = list.value.filter((x) => x.id !== c.id);
    detail.value = null;
    toast.push("Cliente apagado.");
  } catch (e) {
    toast.push(friendly(e), "error");
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="search">
        <Icon name="search" :size="18" />
        <input
          v-model="q"
          class="input"
          type="search"
          placeholder="Buscar por nome, telefone ou nome do pet"
          aria-label="Buscar cliente"
        />
      </div>
      <button class="btn" @click="openForm()"><Icon name="plus" :size="18" /> Novo cliente</button>
    </div>

    <div v-if="loading && !list.length" class="cards">
      <div v-for="i in 6" :key="i" class="skeleton" style="height: 120px" />
    </div>
    <TransitionGroup v-else-if="list.length" tag="div" name="list" class="cards">
      <button
        v-for="(c, i) in list"
        :key="c.id"
        class="client card rise"
        :style="{ '--i': Math.min(i, 12) }"
        @click="openDetail(c)"
      >
        <div class="head">
          <UserAvatar :name="c.name" :size="42" />
          <div>
            <strong>{{ c.name }}</strong>
            <small class="muted">{{ c.phone ? phone(c.phone) : "sem telefone" }}</small>
          </div>
        </div>
        <div class="pets">
          <span v-for="p in c.pets" :key="p.id" class="pet"
            ><span aria-hidden="true">{{ SPECIES_ICON[p.species] }}</span> {{ p.name }}</span
          >
          <span v-if="!c.pets.length" class="muted small">Sem pets cadastrados</span>
        </div>
      </button>
    </TransitionGroup>
    <EmptyState v-else-if="q" icon="search" title="Ninguém encontrado" :text="`Nenhum cliente ou pet com “${q}”.`" />
    <EmptyState
      v-else
      icon="paw"
      title="Nenhum cliente ainda"
      text="Cadastre o tutor e os pets para ver o histórico de compras de cada um."
    >
      <button class="btn sm" @click="openForm()">Cadastrar cliente</button>
    </EmptyState>

    <AppModal :open="detail !== null" :title="detail?.name ?? ''" wide @close="detail = null">
      <div v-if="detail" class="detail">
        <div class="kpis">
          <div>
            <small>Compras</small><strong class="num">{{ detail.stats.purchases }}</strong>
          </div>
          <div>
            <small>Total gasto</small><strong class="num">{{ brl(detail.stats.spent) }}</strong>
          </div>
          <div>
            <small>Última compra</small
            ><strong>{{ detail.stats.lastPurchaseAt ? shortDate(detail.stats.lastPurchaseAt) : "—" }}</strong>
          </div>
        </div>
        <div class="info">
          <p>
            <Icon name="bell" :size="16" /> {{ detail.phone ? phone(detail.phone) : "Sem telefone" }} ·
            {{ detail.email || "sem e-mail" }}
          </p>
          <p v-if="detail.notes" class="muted">{{ detail.notes }}</p>
        </div>
        <h3>Pets</h3>
        <div class="pet-cards">
          <div v-for="p in detail.pets" :key="p.id" class="pet-card">
            <span class="emoji" aria-hidden="true">{{ SPECIES_ICON[p.species] }}</span>
            <div>
              <strong>{{ p.name }}</strong
              ><small class="muted">{{ LABELS.species[p.species] }}{{ p.breed ? ` · ${p.breed}` : "" }}</small>
            </div>
          </div>
          <p v-if="!detail.pets.length" class="muted">Nenhum pet cadastrado.</p>
        </div>
        <h3>Últimas compras</h3>
        <ul v-if="history.length" class="hist">
          <li v-for="s in history" :key="s.id">
            <span>#{{ s.number }} · {{ when(s.at) }}</span>
            <span class="muted items">{{ s.items.map((i) => i.name).join(", ") }}</span>
            <strong class="num">{{ brl(s.total) }}</strong>
          </li>
        </ul>
        <p v-else class="muted">Nenhuma compra registrada.</p>
      </div>
      <template #footer>
        <button v-if="detail" class="btn quiet" @click="remove(detail)"><Icon name="trash" :size="16" /> Apagar</button>
        <button v-if="detail" class="btn" @click="openForm(detail)"><Icon name="edit" :size="16" /> Editar</button>
      </template>
    </AppModal>

    <AppModal :open="formOpen" :title="editingId ? 'Editar cliente' : 'Novo cliente'" wide @close="formOpen = false">
      <form id="client-form" class="form-grid" @submit.prevent="save">
        <label class="field full"
          ><span>Nome do tutor</span><input v-model="form.name" class="input" required maxlength="80"
        /></label>
        <label class="field"
          ><span>Telefone (com DDD)</span
          ><input v-model="form.phone" class="input" inputmode="tel" placeholder="(48) 99999-0000"
        /></label>
        <label class="field"><span>E-mail</span><input v-model="form.email" class="input" type="email" /></label>
        <label class="field full"
          ><span>Observações</span
          ><textarea
            v-model="form.notes"
            class="input"
            rows="2"
            maxlength="500"
            placeholder="Ex.: Thor tem alergia a frango"
          />
        </label>
        <fieldset class="full pets-form">
          <legend>Pets</legend>
          <TransitionGroup name="list" tag="div" class="pet-rows">
            <div v-for="(p, i) in form.pets" :key="p.id ?? `new-${i}`" class="pet-row">
              <input
                v-model="p.name"
                class="input"
                placeholder="Nome"
                maxlength="40"
                :aria-label="`Nome do pet ${i + 1}`"
              />
              <select v-model="p.species" class="select" :aria-label="`Espécie do pet ${i + 1}`">
                <option v-for="s in SPECIES" :key="s" :value="s">{{ LABELS.species[s] }}</option>
              </select>
              <input
                v-model="p.breed"
                class="input"
                placeholder="Raça"
                maxlength="40"
                :aria-label="`Raça do pet ${i + 1}`"
              />
              <button
                type="button"
                class="icon-btn"
                :aria-label="`Remover pet ${i + 1}`"
                @click="form.pets.splice(i, 1)"
              >
                <Icon name="trash" :size="16" />
              </button>
            </div>
          </TransitionGroup>
          <button type="button" class="btn ghost sm" @click="form.pets.push({ name: '', species: 'cao', breed: '' })">
            <Icon name="plus" :size="16" /> Adicionar pet
          </button>
        </fieldset>
        <p v-if="formError" class="error full" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <button class="btn" form="client-form" :disabled="saving">{{ saving ? "Salvando..." : "Salvar" }}</button>
      </template>
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
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.client {
  display: grid;
  gap: 14px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.25s var(--ease),
    box-shadow 0.25s,
    border-color 0.2s;
}
.client:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
  border-color: var(--brand-soft);
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.head div {
  display: grid;
}
.pets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pet {
  padding: 4px 10px;
  border-radius: 99px;
  background: var(--brand-mist);
  font-size: 13px;
  font-weight: 700;
}
.small {
  font-size: 13px;
}
.detail h3 {
  font-size: 17px;
  margin: 18px 0 10px;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.kpis div {
  display: grid;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--brand-mist);
}
.kpis small {
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}
.kpis strong {
  font-family: var(--display);
  font-size: 20px;
}
.info {
  margin-top: 14px;
  display: grid;
  gap: 4px;
}
.info p {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pet-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.pet-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
}
.pet-card div {
  display: grid;
}
.emoji {
  font-size: 26px;
}
.hist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
}
.hist li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 14px;
}
.hist .items {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pets-form {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px 14px;
  display: grid;
  gap: 10px;
}
.pets-form legend {
  font-weight: 800;
  font-size: 13px;
  color: var(--muted);
  padding: 0 6px;
}
.pet-rows {
  display: grid;
  gap: 8px;
}
.pet-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 1fr auto;
  gap: 8px;
  align-items: center;
}
.pets-form > .btn {
  justify-self: start;
}
textarea.input {
  resize: vertical;
}
@media (max-width: 640px) {
  .toolbar .btn {
    padding: 0 12px;
  }
  .kpis {
    grid-template-columns: 1fr 1fr;
  }
  .pet-row {
    grid-template-columns: 1fr 1fr auto;
  }
  .pet-row input:nth-of-type(2) {
    grid-column: 1 / 3;
  }
  .hist li {
    grid-template-columns: 1fr auto;
  }
  .hist .items {
    display: none;
  }
}
</style>
