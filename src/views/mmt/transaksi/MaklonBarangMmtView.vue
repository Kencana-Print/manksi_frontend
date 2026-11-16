<template>
  <BaseBrowse
    title="Maklon Barang"
    menu-id="mmt-maklon-barang"
    icon="mdi-swap-horizontal-circle"
    :headers="headers"
    :items="masterData"
    :is-loading="loading.headers"
    :loading="loading.headers"
    v-model:selected="selected"
    v-model:expanded="expanded"
    :show-expand="true"
    :has-print="true"
    :row-props-fn="getRowProps"
    :row-props="getRowProps"
    :show-actions="false"
    :can-insert="false"
    item-value="mkl_nomor"
    v-model:startDate="filters.startDate"
    v-model:endDate="filters.endDate"
    :summary-fields="['TotalKirim', 'TotalTerima', 'TotalBs']"
    @refresh="fetchMasterData"
    @row-click="handleRowClick"
    @print="handlePrint"
  >
    <!-- Keterangan Cabang & Tip -->
    <template #prepend-content>
      <div
        class="d-flex align-center px-4 py-2 bg-grey-lighten-4 mb-2 rounded text-caption"
      >
        <v-icon size="14" class="mr-2" color="blue-grey-darken-2"
          >mdi-map-marker-radius</v-icon
        >
        <span class="font-weight-bold mr-2">Tip:</span>
        <span v-if="filters.semuaCabang">
          Menampilkan data Maklon dari <strong>Semua Cabang</strong>.
        </span>
        <span v-else>
          Menampilkan data Maklon untuk cabang login
          <strong v-if="userCab">( {{ userCab }} )</strong>
          sebagai asal / tujuan.
        </span>
      </div>
    </template>

    <!-- Tombol Ekstra: Cetak & Export Detail -->
    <template #extra-actions>
      <v-menu v-if="selectedItem">
        <template #activator="{ props: menuProps }">
          <v-btn
            size="x-small"
            color="primary"
            v-bind="menuProps"
            class="mr-2"
          >
            <v-icon start>mdi-printer</v-icon> Cetak Maklon
            <v-icon end size="14">mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            @click="openPrintGabungan()"
            :disabled="!selectedItem?.SjkNomorPertama"
          >
            <template #prepend>
              <v-icon size="18" color="primary">mdi-file-document-multiple</v-icon>
            </template>
            <v-list-item-title>Cetak Gabungan (SJ + Maklon)</v-list-item-title>
            <v-list-item-subtitle v-if="!selectedItem?.SjkNomorPertama">
              (Belum ada SJ Keluar)
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item @click="openPrintMaklon()">
            <template #prepend>
              <v-icon size="18" color="teal">mdi-file-document-outline</v-icon>
            </template>
            <v-list-item-title>Cetak Maklon Barang Saja</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn
        size="x-small"
        variant="tonal"
        color="purple-darken-2"
        class="mr-2"
        @click="router.push('/mmt/sj-hasil-maklon')"
      >
        <v-icon start size="14">mdi-truck-delivery</v-icon> SJ Hasil Maklon
      </v-btn>

      <v-btn
        size="x-small"
        color="info"
        :disabled="masterData.length === 0"
        @click="exportToExcel"
      >
        <v-icon start>mdi-download</v-icon> Export Excel
      </v-btn>
    </template>

    <!-- Filter Tambahan: Semua Cabang & pencarian -->
    <template #filter-fields>
      <v-checkbox
        v-model="filters.semuaCabang"
        label="Semua Cabang"
        density="compact"
        hide-details
        color="primary"
        class="mr-2"
        @update:model-value="fetchMasterData"
      />
      <v-text-field
        v-model="filters.search"
        label="Cari Nomor / Keterangan..."
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="compact-search-field"
        style="max-width: 260px"
        @keyup.enter="fetchMasterData"
        @click:clear="onClearSearch"
      />
    </template>

    <!-- Custom Column Renderers -->
    <template #item.mkl_tanggal="{ item }">
      {{ formatDateCell(item.mkl_tanggal) }}
    </template>

    <template #item.mkl_deadline="{ item }">
      {{ formatDateCell(item.mkl_deadline) || "-" }}
    </template>

    <template #item.mkl_cab_asal="{ item }">
      <span :title="item.NamaCabAsal || item.mkl_cab_asal">
        {{ item.mkl_cab_asal }}
        <span v-if="item.NamaCabAsal" class="text-caption text-grey-darken-1">
          ({{ item.NamaCabAsal }})
        </span>
      </span>
    </template>

    <template #item.mkl_cab_tujuan="{ item }">
      <span :title="item.NamaCabTujuan || item.mkl_cab_tujuan">
        {{ item.mkl_cab_tujuan }}
        <span v-if="item.NamaCabTujuan" class="text-caption text-grey-darken-1">
          ({{ item.NamaCabTujuan }})
        </span>
      </span>
    </template>

    <template #item.TotalKirim="{ item }">
      {{ formatNumber(item.TotalKirim) }}
    </template>

    <template #item.TotalTerima="{ item }">
      {{ formatNumber(item.TotalTerima) }}
    </template>

    <template #item.TotalBs="{ item }">
      {{ formatNumber(item.TotalBs) }}
    </template>

    <template #item.mkl_status="{ item }">
      <v-chip
        size="x-small"
        :color="getStatusColor(item.mkl_status)"
        variant="flat"
        class="font-weight-bold"
      >
        {{ item.mkl_status || "-" }}
      </v-chip>
    </template>

    <template #item.mkl_date_create="{ item }">
      {{ formatDateTimeCell(item.mkl_date_create) }}
    </template>

    <!-- Detail Expansion Slot -->
    <template #expanded-content="{ item }">
      <div class="expand-detail pa-2">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="text-caption font-weight-bold text-primary">
            Rincian Maklon: {{ item.mkl_nomor }}
          </div>
          <!-- Quick Print Buttons inside detail -->
          <div class="d-flex ga-2">
            <v-btn
              v-if="item.SjkNomorPertama"
              size="x-small"
              color="primary"
              variant="tonal"
              @click="openPrintGabungan(item)"
            >
              <v-icon start size="14">mdi-printer</v-icon> Cetak Gabungan (SJ + Maklon)
            </v-btn>
            <v-btn
              size="x-small"
              color="teal"
              variant="tonal"
              @click="openPrintMaklon(item)"
            >
              <v-icon start size="14">mdi-printer</v-icon> Cetak Maklon Saja
            </v-btn>
          </div>
        </div>

        <v-progress-linear
          v-if="detailLoading[item.mkl_nomor]"
          indeterminate
          color="primary"
          height="3"
          class="my-2"
        />

        <div v-else-if="detailCache[item.mkl_nomor]">
          <!-- Timeline Status Maklon -->
          <div class="d-flex flex-wrap ga-4 mb-3 pa-2 bg-grey-lighten-4 rounded text-caption">
            <div>
              <span class="text-grey-darken-1">Dikirim: </span>
              <strong>{{ formatDateTimeCell(item.mkl_tgl_kirim) || "-" }}</strong>
            </div>
            <div>
              <span class="text-grey-darken-1">Selesai DTF: </span>
              <strong>{{ formatDateTimeCell(item.mkl_tgl_selesai_dtf) || "-" }}</strong>
            </div>
            <div>
              <span class="text-grey-darken-1">OTW Gudang: </span>
              <strong>{{ formatDateTimeCell(item.mkl_tgl_otw_gudang) || "-" }}</strong>
            </div>
            <div>
              <span class="text-grey-darken-1">Diterima Gudang: </span>
              <strong>{{ formatDateTimeCell(item.mkl_tgl_selesai) || "-" }}</strong>
            </div>
          </div>

          <!-- Tabel Barang Polos & Target Jadi -->
          <v-table density="compact" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-3">
                <th class="text-left font-weight-bold">Barang Polos</th>
                <th class="text-right font-weight-bold">Qty Kirim</th>
                <th class="text-right font-weight-bold">Sudah Kirim</th>
                <th class="text-right font-weight-bold">Terima</th>
                <th class="text-right font-weight-bold">BS</th>
                <th class="text-left font-weight-bold">Status</th>
                <th class="text-left font-weight-bold">Target Barang Jadi</th>
                <th class="text-left font-weight-bold">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(dtl, idx) in detailCache[item.mkl_nomor].details || []"
                :key="idx"
              >
                <td>
                  <div class="font-weight-medium">{{ dtl.NamaPolos || dtl.mkld_kode_polos || "-" }}</div>
                  <div v-if="dtl.mkld_satuan_kirim" class="text-caption text-grey">
                    Satuan: {{ dtl.mkld_satuan_kirim }}
                  </div>
                </td>
                <td class="text-right">{{ formatNumber(dtl.mkld_qty_kirim) }}</td>
                <td class="text-right">{{ formatNumber(dtl.mkld_qty_sudah_kirim) }}</td>
                <td class="text-right text-success font-weight-medium">{{ formatNumber(dtl.mkld_qty_terima) }}</td>
                <td class="text-right text-error font-weight-medium">{{ formatNumber(dtl.mkld_qty_bs) }}</td>
                <td>
                  <v-chip size="x-small" :color="getStatusColor(dtl.mkld_status)" variant="tonal">
                    {{ dtl.mkld_status || "-" }}
                  </v-chip>
                </td>
                <td>
                  <div v-if="dtl.target_jadi && dtl.target_jadi.length > 0">
                    <div
                      v-for="(tj, tIdx) in dtl.target_jadi"
                      :key="tIdx"
                      class="text-caption mb-1"
                    >
                      • {{ tj.NamaJadi || tj.mkldj_kode_jadi }} (est: {{ formatNumber(tj.mkldj_estimasi_qty) }})
                    </div>
                  </div>
                  <span v-else class="text-caption text-grey">-</span>
                </td>
                <td class="text-caption">{{ dtl.mkld_keterangan || "-" }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <div v-else class="text-caption text-grey pa-2">
          Gagal memuat detail barang.
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format, subDays, parseISO, isValid } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";
import * as XLSX from "xlsx";
import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

