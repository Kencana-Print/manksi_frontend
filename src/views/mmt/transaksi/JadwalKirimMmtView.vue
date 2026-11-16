<template>
  <PageLayout
    title="Data Jadwal Kirim (Gudang Jadi)"
    icon="mdi-truck-delivery-outline"
  >
    <!-- Header Actions: Dibuat simpel dan fungsional seperti LHK -->
    <template #header-actions>
      <v-btn
        v-if="canAccess('insert')"
        size="x-small"
        color="success"
        @click="handleNew"
      >
        <v-icon start>mdi-plus</v-icon> Baru
      </v-btn>
      <v-btn
        v-if="canAccess('edit')"
        size="x-small"
        color="warning"
        :disabled="!isSingleSelected"
        @click="handleEdit"
      >
        <v-icon start>mdi-pencil</v-icon> Ubah
      </v-btn>
      <v-btn
        v-if="canAccess('delete')"
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
      <v-btn
        size="x-small"
        color="info"
        :disabled="masterData.length === 0"
        @click="handleExportExcel"
      >
        <v-icon start>mdi-download</v-icon> Export Excel
      </v-btn>

      <v-btn
        variant="text"
        size="x-small"
        @click="fetchData"
        :loading="loading"
      >
        <v-icon>mdi-refresh</v-icon> Refresh
      </v-btn>
    </template>

    <div class="browse-content">
      <!-- Filter Section: Mengikuti gaya LHK yang rapat -->
      <v-card flat class="mb-4">
        <v-card-text>
          <div class="filter-section d-flex align-center flex-wrap ga-4">
            <DateRangeFilter
              v-model:start-date="filters.startDate"
              v-model:end-date="filters.endDate"
            />

            <v-autocomplete
              v-model="filters.gudang"
              :items="gudangOptions"
              :loading="loadingGudang"
              label="Gudang"
              density="compact"
              hide-details
              variant="outlined"
              style="max-width: 300px"
              clearable
            />

            <v-text-field
              v-model="filters.search"
              prepend-inner-icon="mdi-magnify"
              label="Cari SPK / Nama Barang"
              density="compact"
              hide-details
              variant="outlined"
              clearable
              style="max-width: 300px"
              @keyup.enter="fetchData"
            />
          </div>
        </v-card-text>
      </v-card>

      <!-- Table Section: Desktop Style dengan Row Selection Biru Muda -->
      <div class="table-container">
        <v-data-table
          v-model:selected="selected"
          v-model:expanded="expanded"
          :headers="masterHeaders"
          :items="masterData"
          :loading="loading"
          item-value="Nomor"
          density="compact"
          class="desktop-table elevation-1"
          fixed-header
          show-select
          show-expand
          select-strategy="single"
          @click:row="handleRowClick"
          @update:expanded="loadDetailForExpanded"
          :row-props="getRowProps"
        >
          <!-- Custom item rendering -->
          <template #item.Tanggal="{ item }">
            {{ safeFormatDate(item.Tanggal) }}
          </template>

          <template #item.Qty_Order="{ item }">
            <span class="font-weight-medium">
              {{ Number(item.Qty_Order || 0).toLocaleString("id-ID") }}
            </span>
          </template>

          <template #item.Jumlah="{ item }">
            <span class="font-weight-medium">
              {{ Number(item.Jumlah || 0).toLocaleString("id-ID") }}
            </span>
          </template>

          <template #item.Realisasi="{ item }">
            <v-chip
              size="x-small"
              :color="Number(item.Realisasi || 0) >= Number(item.Jumlah || 0) ? 'success' : 'warning'"
              variant="flat"
            >
              {{ Number(item.Realisasi || 0).toLocaleString("id-ID") }}
            </v-chip>
          </template>

          <template #item.Selisih_Jumlah="{ item }">
            <span
              :class="
                Number(item.Selisih_Jumlah || 0) === 0
                  ? 'text-success font-weight-bold'
                  : Number(item.Selisih_Jumlah || 0) > 0
                    ? 'text-warning font-weight-bold'
                    : 'text-error font-weight-bold'
              "
            >
              {{ Number(item.Selisih_Jumlah || 0).toLocaleString("id-ID") }}
            </span>
          </template>

          <!-- Expanded Row: Gaya Detail Container LHK -->
          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="pa-0">
                <div class="detail-container">
                  <div class="detail-table-wrapper">
                    <!-- Loader Detail -->
                    <div v-if="item.loadingDetail" class="text-center pa-4">
                      <v-progress-circular indeterminate size="20" />
                      <span class="ml-2 text-caption">Memuat detail...</span>
                    </div>

                    <!-- Tabel Detail Internal -->
                    <v-data-table
                      v-else-if="item.Detail && item.Detail.length"
                      :headers="detailHeaders"
                      :items="item.Detail"
                      density="compact"
                      hide-default-footer
                      class="detail-table border"
                    >
                      <template #item.Jumlah="{ value }">
                        <strong class="total-bold text-blue-darken-3">{{
                          Number(value || 0).toLocaleString("id-ID")
                        }}</strong>
                      </template>
                      <template #item.Realisasi="{ value }">
                        <span class="font-weight-medium">{{
                          Number(value || 0).toLocaleString("id-ID")
                        }}</span>
                      </template>
                      <template #item.Selisih="{ value }">
                        <span
                          :class="
                            Number(value || 0) === 0
                              ? 'text-success font-weight-bold'
                              : Number(value || 0) > 0
                                ? 'text-warning font-weight-bold'
                                : 'text-error font-weight-bold'
                          "
                        >
                          {{ Number(value || 0).toLocaleString("id-ID") }}
                        </span>
                      </template>
                    </v-data-table>

                    <div v-else class="text-center pa-4 text-caption">
                      Data detail tidak ditemukan.
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>
      </div>
    </div>

    <!-- Gudang Lookup -->
    <GudangLookup
      :is-visible="isLookupVisible"
      mode="jadi"
      @close="isLookupVisible = false"
      @select="onGudangSelected"
    />
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onActivated, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { format, parseISO, isValid } from "date-fns";
import PageLayout from "@/components/PageLayout.vue";
import DateRangeFilter from "@/components/DateRangeFilter.vue";
import { useAuthStore } from "@/stores/authStore";
import { useTabStore } from "@/stores/tabStore";
import GudangLookup from "@/modal/GudangLookupView.vue";
import * as XLSX from "xlsx";

