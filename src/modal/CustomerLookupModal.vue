<template>
  <v-dialog
    :model-value="isVisible"
    @update:modelValue="emit('close')"
    max-width="900px"
    persistent
  >
    <v-card class="dialog-card d-flex flex-column" style="height: 80vh;">
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">Bantuan - Pilih Customer</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" @click="emit('close')" variant="text" size="small"></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 d-flex flex-column flex-grow-1">
        <v-text-field
          v-model="searchTerm"
          label="Cari berdasarkan Kode, Nama, Alamat, atau Kota..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          class="mb-4 flex-shrink-0"
          hide-details
          @keyup.enter="fetchCustomers"
        ></v-text-field>

        <v-data-table
          :headers="headers"
          :items="filteredCustomers"
          :loading="isLoading"
          hover
          class="desktop-table flex-grow-1"
          density="compact"
          item-key="Kode" 
          fixed-header
          :items-per-page="15"
        >
          <template #item="{ item }">
            <tr style="cursor: pointer;" @click="selectCustomer(item as Customer)">
              <td>{{ (item as Customer).Kode }}</td>
              <td>{{ (item as Customer).Nama }}</td>
              <td>{{ (item as Customer).Alamat }}</td>
              <td>{{ (item as Customer).Kota }}</td>
              <td class="text-center">
                <v-btn 
                    color="success" 
                    size="x-small" 
                    @click.stop="selectCustomer(item as Customer)" 
                    variant="tonal"
                >
                    Pilih
                </v-btn>
              </td>
            </tr>
          </template>
          
          <template #no-data>
            <div class="text-center pa-4">Tidak ada data customer.</div>
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
import { ref, onMounted, computed, defineProps, defineEmits } from 'vue';
import api from '@/services/api'; 
import { AxiosError } from 'axios';
import { useToast } from 'vue-toastification';

// --- Interfaces ---
interface Customer {
    Kode: string;
    Nama: string;
    Alamat: string;
    Kota: string;
    [key: string]: string | number | undefined; 
}

interface ApiResponse {
    success: boolean;
    data: Customer[]; 
}

// --- Props & Emits ---
const props = defineProps<{
    isVisible: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'select', customer: Customer): void;
}>();

const toast = useToast();
const customers = ref<Customer[]>([]);
const searchTerm = ref('');
const isLoading = ref(false);

// --- Header v-data-table ---
const headers = [
  { title: 'Kode', key: 'Kode', sortable: false, width: '120px' },
  { title: 'Nama', key: 'Nama', sortable: false, width: '250px' },
  { title: 'Alamat', key: 'Alamat', sortable: false, width: '300px' },
  { title: 'Kota', key: 'Kota', sortable: false, width: '150px' },
  { title: 'Aksi', key: 'actions', sortable: false, width: '80px', align: 'center' as const },
] as const;

// --- API & Logic ---

const fetchCustomers = async () => {
    isLoading.value = true;
    try {
        // Menggunakan endpoint lookup yang sudah dibuat di backend Express
        const response = await api.get<ApiResponse>('mmt/customer/lookup');
        customers.value = response.data.data || []; 
    } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        
        if (err.response?.data?.message) {
             toast.error(err.response.data.message);
        } else {
             toast.error("Gagal mengambil daftar customer.");
        }
        customers.value = [];
    } finally {
        isLoading.value = false;
    }
};

// Filter Lokal (Client-side)
const filteredCustomers = computed(() => {
    if (!searchTerm.value) {
        return customers.value;
    }
    const query = searchTerm.value.toLowerCase();
    return customers.value.filter(c => 
      c.Kode.toLowerCase().includes(query) ||
      c.Nama.toLowerCase().includes(query) ||
      c.Alamat.toLowerCase().includes(query) ||
      c.Kota.toLowerCase().includes(query)
    );
});

const selectCustomer = (customer: Customer) => {
    emit('select', customer);
    emit('close');
};

onMounted(fetchCustomers);

</script>

<style scoped>
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