interface MaklonHeader {
  mkl_nomor: string;
  mkl_tanggal?: string;
  mkl_deadline?: string;
  mkl_cab_asal?: string;
  mkl_cab_tujuan?: string;
  NamaCabAsal?: string;
  NamaCabTujuan?: string;
  mkl_status?: string;
  mkl_keterangan?: string;
  mkl_user_create?: string;
  mkl_date_create?: string;
  SjkNomorPertama?: string;
  JmlItem?: number;
  TotalKirim?: number;
  TotalTerima?: number;
  TotalBs?: number;
  [key: string]: any;
}

const API_BASE_URL = "/mmt/maklon-barang";
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

// Cabang user yang login (JWT payload: cab / user_cab).
const userCab = String(authStore.user?.cab || "").replace(/-/g, "").trim().toUpperCase();

const masterData = ref<MaklonHeader[]>([]);
const loading = ref({ headers: true });
const selected = ref<MaklonHeader[]>([]);
const expanded = ref<any[]>([]);
const detailCache = ref<Record<string, any>>({});
const detailLoading = ref<Record<string, boolean>>({});

const selectedItem = computed<MaklonHeader | null>(() => {
  if (selected.value && selected.value.length === 1) {
    return (selected.value[0] as any)?.raw || selected.value[0];
  }
  return null;
});

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  search: "",
  semuaCabang: !userCab || userCab === "HO" || userCab === "ALL",
});

