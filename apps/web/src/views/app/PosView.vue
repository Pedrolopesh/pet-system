<script setup lang="ts">
import type { Category, Client, Employee, Payment, Product, Sale } from "@petsystem/contracts";
import { CATEGORIES, LABELS, PAYMENTS, parseMoney } from "@petsystem/contracts";
import { computed, onMounted, ref } from "vue";
import { clientsApi, employeesApi, productsApi, salesApi } from "@/api";
import AppModal from "@/components/AppModal.vue";
import EmptyState from "@/components/EmptyState.vue";
import Icon from "@/components/Icon.vue";
import { brl } from "@/lib/format";
import { friendly } from "@/lib/messages";
import { useToast } from "@/stores/toast";

const toast = useToast();
const products = ref<Product[]>([]);
const clients = ref<Client[]>([]);
const employees = ref<Employee[]>([]);
const loading = ref(true);

const q = ref("");
const category = ref<Category | "all">("all");
const cart = ref<{ product: Product; qty: number }[]>([]);
const clientId = ref<string>("");
const employeeId = ref<string>("");
const payment = ref<Payment>("pix");
const discountText = ref("");
const busy = ref(false);
const error = ref("");
const done = ref<Sale | null>(null);
const cartOpen = ref(false);

onMounted(async () => {
  try {
    const [p, c, e] = await Promise.all([productsApi.list(), clientsApi.list(), employeesApi.list()]);
    products.value = p;
    clients.value = c;
    employees.value = e.filter((x) => x.active);
    employeeId.value = employees.value[0]?.id ?? "";
  } catch (err) {
    error.value = friendly(err);
  } finally {
    loading.value = false;
  }
});

const visible = computed(() => {
  const term = q.value.trim().toLowerCase();
  return products.value.filter(
    (p) =>
      (category.value === "all" || p.category === category.value) && (!term || p.name.toLowerCase().includes(term)),
  );
});
const inCart = (p: Product) => cart.value.find((l) => l.product.id === p.id)?.qty ?? 0;
const available = (p: Product) => (p.stock === null ? Infinity : p.stock - inCart(p));

const subtotal = computed(() => cart.value.reduce((s, l) => s + l.product.price * l.qty, 0));
const discount = computed(() => (discountText.value.trim() ? parseMoney(discountText.value) : 0));
const discountInvalid = computed(() => discount.value === null || discount.value > subtotal.value);
const total = computed(() => subtotal.value - (discountInvalid.value ? 0 : (discount.value ?? 0)));
const items = computed(() => cart.value.reduce((s, l) => s + l.qty, 0));

function add(p: Product) {
  if (available(p) <= 0) return toast.push(`Sem estoque de ${p.name}.`, "error");
  const line = cart.value.find((l) => l.product.id === p.id);
  if (line) line.qty++;
  else cart.value.push({ product: p, qty: 1 });
}
function change(line: { product: Product; qty: number }, delta: number) {
  if (delta > 0 && available(line.product) <= 0) return;
  line.qty += delta;
  if (line.qty <= 0) cart.value = cart.value.filter((l) => l !== line);
}