// --- Initialize ---
const authStore = useAuthStore();
const user = authStore.user;
const router = useRouter();
const toast = useToast();
const tabStore = useTabStore();

const MENU_ID = "ufrmBrowJadwalKirim2";
const API_URL = "/mmt/jadwal-kirim";

// --- State ---
const masterData = ref<any[]>([]);
const loading = ref(false);
const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);
const gudangOptions = ref<any[]>([]);
const loadingGudang = ref(false);
const isLookupVisible = ref(false);

const filters = reactive({
  startDate: format(new Date(), "yyyy-MM-dd"), // <-- Diubah ke yyyy-MM-dd agar menjadi hari ini
  endDate: format(new Date(), "yyyy-MM-dd"),
  gudang: user?.divisi == 1 ? "WH-010" : user?.GDG_KODE || "",
  search: "",
});

const masterHeaders = [
  { title: "Nomor Kirim", key: "Nomor", width: "150px", fixed: true },
  { title: "Gudang", key: "Nama_Gudang", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "No. SPK", key: "No_SPK", width: "150px" },
  { title: "Nama Barang", key: "Nama_Spk", minWidth: "220px" },
  { title: "Qty SPK Order", key: "Qty_Order", align: "end", width: "130px" },
  { title: "Qty Rencana", key: "Jumlah", align: "end", width: "120px" },
  { title: "Koli", key: "Koli", align: "end", width: "80px" },
  { title: "Realisasi", key: "Realisasi", align: "end", width: "110px" },
  { title: "Selisih", key: "Selisih_Jumlah", align: "end", width: "100px" },
  { title: "User", key: "usr_create", width: "100px" },
] as const;

