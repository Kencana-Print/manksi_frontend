<template>
  <BaseBrowse
    title="Hasil Kerja PaperPrint MMT"
    menu-id="mmt-lhk-paperprint"
    icon="mdi-printer-settings"
    :headers="masterHeaders"
    :items="masterData"
    :can-insert="true"
    :can-edit="true"
    :can-delete="true"
    :is-loading="loading.master"
    :loading="loading.master"
    v-model:selected="selected"
    v-model:expanded="expanded"
    v-model:startDate="filters.startDate"
    v-model:endDate="filters.endDate"
    item-value="Nomor"
    has-print
    show-expand
    :summary-columns="summaryColumns"
    :summary-formatters="summaryFormatters"
    @refresh="fetchMasterData"
    @add="handleCreate"
    @edit="handleEdit"
    @delete="handleDelete"
    @print="handlePrint"
    @row-click="handleRowClick"
  >
    <!-- Keterangan Warna ditempatkan di Slot Filter Fields / Sebelah Filter Tanggal -->
    <template #filter-fields>
      <div
        class="d-flex align-center ga-3 ml-2 flex-wrap text-caption text-grey-darken-2"
      >
        <div class="d-flex align-center">
          <span class="color-indicator bg-error rounded-circle mr-1"></span>
          <span class="text-error font-weight-bold">Merah = Draft</span>
        </div>
        <div class="d-flex align-center">
          <span class="color-indicator bg-black rounded-circle mr-1"></span>
          <span>Hitam = Posted / Approve</span>
        </div>
        <div class="d-flex align-center text-error">
          <span class="color-indicator bg-error rounded-circle mr-1"></span>
          <span>Teks Merah = Belum Lengkap</span>
        </div>
      </div>
    </template>

    <!-- Tombol Ekstra (ACC, Bahan, Slip, Export Excel) -->
    <template #extra-actions>
      <v-btn
        size="x-small"
        color="teal-darken-1"
        :disabled="!isSingleSelected"
        :loading="loading.acc"
        @click="handleAcc"
      >
        <v-icon start size="14">mdi-check-decagram</v-icon> ACC
      </v-btn>

      <v-btn
        size="x-small"
        color="secondary"
        :disabled="!isSingleSelected"
        @click="handleBahan"
      >
        <v-icon start size="14">mdi-package-variant</v-icon> Bahan
      </v-btn>

      <v-btn
        size="x-small"
        color="info"
        :disabled="!isSingleSelected"
        @click="handlePrint"
      >
        <v-icon start size="14">mdi-printer</v-icon> Slip
      </v-btn>

      <v-btn
        size="x-small"
        color="success"
        :disabled="masterData.length === 0"
        @click="exportToExcel"
        :loading="loading.master"
      >
        <v-icon start size="14">mdi-file-excel</v-icon> Export Excel
      </v-btn>
    </template>

    <!-- Custom Template Kolom Tabel Utama (Terapkan getRowTextColor agar warna aktif) -->
    <template #item.Nomor="{ item }">
      <span :class="getRowTextColor(item)">
        {{ item.Nomor }}
      </span>
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="
          item.Status === 'APPROVE'
            ? 'success'
            : item.Status === 'POSTED'
              ? 'info'
              : 'warning'
        "
        class="font-weight-bold"
      >
        {{ item.Status || "DRAFT" }}
      </v-chip>
    </template>

    <template #item.Tanggal="{ item }">
      <span :class="getRowTextColor(item)">{{ formatDate(item.Tanggal) }}</span>
    </template>

    <template #item.NomorSPK="{ item }">
      <span :class="getRowTextColor(item)">{{ item.NomorSPK }}</span>
    </template>

    <template #item.total_meter="{ item }">
      <span :class="getRowTextColor(item)">{{
        Number(item.total_meter || 0).toFixed(2)
      }}</span>
    </template>

    <template #item.Status_Acc="{ item }">
      <v-chip
        size="x-small"
        :color="item.Status_Acc === 'ACC' ? 'success' : 'grey'"
        variant="flat"
      >
        {{ item.Status_Acc === "ACC" ? "ACC" : "DRAFT" }}
      </v-chip>
    </template>

    <!-- Slot Expanded Content untuk Menampilkan Detail -->
    <template #expanded-content="{ item }">
      <div class="detail-container">
        <div class="detail-table-wrapper">
          <div v-if="loadingDetails.has(item.Nomor)" class="text-center pa-4">
            <v-progress-circular indeterminate size="20" color="primary" />
            <span class="ml-2 text-caption">Memuat data...</span>
          </div>

          <v-data-table
            v-else-if="details[item.Nomor] && details[item.Nomor].length"
            :headers="detailHeaders"
            :items="details[item.Nomor]"
            density="compact"
            hide-default-footer
            class="detail-table border"
            :items-per-page="-1"
          >
            <!-- Slot untuk Kolom Panjang -->
            <template #item.Panjang="{ item: detailItem }">
              {{ detailItem.Panjang ?? "-" }}
            </template>

            <!-- Slot untuk Kolom Lebar -->
            <template #item.Lebar="{ item: detailItem }">
              {{ detailItem.Lebar ?? "-" }}
            </template>

            <template #item.Jumlah_Meter="{ item: detailItem }">
              <span class="font-weight-bold">
                {{ Number(detailItem.Jumlah_Meter || 0).toFixed(2) }}
              </span>
            </template>
          </v-data-table>

          <div v-else class="text-center pa-4 text-caption text-grey">
            Data detail tidak ditemukan atau gagal dimuat.
          </div>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import Swal from "sweetalert2";
