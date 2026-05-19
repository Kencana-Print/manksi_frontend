<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { IconFileInvoice, IconX, IconSearch } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);
const page = ref(1);
const itemsPerPage = ref(25);
const totalItems = ref(0);

const headers = [
  { title: "NOMOR INVOICE", key: "Nomor", width: "160px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px" },
  { title: "TOTAL QTY", key: "Qty", width: "100px", align: "end" as const },
  { title: "KETERANGAN", key: "Keterangan", minWidth: "200px" },
];

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/inv-dc", {
      params: { q: search.value, page: page.value, limit: itemsPerPage.value },
    });
    items.value = res.data.data.items;
    totalItems.value = res.data.data.total;
  } catch (error) {
    console.error("Gagal memuat data Invoice DC:", error);
  } finally {
    isLoading.value = false;
  }
};

const onSearchInput = () => {
  page.value = 1;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchData();
  }, 500);
};

const onOptionsUpdate = ({ page: newPage, itemsPerPage: newLimit }: any) => {
  page.value = newPage;
  itemsPerPage.value = newLimit;
  fetchData();
};

const onRowClick = (event: MouseEvent, row: any) => {
  emit("selected", row.item || row);
  emit("update:modelValue", false);
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      page.value = 1;
      fetchData();
    }
  },
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="750px"
    scrollable
  >
    <v-card class="lookup-card rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <IconFileInvoice :size="16" color="white" class="mr-2" />
        <span class="text-subtitle-2 font-weight-bold"
          >CARI INVOICE GUDANG DC</span
        >
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          size="small"
          @click="emit('update:modelValue', false)"
          ><IconX :size="16" color="white"
        /></v-btn>
      </v-card-title>
      <v-card-text class="pa-3 bg-grey-lighten-4">
        <v-text-field
          v-model="search"
          @input="onSearchInput"
          label="Cari Nomor Invoice..."
          variant="outlined"
          density="compact"
          bg-color="white"
          hide-details
          class="mb-3"
          autofocus
          clearable
        >
          <template #prepend-inner
            ><IconSearch :size="15" style="opacity: 0.55; margin-top: 1px"
          /></template>
        </v-text-field>
        <v-data-table-server
          :headers="headers"
          :items="items"
          :items-length="totalItems"
          :loading="isLoading"
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          @update:options="onOptionsUpdate"
          density="compact"
          height="400px"
          fixed-header
          hover
          class="lookup-table border rounded elevation-1"
          @click:row="onRowClick"
          :items-per-page-options="[25, 50, 100]"
        />
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
  font-weight: bold !important;
  height: 32px !important;
  white-space: nowrap;
}
.lookup-table :deep(tbody tr) {
  cursor: pointer;
}
.lookup-table :deep(tbody tr:hover td) {
  background-color: #e3f2fd !important;
}
</style>
