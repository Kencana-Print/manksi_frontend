<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import * as XLSX from "xlsx";
import { format, subDays } from "date-fns";
import PageLayout from "@/components/PageLayout.vue";
import DateRangeFilter from "@/components/DateRangeFilter.vue";

interface PlanningDetail {
  Nomor: string;
  TglEstimasi: string;
  Bahan_Datang: number;
  Mesin: string;
  Cetak: number;
  Finishing: number;
  Kirim: number;
  Ket_Cetak: string;
  Ket_Finishing: string;
  Ket_Kirim: string;
}

interface PlanningMaster {
  Nomor: string;
  Dateline: string;
  Tipe: string;
  Cab: string;
  Kepentingan: string;
  NamaSPK: string;
  Panjang: number;
  Lebar: number;
  JumlahSPK: number;
  Bahan: string;
  Finishing: string;
  Plan_Bhn_Datang: number;
  Plancetak: number;
  Plan_finishing: number;
  Plan_kirim: number;
  detail?: PlanningDetail[];
}

const router = useRouter();
const toast = useToast();
const loading = ref(false);
const masterData = ref<PlanningMaster[]>([]);
const selected = ref<PlanningMaster[]>([]);
const expanded = ref<string[]>([]);

const startDate = ref(format(subDays(new Date(), 30), "yyyy-MM-dd"));
const endDate = ref(format(new Date(), "yyyy-MM-dd"));

const masterHeaders = [
  { title: "Nomor SPK", key: "Nomor", width: "130px", fixed: true },
  { title: "Dateline", key: "Dateline", width: "110px" },
  { title: "Tipe", key: "Tipe", width: "90px" },
  { title: "Cabang", key: "Cab", width: "90px" },
  { title: "Nama SPK", key: "NamaSPK", width: "230px" },
  { title: "Panjang", key: "Panjang", width: "90px", align: "end" as const },
  { title: "Lebar", key: "Lebar", width: "90px", align: "end" as const },
  {
    title: "Jumlah SPK",
    key: "JumlahSPK",
    width: "100px",
    align: "end" as const,
  },
  { title: "Bahan", key: "Bahan", width: "140px" },
  { title: "Finishing", key: "Finishing", width: "140px" },
  {
    title: "Plan Bahan Datang",
    key: "Plan_Bhn_Datang",
    width: "130px",
    align: "end" as const,
  },
  {
    title: "Plan Cetak",
    key: "Plancetak",
    width: "110px",
    align: "center" as const,
  },
  {
    title: "Plan Finishing",
    key: "Plan_finishing",
    width: "120px",
    align: "center" as const,
  },
  {
    title: "Plan Kirim",
    key: "Plan_kirim",
    width: "110px",
    align: "center" as const,
  },
  { title: "", key: "data-table-expand", width: "40px" },
];

const detailHeaders = [
  { title: "Tgl Estimasi", key: "TglEstimasi", minWidth: "120px" },
  { title: "Mesin", key: "Mesin", minWidth: "120px" },
  { title: "Cetak", key: "Cetak", minWidth: "100px", align: "end" as const },
  {
    title: "Finishing",
    key: "Finishing",
    minWidth: "100px",
    align: "end" as const,
  },
  { title: "Kirim", key: "Kirim", minWidth: "100px", align: "end" as const },
  { title: "Ket. Cetak", key: "Ket_Cetak", minWidth: "200px" },
];

const handleRowClick = (_event: any, row: any) => {
  const itemData = row.item?.raw || row.item || row;
  selected.value = [itemData];
};

// Modifikasi getRowProps agar hanya fokus memberikan style baris terpilih (Row Selection)
const getRowProps = ({ item }: { item: PlanningMaster }) => {
  return {
    class: {
      "row-selected": selected.value.some((s) => s.Nomor === item.Nomor),
    },
  };
};

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await api.get("/mmt/planning-produksi/browse", {
      params: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });

    if (response.data && response.data.success) {
      masterData.value = response.data.data;
    } else {
      masterData.value = response.data;
    }
  } catch (err) {
    toast.error("Gagal memuat data produksi");
  } finally {
    loading.value = false;
  }
};

const handleEdit = () => {
  if (selected.value.length > 0) {
    const nomorSpk = selected.value[0].Nomor;
    router.push({
      name: 'PlanningProduksiMmtForm',
      query: { spk_nomor: nomorSpk },
    });
  }
};