const detailHeaders = [
  { title: "No", key: "No_urut", width: "50px" },
  { title: "Kota Tujuan", key: "kota", minWidth: "150px" },
  { title: "Uraian Barang", key: "uraian", minWidth: "250px" },
  { title: "Size", key: "size", width: "100px" },
  { title: "Qty Rencana", key: "Jumlah", align: "end" },
  { title: "Realisasi", key: "Realisasi", align: "end" },
  { title: "Selisih", key: "Selisih", align: "end" },
  { title: "Koli", key: "Koli", align: "end" },
  { title: "Ekspedisi", key: "expedisi", minWidth: "150px" },
];

// --- Computed & Props ---
const isSingleSelected = computed(() => selected.value.length === 1);
const selectedRow = computed(() =>
  isSingleSelected.value
    ? masterData.value.find((i) => i.Nomor === selected.value[0])
    : null,
);

const getRowProps = ({ item }: any) => {
  return {
    class: selected.value.includes(item.Nomor) ? "row-selected" : "",
  };
};

// --- API Methods ---
const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.get(API_URL, { params: { ...filters } });
    masterData.value = res.data || [];
    selected.value = [];
    expanded.value = [];
  } catch (err) {
    toast.error("Gagal memuat data.");
  } finally {
    loading.value = false;
  }
};

// Taruh baris yang baru saja disimpan di paling atas list lalu pilih baris
// itu, supaya hasil input langsung terlihat tanpa scroll/reload.
const focusSavedRow = (nomor: string | null) => {
  if (!nomor) return;
  const idx = masterData.value.findIndex((i) => i.Nomor === nomor);
  if (idx === -1) return;
  if (idx > 0) {
    const [row] = masterData.value.splice(idx, 1);
    masterData.value.unshift(row);
  }
  selected.value = [nomor];
  expanded.value = [];
};

const loadDetailForExpanded = async (expandedKeys: any[]) => {
  if (expandedKeys.length === 0) return;
  const lastNomor = expandedKeys[expandedKeys.length - 1];
  const targetItem = masterData.value.find((i) => i.Nomor === lastNomor);
  if (!targetItem || targetItem.Detail) return;

  try {
    targetItem.loadingDetail = true;
    const res = await api.get(`${API_URL}/${lastNomor}`);
    targetItem.Detail = res.data.Detail || [];
  } catch (err) {
    toast.error("Gagal memuat detail.");
  } finally {
    targetItem.loadingDetail = false;
  }
};

// --- Actions ---
const handleRowClick = (event: any, { item }: any) => {
  selected.value = selected.value[0] === item.Nomor ? [] : [item.Nomor];
};

const handleNew = () =>
  router.push({ name: 'JadwalKirimMmtNew', query: { gudang: filters.gudang } });

const handleEdit = () => {
  if (!selectedRow.value) return;
  if (
    selectedRow.value.usr_create !== (user?.kdUser || authStore.user?.kdUser)
  ) {
    toast.warning(
      `Data ini milik ${selectedRow.value.usr_create}. Anda tidak boleh mengubah.`,
    );
    return;
  }
  router.push({
    name: 'JadwalKirimMmtEdit',
    params: { nomor: selectedRow.value.Nomor },
  });
};

const handleDelete = async () => {
  if (
    !selectedRow.value ||
    !confirm(`Hapus Jadwal Kirim ${selectedRow.value.Nomor}?`)
  )
    return;
  try {
    await api.delete(`${API_URL}/delete`, {
      data: { nomor: selectedRow.value.Nomor },
    });
    toast.success("Data berhasil dihapus.");
    fetchData();
  } catch (err) {
    toast.error("Gagal menghapus data.");
  }
};

