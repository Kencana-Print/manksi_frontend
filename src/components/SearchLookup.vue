<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { IconX, IconSearch } from "@tabler/icons-vue";

interface LookupItem {
  Kode: string;
  Nama: string;
}

interface RowClickEvent<T> {
  item: T;
}

const props = defineProps<{
  modelValue: boolean;
  title: string;
  lookupCategory: string;
  apiEndpoint?: string; // <--- Tambahkan prop ini
}>();

const emit = defineEmits(["update:modelValue", "on-select"]);

const search = ref("");
const items = ref([]);
const isLoading = ref(false);

const headers = [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA", key: "Nama" },
];

const fetchData = async () => {
  if (!props.lookupCategory) return;
  isLoading.value = true;
  try {
    // Gunakan apiEndpoint jika ada, jika tidak gunakan default /master/bahan
    const url =
      props.apiEndpoint || `/master/bahan/lookups/${props.lookupCategory}`;
    const res = await api.get(url);
    items.value = res.data.data;
  } catch (error) {
    console.error("Lookup error:", error);
  } finally {
    isLoading.value = false;
  }
};

const onRowClick = (e: MouseEvent, data: RowClickEvent<LookupItem>) => {
  selectItem(data.item);
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      search.value = "";
      fetchData();
    }
  },
);

const selectItem = (item: any) => {
  emit("on-select", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog v-model="props.modelValue" max-width="500px" persistent>
    <v-card class="lookup-card">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <span class="text-subtitle-2 font-weight-bold"
          >CARI {{ title.toUpperCase() }}</span
        >
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          size="small"
          @click="emit('update:modelValue', false)"
        >
          <IconX :size="16" :stroke-width="2" color="white" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-2">
        <v-text-field
          v-model="search"
          label="Pencarian..."
          variant="outlined"
          density="compact"
          hide-details
          class="mb-2"
          autofocus
        >
          <template #prepend-inner>
            <IconSearch
              :size="15"
              :stroke-width="1.7"
              style="opacity: 0.55; margin-top: 1px"
            />
          </template>
        </v-text-field>

        <v-data-table
          :headers="headers"
          :items="items"
          :search="search"
          :loading="isLoading"
          density="compact"
          height="300px"
          fixed-header
          hover
          class="lookup-table"
          @click:row="onRowClick"
        >
          <template #loading>
            <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lookup-card :deep(*) {
  font-size: 11px !important;
}
.lookup-table :deep(thead th) {
  background-color: #1565c0 !important;
  color: white !important;
  height: 30px !important;
}
.lookup-table :deep(tbody tr) {
  cursor: pointer;
}
</style>