import BaseBrowse from "@/components/BaseBrowse.vue";
import api from "@/services/api";
import * as XLSX from "xlsx";

const router = useRouter();
const toast = useToast();

const selected = ref<any[]>([]);
const expanded = ref<any[]>([]);
const masterData = ref<any[]>([]);
const details = ref<Record<string, any[]>>({});

const loading = reactive({
  master: false,
  acc: false,
});

const loadingDetails = ref<Set<string>>(new Set());

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const get30DaysAgoString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filters = reactive({
  startDate: get30DaysAgoString(),
  endDate: getTodayString(),
});

// --- Fungsi Aturan Warna Baris (Merah jika Draft / Belum Lengkap) ---
const getRowTextColor = (item: any) => {
  const status = (item.Status || "DRAFT").toUpperCase();
  const isLengkap = item.Lengkap === "Y";

  if (status === "DRAFT" || !isLengkap) {
    return "text-error font-weight-bold";
  }
  return ""; // Hitam untuk POSTED / APPROVE & Lengkap == 'Y'
};

// --- Table Headers ---
const masterHeaders = [
  {
    title: "Nomor",
    key: "Nomor",
    width: "180px",
    minWidth: "180px",
    fixed: true,
  },
  { title: "Status", key: "Status", width: "100px", align: "center" as const },
  { title: "Tanggal", key: "Tanggal", width: "110px" },
  { title: "ACC", key: "Status_Acc", width: "90px", align: "center" as const },
  { title: "Gudang", key: "Nama_Gudang", width: "130px" },
  { title: "Operator", key: "Operator", width: "130px" },
  { title: "Mesin", key: "Mesin", width: "110px" },
  { title: "SPK", key: "NomorSPK", width: "140px" },
  { title: "Nama SPK", key: "NamaOrder" },
  {
    title: "Total Item",
    key: "Total_Item",
    align: "end" as const,
    width: "90px",
  },
  {
    title: "Total Qty",
    key: "Total_Qty",
    align: "end" as const,
    width: "90px",
  },
  { title: "Shift", key: "Shift", width: "70px" },
  { title: "Barcode", key: "Barcode_Roll", width: "130px" },
  {
    title: "Ambil Bahan (M)",
    key: "PanjangBahanAwal",
    width: "130px",
    align: "end" as const,
  },
  {
    title: "Cetak (m²)",
    key: "total_meter",
    align: "end" as const,
    width: "100px",
  },
];

