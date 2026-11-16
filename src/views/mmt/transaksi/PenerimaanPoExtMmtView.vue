<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import * as XLSX from "xlsx";
import { format, subDays, parseISO } from "date-fns";
import PageLayout from "@/components/PageLayout.vue";
import DateRangeFilter from "@/components/DateRangeFilter.vue";

// --- Auth Store Mock (Replikasi frmMenu.CAB & KDUSER) ---
const useAuthStore = () => ({
  can: (menuId: string, action: string) => true,
  KDUSER: "ADMIN",
  CAB: "", // Kosong berarti ALL, atau isi misal 'P02'
});
const authStore = useAuthStore();

// --- Interfaces ---
interface BPBPOExtDetail {
  NomorPO: string;
  NoUrut: number;
  KodeBrg: string; // 🌟 SESUAIKAN: dari Kode -> KodeBrg (alias SQL)
  NamaBrg: string; // 🌟 SESUAIKAN: dari Nama_Bahan -> NamaBrg (alias SQL)
  QtyPO: number; // 🌟 SESUAIKAN: dari Jumlah -> QtyPO (alias SQL)
  Satuan?: string;
  Keterangan?: string;
}

interface BPBPOExtHeader {
  Nomor: string;
  Tanggal: string;
  NomorPO: string;
  Cab: string;
  SPK: string;
  NamaSPK: string;
  Kdsup: string;
  Supplier: string;
  Jumlah: number;
  Finishing: number;
  Keterangan: string;
  details?: BPBPOExtDetail[];
}

// --- State ---
const toast = useToast();
const router = useRouter();
const API_BPB_EXT = "/mmt/penerimaan-po-ext-mmt";
const MENU_ID = "MMT_BPB_PO_EXTERNAL";

const masterData = ref<BPBPOExtHeader[]>([]);
const loading = ref<boolean>(true);
const selected = ref<BPBPOExtHeader[]>([]);
const expanded = ref<string[]>([]);

const startDate = ref(format(subDays(new Date(), 30), "yyyy-MM-dd"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));
const cbCab = ref(authStore.CAB || "ALL");

// --- Computed ---
const isSingleSelected = computed(() => selected.value.length === 1);
const selectedNomor = computed(() =>
  isSingleSelected.value ? selected.value[0].Nomor : null,
);

// --- Table Headers ---
const masterHeaders = [
  { title: "Nomor BPB", key: "Nomor", minWidth: "150px", fixed: true },
  { title: "Tanggal", key: "Tanggal", minWidth: "120px" },
  { title: "Nomor PO", key: "NomorPO", minWidth: "150px" },
  { title: "Cab", key: "Cab", minWidth: "80px" },
  { title: "Supplier", key: "Supplier", minWidth: "200px" },
  { title: "SPK / Nama SPK", key: "NamaSPK", minWidth: "200px" },
  { title: "Total", key: "Jumlah", minWidth: "120px", align: "end" as const },
  { title: "Finishing", key: "Finishing", minWidth: "120px", align: "end" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
  { title: "", key: "data-table-expand", minWidth: "40px" },
];

// --- Methods ---

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await api.get(API_BPB_EXT, {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
        cab: cbCab.value,
      },
    });
    // Pastikan menangkap response.data.data yang dibungkus oleh controller baru
    masterData.value = response.data.data || [];
  } catch (err) {
    toast.error("Gagal mengambil data Penerimaan PO External.");
  } finally {
    loading.value = false;
  }
};

const handleRowClick = (event: any, row: any) => {
  // Jika yang diklik adalah elemen tombol expand, jangan overwrite array selected
  if (event?.target?.closest?.(".v-data-table__expand-icon")) return;
  const item = row?.item ?? event;
  if (item) selected.value = [item];
};

const getRowProps = ({ item }: { item: BPBPOExtHeader }) => {
  return {
    class: item?.Nomor === selectedNomor.value ? "row-selected" : "",
  };
};

// Replikasi cxButton2Click (Baru)
const handleNew = () => {
  router.push({ name: 'PenerimaanPoExtMmtNew' });
};

// Replikasi cxButton1Click (Ubah)
const handleEdit = () => {
  if (!isSingleSelected.value) return;
  const item = selected.value[0];

  // Validasi Cabang (Replikasi logika Delphi)
  if (authStore.CAB !== "" && item.Cab !== authStore.CAB) {
    toast.warning("Data tersebut bukan milik cabang Anda.");
    return;
  }

  router.push({
    name: 'PenerimaanPoExtMmtEdit',
    params: { nomor: item.Nomor },
  });
};

