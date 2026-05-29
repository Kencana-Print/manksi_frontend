<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { kunjunganSalesService } from "@/services/laporan/marketing/kunjunganSalesService";
import { IconUsers, IconCheck, IconX } from "@tabler/icons-vue";

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dtAwal = ref(formatDateLocal(firstDay));
const dtAkhir = ref(formatDateLocal(today));

const filterState = ref({
  startDate: dtAwal.value,
  endDate: dtAkhir.value,
});

// Menyimpan data summary secara lokal dari intersep fetchApi
const summarySales = ref<any[]>([]);
const summaryDialog = ref(false);

watch(
  filterState,
  (newVal) => {
    if (newVal.startDate) dtAwal.value = newVal.startDate;
    if (newVal.endDate) dtAkhir.value = newVal.endDate;
  },
  { deep: true },
);

const headers = [
  { title: "NAMA SALES", key: "Nama_Sales", width: "150px" },
  { title: "TGL PLAN", key: "Tanggal_Plan", width: "110px", align: "center" },
  {
    title: "PLAN",
    key: "has_plan",
    width: "70px",
    align: "center",
    sortable: false,
  },
  {
    title: "TGL REALISASI",
    key: "Tgl_Realisasi",
    width: "110px",
    align: "center",
  },
  {
    title: "REALISASI",
    key: "has_realisasi",
    width: "90px",
    align: "center",
    sortable: false,
  },
  { title: "STATUS", key: "status_kunjungan", width: "100px", align: "center" },
  { title: "KODE CUS", key: "Cus_Kode", width: "100px" },
  { title: "NAMA CUSTOMER", key: "Cus_Nama", minWidth: "200px" },
  { title: "ALAMAT CUSTOMER", key: "Cus_Alamat", minWidth: "250px" },
  { title: "KEPERLUAN", key: "Keperluan", minWidth: "200px" },
  { title: "CATATAN", key: "Catatan", minWidth: "200px" },
];

const fetchApi = async () => {
  const response = await kunjunganSalesService.getBrowse({
    startDate: filterState.value.startDate,
    endDate: filterState.value.endDate,
  });
  // Ambil data array summary dari struktur backend
  summarySales.value = response.data?.summary || [];
  return response.data?.data || [];
};

const { items, isLoading, fetchData, exportToExcel } = useBrowse({
  menuId: "313",
  fetchApi,
  immediate: false,
});

onMounted(() => fetchData());

watch([dtAwal, dtAkhir], () => {
  filterState.value.startDate = dtAwal.value;
  filterState.value.endDate = dtAkhir.value;
  fetchData();
});

const formatDate = (val: string) => {
  if (!val || val.startsWith("0000")) return "-";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const getStatusColor = (status: string) => {
  if (status === "done") return "success";
  if (status === "failed") return "error";
  return "warning"; // unplan
};

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.status_kunjungan === "failed") {
    return { style: "background-color: #ffebee;" }; // Highlight kemerahan jika failed
  }
  return {};
};
</script>

<template>
  <BaseBrowse
    title="Laporan Kunjungan Sales"
    menu-id="313"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Cus_Kode"
    v-model:filter-state="filterState"
    can-export
    :row-props-fn="rowPropsFn"
    @export="exportToExcel('Laporan_Kunjungan_Sales')"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="filter-group">
        <input
          type="date"
          v-model="dtAwal"
          class="date-inp"
          @change="fetchData"
        />
        <span class="filter-sep">s.d</span>
        <input
          type="date"
          v-model="dtAkhir"
          class="date-inp"
          @change="fetchData"
        />
      </div>
    </template>

    <template #extra-actions>
      <v-btn size="small" color="indigo" @click="summaryDialog = true">
        <template #prepend><IconUsers :size="15" /></template>
        Rekap Status Sales
      </v-btn>
    </template>

    <template #item.Tanggal_Plan="{ item }">
      {{ formatDate(item.Tanggal_Plan) }}
    </template>

    <template #item.Tgl_Realisasi="{ item }">
      {{ formatDate(item.Tgl_Realisasi) }}
    </template>

    <template #item.has_plan="{ item }">
      <v-icon v-if="item.has_plan" color="success" size="18"
        ><IconCheck
      /></v-icon>
      <v-icon v-else color="grey" size="14"><IconX /></v-icon>
    </template>

    <template #item.has_realisasi="{ item }">
      <v-icon v-if="item.has_realisasi" color="success" size="18"
        ><IconCheck
      /></v-icon>
      <v-icon v-else color="grey" size="14"><IconX /></v-icon>
    </template>

    <template #item.status_kunjungan="{ item }">
      <v-chip
        :color="getStatusColor(item.status_kunjungan)"
        size="x-small"
        class="font-weight-bold text-uppercase"
      >
        {{ item.status_kunjungan }}
      </v-chip>
    </template>
  </BaseBrowse>

  <v-dialog v-model="summaryDialog" max-width="650px">
    <v-card class="rounded-lg">
      <v-card-title class="bg-indigo text-white d-flex align-center pa-3">
        <span class="text-subtitle-1 font-weight-bold"
          >Summary Kunjungan Per Sales</span
        >
        <v-spacer />
        <v-btn
          icon
          variant="text"
          color="white"
          density="compact"
          @click="summaryDialog = false"
        >
          <IconX :size="18" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="table-wrap-summary">
          <table class="summary-table">
            <thead>
              <tr>
                <th style="text-align: left">NAMA SALES</th>
                <th>DONE</th>
                <th>FAILED</th>
                <th>UNPLAN</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sm in summarySales" :key="sm.Nama_Sales">
                <td style="text-align: left" class="font-weight-bold">
                  {{ sm.Nama_Sales }}
                </td>
                <td class="text-green font-weight-bold">{{ sm.done }}</td>
                <td class="text-red font-weight-bold">{{ sm.failed }}</td>
                <td class="text-orange font-weight-bold">{{ sm.unplan }}</td>
                <td class="bg-grey-lighten-4 font-weight-bold">
                  {{ sm.total }}
                </td>
              </tr>
              <tr v-if="summarySales.length === 0">
                <td colspan="5" class="text-center text-grey py-4 font-italic">
                  Tidak ada rekap data pada periode ini
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-sep {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 4px;
}
.date-inp {
  height: 30px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  cursor: pointer;
}
.date-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}

/* Styling Tabel Rekap Summary */
.table-wrap-summary {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}
.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.summary-table th {
  background: #3f51b5;
  color: white;
  padding: 8px 12px;
  font-weight: 700;
  text-align: center;
}
.summary-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  text-align: center;
}
.summary-table tbody tr:hover {
  background: #f5f5f5;
}
.text-green {
  color: #2e7d32;
}
.text-red {
  color: #c62828;
}
.text-orange {
  color: #ef6c00;
}
</style>
