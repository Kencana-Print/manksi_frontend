<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { IconNotebook, IconX, IconSearch } from "@tabler/icons-vue";

interface PraOrderItem {
  Nomor: string;
  NamaPekerjaan: string;
  Customer: string;
  Tanggal: string;
  Status: string;
}

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<PraOrderItem[]>([]);
const isLoading = ref(false);

const page = ref(1);
const itemsPerPage = ref(50);
const totalItems = ref(0);

const headers = [
  { title: "NOMOR", key: "Nomor", width: "150px" },
  { title: "NAMA PEKERJAAN", key: "NamaPekerjaan", minWidth: "200px" },
  { title: "CUSTOMER", key: "Customer", minWidth: "180px" },
  { title: "TANGGAL", key: "Tanggal", width: "110px" },
  { title: "STATUS", key: "Status", width: "90px" },
];

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/penjualan/pra-order-form/search", {
      params: { q: search.value, page: page.value, limit: itemsPerPage.value },
    });
    items.value = res.data.data;
    totalItems.value = res.data.total;
  } catch (error) {
    console.error("Gagal memuat data Pra Order:", error);
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
  const selectedItem = row.item || row;
  if (selectedItem) {
    selectItem(selectedItem);
  } else {
    console.warn("Data Pra Order tidak ditemukan pada baris yang diklik");
  }
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

const selectItem = (item: PraOrderItem) => {
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="800px"
    scrollable
  >
    <v-card class="lookup-card rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <IconNotebook
          :size="16"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-2 font-weight-bold"
          >CARI DATA PRA ORDER</span
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

      <v-card-text class="pa-3 bg-grey-lighten-4">
        <v-text-field
          v-model="search"
          @input="onSearchInput"
          label="Cari Nomor, Nama Pekerjaan, atau Customer..."
          variant="outlined"
          density="compact"
          bg-color="white"
          hide-details
          class="mb-3"
          autofocus
          clearable
        >
          <template #prepend-inner>
            <IconSearch
              :size="15"
              :stroke-width="1.7"
              style="opacity: 0.55; margin-top: 1px"
            />
          </template>
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
        >
        </v-data-table-server>
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
