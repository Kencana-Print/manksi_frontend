<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";

interface Bahan {
  Kode: string;
  Nama: string;
  Satuan: string; // Tambahkan Satuan untuk kalkulasi di form
}

interface RowClickEvent<T> {
  item: {
    raw: T;
  };
}

const props = defineProps<{
  modelValue: boolean;
  isBordir?: boolean;
  mode?: "komponen" | "all"; // Tambahkan ini
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);
const page = ref(1);
const itemsPerPage = ref(50);
const totalItems = ref(0);

const headers = [
  { title: "KODE", key: "Kode", width: "120px" },
  { title: "NAMA KOMPONEN", key: "Nama" },
];

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/bahan", {
      params: {
        q: search.value,
        page: page.value,
        limit: itemsPerPage.value,
        isBordir: props.isBordir,
        mode: props.mode,
      },
    });
    // Pastikan mapping data sesuai dengan res.data.data.items
    items.value = res.data.data.items;
    totalItems.value = res.data.data.total;
  } catch (error) {
    console.error("Gagal memuat data bahan");
  } finally {
    isLoading.value = false;
  }
};

const onSearchInput = () => {
  page.value = 1; // Reset ke halaman 1 saat cari
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchData();
  }, 500);
};

const onOptionsUpdate = (options: any) => {
  page.value = options.page;
  itemsPerPage.value = options.itemsPerPage;
  fetchData();
};

const onRowClick = (event: MouseEvent, row: any) => {
  // row.item biasanya berisi data mentah jika menggunakan v-data-table-server
  const selectedItem = row.item;
  selectItem(selectedItem);
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

const selectItem = (item: any) => {
  if (!item) return;
  // Pastikan mengirim objek yang punya properti Kode, Nama, Satuan
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600px"
    scrollable
  >
    <v-card class="lookup-card rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <v-icon start color="white" size="small">mdi-puzzle</v-icon>
        <span class="text-subtitle-2 font-weight-bold"
          >CARI KOMPONEN {{ isBordir ? "(KHUSUS BORDIR)" : "" }}</span
        >
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="emit('update:modelValue', false)"
        ></v-btn>
      </v-card-title>
      <v-card-text class="pa-3 bg-grey-lighten-4">
        <v-text-field
          v-model="search"
          @input="onSearchInput"
          prepend-inner-icon="mdi-magnify"
          label="Cari Kode atau Nama Komponen..."
          variant="outlined"
          density="compact"
          bg-color="white"
          hide-details
          class="mb-3"
          autofocus
          clearable
        ></v-text-field>
        <v-data-table-server
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="items"
          :items-length="totalItems"
          :loading="isLoading"
          @update:options="onOptionsUpdate"
          density="compact"
          height="350px"
          fixed-header
          hover
          class="lookup-table border rounded elevation-1"
          @click:row="onRowClick"
        ></v-data-table-server>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.lookup-card :deep(*) {
  font-size: 11px !important;
}
.lookup-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  color: #424242 !important;
  font-weight: bold !important;
  height: 32px !important;
}
.lookup-table :deep(tbody tr) {
  cursor: pointer;
}
.lookup-table :deep(tbody tr:hover td) {
  background-color: #e3f2fd !important;
}
</style>