const handleExportExcel = async () => {
  if (masterData.value.length === 0) {
    toast.warning("Tidak ada data untuk di-export.");
    return;
  }

  loading.value = true;
  try {
    const fileName = `Jadwal_Kirim_${filters.startDate}_sd_${filters.endDate}.xlsx`;

    // ==========================================
    // 1. DEFINISI STYLE EXCEL
    // ==========================================
    const styleHeaderMain = {
      fill: { fgColor: { rgb: "B3E5FC" } },
      font: { bold: true, color: { rgb: "000000" }, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    const styleDataCell = {
      font: { sz: 10 },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
      alignment: { vertical: "center" },
    };

    const styleDataCellCenter = {
      ...styleDataCell,
      alignment: { horizontal: "center", vertical: "center" },
    };

    const styleDataCellRight = {
      ...styleDataCell,
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0",
    };

    const styleTotalCell = {
      fill: { fgColor: { rgb: "E0E0E0" } },
      font: { bold: true, sz: 10, color: { rgb: "000000" } },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "double", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0",
    };

    const styleTotalLabel = {
      ...styleTotalCell,
      alignment: { horizontal: "center", vertical: "center" },
    };

    // ==========================================
    // 2. SUSUN DATA (Array of Objects / Cell Objects)
    // ==========================================
    const wsData = [];

    const formatTanggalIndo = (dateStr: string) => {
      if (!dateStr) return "";
      const bulanIndo = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];
      const [year, month, day] = dateStr.split("-");
      const indexBulan = parseInt(month, 10) - 1;
      return `${parseInt(day, 10)} ${bulanIndo[indexBulan]} ${year}`;
    };

    const periodeStr = `Periode : ${formatTanggalIndo(filters.startDate)} s/d ${formatTanggalIndo(filters.endDate)}`;

    wsData.push([
      {
        v: "LAPORAN JADWAL KIRIM (GUDANG JADI)",
        s: { font: { bold: true, sz: 14 } },
        t: "s",
      },
    ]);
    wsData.push([{ v: periodeStr, s: { font: { sz: 10 } }, t: "s" }]);
    wsData.push([]); // Baris kosong

    const tableHeaders = [
      { v: "NOMOR KIRIM", s: styleHeaderMain, t: "s" },
      { v: "KODE GDG", s: styleHeaderMain, t: "s" },
      { v: "NAMA GUDANG", s: styleHeaderMain, t: "s" },
      { v: "TANGGAL", s: styleHeaderMain, t: "s" },
      { v: "NO. SPK", s: styleHeaderMain, t: "s" },
      { v: "NAMA BARANG", s: styleHeaderMain, t: "s" },
      { v: "UKURAN", s: styleHeaderMain, t: "s" },
      { v: "KAIN", s: styleHeaderMain, t: "s" },
      { v: "QTY SPK ORDER", s: styleHeaderMain, t: "s" },
      { v: "QTY RENCANA", s: styleHeaderMain, t: "s" },
      { v: "KOLI", s: styleHeaderMain, t: "s" },
      { v: "REALISASI", s: styleHeaderMain, t: "s" },
      { v: "SELISIH QTY", s: styleHeaderMain, t: "s" },
      { v: "SELISIH KOLI", s: styleHeaderMain, t: "s" },
      { v: "USER CREATE", s: styleHeaderMain, t: "s" },
      { v: "NO URUT", s: styleHeaderMain, t: "s" },
      { v: "KOTA TUJUAN", s: styleHeaderMain, t: "s" },
      { v: "URAIAN BARANG", s: styleHeaderMain, t: "s" },
      { v: "SIZE", s: styleHeaderMain, t: "s" },
      { v: "QTY DETAIL", s: styleHeaderMain, t: "s" },
      { v: "KOLI DETAIL", s: styleHeaderMain, t: "s" },
      { v: "EKSPEDISI", s: styleHeaderMain, t: "s" },
    ];
    wsData.push(tableHeaders);

    const detailPromises = masterData.value.map((m) =>
      api.get(`${API_URL}/${m.Nomor}`),
    );
    const detailResponses = await Promise.all(detailPromises);

    const startRowIndex = 5;
    let currentRowCounter = startRowIndex;

    masterData.value.forEach((master, index) => {
      const detailItems = detailResponses[index].data.Detail || [];
      const tglFormatted = safeFormatDate(master.Tanggal);

      if (detailItems.length > 0) {
        detailItems.forEach((dtl: any, idxDtl: number) => {
          const row = [
            {
              v: idxDtl === 0 ? master.Nomor : "",
              s: styleDataCellCenter,
              t: "s",
            },
            {
              v: idxDtl === 0 ? master.Gudang || "" : "",
              s: styleDataCellCenter,
              t: "s",
            },
            {
              v: idxDtl === 0 ? master.Nama_Gudang : "",
              s: styleDataCell,
              t: "s",
            },
            {
              v: idxDtl === 0 ? tglFormatted : "",
              s: styleDataCellCenter,
              t: "s",
            },
            {
              v: idxDtl === 0 ? master.No_SPK : "",
              s: styleDataCellCenter,
              t: "s",
            },
            {
              v: idxDtl === 0 ? master.Nama_Spk : "",
              s: styleDataCell,
              t: "s",
            },
            {
              v: idxDtl === 0 ? master.Ukuran || "-" : "",
              s: styleDataCellCenter,
              t: "s",
            },
            {
              v: idxDtl === 0 ? master.Kain || "-" : "",
              s: styleDataCell,
              t: "s",
            },
            // Kolom angka master (t: "n")
            {
              v: idxDtl === 0 ? Number(master.Qty_Order || 0) : 0,
              s: styleDataCellRight,
              t: "n",
            },
            {
              v: idxDtl === 0 ? Number(master.Jumlah || 0) : 0,
              s: styleDataCellRight,
              t: "n",
            },
            {
              v: idxDtl === 0 ? Number(master.Koli || 0) : 0,
              s: styleDataCellRight,
              t: "n",
            },
            {
              v: idxDtl === 0 ? Number(master.Realisasi || 0) : 0,
              s: styleDataCellRight,
              t: "n",
            },
            {
              v: idxDtl === 0 ? Number(master.Selisih_Jumlah || 0) : 0,
              s: styleDataCellRight,
              t: "n",
            },
            {
              v: idxDtl === 0 ? Number(master.Selisih_Koli || 0) : 0,
              s: styleDataCellRight,
              t: "n",
            },
            {
              v: idxDtl === 0 ? master.usr_create : "",
              s: styleDataCellCenter,
              t: "s",
            },
            // Kolom detail
            { v: dtl.No_urut, s: styleDataCellCenter, t: "s" },
            { v: dtl.kota || "-", s: styleDataCell, t: "s" },
            { v: dtl.uraian || "-", s: styleDataCell, t: "s" },
            { v: dtl.size || "-", s: styleDataCellCenter, t: "s" },
            // Kolom angka detail (t: "n")
            { v: Number(dtl.Jumlah || 0), s: styleDataCellRight, t: "n" },
            { v: Number(dtl.Koli || 0), s: styleDataCellRight, t: "n" },
            { v: dtl.expedisi || "-", s: styleDataCell, t: "s" },
          ];
          wsData.push(row);
          currentRowCounter++;
        });
      } else {
        const row = [
          { v: master.Nomor, s: styleDataCellCenter, t: "s" },
          { v: master.Gudang || "", s: styleDataCellCenter, t: "s" },
          { v: master.Nama_Gudang, s: styleDataCell, t: "s" },
          { v: tglFormatted, s: styleDataCellCenter, t: "s" },
          { v: master.No_SPK, s: styleDataCellCenter, t: "s" },
          { v: master.Nama_Spk, s: styleDataCell, t: "s" },
          { v: master.Ukuran || "-", s: styleDataCellCenter, t: "s" },
          { v: master.Kain || "-", s: styleDataCell, t: "s" },
          { v: Number(master.Qty_Order || 0), s: styleDataCellRight, t: "n" },
          { v: Number(master.Jumlah || 0), s: styleDataCellRight, t: "n" },
          { v: Number(master.Koli || 0), s: styleDataCellRight, t: "n" },
          { v: Number(master.Realisasi || 0), s: styleDataCellRight, t: "n" },
          {
            v: Number(master.Selisih_Jumlah || 0),
            s: styleDataCellRight,
            t: "n",
          },
          {
            v: Number(master.Selisih_Koli || 0),
            s: styleDataCellRight,
            t: "n",
          },
          { v: master.usr_create, s: styleDataCellCenter, t: "s" },
          { v: "-", s: styleDataCellCenter, t: "s" },
          { v: "Tidak ada detail", s: styleDataCell, t: "s" },
          { v: "-", s: styleDataCell, t: "s" },
          { v: "-", s: styleDataCellCenter, t: "s" },
          { v: 0, s: styleDataCellRight, t: "n" },
          { v: 0, s: styleDataCellRight, t: "n" },
          { v: "-", s: styleDataCell, t: "s" },
        ];
        wsData.push(row);
        currentRowCounter++;
      }
    });

    const endRowIndex = currentRowCounter - 1;

    // ==========================================
    // 3. BARIS TOTAL (SUM) DENGAN TIPE NUMERIK (`t: 'n'`)
    // ==========================================
    const totalRow = new Array(22)
      .fill(null)
      .map(() => ({ v: "", s: styleTotalCell, t: "s" }));

    totalRow[7] = { v: "TOTAL", s: styleTotalLabel, t: "s" };

    // Menggunakan formula SUM dengan tipe data 'n' (number)
    totalRow[8] = {
      t: "n",
      f: `SUM(I${startRowIndex}:I${endRowIndex})`,
      s: styleTotalCell,
    };
    totalRow[9] = {
      t: "n",
      f: `SUM(J${startRowIndex}:J${endRowIndex})`,
      s: styleTotalCell,
    };
    totalRow[10] = {
      t: "n",
      f: `SUM(K${startRowIndex}:K${endRowIndex})`,
      s: styleTotalCell,
    };
    totalRow[11] = {
      t: "n",
      f: `SUM(L${startRowIndex}:L${endRowIndex})`,
      s: styleTotalCell,
    };
    totalRow[12] = {
      t: "n",
      f: `SUM(M${startRowIndex}:M${endRowIndex})`,
      s: styleTotalCell,
    };
    totalRow[13] = {
      t: "n",
      f: `SUM(N${startRowIndex}:N${endRowIndex})`,
      s: styleTotalCell,
    };
    totalRow[19] = {
      t: "n",
      f: `SUM(T${startRowIndex}:T${endRowIndex})`,
      s: styleTotalCell,
    };
    totalRow[20] = {
      t: "n",
      f: `SUM(U${startRowIndex}:U${endRowIndex})`,
      s: styleTotalCell,
    };

    wsData.push(totalRow);

    // ==========================================
    // 4. GENERATE WORKSHEET & FILE
    // ==========================================
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 21 } },
      { s: { r: endRowIndex + 1, c: 0 }, e: { r: endRowIndex + 1, c: 7 } },
    ];

    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 25 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
      { wch: 16 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Kirim Detail");
    XLSX.writeFile(workbook, fileName);

    toast.success("Export Excel Berhasil!");
  } catch (error) {
    console.error("Export Detail Error:", error);
    toast.error("Gagal melakukan export excel.");
  } finally {
    loading.value = false;
  }
};

