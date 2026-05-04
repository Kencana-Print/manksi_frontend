<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import BlankLayout from "@/layouts/BlankLayout.vue";

const route = useRoute();

// Mapping layout berdasarkan nama yang ada di meta.layout router
const layouts: any = {
  DefaultLayout,
  BlankLayout,
};

// Default ke DefaultLayout jika tidak ditentukan di router
const layout = computed(() => {
  const layoutName = route.meta.layout as string;
  return layouts[layoutName] || DefaultLayout;
});
</script>