// --- Headers ---
const headers = [
  { title: "Nomor", key: "mkl_nomor", minWidth: "170px", width: "170px" },
  {
    title: "Tanggal",
    key: "mkl_tanggal",
    minWidth: "110px",
    width: "110px",
  },
  { title: "Deadline", key: "mkl_deadline", minWidth: "110px", width: "110px" },
  {
    title: "Cab. Asal",
    key: "mkl_cab_asal",
    minWidth: "110px",
    width: "110px",
    align: "center",
  },
  {
    title: "Cab. Tujuan",
    key: "mkl_cab_tujuan",
    minWidth: "110px",
    width: "110px",
    align: "center",
  },
  {
    title: "Jml Item",
    key: "JmlItem",
    minWidth: "90px",
    width: "90px",
    align: "end",
  },
  {
    title: "Total Kirim",
    key: "TotalKirim",
    minWidth: "110px",
    width: "110px",
    align: "end",
  },
  {
    title: "Total Terima",
    key: "TotalTerima",
    minWidth: "110px",
    width: "110px",
    align: "end",
  },
  {
    title: "Total BS",
    key: "TotalBs",
    minWidth: "100px",
    width: "100px",
    align: "end",
  },
  {
    title: "Status",
    key: "mkl_status",
    minWidth: "140px",
    width: "140px",
    align: "center",
  },
  { title: "Keterangan", key: "mkl_keterangan", minWidth: "200px" },
  { title: "User", key: "mkl_user_create", minWidth: "100px" },
  { title: "Created", key: "mkl_date_create", minWidth: "150px" },
];

