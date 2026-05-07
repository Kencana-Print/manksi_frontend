<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { IconFileSearch, IconX, IconSearch } from "@tabler/icons-vue";

interface MintaHarga {
  Nomor: string;
  Tanggal: string;
  Nama: string;
  Divisi: string;
  Sales: string;
  QtyOrder: number;
  Harga: number;
}

interface RowClickEvent<T> {
  item: {
    raw: T;
  };
}

const props = defineProps<{
  modelValue: boolean;
  custKode?: string; // Buat jadi opsional (tambahkan tanda ?)
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<MintaHarga[]>([]);
const isLoading = ref(false);

const page = ref(1);
const itemsPerPage = ref(50);
const totalItems = ref(0);

const headers = [
  { title: "NOMOR", key: "Nomor", width: "120px" },
  { title: "TANGGAL", key: "Tanggal", width: "90px" },
  { title: "NAMA / BARANG", key: "Nama", minWidth: "200px" },
  { title: "DIVISI", key: "Divisi", width: "90px" },
  { title: "SALES", key: "Sales", width: "100px" },
  { title: "QTY", key: "QtyOrder", width: "60px", align: "end" },
  { title: "HARGA", key: "Harga", width: "90px", align: "end" },
] as const;

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/minta-harga", {
      params: {
        q: search.value,
        custKode: props.custKode,
        page: page.value,
        limit: itemsPerPage.value,
      },
    });
    items.value = res.data.data.items;
    totalItems.value = res.data.data.total;
  } catch (error) {
    console.error("Gagal memuat Permintaan Harga:", error);
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

const onRowClick = (e: MouseEvent, row: any) => {
  // Vuetify 3 biasanya mengirimkan (event, { item })
  // Kita coba ambil item dari row, jika tidak ada, gunakan row itu sendiri
  const selectedItem = row.item || row;

  if (selectedItem) {
    // Jika data masih terbungkus proxy 'raw' (pada beberapa versi Vuetify)
    const finalData = selectedItem.raw || selectedItem;
    selectItem(finalData);
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

const selectItem = (item: MintaHarga) => {
  if (!item) {
    console.warn("Item tidak terpilih atau undefined");
    return;
  }

  // Memastikan data yang di-emit tidak kosong
  emit("selected", item);
  emit("update:modelValue", false);
};

const rp = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="850px"
    scrollable
  >
    <v-card class="lookup-card rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center pa-2 px-4">
        <IconFileSearch
          :size="16"
          :stroke-width="1.7"
          color="white"
          class="mr-2"
        />
        <span class="text-subtitle-2 font-weight-bold"
          >CARI PERMINTAAN HARGA</span
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
          label="Cari Nomor atau Nama Barang..."
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
          height="350px"
          fixed-header
          hover
          class="lookup-table border rounded elevation-1"
          @click:row="onRowClick"
          :items-per-page-options="[25, 50, 100]"
        >
          <template #item.Harga="{ item }">
            {{ rp(item.Harga) }}
          </template>
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