// Replikasi cxButton4Click (Hapus)
const handleDelete = async () => {
  if (!selectedNomor.value) return;
  const item = selected.value[0];

  if (authStore.CAB !== "" && item.Cab !== authStore.CAB) {
    toast.warning("Data tersebut bukan milik cabang Anda.");
    return;
  }

  if (!confirm(`Yakin ingin hapus Penerimaan Nomor: ${selectedNomor.value}?`))
    return;

  try {
    loading.value = true;
    await api.delete(`${API_BPB_EXT}/${selectedNomor.value}`);
    toast.success("Data Berhasil Dihapus & Status PO diperbarui.");
    await fetchData();
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Gagal Hapus Data.");
  } finally {
    loading.value = false;
  }
};

// Replikasi cxButton3Click (Cetak)
const handlePrint = () => {
  if (!selectedNomor.value) return;
  toast.info("Format cetak BPB PO External sedang disiapkan.");
};
const handleExportExcel = () => {
  if (masterData.value.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(masterData.value);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BPB_PO_External");
  XLSX.writeFile(wb, `BPB_External_${startDate.value}.xlsx`);
};

// --- Lifecycle ---
onMounted(() => {
  fetchData();
});

watch([startDate, endDate, cbCab], fetchData);
</script>

<template>
  <PageLayout title="Penerimaan PO External MMT" icon="mdi-dolly">
    <template #header-actions>
      <v-btn size="x-small" color="success" @click="handleNew">
        <v-icon start>mdi-plus</v-icon> Baru
      </v-btn>
      <v-btn
        size="x-small"
        color="warning"
        :disabled="!isSingleSelected"
        @click="handleEdit"
      >
        <v-icon start>mdi-pencil</v-icon> Ubah
      </v-btn>
      <v-btn
        size="x-small"
        color="error"
        :disabled="!isSingleSelected"
        @click="handleDelete"
      >
        <v-icon start>mdi-trash-can</v-icon> Hapus
      </v-btn>

      <v-divider vertical class="mx-2" />

      <v-btn
        size="x-small"
        color="info"
        :disabled="!isSingleSelected"
        @click="handlePrint"
      >
        <v-icon start>mdi-printer</v-icon> Cetak
      </v-btn>
      <v-btn size="x-small" color="secondary" @click="handleExportExcel">
        <v-icon start>mdi-file-excel</v-icon> Export
      </v-btn>
    </template>

    <div class="browse-content">
      <v-card flat class="mb-1 border">
        <v-card-text>
          <div class="filter-section d-flex align-center flex-wrap ga-4">
            <DateRangeFilter v-model:start-date="startDate" v-model:end-date="endDate" />

            <v-divider vertical class="mx-2" />

            <v-label>Cabang:</v-label>
            <v-select
              v-model="cbCab"
              :items="['ALL', 'P02', 'P05']"
              density="compact"
              hide-details
              variant="outlined"
              style="max-width: 120px"
              :readonly="authStore.CAB !== ''"
            />

            <v-btn
              variant="tonal"
              size="small"
              @click="fetchData"
              :loading="loading"
              color="primary"
            >
              <v-icon start>mdi-refresh</v-icon> Refresh
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <div class="table-container">
        <v-data-table
          v-model:selected="selected"
          v-model:expanded="expanded"
          :headers="masterHeaders"
          :items="masterData"
          :loading="loading"
          item-value="Nomor"
          density="compact"
          class="desktop-table elevation-1 border"
          fixed-header
          show-select
          select-strategy="single"
          return-object
          show-expand
          @click:row="handleRowClick"
          :row-props="getRowProps"
        >
          <template #item.Tanggal="{ item }">
            {{
              item.Tanggal ? format(parseISO(item.Tanggal), "dd/MM/yyyy") : ""
            }}
          </template>

          <template #item.Jumlah="{ item }">
            {{ item.Jumlah?.toLocaleString() }}
          </template>

          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="pa-0">
                <div class="detail-container pa-4 bg-grey-lighten-4">
                  <v-card flat border>
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Kode Bahan / Kota</th>
                          <th>Nama Bahan / Alokasi</th>
                          <th class="text-right">Qty PO</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(dtl, index) in item.details" :key="index">
                          <td>{{ dtl.KodeBrg }}</td>
                          <td>{{ dtl.NamaBrg }}</td>
                          <td class="text-right">{{ dtl.QtyPO }}</td>
                        </tr>
                        <tr v-if="!item.details?.length">
                          <td colspan="3" class="text-center pa-2 text-grey">
                            Tidak ada data detail alokasi kota.
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.browse-content {
  padding: 8px;
}
.row-selected {
  background-color: #e3f2fd !important;
}
:deep(.row-selected) {
  background-color: #e3f2fd !important;
}
.v-data-table :deep(tbody tr:hover) {
  cursor: pointer;
  background-color: #f5f5f5;
}
.table-container {
  height: calc(100vh - 200px);
  overflow: hidden;
}
</style>
