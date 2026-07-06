<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { IconUserSearch, IconX, IconSearch } from "@tabler/icons-vue";

interface UserRow {
  Kode: string;
  Nama: string;
}

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<UserRow[]>([]);
const isLoading = ref(false);
const page = ref(1);
const itemsPerPage = ref(50);
const totalItems = ref(0);

const headers = [
  { title: "KODE", key: "Kode", width: "120px" },
  { title: "NAMA USER", key: "Nama" },
];

let requestSeq = 0; // guard race-condition — sama pola BahanSearchModal
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  const mySeq = ++requestSeq;
  isLoading.value = true;
  try {
    const res = await api.get("/tools/user-form/search", {
      params: { q: search.value },
    });
    if (mySeq !== requestSeq) return;
    const rows: UserRow[] = res.data.data || [];
    totalItems.value = rows.length;
    // Endpoint search backend belum paginasi (F1 lookup Delphi juga
    // tidak paginasi) — potong di FE agar tabel tetap ringan.
    const start = (page.value - 1) * itemsPerPage.value;
    items.value = rows.slice(start, start + itemsPerPage.value);
  } catch {
    if (mySeq !== requestSeq) return;
    items.value = [];
    totalItems.value = 0;
  } finally {
    if (mySeq === requestSeq) isLoading.value = false;
  }
};

const onSearchInput = () => {
  page.value = 1;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(fetchData, 400);
};

const onOptionsUpdate = (options: any) => {
  page.value = options.page;
  itemsPerPage.value = options.itemsPerPage;
  fetchData();
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

const onRowClick = (_e: MouseEvent, row: any) => {
  selectItem(row.item);
};

const selectItem = (item: UserRow) => {
  if (!item) return;
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
        <IconUserSearch
          :size="16"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-2 font-weight-bold">CARI USER (AKTIF)</span>
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
          label="Cari Kode atau Nama User..."
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
