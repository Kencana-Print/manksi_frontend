// Types
import type { App } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import router from "../router";
import vuetify from "./vuetify";

// [TAMBAHKAN INI]
import Toast, { POSITION, type PluginOptions } from "vue-toastification";

export function registerPlugins(app: App) {
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);

  // [TAMBAHKAN KONFIGURASI INI]
  const toastOptions: PluginOptions = {
    position: POSITION.TOP_RIGHT,
    timeout: 3000,
    closeOnClick: true,
    pauseOnHover: true,
  };

  app.use(vuetify);
  app.use(pinia);
  app.use(router);

  // [DAFTARKAN PLUGIN TOAST DI SINI]
  app.use(Toast, toastOptions);
}
