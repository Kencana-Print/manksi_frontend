/**
 * plugins/vuetify.ts
 */

// Composables
import { createVuetify } from "vuetify";
// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Ambil tema dari storage saat inisialisasi awal
const savedTheme = localStorage.getItem("manksi-theme") || "light";

export default createVuetify({
  theme: {
    defaultTheme: savedTheme, // Ganti 'system' dengan variabel savedTheme
    themes: {
      light: {
        colors: {
          primary: "#1565C0", // Biru Manksi
        },
      },
      dark: {
        colors: {
          primary: "#2196F3",
          surface: "#121212",
        },
      },
    },
  },
});