const getStatusColor = (status?: string) => {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "SELESAI":
    case "SELESAI DTF":
    case "SELESAI DTFD":
      return "success";
    case "DITERIMA SEBAGIAN":
      return "light-green-darken-1";
    case "OTW GUDANG":
      return "amber-darken-2";
    case "DIKIRIM":
      return "primary";
    case "SEBAGIAN DIKIRIM":
      return "orange-darken-2";
    case "DRAFT":
      return "blue-grey";
    default:
      return "grey-darken-1";
  }
};

// --- Warna baris berdasarkan status ---
const getRowProps = ({ item }: any) => {
  const status = (item?.mkl_status || "").toUpperCase();
  const isDone =
    status === "SELESAI" || status === "SELESAI DTF" || status === "SELESAI DTFD";
  return {
    class: isDone ? "" : "font-weight-medium text-error",
  };
};

// BaseBrowse memancarkan event `row-click` dengan dua argumen:
// (MouseEvent, { item, index, ... }). Ambil `row.item`, bukan argumen
// pertama — sebelumnya yang tersimpan adalah MouseEvent sehingga
// tombol Cetak membuka nomor "undefined".
const handleRowClick = (_event: any, row: any) => {
  const item = row?.item as MaklonHeader | undefined;
  if (!item) return;
  selected.value = selected.value.some(
    (s) => s.mkl_nomor === item.mkl_nomor,
  )
    ? []
    : [item];
};

const formatDateCell = (val?: string) => {
  if (!val) return "";
  const d = parseISO(String(val));
  if (!isValid(d)) return String(val);
  return format(d, "dd-MM-yyyy");
};

const formatDateTimeCell = (val?: string) => {
  if (!val) return "-";
  const d = parseISO(String(val));
  if (!isValid(d)) {
    const raw = new Date(val);
    return !isNaN(raw.getTime()) ? format(raw, "dd-MM-yyyy HH:mm") : String(val);
  }
  return format(d, "dd-MM-yyyy HH:mm");
};

const formatNumber = (val?: any) => {
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : "0";
};

const onClearSearch = () => {
  filters.search = "";
  fetchMasterData();
};

// --- Cetak Maklon ---
const openPrintGabungan = (item?: MaklonHeader) => {
  const target = item || selectedItem.value;
  if (!target) {
    toast.warning("Pilih baris Maklon terlebih dahulu.");
    return;
  }
  const url = router.resolve({
    name: "MaklonGabunganMmtPrint",
    params: {
      nomor: target.mkl_nomor,
      sjkNomor: target.SjkNomorPertama || "",
    },
  }).href;
  window.open(url, "_blank");
};

