/**
 * main.ts
 */

// Composables
import { createApp } from "vue";

// Plugins
import { registerPlugins } from "@/plugins";

// Components
import App from "./App.vue";

// Styles
import "unfonts.css";
import "./styles/main.css";
import "vue-toastification/dist/index.css"; // <-- [TAMBAHKAN BARIS INI]

const app = createApp(App);

registerPlugins(app);

app.mount("#app");