const handlePrint = () => {
  if (!selectedRow.value) {
    toast.warning("Pilih satu data terlebih dahulu untuk dicetak.");
    return;
  }

  // Menggunakan Nomor (ID Utama) atau No_SPK sesuai kebutuhan route Anda
  // Jika di router.ts menggunakan :nomor, maka sesuaikan params-nya
  router.push({
    name: 'JadwalKirimMmtPrint',
    params: { nomor: selectedRow.value.Nomor },
    query: {
      startDate: filters.startDate,
      endDate: filters.endDate,
      gudang: filters.gudang,
    },
  });
};

const canAccess = (action: string) =>
  typeof (authStore as any).can === "function"
    ? (authStore as any).can(MENU_ID, action)
    : true;
const safeFormatDate = (d: string) =>
  isValid(parseISO(d)) ? format(parseISO(d), "dd/MM/yyyy") : d;
const onGudangSelected = (g: any) => {
  filters.gudang = g.Kode;
  isLookupVisible.value = false;
};

const fetchGudangOptions = async () => {
  try {
    const res = await api.get("/mmt/lookup/gudang", {
      params: { mode: "jadi" },
    });
    gudangOptions.value = res.data.data.map((g: any) => ({
      title: `${g.Kode} - ${g.Nama}`,
      value: g.Kode,
    }));
  } catch (e) {}
};

