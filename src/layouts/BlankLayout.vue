<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
// Tidak butuh logic apa-apa di sini
</script>

<style scoped>
/* Hilangkan padding default jika perlu */
.v-main {
  --v-layout-left: 0px !important;
  --v-layout-right: 0px !important;
  --v-layout-top: 0px !important;
  --v-layout-bottom: 0px !important;
}
</style>
