import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { setSessionLostHandler } from "./api/http";
import { reveal } from "./lib/reveal";
import router from "./router";
import { useSession } from "./stores/session";
import "./styles/base.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.directive("reveal", reveal);

// Sessão perdida (refresh recusado): limpa e volta para o login.
setSessionLostHandler(() => {
  useSession().clear();
  if (router.currentRoute.value.meta.auth) void router.push({ name: "login", query: { expirou: "1" } });
});

app.mount("#app");
