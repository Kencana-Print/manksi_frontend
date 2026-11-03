<template>
  <v-dialog
    :model-value="true"
    @update:modelValue="emit('close')"
    max-width="900px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 80vh;">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">Bantuan - Pilih Supplier</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" @click="emit('close')" variant="text" size="small"></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
        <v-text-field
          v-model="searchTerm"
          label="Cari berdasarkan Kode, Nama, atau Kota..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchSuppliers"
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="filteredSuppliers"
          :loading="isLoading"
          hover
          class="desktop-table flex-grow-1"
          density="compact"
          item-key="Kode" fixed-header
          :items-per-page="15"
        >
          <template #item="{ item }">
            <tr style="cursor: pointer;" @click="selectSupplier(item as Supplier)">
              <td>{{ (item as Supplier).Kode }}</td> <td>{{ (item as Supplier).Nama }}</td> <td>{{ (item as Supplier).Kota }}</td> <td>{{ (item as Supplier).Telp }}</td> <td class="text-center">
                <v-btn 
                    color="success" 
                    size="x-small" 
                    @click.stop="selectSupplier(item as Supplier)" 
                    variant="tonal"
                >
                    Pilih
                </v-btn>
              </td>
            </tr>
          </template>
          
          <template #no-data>
            <div class="text-center pa-4">Tidak ada data supplier.</div>
          </template>

          <template #loading>
            <v-progress-linear indeterminate color="primary"></v-progress-linear>
          </template>
          
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, defineProps, defineEmits } from 'vue';
import api from '@/services/api'; 
import { AxiosError } from 'axios';
import { useToast } from 'vue-toastification';

// --- Interfaces (TETAP SAMA) ---
interface Supplier {
    Kode: string;
    Nama: string;
    Kota: string; 
    Telp: string;
    [key: string]: string | number | undefined; 
}
interface ApiResponse {
    message: string;
    data: Supplier[]; 
}

// --- Props & Emits ---
const props = defineProps<{
    isVisible: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'select', supplier: Supplier): void;
}>();

const toast = useToast();
const suppliers = ref<Supplier[]>([]);
const searchTerm = ref('');
const isLoading = ref(false);

// --- Header v-data-table diperluas (FIXED TYPE) ---
// FIX UTAMA: Menetapkan tipe 'align' sebagai literal type yang diizinkan Vuetify 3
const headers = [
  { title: 'Kode', key: 'Kode', sortable: false, width: '120px' },
  { title: 'Nama', key: 'Nama', sortable: false, width: '250px' },
  { title: 'Kota', key: 'Kota', sortable: false, width: '150px' },
  { title: 'Telp', key: 'Telp', sortable: false, width: '150px' },
  { title: 'Aksi', key: 'actions', sortable: false, width: '80px', align: 'center' as const }, // Menggunakan 'center' as const
] as const; // Menetapkan seluruh array sebagai const yang readonly


// --- API & Logic (TETAP SAMA) ---

const fetchSuppliers = async (query: string) => {
    isLoading.value = true;
    try {
        const response = await api.get<ApiResponse>('/supplier', { params: { q: query } });
        suppliers.value = response.data.data || []; 
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        
        if (err.response?.data?.message) {
             toast.error(err.response.data.message);
        } else if (err.message) {
             toast.error(err.message);
        } else {
             toast.error("Gagal mengambil daftar supplier.");
        }
        suppliers.value = [];
    } finally {
        isLoading.value = false;
    }
};

// Filter dilakukan secara lokal (client-side)
const filteredSuppliers = computed(() => {
    if (!searchTerm.value) {
        return suppliers.value;
    }
    const lowerCaseSearch = searchTerm.value.toLowerCase();
    return suppliers.value.filter(supplier => 
      // FIX: Menggunakan Kode, Nama, Kota
      supplier.Kode.toLowerCase().includes(lowerCaseSearch) ||
      supplier.Nama.toLowerCase().includes(lowerCaseSearch) ||
      supplier.Kota.toLowerCase().includes(lowerCaseSearch)
    );
});

// Aksi saat tombol 'Pilih' diklik atau baris diklik
const selectSupplier = (supplier: Supplier) => {
    emit('select', supplier); // Emit event 'select' (sesuai Parent Component)
    emit('close'); // Tutup modal
};

onMounted(fetchSuppliers);

// Tambahkan watch untuk memuat ulang data saat searchTerm berubah (Opsional)
/* Jika Anda ingin pencarian dilakukan setiap kali user mengetik, gunakan watch dengan debounce:
import debounce from 'lodash/debounce';
const debouncedSearch = debounce(fetchAllSuppliers, 300);
watch(searchTerm, () => {
    debouncedSearch();
});
*/

</script>

<style scoped>
/* Style tetap sama */
.dialog-card {
font-size: 13px; 
}
.desktop-table {
  font-size: 12px; 
}
.desktop-table :deep(td), .desktop-table :deep(th) {
  padding: 0 8px !important;
  height: 35px !important; 
}
.desktop-table :deep(thead th) {
  background-color: #f5f5f5 !important;
  font-weight: bold;
  color: #333 !important;
}
</style>