const openPrintMaklon = (item?: MaklonHeader) => {
  const target = item || selectedItem.value;
  if (!target) {
    toast.warning("Pilih baris Maklon terlebih dahulu.");
    return;
  }
  const url = router.resolve({
    name: "MaklonBarangMmtPrint",
    params: {
      nomor: target.mkl_nomor,
    },
  }).href;
  window.open(url, "_blank");
};

const handlePrint = () => {
  const target = selectedItem.value;
  if (!target) return;
  if (target.SjkNomorPertama) {
    openPrintGabungan(target);
  } else {
    openPrintMaklon(target);
  }
};

// --- Ambil data detail ketika baris di-expand ---
const loadDetail = async (nomor: string) => {
  if (!nomor || detailCache.value[nomor] || detailLoading.value[nomor]) return;
  detailLoading.value[nomor] = true;
  try {
    const res = await api.get(`${API_BASE_URL}/detail/${encodeURIComponent(nomor)}`);
    detailCache.value[nomor] = res.data?.data ?? res.data;
  } catch (err: any) {
    console.error(`Gagal memuat detail maklon ${nomor}:`, err);
  } finally {
    detailLoading.value[nomor] = false;
  }
};

watch(
  expanded,
  (newExpanded) => {
    if (Array.isArray(newExpanded)) {
      newExpanded.forEach((itemOrNomor: any) => {
        const no = typeof itemOrNomor === "string" ? itemOrNomor : itemOrNomor?.mkl_nomor;
        if (no) loadDetail(no);
      });
    }
  },
  { deep: true },
);

// --- Ambil data browse ---
const fetchMasterData = async () => {
  loading.value.headers = true;
  try {
    const params: any = {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    if (filters.search && filters.search.trim() !== "") {
      params.keyword = filters.search.trim();
    }
    if (filters.semuaCabang) {
      params.semuaCabang = true;
    }

    const response = await api.get(`${API_BASE_URL}/browse`, { params });
    const result = response.data?.data ?? response.data;
    masterData.value = Array.isArray(result) ? result : [];
  } catch (error: any) {
    console.error("Gagal memuat data Maklon Barang:", error);
    const msg = error?.response?.data?.message || error?.message || "Gagal memuat data Maklon Barang.";
    toast.error(msg);
    masterData.value = [];
  } finally {
    loading.value.headers = false;
  }
};

// Ganti rentang tanggal → ambil ulang data
watch(
  () => [filters.startDate, filters.endDate],
  () => {
    if (filters.startDate && filters.endDate) fetchMasterData();
  },
);

// --- Export Excel ---
const exportToExcel = () => {
  if (masterData.value.length === 0) return;

  const data = masterData.value.map((row, i) => ({
    No: i + 1,
    Nomor: row.mkl_nomor,
    Tanggal: formatDateCell(row.mkl_tanggal),
    Deadline: formatDateCell(row.mkl_deadline),
    "Cab. Asal": row.NamaCabAsal ? `${row.mkl_cab_asal} (${row.NamaCabAsal})` : row.mkl_cab_asal,
    "Cab. Tujuan": row.NamaCabTujuan ? `${row.mkl_cab_tujuan} (${row.NamaCabTujuan})` : row.mkl_cab_tujuan,
    "Jml Item": Number(row.JmlItem) || 0,
    "Total Kirim": Number(row.TotalKirim) || 0,
    "Total Terima": Number(row.TotalTerima) || 0,
    "Total BS": Number(row.TotalBs) || 0,
    Status: row.mkl_status,
    Keterangan: row.mkl_keterangan,
    User: row.mkl_user_create,
    Created: formatDateTimeCell(row.mkl_date_create),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Maklon Barang");
  XLSX.writeFile(wb, `Maklon_Barang_${format(new Date(), "yyyyMMdd")}.xlsx`);
};

onMounted(fetchMasterData);
</script>

<style scoped>
.compact-search-field :deep(.v-field) {
  font-size: 12px;
}
.expand-detail {
  background-color: #fafafa;
  border-left: 3px solid #1976d2;
}
</style>
