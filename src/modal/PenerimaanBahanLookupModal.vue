<template>
  <v-dialog v-model="internalVisible" max-width="800px" persistent>
    <v-card>
      <v-card-title class="bg-primary text-white d-flex align-center pa-4">
        <v-icon start>mdi-package-down</v-icon>
        Lookup Penerimaan Bahan MMT
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="closeModal"></v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-text-field
          v-model="searchQuery"
          label="Cari Nomor Rec / Supplier / Memo..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-4"
          @keyup.enter="fetchData"
          clearable
        />

        <v-data-table
          :headers="headers"
          :items="items"
          :loading="isLoading"
          :items-per-page="10"
          density="compact"
          hover
          class="lookup-table border"
          height="400px"
          fixed-header
        >
          <template #[`item.action`]="{ item }">
            <v-btn
              color="primary"
              size="x-small"
              @click="selectItem(item)"
              prepend-icon="mdi-check-circle"
            >
              Pilih
            </v-btn>
          </template>
          
          <template #no-data>
            <div class="pa-4 text-center">Data tidak ditemukan.</div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeModal">Batal</v-btn>
        <v-btn color="primary" @click="fetchData" :loading="isLoading">
          Refresh Data
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import api from "@/services/api";

const props = defineProps({
  isVisible: Boolean
});

const emit = defineEmits(['close', 'select']);

const internalVisible = ref(props.isVisible);
const isLoading = ref(false);
const searchQuery = ref('');
const items = ref([]);

const headers = [
  { title: 'Nomor Rec', key: 'Nomor', width: '150px' },
  { title: 'Tanggal', key: 'Tanggal', width: '120px' },
  { title: 'Supplier', key: 'Supplier' },
  { title: 'No. Permintaan', key: 'No_Permintaan' },
  { title: 'Aksi', key: 'action', sortable: false, align: 'center' }
];

// Sinkronisasi prop isVisible ke internal state
watch(() => props.isVisible, (val) => {
  internalVisible.ref = val;
  if (val) fetchData();
});

const fetchData = async () => {
  try {
    isLoading.value = true;
    // Menggunakan route yang tadi kita buat: /api/penerimaan/lookup-invoice
    const response = await api.get('mmt/penerimaan-bahan/lookup-invoice', {
      params: { q: searchQuery.value }
    });
    items.value = response.data.data || response.data;
  } catch (error) {
    console.error("Gagal load lookup penerimaan:", error);
  } finally {
    isLoading.value = false;
  }
};

const closeModal = () => {
  emit('close');
};

const selectItem = (item: any) => {
  emit('select', item);
};

onMounted(() => {
  if (props.isVisible) fetchData();
});
</script>

<style scoped>
.lookup-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  font-weight: bold !important;
}
.lookup-table :deep(tbody tr:hover) {
  cursor: pointer;
  background-color: #e3f2fd !important;
}
</style>