const handleExport = () => {
  const ws = XLSX.utils.json_to_sheet(masterData.value);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Planning");
  XLSX.writeFile(wb, `Planning_MMT_${startDate.value}.xlsx`);
  toast.success("Export berhasil");
};

onMounted(fetchData);
watch([startDate, endDate], fetchData);
</script>

<template>
  <PageLayout title="Browse Planning Produksi MMT" icon="mdi-factory">
    <template #header-actions>
      <v-btn
        size="x-small"
        color="primary"
        prepend-icon="mdi-calendar-plus"
        :disabled="!selected.length"
        @click="handleEdit"
      >
        Input Planning
      </v-btn>
      <v-btn
        size="x-small"
        color="success"
        prepend-icon="mdi-file-excel"
        @click="handleExport"
      >
        Export Excel
      </v-btn>
    </template>

    <div class="browse-content">
      <v-card flat class="mb-1">
        <v-card-text class="pa-3">
          <div class="filter-section d-flex align-center flex-wrap ga-4">
            <DateRangeFilter
              v-model:start-date="startDate"
              v-model:end-date="endDate"
            />
            <v-btn
              variant="text"
              size="x-small"
              @click="fetchData"
              :loading="loading"
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
          class="desktop-table elevation-1 border custom-table text-white-bg"
          show-select
          select-strategy="single"
          return-object
          show-expand
          hover
          @click:row="handleRowClick"
          :row-props="getRowProps"
        >
          <template #item.Nomor="{ item }">
            <span
              :class="
                item.Plancetak > 0 ||
                item.Plan_finishing > 0 ||
                item.Plan_kirim > 0
                  ? 'text-sudah-plan'
                  : 'text-belum-plan'
              "
              class="font-weight-bold"
            >
              {{ item.Nomor }}
            </span>
          </template>

          <template #item.Dateline="{ item }">
            {{
              item.Dateline
                ? format(new Date(item.Dateline), "dd/MM/yyyy")
                : "-"
            }}
          </template>

          <template #item.Plancetak="{ item }">
            <v-chip
              :color="item.Plancetak > 0 ? 'success' : 'error'"
              size="x-small"
              variant="flat"
            >
              {{ item.Plancetak > 0 ? "Sudah" : "Belum" }}
            </v-chip>
          </template>

          <template #item.Plan_finishing="{ item }">
            <v-chip
              :color="item.Plan_finishing > 0 ? 'warning' : 'error'"
              size="x-small"
              variant="flat"
            >
              {{ item.Plan_finishing > 0 ? "Sudah" : "Belum" }}
            </v-chip>
          </template>

          <template #item.Plan_kirim="{ item }">
            <v-chip
              :color="item.Plan_kirim > 0 ? 'info' : 'error'"
              size="x-small"
              variant="flat"
            >
              {{ item.Plan_kirim > 0 ? "Sudah" : "Belum" }}
            </v-chip>
          </template>

          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="pa-0 border-0">
                <div class="detail-container">
                  <v-data-table
                    :headers="detailHeaders"
                    :items="item.detail || []"
                    density="compact"
                    hide-default-footer
                    class="border-0 bg-transparent"
                  >
                    <template #item.TglEstimasi="{ item: detItem }">
                      {{
                        detItem.TglEstimasi
                          ? format(new Date(detItem.TglEstimasi), "dd/MM/yyyy")
                          : "-"
                      }}
                    </template>
                  </v-data-table>
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
:deep(.v-data-table) {
  font-size: 11px !important;
  background-color: #ffffff !important;
}
:deep(.v-data-table td) {
  font-size: 11px !important;
  height: 32px !important;
  background-color: #ffffff !important; /* Memaksa latar belakang baris default selalu putih */
}
:deep(.row-selected td) {
  background-color: #d8efff !important; /* Warna penanda khusus baris yang sedang diklik/dipilih */
}
:deep(.v-data-table__tr.row-selected:hover > td) {
  background-color: #c0e4ff !important;
}
:deep(.v-data-table__tr) {
  cursor: pointer;
}

/* CLASS WARNA SPESIFIK TEKS NOMOR SPK */
.text-belum-plan {
  color: #d32f2f !important; /* Merah jika belum masuk planning */
}
.text-sudah-plan {
  color: #212121 !important; /* Hitam jika sudah ada item planning */
}
</style>