async function finish() {
  error.value = "";
  if (!employeeId.value) return (error.value = "Escolha quem está atendendo.");
  if (discountInvalid.value) return (error.value = "Confira o desconto.");
  busy.value = true;
  try {
    const sale = await salesApi.create({
      items: cart.value.map((l) => ({ productId: l.product.id, qty: l.qty })),
      clientId: clientId.value || null,
      employeeId: employeeId.value,
      payment: payment.value,
      discount: discount.value ?? 0,
    });
    // Atualiza o estoque mostrado sem recarregar a lista inteira.
    for (const l of cart.value) if (l.product.stock !== null) l.product.stock -= l.qty;
    done.value = sale;
    cart.value = [];
    discountText.value = "";
    clientId.value = "";
    cartOpen.value = false;
  } catch (err) {
    error.value = friendly(err);
    // Estoque mudou (outra venda): recarrega os produtos.
    products.value = await productsApi.list().catch(() => products.value);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="pos">
    <section class="catalog">
      <div class="search">
        <Icon name="search" :size="18" />
        <input
          v-model="q"
          class="input"
          type="search"
          placeholder="Buscar produto ou serviço"
          aria-label="Buscar produto"
        />
      </div>
      <div class="chips" role="group" aria-label="Categoria">
        <button class="chip" :aria-pressed="category === 'all'" @click="category = 'all'">Tudo</button>
        <button v-for="c in CATEGORIES" :key="c" class="chip" :aria-pressed="category === c" @click="category = c">
          {{ LABELS.category[c] }}
        </button>
      </div>

      <div v-if="loading" class="tiles">
        <div v-for="i in 9" :key="i" class="skeleton" style="height: 118px" />
      </div>
      <TransitionGroup v-else-if="visible.length" tag="div" name="list" class="tiles">
        <button
          v-for="(p, i) in visible"
          :key="p.id"
          class="tile rise"
          :style="{ '--i': Math.min(i, 12) }"
          :class="{ out: available(p) <= 0, picked: inCart(p) > 0 }"
          :disabled="available(p) <= 0"
          @click="add(p)"
        >
          <span class="cat">{{ LABELS.category[p.category] }}</span>
          <strong class="name">{{ p.name }}</strong>
          <span class="row">
            <span class="price num">{{ brl(p.price) }}</span>
            <span v-if="p.stock === null" class="badge gray">serviço</span>
            <span v-else class="badge" :class="available(p) <= 0 ? 'danger' : p.stock <= p.minStock ? 'warn' : 'gray'"
              >{{ available(p) }} un.</span
            >
          </span>
          <span v-if="inCart(p)" class="qty">{{ inCart(p) }}</span>
        </button>
      </TransitionGroup>
      <EmptyState v-else icon="search" title="Nada encontrado" text="Tente outro nome ou outra categoria." />
    </section>

    <aside class="cart card" :class="{ open: cartOpen }" aria-label="Carrinho">
      <button class="cart-toggle" :aria-expanded="cartOpen" @click="cartOpen = !cartOpen">
        <span><Icon name="cart" :size="18" /> {{ items }} {{ items === 1 ? "item" : "itens" }}</span>
        <strong class="num">{{ brl(total) }}</strong>
      </button>
      <div class="cart-body">
        <h2>Carrinho</h2>
        <TransitionGroup v-if="cart.length" tag="ul" name="list" class="lines">
          <li v-for="l in cart" :key="l.product.id">
            <div class="ln">
              <strong>{{ l.product.name }}</strong>
              <small class="muted num">{{ brl(l.product.price) }} cada</small>
            </div>
            <div class="stepper">
              <button class="icon-btn" :aria-label="`Tirar um ${l.product.name}`" @click="change(l, -1)">
                <Icon :name="l.qty === 1 ? 'trash' : 'minus'" :size="16" />
              </button>
              <span class="num">{{ l.qty }}</span>
              <button
                class="icon-btn"
                :aria-label="`Mais um ${l.product.name}`"
                :disabled="available(l.product) <= 0"
                @click="change(l, 1)"
              >
                <Icon name="plus" :size="16" />
              </button>
            </div>
            <strong class="num sum">{{ brl(l.product.price * l.qty) }}</strong>
          </li>
        </TransitionGroup>
        <EmptyState v-else icon="cart" title="Carrinho vazio" text="Toque nos produtos para adicionar." />

        <div class="form">
          <label class="field"
            ><span>Cliente</span>
            <select v-model="clientId" class="select">
              <option value="">Cliente avulso</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">
                {{ c.name }}{{ c.pets.length ? ` · ${c.pets.map((p) => p.name).join(", ")}` : "" }}
              </option>
            </select>
          </label>
          <label class="field"
            ><span>Atendente</span>
            <select v-model="employeeId" class="select" required>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
            </select>
          </label>
          <div class="field">
            <span>Pagamento</span>
            <div class="pay" role="group" aria-label="Forma de pagamento">
              <button v-for="p in PAYMENTS" :key="p" type="button" :aria-pressed="payment === p" @click="payment = p">
                {{ LABELS.payment[p] }}
              </button>
            </div>
          </div>
          <label class="field"
            ><span>Desconto (R$)</span>
            <input
              v-model="discountText"
              class="input"
              inputmode="decimal"
              placeholder="0,00"
              :aria-invalid="discountText !== '' && discountInvalid"
            />
          </label>
        </div>

        <dl class="totals">
          <div>
            <dt>Subtotal</dt>
            <dd class="num">{{ brl(subtotal) }}</dd>
          </div>
          <div v-if="discount && !discountInvalid">
            <dt>Desconto</dt>
            <dd class="num">− {{ brl(discount) }}</dd>
          </div>
          <div class="grand">
            <dt>Total</dt>
            <dd class="num">{{ brl(total) }}</dd>
          </div>
        </dl>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="btn lg finish" :disabled="!cart.length || busy" @click="finish">
          {{ busy ? "Fechando..." : `Fechar venda · ${brl(total)}` }}
        </button>
      </div>
    </aside>

    <AppModal :open="done !== null" title="Venda concluída" @close="done = null">
      <div v-if="done" class="receipt">
        <span class="ok-ic"><Icon name="check" :size="30" /></span>
        <p class="muted">Venda #{{ done.number }} · {{ LABELS.payment[done.payment] }}</p>
        <p class="big num">{{ brl(done.total) }}</p>
        <ul>
          <li v-for="i in done.items" :key="i.productId">
            <span>{{ i.qty }}× {{ i.name }}</span
            ><span class="num">{{ brl(i.unitPrice * i.qty) }}</span>
          </li>
        </ul>
        <p v-if="done.client" class="muted">Cliente: {{ done.client.name }}</p>
      </div>
      <template #footer>
        <RouterLink class="btn ghost" :to="{ name: 'sales' }">Ver vendas</RouterLink>
        <button class="btn" autofocus @click="done = null">Nova venda</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.pos {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: start;
}
.catalog {
  display: grid;
  gap: 14px;
  min-width: 0;
}
.search {
  position: relative;
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
  min-height: 50px;
  font-size: 16px;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}
.tile {
  position: relative;
  display: grid;
  align-content: space-between;
  gap: 8px;
  min-height: 118px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition:
    transform 0.2s var(--ease),
    border-color 0.2s,
    box-shadow 0.25s;
}
.tile:hover {
  transform: translateY(-3px);
  border-color: var(--brand);
  box-shadow: var(--shadow);
}
.tile:active {
  transform: scale(0.97);
}
.tile.picked {
  border-color: var(--brand);
  background: var(--brand-mist);
}
.tile.out {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.cat {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--soft);
}
.name {
  font-size: 14px;
  line-height: 1.3;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.price {
  font-family: var(--display);
  font-weight: 600;
  font-size: 17px;
  color: var(--brand-deep);
}
.qty {
  position: absolute;
  top: -8px;
  right: -8px;
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border-radius: 99px;
  background: var(--brand);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  box-shadow: 0 4px 10px -2px rgba(186, 43, 210, 0.6);
  animation: pop 0.35s var(--ease);
}

.cart {
  position: sticky;
  top: 88px;
  padding: 20px;
}
.cart h2 {
  font-size: 20px;
  margin-bottom: 10px;
}
.cart-toggle {
  display: none;
}
.lines {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: grid;
  gap: 2px;
  max-height: 34vh;
  overflow-y: auto;
}
.lines li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.ln {
  display: grid;
  min-width: 0;
}
.ln strong {
  font-size: 13px;
  line-height: 1.3;
}
.ln small {
  font-size: 12px;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 10px;
  background: var(--brand-mist);
}
.stepper .icon-btn {
  width: 28px;
  height: 28px;
}
.stepper span {
  min-width: 22px;
  text-align: center;
  font-weight: 800;
}
.sum {
  font-size: 13px;
  min-width: 74px;
  text-align: right;
}
.form {
  display: grid;
  gap: 12px;
  padding-top: 6px;
}
.pay {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: #f1e8f4;
}
.pay button {
  min-height: 36px;
  border: 0;
  border-radius: 9px;
  background: none;
  font-weight: 800;
  font-size: 13px;
  color: var(--muted);
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}
.pay button[aria-pressed="true"] {
  background: #fff;
  color: var(--brand-deep);
  box-shadow: var(--shadow-sm);
}
.totals {
  margin: 16px 0 10px;
  display: grid;
  gap: 4px;
}
.totals div {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
}
.totals dd {
  margin: 0;
}
.totals .grand {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
  color: var(--ink);
  font-family: var(--display);
  font-size: 22px;
  font-weight: 600;
}
.finish {
  width: 100%;
}
.receipt {
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;
}
.ok-ic {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--ok-soft);
  color: var(--ok);
  animation: pop 0.5s var(--ease);
}
.big {
  font-family: var(--display);
  font-size: 36px;
  font-weight: 600;
}
.receipt ul {
  list-style: none;
  padding: 12px 0 0;
  margin: 6px 0 0;
  width: 100%;
  border-top: 1px dashed var(--line);
  display: grid;
  gap: 6px;
}
.receipt li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
}

@media (max-width: 1080px) {
  .pos {
    grid-template-columns: 1fr;
    padding-bottom: 80px;
  }
  .cart {
    position: fixed;
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    padding: 0;
    border-radius: 22px 22px 0 0;
    box-shadow: 0 -10px 40px -10px rgba(60, 20, 80, 0.35);
    max-height: 64px;
    overflow: hidden;
    transition: max-height 0.4s var(--ease);
  }
  .cart.open {
    max-height: 88vh;
    overflow-y: auto;
  }
  .cart-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 64px;
    padding: 0 20px;
    border: 0;
    background: var(--brand);
    color: #fff;
    font-weight: 800;
    cursor: pointer;
  }
  .cart-toggle span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .cart-body {
    padding: 18px 18px 24px;
  }
  .tiles {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  .chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin-inline: -14px;
    padding: 0 14px 4px;
    scrollbar-width: none;
  }
  .chip {
    flex: none;
  }
}
</style>