const detailHeaders = [
  { title: "No. Urut", key: "No_Urut", width: "70px" },
  { title: "No. SPK", key: "Nomor_SPK", width: "130px" },
  { title: "Nama SPK", key: "Nama_SPK" },
  { title: "Size", key: "Poi_Size", width: "70px", align: "center" as const },
  { title: "Panjang", key: "Panjang", align: "end" as const, width: "90px" },
  { title: "Lebar", key: "Lebar", align: "end" as const, width: "90px" },
  { title: "Bahan", key: "Bahan" },
  { title: "J. Order", key: "J_Order", align: "end" as const, width: "80px" },
  { title: "J. Hasil", key: "Jumlah", align: "end" as const, width: "80px" },
  { title: "Mtr²", key: "Jumlah_Meter", align: "end" as const, width: "90px" },
];

// --- Summary Footer ---
const summaryColumns = [
  "Total_Item",
  "Total_Qty",
  "PanjangBahanAwal",
  "total_meter",
];

const summaryFormatters = {
  Nomor: () => "TOTAL :",
  Total_Item: (items: any[]) =>
    new Intl.NumberFormat("id-ID").format(
      items.reduce((sum, item) => sum + (Number(item.Total_Item) || 0), 0),
    ),
  Total_Qty: (items: any[]) =>
    new Intl.NumberFormat("id-ID").format(
      items.reduce((sum, item) => sum + (Number(item.Total_Qty) || 0), 0),
    ),
  PanjangBahanAwal: (items: any[]) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(
      items.reduce(
        (sum, item) => sum + (Number(item.PanjangBahanAwal) || 0),
        0,
      ),
    ),
  total_meter: (items: any[]) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(
      items.reduce((sum, item) => sum + (Number(item.total_meter) || 0), 0),
    ),
  Nomor: () => "GRAND TOTAL",
  Total_Item: (items: any[]) => {
    const total = items.reduce(
      (sum, r) => sum + (Number(r.Total_Item) || 0),
      0,
    );
    return Math.round(total).toLocaleString("id-ID");
  },
  Total_Qty: (items: any[]) => {
    const total = items.reduce((sum, r) => sum + (Number(r.Total_Qty) || 0), 0);
    return Math.round(total).toLocaleString("id-ID");
  },
  PanjangBahanAwal: (items: any[]) => {
    const total = items.reduce(
      (sum, r) => sum + (Number(r.PanjangBahanAwal) || 0),
      0,
    );
    return Number(total.toFixed(2)).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
  total_meter: (items: any[]) => {
    const total = items.reduce(
      (sum, r) => sum + (Number(r.total_meter) || 0),
      0,
    );
    return Number(total.toFixed(2)).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
};

const isSingleSelected = computed(() => selected.value.length === 1);

const selectedItemNomor = computed(() => {
  if (selected.value.length === 0) return null;
  const item = selected.value[0];
  if (typeof item === "object" && item !== null) {
    return item.Nomor || item.raw?.Nomor || null;
  }
  return item;
});

const fetchMasterData = async () => {
  loading.master = true;
  try {
    const response = await api.get("/mmt/lhk-paperprint", { params: filters });
    masterData.value = response.data || [];
    selected.value = [];
    expanded.value = [];
  } catch (error) {
    toast.error("Gagal mengambil data master");
  } finally {
    loading.master = false;
  }
};

const loadDetails = async (expandedKeys: any[]) => {
  if (expandedKeys.length === 0) return;
  const lastExpanded = expandedKeys[expandedKeys.length - 1];
  const nomorKey =
    typeof lastExpanded === "object" ? lastExpanded.Nomor : lastExpanded;

  if (nomorKey && !details.value[nomorKey]) {
    loadingDetails.value.add(nomorKey);
    try {
      const res = await api.get(`/mmt/lhk-paperprint/detail/${nomorKey}`);
      details.value[nomorKey] = res.data || [];
    } catch (e) {
      toast.error("Gagal memuat detail");
    } finally {
      loadingDetails.value.delete(nomorKey);
    }
  }
};

watch(
  expanded,
  (newVal) => {
    loadDetails(newVal);
  },
  { deep: true },
);

const handleRowClick = (_event: any, row: any) => {
  const item = row.item;
  const targetNomor = item?.Nomor || item?.raw?.Nomor;
  if (!targetNomor) return;

  const isAlreadySelected = selected.value.some((s: any) => {
    const currentNomor = typeof s === "object" ? s.Nomor : s;
    return currentNomor === targetNomor;
  });

  if (isAlreadySelected) {
    selected.value = [];
  } else {
    selected.value = [item];
  }
};

const handleCreate = () => {
  router.push({ name: "LhkPaperprintCreate" });
};

const handleEdit = () => {
  if (!selectedItemNomor.value) {
    toast.warning("Silakan pilih satu data terlebih dahulu");
    return;
  }
  router.push({
    name: "LhkPaperprintEdit",
    params: { nomor: selectedItemNomor.value },
  });
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const handleAcc = async () => {
  if (!selectedItemNomor.value) return;

  // Ambil data item yang sedang dipilih untuk mengecek statusnya
  const selectedItem = selected.value[0];
  const currentStatus = (selectedItem?.Status || "DRAFT").toUpperCase();

  // Validasi: Jika masih DRAFT, tampilkan warning dan hentikan proses
  if (currentStatus === "DRAFT") {
    Swal.fire({
      title: "Tidak Dapat ACC",
      text: "Data dengan status Draft tidak dapat di-ACC. Silakan post data terlebih dahulu.",
      icon: "warning",
      confirmButtonColor: "#00897B",
    });
    return;
  }

  const result = await Swal.fire({
    title: "Konfirmasi ACC LHK",
    text: `Apakah Anda yakin ingin menyetujui (ACC) LHK Paperprint Nomor: ${selectedItemNomor.value}?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#00897B",
    confirmButtonText: "Ya, ACC!",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    loading.acc = true;
    try {
      await api.post(`/mmt/lhk-paperprint/acc/${selectedItemNomor.value}`);
      toast.success(`LHK ${selectedItemNomor.value} berhasil di-ACC.`);
      fetchMasterData();
      selected.value = [];
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Gagal memproses ACC LHK Paperprint.",
      );
    } finally {
      loading.acc = false;
    }
  }
};

const handleBahan = () => {
  if (!selectedItemNomor.value) return;
  toast.info("Fitur rincian pemakaian bahan paperprint sedang disiapkan.");
};
const handleDelete = async () => {
  if (!selectedItemNomor.value) return;

  const result = await Swal.fire({
    title: "Yakin ingin hapus?",
    text: `Data LHK Sublim Nomor: ${selectedItemNomor.value} akan dihapus permanen.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Ya, Hapus!",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    try {
      await api.delete(`/sublim/lhk-paperprint/${selectedItemNomor.value}`);
      toast.success("Berhasil dihapus.");
      fetchMasterData();
      selected.value = [];
    } catch (e) {
      toast.error("Gagal menghapus data.");
    }
  }
};

const handlePrint = () => {
  if (!selectedItemNomor.value) return;
  window.open(
    `/api/report/lhk-paperprint-slip/${selectedItemNomor.value}`,
    "_blank",
  );
};

const exportToExcel = async () => {
  if (masterData.value.length === 0) {
    toast.warning("Tidak ada data untuk diekspor");
    return;
  }

  loading.master = true;
  try {
    for (const header of masterData.value) {
      if (
        !details.value[header.Nomor] ||
        details.value[header.Nomor].length === 0
      ) {
        try {
          const res = await api.get(
            `/mmt/lhk-paperprint/detail/${header.Nomor}`,
          );
          details.value[header.Nomor] = res.data || [];
        } catch (e) {
          details.value[header.Nomor] = [];
        }
      }
    }

    const fileName = `LHK_Paperprint_MMT_${filters.startDate}_to_${filters.endDate}.xlsx`;

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
    };

    const styleFooter = {
      ...styleDataCell,
      fill: { fgColor: { rgb: "F0F4F8" } },
      font: { bold: true, sz: 10 },
    };

    const formatTglManual = (dateStr: string) => {
      if (!dateStr) return "-";
      try {
        if (dateStr.includes("-")) {
          const parts = dateStr.split("T")[0].split("-");
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return `${parts[0]}/${parts[1]}/${parts[2]}`;
          }
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    const worksheetData: any[] = [];
    worksheetData.push([
      {
        v: "LAPORAN HASIL KERJA PAPERPRINT MMT",
        s: { font: { bold: true, sz: 14 } },
      },
    ]);
    worksheetData.push([
      {
        v: `Periode : ${formatTglManual(filters.startDate)} s/d ${formatTglManual(filters.endDate)}`,
        s: { font: { sz: 10 } },
      },
    ]);
    worksheetData.push([]);

    const headersTable = [
      { v: "NOMOR LHK", s: styleHeaderMain },
      { v: "TANGGAL", s: styleHeaderMain },
      { v: "STATUS ACC", s: styleHeaderMain },
      { v: "GUDANG", s: styleHeaderMain },
      { v: "MESIN", s: styleHeaderMain },
      { v: "SHIFT", s: styleHeaderMain },
      { v: "TOTAL (M²)", s: styleHeaderMain },
      { v: "NO URUT", s: styleHeaderMain },
      { v: "NOMOR SPK", s: styleHeaderMain },
      { v: "NAMA SPK / ORDER", s: styleHeaderMain },
      { v: "SIZE", s: styleHeaderMain },
      { v: "PANJANG", s: styleHeaderMain },
      { v: "LEBAR", s: styleHeaderMain },
      { v: "BAHAN", s: styleHeaderMain },
      { v: "JML ORDER", s: styleHeaderMain },
      { v: "JML HASIL", s: styleHeaderMain },
      { v: "TOTAL DETAIL (M²)", s: styleHeaderMain },
    ];
    worksheetData.push(headersTable);

    let grandTotalM2Master = 0;
    let grandTotalOrder = 0;
    let grandTotalHasil = 0;
    let grandTotalM2Detail = 0;

    masterData.value.forEach((header: any) => {
      const targetDetails = details.value[header.Nomor] || [];
      const tglHeader = header.Tanggal ? formatTglManual(header.Tanggal) : "";
      const statusAcc = header.Status_Acc === "ACC" ? "ACC" : "DRAFT";
      const namaMesin = header.Mesin || "-";

      if (targetDetails.length > 0) {
        targetDetails.forEach((dtl: any, index: number) => {
          const isFirstRow = index === 0;
          if (isFirstRow) {
            grandTotalM2Master += Number(header.total_meter || 0);
          }
          grandTotalOrder += Number(dtl.J_Order || 0);
          grandTotalHasil += Number(dtl.Jumlah || 0);
          grandTotalM2Detail += Number(dtl.Jumlah_Meter || 0);

          const row = [
            { v: isFirstRow ? header.Nomor : "", s: styleDataCellCenter },
            { v: isFirstRow ? tglHeader : "", s: styleDataCellCenter },
            { v: isFirstRow ? statusAcc : "", s: styleDataCellCenter },
            {
              v: isFirstRow ? header.Nama_Gudang || "-" : "",
              s: styleDataCell,
            },
            {
              v: isFirstRow ? namaMesin : "",
              s: styleDataCellCenter,
            },
            {
              v: isFirstRow ? header.Shift || "-" : "",
              s: styleDataCellCenter,
            },
            {
              v: isFirstRow ? Number(header.total_meter || 0) : "",
              t: "n",
              z: "#,##0.00",
              s: styleDataCellRight,
            },
            { v: dtl.No_Urut || index + 1, s: styleDataCellCenter },
            { v: dtl.Nomor_SPK || "-", s: styleDataCellCenter },
            { v: dtl.Nama_SPK || "-", s: styleDataCell },
            { v: dtl.Poi_Size || "-", s: styleDataCellCenter },
            {
              v:
                dtl.Panjang !== undefined && dtl.Panjang !== null
                  ? Number(dtl.Panjang)
                  : 0,
              t: "n",
              z: "#,##0.00",
              s: styleDataCellRight,
            },
            {
              v:
                dtl.Lebar !== undefined && dtl.Lebar !== null
                  ? Number(dtl.Lebar)
                  : 0,
              t: "n",
              z: "#,##0.00",
              s: styleDataCellRight,
            },
            { v: dtl.Bahan || "-", s: styleDataCell },
            {
              v: dtl.J_Order !== undefined ? Number(dtl.J_Order) : 0,
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: dtl.Jumlah !== undefined ? Number(dtl.Jumlah) : 0,
              t: "n",
              z: "#,##0",
              s: styleDataCellRight,
            },
            {
              v: dtl.Jumlah_Meter !== undefined ? Number(dtl.Jumlah_Meter) : 0,
              t: "n",
              z: "#,##0.00",
              s: styleDataCellRight,
            },
          ];
          worksheetData.push(row);
        });
      } else {
        grandTotalM2Master += Number(header.total_meter || 0);
        const row = [
          { v: header.Nomor, s: styleDataCellCenter },
          { v: tglHeader, s: styleDataCellCenter },
          { v: statusAcc, s: styleDataCellCenter },
          { v: header.Nama_Gudang || "-", s: styleDataCell },
          { v: namaMesin, s: styleDataCellCenter },
          { v: header.Shift || "-", s: styleDataCellCenter },
          {
            v: Number(header.total_meter || 0),
            t: "n",
            z: "#,##0.00",
            s: styleDataCellRight,
          },
          { v: "-", s: styleDataCellCenter },
          { v: "-", s: styleDataCellCenter },
          { v: "Tidak ada data detail pekerjaan paperprint", s: styleDataCell },
          { v: "-", s: styleDataCellCenter },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
          { v: "-", s: styleDataCell },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0", s: styleDataCellRight },
          { v: 0, t: "n", z: "#,##0.00", s: styleDataCellRight },
        ];
        worksheetData.push(row);
      }
    });

    const footerRow = [
      {
        v: "GRAND TOTAL",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      ...Array(5).fill({ v: "", s: styleFooter }),
      {
        v: grandTotalM2Master,
        t: "n",
        z: "#,##0.00",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      ...Array(7).fill({ v: "", s: styleFooter }),
      {
        v: grandTotalOrder,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      {
        v: grandTotalHasil,
        t: "n",
        z: "#,##0",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
      {
        v: grandTotalM2Detail,
        t: "n",
        z: "#,##0.00",
        s: { ...styleFooter, alignment: { horizontal: "right" } },
      },
    ];
    worksheetData.push(footerRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
      {
        s: { r: worksheetData.length - 1, c: 0 },
        e: { r: worksheetData.length - 1, c: 5 },
      },
    ];
    ws["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
      { wch: 8 },
      { wch: 15 },
      { wch: 8 },
      { wch: 18 },
      { wch: 35 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LHK_Sublim");
    XLSX.writeFile(wb, fileName);
    toast.success("Excel LHK Sublim berhasil diunduh");
  } catch (error) {
    console.error("Export Error:", error);
    toast.error("Gagal mengekspor data ke Excel.");
  } finally {
    loading.master = false;
  }
};

onMounted(() => {
  fetchMasterData();
});
</script>

<style scoped>
.color-indicator {
  width: 10px;
  height: 10px;
  display: inline-block;
}
.bg-error {
  background-color: #ff5252 !important;
}
.bg-black {
  background-color: #000000 !important;
}
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
  font-size: 11px !important;
  width: auto !important;
}
:deep(.detail-table th),
:deep(.detail-table td) {
  font-size: 11px !important;
  white-space: nowrap;
}
:deep(.detail-table thead tr) {
  background-color: #f5f5f5 !important;
}
:deep(.detail-table thead th) {
  font-weight: 700 !important;
  color: #333 !important;
}
.text-error {
  color: #ff5252 !important;
}
.italic {
  font-style: italic;
}
</style>
