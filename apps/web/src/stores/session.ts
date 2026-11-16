import type { AuthResponse, Me } from "@petsystem/contracts";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { authApi } from "@/api";
import { refreshTokens, tokens } from "@/api/http";

export const useSession = defineStore("session", () => {
  const me = ref<Me | null>(null);
  const loggedIn = computed(() => Boolean(me.value));

  function start(res: AuthResponse) {
    tokens.set(res);
    me.value = { user: res.user, shop: res.shop };
  }

  /** Recupera a sessão ao abrir o app (renova o token se precisar). */
  async function restore(): Promise<boolean> {
    if (me.value) return true;
    if (!tokens.refresh()) return false;
    if (!tokens.access() && !(await refreshTokens())) return false;
    try {
      me.value = await authApi.me();
      return true;
    } catch {
      return false;
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      /* a sessão local sai de qualquer jeito */
    }
    clear();
  }

  function clear() {
    tokens.clear();
    me.value = null;
  }

  return { me, loggedIn, start, restore, logout, clear };
});
