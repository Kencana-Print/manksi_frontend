<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/services/api";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";

const router = useRouter();
const toast = useToast();

// ── Filter tanggal — persistence diurus BaseBrowse via filterState ────
const today = new Date().toISOString().split("T")[0];
const firstDayOfMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1,
)
  .toISOString()
  .split("T")[0];

const filterDate = ref({
  start: firstDayOfMonth,
  end: today,
});
// BaseBrowse akan emit update:filterState saat restore,
// kita terima dan terapkan ke filterDate
const onFilterStateRestored = (state: Record<string, any>) => {
  if (state.start) filterDate.value.start = state.start;
  if (state.end) filterDate.value.end = state.end;
};

// ── State Browse ───────────────────────────────────────────────────────
const items = ref([]);
const isLoading = ref(false);
const selected = ref([]);
const expandedRows = ref<any[]>([]);
const expandedData = ref<Record<string, any[]>>({});
const loadingDetails = ref(new Set<string>());

const canInsert = ref(true);
const canEdit = ref(true);
const canExport = ref(true);

// ── Headers ────────────────────────────────────────────────────────────
const headers = [
  { title: "NOMOR", key: "Nomor", width: "130px" },
  { title: "TANGGAL", key: "Tanggal", width: "90px" },
  { title: "MAP", key: "Map", width: "150px" },
  { title: "DIVISI", key: "Divisi", width: "60px", align: "center" },
  { title: "CAB", key: "Cab", width: "60px", align: "center" },
  { title: "TIPE", key: "Tipe", width: "80px" },
  { title: "NAMA", key: "Nama", minWidth: "250px" },
  { title: "JUMLAH", key: "Jumlah", width: "80px", align: "right" },
  { title: "CETAK", key: "Cetak", width: "60px", align: "center" },
  { title: "BORDIR", key: "Bordir", width: "60px", align: "center" },
  {
    title: "IDENTIFIKASI",
    key: "Identifikasi",
    width: "100px",
    align: "center",
  },
];

// ── Fetch data ─────────────────────────────────────────────────────────
const fetchData = async () => {
  isLoading.value = true;
  selected.value = [];
  expandedRows.value = [];
  try {
    const res = await api.get("/master/komponen-spk", {
      params: {
        startDate: filterDate.value.start,
        endDate: filterDate.value.end,
      },
    });
    items.value = res.data.data;
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Gagal memuat data");
  } finally {
    isLoading.value = false;
  }
};

// ── Expanded row detail ────────────────────────────────────────────────
const handleExpand = async (newExpanded: any[]) => {
  const added = newExpanded.find((item) => !expandedRows.value.includes(item));
  expandedRows.value = newExpanded;

  if (added) {
    const spkNomor = added.Nomor;
    if (!expandedData.value[spkNomor]) {
      loadingDetails.value.add(spkNomor);
      try {
        const res = await api.get(`/master/komponen-spk/${spkNomor}/detail`);
        expandedData.value[spkNomor] = res.data.data;
      } catch {
        toast.error("Gagal memuat detail komponen");
      } finally {
        loadingDetails.value.delete(spkNomor);
      }
    }
  }
};

// ── Row coloring ───────────────────────────────────────────────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Identifikasi === "N") {
    return { class: "text-red font-weight-bold" };
  }
  return {};
};

// ── Actions ───────────────────────────────────────────────────────────
const handleAdd = () => router.push("/daftar/komponen-spk/create");
const handleEdit = (item: any) =>
  router.push(`/daftar/komponen-spk/edit/${encodeURIComponent(item.Nomor)}`);

// ── Initial load ───────────────────────────────────────────────────────
fetchData();
</script>

<template>
  <BaseBrowse
    title="Browse Identitas Komponen SPK"
    menu-id="18"
    icon="mdi-format-list-bulleted-type"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    :expanded="expandedRows"
    @update:expanded="handleExpand"
    show-expand
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="canExport"
    :row-props-fn="rowPropsFn"
    item-value="Nomor"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    :filter-state="filterDate"
    @update:filter-state="onFilterStateRestored"
  >
    <template #filter-left>
      <div class="date-filter">
        <span class="date-label">Tanggal SPK:</span>
        <input
          type="date"
          v-model="filterDate.start"
          class="custom-date-input"
        />
        <span class="date-sep">s/d</span>
        <input type="date" v-model="filterDate.end" class="custom-date-input" />
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          height="26"
          class="px-2"
          @click="fetchData"
        >
          Filter
        </v-btn>
      </div>
    </template>

    <template #filter-right>
      <div class="legend-wrap">
        <div class="legend-box bg-red" />
        <span class="text-caption font-weight-bold text-red"
          >Belum Identifikasi Komponen</span
        >
      </div>
    </template>

    <template #detail="{ item }">
      <div class="pa-3 bg-grey-lighten-4 w-100">
        <div
          v-if="loadingDetails.has(item.Nomor)"
          class="d-flex align-center justify-center pa-4"
        >
          <v-progress-circular
            indeterminate
            color="primary"
            size="24"
            class="mr-2"
          />
          <span class="text-caption text-grey-darken-1"
            >Memuat komponen...</span
          >
        </div>

        <div
          v-else-if="
            !expandedData[item.Nomor] || expandedData[item.Nomor].length === 0
          "
          class="text-center text-caption text-grey pa-3"
        >
          Tidak ada data komponen (Potong/Cetak/Bordir).
        </div>

        <v-table
          v-else
          density="compact"
          class="detail-table border rounded elevation-1"
        >
          <thead>
            <tr class="bg-grey-lighten-2">
              <th style="width: 150px">KODE</th>
              <th>NAMA KOMPONEN</th>
              <th style="width: 100px">LINI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(det, i) in expandedData[item.Nomor]" :key="i">
              <td>{{ det.Kode }}</td>
              <td>{{ det.Komponen || "-" }}</td>
              <td>
                <v-chip
                  size="x-small"
                  :color="
                    det.Lini === 'POTONG'
                      ? 'blue'
                      : det.Lini === 'CETAK'
                        ? 'orange'
                        : 'purple'
                  "
                  variant="flat"
                  class="font-weight-bold"
                  >{{ det.Lini }}</v-chip
                >
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.date-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px 10px;
}
.date-label {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.date-sep {
  font-size: 11px;
  color: #757575;
}
.custom-date-input {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.custom-date-input:focus {
  border-color: #1976d2;
}

.legend-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px 10px;
}
.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  flex-shrink: 0;
}

.detail-table th {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #424242 !important;
  height: 30px !important;
}
.detail-table td {
  font-size: 11px !important;
  height: 26px !important;
  border-bottom: 1px solid #f5f5f5;
}
</style>