// --- Lifecycle ---
onMounted(() => {
  fetchGudangOptions();
  fetchData();
});

// KeepAlive: saat tab browse ini diaktifkan kembali (mis. setelah Simpan di
// form Jadwal Kirim) data dimuat ulang otomatis sehingga baris terbaru
// langsung tampil — tanpa perlu reload halaman. Aktivasi pertama dilewati
// karena onMounted sudah memuat.
let isFirstActivation = true;
// Flag agar perubahan filter programatik di bawah tidak memicu fetch ganda.
let suppressFilterFetch = false;

onActivated(async () => {
  if (isFirstActivation) {
    isFirstActivation = false;
    return;
  }

  const marker = tabStore.consumeSaved('JadwalKirimMmtBrowse');

  // Bila tanggal data tersimpan di luar rentang filter saat ini, lebarkan
  // filter ke tanggal tsb agar barisnya pasti ikut termuat.
  const tgl = marker?.tanggal;
  if (tgl && (tgl < filters.startDate || tgl > filters.endDate)) {
    suppressFilterFetch = true;
    filters.startDate = tgl;
    filters.endDate = tgl;
  }

  await fetchData();
  suppressFilterFetch = false;
  if (marker) focusSavedRow(marker.nomor);
});

watch(
  [
    () => filters.startDate,
    () => filters.endDate,
    () => filters.gudang,
    () => filters.search,
  ],
  () => {
    if (suppressFilterFetch) {
      suppressFilterFetch = false;
      return;
    }
    fetchData();
  },
);
</script>

<style scoped>
.table-container {
  height: calc(100vh - 250px);
}

/* Row Selection: Biru Muda khas LHK */
:deep(.row-selected) {
  background-color: rgb(216, 239, 255) !important;
}

:deep(.v-data-table tbody tr:hover) {
  background-color: #f1f8ff !important;
  cursor: pointer;
}

/* Detail Expanded Container */
:deep(.detail-container),
.detail-container {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: flex-start !important;
  padding: 6px 0 !important;
  background-color: transparent !important;
  border-top: none !important;
  width: 100% !important;
}

:deep(.detail-table-wrapper),
.detail-table-wrapper {
  padding: 0 !important;
  width: auto !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  margin-left: 0 !important;
  margin-right: auto !important;
}

:deep(.detail-table),
.detail-table {
  background-color: white !important;
  font-size: 0.8rem !important;
  width: auto !important;
}

/* Text & Visual Styles */
:deep(.v-data-table__table) {
  font-size: 0.82rem;
}

.text-error {
  color: #f44336 !important;
}
.text-success {
  color: #4caf50 !important;
}
.font-weight-bold {
  font-weight: bold !important;
}
</style>
